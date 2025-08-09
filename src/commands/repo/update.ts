import { ApplyOptions } from "@sapphire/decorators";
import logger from "./../../lib/logger.ts";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { createHash } from "crypto";
import {
  ButtonBuilder,
  ButtonStyle,
  escapeMarkdown,
  hideLinkEmbed,
  hyperlink,
  inlineCode,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
} from "discord.js";
import JSZip from "jszip";
import { Mods, getRepoJSON, getMods, getPacks } from "../../lib/data.js";
import { checkMember, hasPermission } from "../../lib/update.js";
import { SkyClient, Emojis, repoURL } from "../../const.js";
import { z } from "zod";
import { basename } from "node:path/posix";
import {
  PendingUpdatesDB,
  type ModUpdate,
  type PackUpdate,
  type PartialUpdate,
} from "../../lib/db.js";
import { envParseString } from "@skyra/env-utilities";
import { type Nullish } from "@sapphire/utilities";
import { extname } from "path";
import { generateDataComponent } from "../../interaction-handlers/repo/updateCheck2.ts";
import dedent from "dedent";
import { assert } from "@std/assert";

const ModInfo = z.array(z.object({ modid: z.string() }));
const URL = z.url();

const baseURL =
  "https://github.com/SkyblockClient/SkyblockClient-REPO/blob/main/files";

const modsJson = hyperlink("mods.json", hideLinkEmbed(`${baseURL}/mods.json`));
const packsJson = hyperlink(
  "packs.json",
  hideLinkEmbed(`${baseURL}/packs.json`),
);
const permsJson = hyperlink(
  "update_perms.json",
  hideLinkEmbed(`${baseURL}/update_perms.json`),
);
const mistakeLine = "-# If you believe this to be a mistake, please make a PR";

