import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import {
  findPinnedTicketCategory,
  isPinned,
  isSupportTeam,
  isTicket,
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
    const { channel, guild } = interaction;
    if (!guild) return;
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

    const pinned = isPinned(channel);
    if (pinned) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "**This ticket is already pinned.**",
      });
    }

    const doNotCloseCategory = await findPinnedTicketCategory(channel);
    if (!doNotCloseCategory) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Could not find the pinned category for this ticket type...",
      });
    }

    await channel.setParent(doNotCloseCategory);

    return interaction
      .reply(PINNED_TICKET_MESSAGE)
      .then((message) => message.fetch().then((message) => message.pin()));
  }
}
