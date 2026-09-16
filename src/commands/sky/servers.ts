import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { dedent } from "es-toolkit";
import { MessageFlags, unorderedList } from "discord.js";

@ApplyOptions<Command.Options>({
  description: "See what servers the bot got into",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const { client } = interaction;
    const guilds = client.guilds.cache;

    const list = guilds.map((guild) => `${guild.name} (${guild.id})`);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: dedent`
        ${guilds.size} servers:
        ${unorderedList(list)}
      `,
    });
  }
}
