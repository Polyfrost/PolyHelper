import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import {
  isTicket,
  isSupportTeam,
  findDoNotCloseChannel,
  isPinned,
} from "../../lib/ticket.js";
import { PINNED_TICKET_MESSAGE } from "./pinticket.ts";

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
    if (!(await isPinned(channel)))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This ticket is not pinned",
      });
    const doNotCloseChannel = await findDoNotCloseChannel(channel);
    if (!doNotCloseChannel)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Could not find the do-not-close channel...",
      });

    await channel.setPosition(doNotCloseChannel.position + 0.5);

    channel.messages
      .fetchPins()
      .then((messages) => messages.items.map((message) => message.message))
      .then((messages) =>
        messages
          .filter((message) => message.author.id === interaction.client.user.id)
          .filter((message) => message.content === PINNED_TICKET_MESSAGE)
          .forEach((message) => message.unpin()),
      );

    return interaction.reply({
      content: "Ticket has been unpinned",
    });
  }
}
