import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import {
  getTicketInfo,
  isSupportTeam,
  TicketInfoFail,
} from "../../lib/ticket.ts";
import { PINNED_TICKET_MESSAGE } from "./pinticket.ts";

@ApplyOptions<Command.Options>({
  description: "Unpins a ticket",
  requiredClientPermissions: ["ManageChannels"],
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
    if (!isSupportTeam(interaction.member)) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "❔",
      });
    }
    const ticketInfo = await getTicketInfo(interaction.channel);
    if (ticketInfo === TicketInfoFail.NotATicket) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Bold of you to assume this is a ticket...",
      });
    }

    if (ticketInfo === TicketInfoFail.NoParent) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content:
          "Could not find the parent category for this channel. Is this a ticket?",
      });
    }

    if (ticketInfo === TicketInfoFail.CouldNotFindPrimary) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Could not find the primary category. Is this a ticket?",
      });
    }

    if (!ticketInfo.pinned) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This ticket is not pinned...",
      });
    }

    await ticketInfo.channel.setParent(ticketInfo.categories.primary);

    ticketInfo.channel.messages
      .fetchPins()
      .then((messages) => messages.items.map((message) => message.message))
      .then((messages) =>
        messages
          .filter((message) => message.author.id === interaction.client.user.id)
          .filter((message) => message.content === PINNED_TICKET_MESSAGE)
          .forEach((message) => message.unpin()),
      );

    return interaction.reply("Ticket has been unpinned");
  }
}
