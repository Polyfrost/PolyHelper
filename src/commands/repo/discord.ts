import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { Discord, Discords, getRepoJSON, queryData } from "../../lib/data.js";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  type InteractionReplyOptions,
} from "discord.js";
import { repoFilesURL } from "../../const.js";

@ApplyOptions<Command.Options>({
  description: "Gives the link to a discord",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "discord",
          description: "Discord server to search for",
          required: true,
          autocomplete: true,
        },
      ],
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const query = interaction.options.getString("discord", true);

    const items = await getRepoJSON("discords", Discords);
    const item = queryData(items, query);
    if (!item) return interaction.reply({ content: `No Discord found` });

    return interaction.reply(getDiscordEmbed(item));
  }
}

export function getDiscordEmbed(item: Discord): InteractionReplyOptions {
  const embed = new EmbedBuilder({
    color: 0x8ff03f,
    title: item.fancyname,
  });
  if (item.icon)
    embed.setThumbnail(
      `${repoFilesURL}/discords/${encodeURIComponent(item.icon)}`,
    );
  if (item.description) embed.setDescription(item.description);

  return {
    content: "discord.gg/" + item.code,
    embeds: [embed],
  };
}
