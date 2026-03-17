import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { Colors, hyperlink, MessageFlags, time } from "discord.js";
import {
  getTicketTop,
  getTicketOwner,
  isTicket,
  isSupportTeam,
  isPinned,
} from "../../lib/ticket.js";
import { MessageBuilder } from "@sapphire/discord.js-utilities";
import { Duration } from "@sapphire/time-utilities";

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
    if (await isPinned(guild, channel))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This ticket is pinned. Please unpin it before bumping",
      });

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
              value: `__Close the ticket.__ View the ${pinnedMsg}, click the 🔒 button, and follow the bot's instructions.`,
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
