import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import dedent from "dedent";
import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import {
  getDistance,
  getDownloadableMessage,
  getMods,
  probableMatches,
  queryData,
} from "../../lib/data.ts";
import { isSupportTeam } from "../../lib/ticket.ts";

@ApplyOptions<Command.Options>({
  description: "Gives info about a mod",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "mod",
          description: "Mod to search for",
          required: true,
          autocomplete: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: "instructions",
          description:
            "Additional instructions to post with the mod (Support Team only)",
          required: false,
          choices: [
            { name: "Download Mod", value: "download" },
            { name: "Update Mod", value: "update" },
            { name: "Config Command", value: "config" },
          ],
        },
        {
          type: ApplicationCommandOptionType.User,
          name: "mention",
          description:
            "User to mention when posting the mod (Support Team only)",
          required: false,
        },
        {
          type: ApplicationCommandOptionType.Boolean,
          name: "hidden",
          description: "Shows the information only to you",
          required: false,
        },
      ],
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const query = interaction.options.getString("mod", true);
    const items = await getMods();
    const item = queryData(items, query);
    if (!item) {
      const best = probableMatches(items, query)[0];
      let reply = "Mod not found.";
      if (best && getDistance(best, query) <= 3) {
        reply += `\nDid you mean ${best.display}?`;
      }
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: reply,
      });
    }

    let bundledIn: string | undefined;
    if (item.hidden) {
      bundledIn = items.find((otherItem) =>
        otherItem.packages?.includes(item.id)
      )?.display;
    }

    const ping = interaction.options.getUser("mention", false);
    const pingText = ping?.toString() || "";

    let instText = "";
    switch (interaction.options.getString("instructions", false)) {
      case "download":
        instText =
          `Download ${item.display} below and add it to your \`mods\` folder.`;
        break;
      case "update":
        instText = "\n";
        instText += dedent`
          Please manually update ${item.display}:
          1. Remove the old version of ${item.display} from your \`mods\` folder.
          2. Download ${item.display} below and add it to your \`mods\` folder.
        `;
        break;
      case "config": {
        const { command } = item;
        if (!command) {
          return interaction.reply({
            flags: MessageFlags.Ephemeral,
            content: `${item.display} doesn't have a config command!`,
          });
        }
        instText =
          `You can configure ${item.display} using the command \`${command}\` in-game.`;
      }
    }

    const reply = await getDownloadableMessage(item, bundledIn);
    if (isSupportTeam(interaction.member)) {
      reply.content = `${pingText} ${instText}`;
      reply.allowedMentions = { users: ping ? [ping.id] : [] };
    }
    if (interaction.options.getBoolean("hidden", false)) {
      reply.flags = MessageFlags.Ephemeral;
    }
    return interaction.reply(reply);
  }
}
