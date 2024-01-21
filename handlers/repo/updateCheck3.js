import { InteractionType } from "discord.js";
import fs from "fs/promises";
import { add, clone, commit, push } from "isomorphic-git";
import { randomUUID } from "crypto";
import http from "isomorphic-git/http/node/index.js";
import { checkMember, pendingUpdates } from "./_update.js";
import { format } from "prettier";

/**
 * @param {import("discord.js").MessageComponentInteraction} interaction
 */
export const command = async (interaction) => {
  const data = pendingUpdates[interaction.message.id];
  if (!data) {
    await interaction.reply({
      content: "no update found",
      ephemeral: true,
    });
    return;
  }
  if (data.initiator == interaction.user.id && process.env.USER != "kendell") {
    await interaction.reply({
      content: "you need someone else to approve this update",
      ephemeral: true,
    });
    return;
  }

  // @ts-ignore
  const perms = await checkMember(interaction.member);
  const approved = perms.all ? true : perms.some?.includes(data.forge_id);
  if (!approved) {
    await interaction.reply({
      content: "you can't approve this update",
      ephemeral: true,
    });
    return;
  }

  await interaction.update({
    content: data.url.startsWith("https://cdn.discordapp.com/")
      ? `hold on, we're downloading some stuff`
      : `hold on, we're downloading the repo`,
    components: [],
  });

  const tmp = `/tmp/${randomUUID()}`;
  await fs.mkdir(tmp);

  let tasks = [];
  tasks.push(
    clone({
      fs,
      http,
      url: `https://github.com/${
        process.env.USER == "kendell" ? "KTibow" : "SkyblockClient"
      }/SkyblockClient-REPO`,
      dir: tmp,
      depth: 1,
      singleBranch: true,
    })
  );
  if (data.url.startsWith("https://cdn.discordapp.com/")) {
    let modData;
    tasks.push(
      (async () => {
        const modResp = await fetch(data.url, {
          headers: {
            "User-Agent": "github.com/SkyblockClient/SkyAnswers",
          },
        });
        if (!modResp.ok) {
          throw new Error(`${modResp.statusText} while fetching ${data.url}`);
        }
        modData = await modResp.arrayBuffer();
      })()
    );
    await Promise.all(tasks);

    await fs.writeFile(`${tmp}/files/mods/${data.file}`, Buffer.from(modData));
    data.url = `https://raw.githubusercontent.com/KTibow/SkyblockClient-REPO/main/files/mods/${data.file}`;
  } else {
    await Promise.all(tasks);
  }

  await interaction.message.edit({
    content: `pushing it out...`,
  });
  const modsFile = await fs.readFile(
    data.type == "beta"
      ? `${tmp}/files/mods_beta.json`
      : `${tmp}/files/mods.json`
  );
  const mods = JSON.parse(modsFile.toString());
  const mod = mods.find((m) => m.forge_id == data.forge_id);
  mod.url = data.url;
  mod.file = data.file;
  mod.hash = data.hash;

  await fs.writeFile(
    data.type == "beta"
      ? `${tmp}/files/mods_beta.json`
      : `${tmp}/files/mods.json`,
    await format(JSON.stringify(mods), { parser: "json", tabWidth: 4 })
  );
  await add({
    fs,
    dir: tmp,
    filepath: ".",
  });
  await commit({
    fs,
    dir: tmp,
    author: {
      name: "SkyClient-repo-bot",
      email: "SkyClient-repo-bot@users.noreply.github.com",
    },
    message: `Update ${data.forge_id} to ${data.file}`,
  });
  await push({
    fs,
    http,
    dir: tmp,
    onAuth: () => ({ username: process.env.GH_KEY }),
  });
  await interaction.message.edit({
    content: `✅ pushed it out`,
    components: [],
  });
};
export const when = {
  interactionId: "updateCheck3",
  interactionType: InteractionType.MessageComponent,
};
