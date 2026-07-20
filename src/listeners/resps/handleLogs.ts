import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { format as formatBytes } from "@std/fmt/bytes";
import consola from "consola";
import {
  type APIEmbed,
  type APIEmbedField,
  blockQuote,
  ButtonStyle,
  Colors,
  ComponentType,
  Message,
  type MessageActionRowComponentData,
} from "discord.js";
import { isNotNil, uniq } from "es-toolkit";
import { z } from "zod";
import { getJSON } from "../../lib/data.ts";
import { getLog, limits, postLog, PostLogMetadata } from "../../lib/mcLogs.ts";
import ky from "ky";

const mclogsLogo = "https://mclo.gs/img/logo.png";
const mclogsRegex = /https:\/\/(?:mclo\.gs|api.mclo\.gs\/1\/raw)\/([a-z0-9]+)/i;
const hstshRegex = /https:\/\/hst\.sh\/(?:raw\/)?([a-z]+)/i;
const mclogsRegexG = new RegExp(mclogsRegex, "gi");
const hstshRegexG = new RegExp(hstshRegex, "gi");

/** Provides info and recommendations for crashes */
@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
})
export class UserEvent extends Listener<typeof Events.MessageCreate> {
  public override async run(message: Message<true>) {
    // Don't parse logs on @silent
    if (message.flags.has("SuppressNotifications")) return;
    if (message.content.toLowerCase().includes("sky ignore")) return;
    if (message.content.toLowerCase().includes("poly ignore")) return;

    const msgLogs = message.attachments
      .filter(
        (attachment) =>
          attachment.name.endsWith(".txt") || attachment.name.endsWith(".log"),
      )
      .map((attachment) => attachment.url);

    const logURL = [...msgLogs, ...findLogs(message.content)].at(0);
    if (!logURL) return;

    await message.channel.sendTyping();

    const newContent = message.content
      .replaceAll(hstshRegexG, "")
      .replaceAll(mclogsRegexG, "")
      .trim();
    const embeds: APIEmbed[] = [];
    const components: MessageActionRowComponentData[] = [];
    let text: string;
    let content = `${message.author.toString()} uploaded a `;
    try {
      const mcLog = await getNewLog(logURL, [
        { key: "uploader", value: message.author.tag, label: "Uploader" },
        { key: "uploader_id", value: message.author.id, visible: false },
      ]);
      try {
        await message.delete();
      } catch (e) {
        // message may have already been deleted by another bot
        consola.error("Failed to delete log message", e);
      }
      text = mcLog.content.raw;
      const insights = mcLog.content.insights;
      content += insights.type;

      const logSize = mcLog.size;
      const logFileSize = formatBytes(logSize, { binary: true });
      const logLines = mcLog.lines;
      const truncated = logLines == limits.maxLines ||
        logSize == limits.maxLength;
      let footer = `${logFileSize} / ${logLines} lines`;
      if (truncated) footer += " (truncated)";
      embeds.push({
        title: insights.title,
        url: mcLog.url,
        color: 0x2d3943,
        thumbnail: { url: mclogsLogo },
        fields: insights.analysis.information.map((v) => ({
          name: v.label,
          value: v.value,
          inline: true,
        })),
        footer: { text: footer },
      });

      if (insights.id == "unknown/unknown" || insights.id == "vanilla/server") {
        embeds.push({
          title: "This may be an incomplete log",
          color: Colors.Yellow,
          description:
            "If you're using Prism or Modrinth Launcher, please upload the log file called `latest` or `fml-client-latest`.",
        });
      }

      components.push(
        {
          type: ComponentType.Button,
          style: ButtonStyle.Link,
          label: "Open on mclo.gs",
          url: mcLog.url,
        },
        {
          type: ComponentType.Button,
          style: ButtonStyle.Link,
          label: "Raw Log",
          url: mcLog.raw,
        },
      );
    } catch (e) {
      consola.error(e);
      embeds.push({
        title: "Failed to upload to mclo.gs",
        color: Colors.Red,
        description: e instanceof Error ? e.message : "Unknown error",
        thumbnail: { url: mclogsLogo },
      });
      text = await ky(logURL).text();
      content += "file";
    }

    const verb = await verbalizeCrash(text);
    if (verb.length > 0) {
      const myAvatar = message.client.user.avatarURL();
      embeds.push({
        title: "Bot Analysis",
        color: 0x81ca3f,
        thumbnail: myAvatar ? { url: myAvatar } : undefined,
        fields: verb,
      });
    }

    if (newContent) content += `\n${blockQuote(newContent)}`;
    await message.channel.send({
      content,
      embeds,
      components: components.length > 0
        ? [{ type: ComponentType.ActionRow, components }]
        : [],
      allowedMentions: { parse: [] },
    });
  }
}

