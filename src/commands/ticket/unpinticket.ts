import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import {
  findNormalTicketCategory,
  isPinned,
  isSupportTeam,
  isTicket,
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
    const { channel } = interaction;
    if (!isSupportTeam(interaction.member)) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "❔",
      });
    }
    if (!isTicket(channel)) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Bold of you to assume this is a ticket...",
      });
    }
    if (!isPinned(channel)) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This ticket is not pinned",
      });
    }
    const normalTicketCategory = await findNormalTicketCategory(channel);
    if (!normalTicketCategory) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Could not find the *normal* category for this ticket type...",
      });
    }

    await channel.setParent(normalTicketCategory);

    channel.messages
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
