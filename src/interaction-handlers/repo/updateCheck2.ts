import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import consola from "consola";
import {
  BaseInteraction,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  unorderedList,
  userMention,
  type APIMessageTopLevelComponent,
  type ButtonInteraction,
  type JSONEncodable,
  type MessageEditOptions,
} from "discord.js";
import { format } from "prettier";
import { hasPermission } from "../../lib/update.js";
import { notSkyClient } from "../../preconditions/notPublic.js";
import {
  Mod,
  Mods,
  Pack,
  Packs,
  invalidateTrackedData,
} from "../../lib/data.js";
import {
  PendingUpdatesDB,
  type ModUpdate,
  type PackUpdate,
  type PartialUpdate,
} from "../../lib/db.js";
import { envParseString } from "@skyra/env-utilities";
import {
  commitFiles,
  readGHContent,
  type FileToCommit,
} from "../../lib/GHAPI.ts";
import dedent from "dedent";
import { assert } from "@std/assert";
import { repoURL } from "../../const.ts";

const owner = "SkyBlockClient";
const repo = "SkyblockClient-REPO";
const branch = "main";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    assert(envParseString("GH_KEY", null), `Missing GitHub API Key`);

    if (notSkyClient(interaction.guildId)) return;
    const { channel, message } = interaction;
    const member = interaction.guild?.members.resolve(interaction.user);
    const data = PendingUpdatesDB.data[message.id];
    assert(member && data);

    if (!(await hasPermission(member, "approve", data.type, data.id)))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "You can't approve this update",
      });

    if (data.approvers.some(({ id }) => id == interaction.user.id))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "You already approved this update",
      });

    const approver = { name: member.user.tag, id: member.user.id };
    await PendingUpdatesDB.update((data) => {
      const update = data[message.id];
      assert(update);
      update.approvers.push(approver);
    });

    await interaction.update(generateMessage(interaction, data));
    if (!isUpdateApproved(data)) return;

    if (data.pingMsg) {
      const msg = await channel?.messages.fetch(data.pingMsg);
      if (msg) await msg.delete();
    }

    const changes: FileToCommit[] = [];

    if (data.url.startsWith("https://cdn.discordapp.com/")) {
      await message.edit(
        generateMessage(
          interaction,
          data,
          new TextDisplayBuilder().setContent("Downloading the file..."),
        ),
      );

      let fileData: ArrayBuffer;
      try {
        const fileResp = await fetch(data.url, {
          headers: { "User-Agent": repoURL },
        });
        if (!fileResp.ok)
          throw new Error(`${fileResp.statusText} while fetching ${data.url}`);
        fileData = await fileResp.arrayBuffer();
      } catch (e) {
        consola.error("Failed to download file", e);
        await message.edit(
          errorMessage(
            data,
            new TextDisplayBuilder().setContent("❌ Failed to download file"),
          ),
        );
        throw e;
      }
      // if (!modData) throw new Error("this shouldn't happen");

      const path = `files/${data.type}s/${data.file}`;
      changes.push({ path, content: fileData });
      data.url = `https://github.com/SkyblockClient/SkyblockClient-REPO/raw/main/${path}`;
    }

    await message.edit(
      generateMessage(
        interaction,
        data,
        new TextDisplayBuilder().setContent("Sending to GitHub..."),
      ),
    );

    const itemName =
      data.type == "mod"
        ? await updateMod(data, changes)
        : await updatePack(data, changes);
    const displayName = `${itemName} (\`${data.id}\`)`;

    try {
      await commitFiles(
        owner,
        repo,
        branch,
        dedent`
          Update ${data.type} ${displayName}
          Approved by:
          ${unorderedList(data.approvers.map(({ name, id }) => `${name} (${id})`))}
        `,
        changes,
      );

      await PendingUpdatesDB.update((data) => {
        delete data[message.id];
      });
      invalidateTrackedData();

      return await message.edit(
        generateMessage(
          interaction,
          data,
          new TextDisplayBuilder().setContent("✅ Pushed it out"),
        ),
      );
    } catch (e) {
      consola.error("Failed to update", data, e);
      return await message.edit(
        errorMessage(
          data,
          new TextDisplayBuilder().setContent("❌ Failed to push it out"),
        ),
      );
    }
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== "updateCheck2") return this.none();
    return this.some();
  }
}