// We want to use mclo.gs to censor logs,
// but we don't need to upload if the log is already from MCLogs.
async function getNewLog(
  url: string,
  metadata?: PostLogMetadata[],
) {
  let log: string | { id: string } = url;
  if (!url.includes("mclo.gs")) {
    const text = await ky(url).text();
    log = await postLog(text, {
      source: "PolyHelper",
      metadata,
    });
  }

  return await getLog(log, {
    raw: true,
    insights: true,
  });
}

function findLogs(txt: string) {
  const ret = [];

  const mclogsMatch = txt.match(mclogsRegex);
  if (mclogsMatch) ret.push(`https://api.mclo.gs/1/raw/${mclogsMatch[1]}`);

  const hastebinMatch = txt.match(hstshRegex);
  if (hastebinMatch) ret.push(`https://hst.sh/raw/${hastebinMatch[1]}`);

  return ret;
}

const CrashCause = z.object({
  method: z.enum(["contains", "contains_not", "regex"]),
  value: z.string(),
});
const CrashFix = z.object({
  name: z.string().optional(),
  fixtype: z.number().optional(),
  fix: z.string(),
  causes: z.array(CrashCause),
});
const FixType = z.object({
  name: z.string(),
});
const Crashes = z.object({
  fixes: z.array(CrashFix),
  fixtypes: z.array(FixType),
  default_fix_type: z.number(),
});
type Crashes = z.infer<typeof Crashes>;

export const getCrashes = async () =>
  await getJSON("Polyfrost/CrashData", "main", "crashes.json", Crashes);

async function verbalizeCrash(
  log: string,
): Promise<APIEmbedField[]> {
  const pathIndicator = "`";
  const gameRoot = ".minecraft";
  const profileRoot = ".minecraft";
  let crashData: Crashes;
  try {
    crashData = await getCrashes();
  } catch (e) {
    consola.error("Failed to parse crashes.json", e);
    return [
      {
        name: "Failed to parse crashes.json",
        value: "Blame Wyvest",
      },
    ];
  }
  const relevantInfo = crashData.fixes.filter((fix) => {
    return fix.causes.every((type) => {
      if (type.method == "contains") return log.includes(type.value);
      else if (type.method == "regex") return log.match(new RegExp(type.value));
      else if (type.method == "contains_not") return !log.includes(type.value);
      else return false;
    });
  });

  const cheater = relevantInfo.find((info) => info.fix.startsWith("Cheater"));
  if (cheater) return [{ name: "Cheater", value: cheater.fix }];

  const crashGroups = crashData.fixtypes.map((type, i) => {
    const groupInfo = relevantInfo.filter(
      (info) => (info.fixtype ?? crashData.default_fix_type) == i,
    );
    if (!groupInfo.length) return;
    return {
      name: type.name,
      value: uniq(
        groupInfo.map((info) =>
          info.fix
            .replaceAll("%pathindicator%", pathIndicator)
            .replaceAll("%gameroot%", gameRoot)
            .replaceAll("%profileroot%", profileRoot)
        ),
      ).join("\n"),
    };
  });
  return crashGroups.filter(isNotNil);
}