@ApplyOptions<Subcommand.Options>({
  description: "Updates a mod / pack",
  subcommands: [
    { name: "mod", chatInputRun: "updateMod" },
    { name: "pack", chatInputRun: "updatePack" },
  ],
})
export class UserCommand extends Subcommand {
  public override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addSubcommand((command) =>
          command
            .setName("mod")
            .setDescription("Updates a mod")
            .addStringOption((option) =>
              option
                .setName("url")
                .setDescription("Download URL")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("forge_id")
                .setDescription(
                  "modid to update, only used if not found in mcmod.info",
                )
                .setRequired(false),
            )
            .addStringOption((option) =>
              option
                .setName("filename")
                .setDescription(
                  "filename for the file, replacing the autodetected name",
                )
                .setRequired(false),
            )
            .addBooleanOption((option) =>
              option.setName("beta").setDescription("Beta").setRequired(false),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("pack")
            .setDescription("Updates a pack")
            .addStringOption((option) =>
              option
                .setName("url")
                .setDescription("Download URL")
                .setRequired(true),
            )
            .addStringOption((option) =>
              option
                .setName("pack")
                .setDescription("Pack ID")
                .setRequired(true)
                .setAutocomplete(true),
            )
            .addStringOption((option) =>
              option
                .setName("filename")
                .setDescription(
                  "filename for the file, replacing the autodetected name",
                )
                .setRequired(false),
            ),
        ),
    );
  }

  public async updateMod(int: Subcommand.ChatInputCommandInteraction) {
    if (!envParseString("GH_KEY", null))
      return int.reply(`Missing GitHub API Key! ${Emojis.BlameWyvest}`);

    const { guild, channel } = int;
    if (!guild || !channel) return;
    const member = int.guild?.members.resolve(int.user);
    if (!member) return;
    const perms = await checkMember(member);
    if (!perms.all && !Object.keys(perms.mods).length) {
      return int.reply({
        flags: MessageFlags.Ephemeral,
        content: dedent`
          ${Emojis.YouWhat} You don't have any mod update perms
          ${mistakeLine} in ${permsJson}
        `,
      });
    }

    if (channel.id != SkyClient.channels.ModUpdating)
      return int.reply({
        flags: MessageFlags.Ephemeral,
        content: `${Emojis.Light} This command is only available in <#${SkyClient.channels.ModUpdating}>`,
      });
    const url = int.options.getString("url", true);
    if (!URL.safeParse(url).success)
      return int.reply(`This doesn't look like a URL to me ${Emojis.Thinking}`);

    await int.deferReply();

    const modResp = await fetch(url, {
      headers: { "User-Agent": repoURL },
    });
    if (!modResp.ok) {
      logger.error(
        `${modResp.statusText} while fetching ${url}`,
        await modResp.text(),
      );
      return int.editReply("Failed to fetch mod. Is the URL correct?");
    }
    const modFile = await modResp.arrayBuffer();

    let modId: string | Nullish;
    try {
      const modZip = await JSZip.loadAsync(modFile);
      const modInfoFile = modZip.file("mcmod.info");
      if (modInfoFile)
        try {
          const modInfoStr = await modInfoFile.async("text");
          const modInfo = ModInfo.parse(JSON.parse(modInfoStr));
          modId = modInfo[0]?.modid;
        } catch (e) {
          logger.error("Failed to read mcmod.info", e);
        }
    } catch (e) {
      logger.error("Failed to read ZIP", e);
      return int.editReply("Failed to read ZIP. Is the URL correct?");
    }
    modId = modId || int.options.getString("forge_id");

    if (!modId)
      return int.editReply(
        `${Emojis.Shaking} Failed to find modid in mcmod.info!`,
      );
    if (!(await hasPermission(member, "update", "mod", modId))) {
      assert(!perms.all);
      return int.editReply(dedent`
        ${Emojis.Shaking} You aren't allowed to update the mod \`${escapeMarkdown(modId)}\`
        You can only update mods with the Forge modid of: \
        ${Object.keys(perms.mods).map(inlineCode).join(", ")}
        ${mistakeLine} in ${modsJson}
      `);
    }

    const isBeta = int.options.getBoolean("beta") || false;
    const data: ModUpdate = {
      type: "mod",
      id: modId,
      url,
      file: decodeURIComponent(
        int.options.getString("filename") || basename(url),
      ),
      hash: createHash("md5").update(new Uint8Array(modFile)).digest("hex"),
      sha256: createHash("sha256")
        .update(new Uint8Array(modFile))
        .digest("hex"),
      beta: isBeta,
      approvers: [],
    };

    const modsRef = await getMods();
    const mods = isBeta ? await getRepoJSON("mods_beta", Mods) : modsRef;

    const existingMod =
      mods.find((mod) => mod.forge_id == modId) ||
      modsRef.find((mod) => mod.forge_id == modId);
    if (!existingMod)
      return int.editReply(dedent`
        ${Emojis.Thinking} The database doesn't contain a mod with forge_id \`${escapeMarkdown(modId)}\`
        ${mistakeLine} in ${modsJson}
      `);

    if (
      existingMod.url == data.url &&
      existingMod.file == data.file &&
      existingMod.hash == data.hash
    )
      return int.editReply("🤔 Nothing to change");

    if (!extname(data.file))
      return int.editReply(`${Emojis.MindBlown} File extension required`);
    if (extname(existingMod.file) != extname(data.file))
      return int.editReply(dedent`
        ${Emojis.MindBlown} File extension changed! \
        (\`${extname(existingMod.file)}\` -> \`${extname(data.file)}\`)
      `);

    const { id } = await int.fetchReply();
    await PendingUpdatesDB.update((pending) => {
      pending[id] = { ...data };
    });

    return retMessage(int, data);
  }

  public async updatePack(int: Subcommand.ChatInputCommandInteraction) {
    if (!envParseString("GH_KEY", null))
      return int.reply(`Missing GitHub API Key! ${Emojis.BlameWyvest}`);

    const { guild, channel } = int;
    if (!guild || !channel) return;
    const member = int.guild?.members.resolve(int.user);
    if (!member) return;
    const perms = await checkMember(member);
    if (!perms.all && !Object.keys(perms.packs).length)
      return int.reply({
        flags: MessageFlags.Ephemeral,
        content: dedent`
          ${Emojis.YouWhat} You don't have any pack update perms
          ${mistakeLine} in ${permsJson}
        `,
      });

    if (channel.id != SkyClient.channels.ModUpdating)
      return int.reply({
        flags: MessageFlags.Ephemeral,
        content: `${Emojis.Thinking} This command is only available in <#${SkyClient.channels.ModUpdating}>`,
      });
    const url = int.options.getString("url", true);
    if (!URL.safeParse(url).success)
      return int.reply(`This doesn't look like a URL to me ${Emojis.Thinking}`);

    await int.deferReply();

    const modResp = await fetch(url, {
      headers: { "User-Agent": repoURL },
    });
    if (!modResp.ok) {
      logger.error(
        `${modResp.statusText} while fetching ${url}`,
        await modResp.text(),
      );
      return int.editReply("Failed to fetch pack. Is the URL correct?");
    }
    const modFile = await modResp.arrayBuffer();

    try {
      const modZip = await JSZip.loadAsync(modFile);
      const modInfoFile = modZip.file("pack.mcmeta");
      if (!modInfoFile) throw new Error();
    } catch (e) {
      logger.error("Failed to read ZIP", e);
      return int.editReply("Failed to read ZIP. Is the URL correct?");
    }

    const packId = int.options.getString("pack", true);

    if (!(await hasPermission(member, "update", "pack", packId))) {
      assert(!perms.all);
      return int.editReply(dedent`
        ${Emojis.Thinking} You aren't allowed to update the pack \`${escapeMarkdown(packId)}\`
        You can only update packs with the id of: \
        ${Object.keys(perms.packs).map(inlineCode).join(", ")}
        ${mistakeLine} in ${permsJson}
      `);
    }

    const data: PackUpdate = {
      type: "pack",
      id: packId,
      url,
      file: decodeURIComponent(
        int.options.getString("filename") || basename(url),
      ),
      hash: createHash("md5").update(new Uint8Array(modFile)).digest("hex"),
      sha256: createHash("sha256")
        .update(new Uint8Array(modFile))
        .digest("hex"),
      approvers: [],
    };

    const packs = await getPacks();

    const existingPack = packs.find((pack) => pack.id == packId);
    if (!existingPack)
      return int.editReply(dedent`
        ${Emojis.Thinking} The database doesn't contain a pack with id \`${escapeMarkdown(packId)}\`
        ${mistakeLine} in ${packsJson}
      `);

    if (
      existingPack.url == data.url &&
      existingPack.file == data.file &&
      existingPack.hash == data.hash
    )
      return int.editReply(`${Emojis.Thinking} Nothing to change`);

    if (!extname(data.file))
      return int.editReply(`${Emojis.MindBlown} File extension required`);
    if (extname(existingPack.file) != extname(data.file))
      return int.editReply(dedent`
        ${Emojis.MindBlown} File extension changed! \
        (\`${extname(existingPack.file)}\` -> \`${extname(data.file)}\`)
      `);

    const { id } = await int.fetchReply();
    await PendingUpdatesDB.update((pending) => {
      pending[id] = data;
    });

    return retMessage(int, data);
  }
}

function retMessage(
  int: Subcommand.ChatInputCommandInteraction,
  data: PartialUpdate,
) {
  return int.editReply({
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    components: [
      generateDataComponent(data),
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${Emojis.Eyes} Does this look correct?`,
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel("Continue")
            .setCustomId("updateCheck1"),
        ),
    ],
  });
}
