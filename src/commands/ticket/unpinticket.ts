import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import {
  isTicket,
  isSupportTeam,
  findDoNotCloseChannel,
} from "../../lib/ticket.js";

@ApplyOptions<Command.Options>({
  description: "Unpins a ticket",
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
    const { channel, guild } = interaction;
    if (!guild || isSupportTeam(interaction.member))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "❔",
      });
    if (!isTicket(channel))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Bold of you to assume this is a ticket...",
      });
    const doNotCloseChannel = await findDoNotCloseChannel(guild, channel);
    if (!doNotCloseChannel)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Could not find the do-not-close channel...",
      });

    await channel.setPosition(doNotCloseChannel.position + 0.5);
    return interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Channel has been unpinned",
    });
  }
}
