import { ApplyOptions } from "@sapphire/decorators";
import { MessageBuilder } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import { Colors, MessageFlags } from "discord.js";
import {
  getTicketOwner,
  isPinned,
  isSupportTeam,
  isTicket,
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
    const { channel } = interaction;
    if (!isSupportTeam(interaction.member)) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "❔",
      });
    }

    if (!isTicket(channel))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Bold of you to assume this is a ticket...",
      });

    if (isPinned(channel))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This ticket is pinned. Please unpin it before bumping",
      });

    const owner = await getTicketOwner(channel);

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
      ],
      allowedMentions: { users: owner ? [owner] : [] },
    });
    if (owner) message.setContent(`Hey <@${owner}>:`);
    return interaction.reply(message);
  }
}
