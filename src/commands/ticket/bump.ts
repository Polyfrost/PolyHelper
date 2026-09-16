import { ApplyOptions } from "@sapphire/decorators";
import { MessageBuilder } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import { Duration } from "@sapphire/time-utilities";
import { Colors, hyperlink, MessageFlags, time } from "discord.js";
import {
  getTicketInfo,
  getTicketOwner,
  getTicketTop,
  isSupportTeam,
  TicketInfoFail,
} from "../../lib/ticket.ts";

@ApplyOptions<Command.Options>({
  description: "Bumps a ticket to encourage closing",
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

    const { channel, pinned } = ticketInfo;
    if (pinned) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This ticket is pinned. Please unpin it before bumping",
      });
    }

    const pinMsg = await getTicketTop(channel);
    const owner = await getTicketOwner(channel);

    const twoDays = new Duration("2d").fromNow;
    const twoDaysStamp = time(twoDays, "R");

    const pinnedMsg = pinMsg
      ? hyperlink("pinned message", pinMsg.url)
      : "pinned message";
    const message = new MessageBuilder({
      embeds: [
        {
          title: "Do you still need help?",
          color: Colors.Yellow,
          fields: [
            {
              name: "> Yes, I still need help!",
              value:
                "__Restate your problem clearly.__ If someone asked you to upload something, do that.",
            },
            {
              name: "> No, all my problems are solved.",
              value: `__Let us know__ so we can close the ticket.`,
            },
          ],
        },
        {
          description: `If you do not respond ${twoDaysStamp}, your ticket will be closed.`,
          color: Colors.DarkRed,
        },
      ],
      allowedMentions: { users: owner ? [owner] : [] },
    });
    if (owner) message.setContent(`Hey <@${owner}>:`);
    return interaction.reply(message);
  }
}
