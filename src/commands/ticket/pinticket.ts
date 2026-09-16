import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import {
  isSupportTeam,
  getTicketInfo,
  TicketInfoFail,
} from "../../lib/ticket.ts";

export const PINNED_TICKET_MESSAGE =
  "**This ticket has been pinned.**\n*Please* do not close it.";

@ApplyOptions<Command.Options>({
  description: "Pin a ticket",
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
    const { guild } = interaction;
    if (!guild) return;
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

    if (ticketInfo.pinned) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "**This ticket is already pinned.**",
      });
    }

    await ticketInfo.channel.setParent(ticketInfo.categories.pinned);

    return interaction
      .reply(PINNED_TICKET_MESSAGE)
      .then((message) => message.fetch().then((message) => message.pin()));
  }
}