async function updateMod(data: ModUpdate, changes: FileToCommit[]) {
  let mods = JSON.parse(
    await readGHContent(owner, repo, "files/mods.json"),
  ) as Mod[];
  if (!isModList(mods)) throw new Error("failed to parse mods.json");

  let retName = "";
  mods = mods.map((mod) => {
    if (mod.forge_id != data.id) return mod;
    mod.url = data.url;
    mod.file = data.file;
    mod.hash = data.hash;
    mod.sha256 = data.sha256;
    retName = retName || mod.display;
    return mod;
  });
  assert(retName, "mod not found");

  if (data.beta) {
    const betaMods = JSON.parse(
      await readGHContent(owner, repo, "files/mods_beta.json"),
    ) as Mod[];
    assert(isModList(betaMods), "failed to parse mods_beta.json");

    const updated = mods.filter((mod) => mod.forge_id == data.id);
    for (const mod of updated) {
      const index = betaMods.findIndex((m) => m.id == mod.id);
      if (index == -1) betaMods.push(mod);
      else betaMods[index] = mod;
    }

    changes.push({
      path: "files/mods_beta.json",
      content: await format(JSON.stringify(betaMods), {
        parser: "json",
        tabWidth: 4,
      }),
    });
  } else
    changes.push({
      path: "files/mods.json",
      content: await format(JSON.stringify(mods), {
        parser: "json",
        tabWidth: 4,
      }),
    });

  return retName;
}

async function updatePack(data: PackUpdate, changes: FileToCommit[]) {
  let packs = JSON.parse(
    await readGHContent(owner, repo, "files/packs.json"),
  ) as Pack[];
  assert(isPackList(packs), "failed to parse packs.json");

  let retName = "";
  packs = packs.map((pack) => {
    if (pack.id != data.id) return pack;
    pack.url = data.url;
    pack.file = data.file;
    pack.hash = data.hash;
    pack.sha256 = data.sha256;
    retName = retName || pack.display;
    return pack;
  });
  assert(retName, "pack not found");

  changes.push({
    path: "files/packs.json",
    content: await format(JSON.stringify(packs), {
      parser: "json",
      tabWidth: 4,
    }),
  });

  return retName;
}

function isModList(obj: unknown): obj is Mod[] {
  return Mods.safeParse(obj).success;
}
function isPackList(obj: unknown): obj is Pack[] {
  return Packs.safeParse(obj).success;
}

function isUpdateApproved(data: PartialUpdate) {
  return data.approvers.length >= 3;
}

export function generateDataComponent(data: PartialUpdate) {
  return new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(dedent`
      id: ${data.id}
      url: ${data.url}
      file: ${data.file}
      md5: ${data.hash}
      sha256: ${data.sha256}
    `),
  );
}

export function generateApproversComponent(data: PartialUpdate) {
  const { approvers } = data;

  const container = new ContainerBuilder();
  if (isUpdateApproved(data))
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent("## Approvers"),
    );
  else
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("## Approvers"),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Success)
            .setLabel("Approve")
            .setCustomId("updateCheck2"),
        ),
    );
  container
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        approvers.length > 0
          ? unorderedList(approvers.map(({ id }) => userMention(id)))
          : "*(None yet)*",
      ),
    );
  return container;
}

function errorMessage(
  data: PartialUpdate,
  ...additionalComponents: JSONEncodable<APIMessageTopLevelComponent>[]
): MessageEditOptions {
  return {
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
    components: [
      generateDataComponent(data).setAccentColor(Colors.Red),
      ...additionalComponents,
    ],
  };
}

export function generateMessage(
  int: BaseInteraction,
  data: PartialUpdate,
  ...additionalComponents: JSONEncodable<APIMessageTopLevelComponent>[]
): MessageEditOptions {
  const { approvers } = data;
  const approved = isUpdateApproved(data);
  const approvedOwn =
    approved || approvers.map(({ id }) => id).includes(int.user.id);
  const ratURL = `https://ktibow.github.io/RatRater2/?rat-to-peer-url=${encodeURIComponent(
    data.url,
  )}`;

  const components: JSONEncodable<APIMessageTopLevelComponent>[] = [];
  if (!approved) {
    components.push(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "Double-check that this mod doesn't have a rat in it before approving!",
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setEmoji("🐀")
            .setLabel("RatRater")
            .setURL(ratURL),
        ),
      new TextDisplayBuilder().setContent(
        "**(rat-to-peer may take a bit to boot up but it'll load within 15 seconds)**",
      ),
    );
    if (!approvedOwn)
      components.push(
        new TextDisplayBuilder().setContent(
          `${int.user.toString()} don't forget to approve your own update`,
        ),
      );
  }
  return {
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [], users: approvedOwn ? [] : [int.user.id] },
    components: [
      generateDataComponent(data),
      generateApproversComponent(data),
      ...components,
      ...additionalComponents,
    ],
  };
}
