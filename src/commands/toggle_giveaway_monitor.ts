import { ApplyOptions } from "@sapphire/decorators";
import { isTextChannel } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import consola from "consola";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { Polyfrost } from "../const.ts";
import { isModTeam } from "../lib/permissions.ts";
import { GiveawayMonitorDB } from "../lib/db.ts";

@ApplyOptions<Command.Options>({
  description: "Set the state of the giveaway monitor",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          type: ApplicationCommandOptionType.Boolean,
          name: "state",
          description: "The state to set",
        },
      ],
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    if (interaction.guildId != Polyfrost.id) return;
    if (!isModTeam(interaction.member)) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "❔",
      });
    }

    const db = GiveawayMonitorDB.data;
    const newState = interaction.options.getBoolean("state") ?? !db.enabled;
    await GiveawayMonitorDB.update((data) => (data.enabled = newState));

    const embed = new EmbedBuilder()
      .setColor(newState ? "Green" : "Red")
      .setTitle("Giveaway Monitor State update")
      .setDescription(
        `Giveaway monitor has been **${newState ? "Enabled" : "Disabled"}**`,
      )
      .setAuthor({
        name: `${interaction.user.displayName} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL(),
      });

    const botLogsChannel = Polyfrost.channels.BotLogs;
    const botLogs = interaction.client.channels.cache.get(botLogsChannel);
    if (!isTextChannel(botLogs)) {
      consola.error("Bot logs channel not found", botLogsChannel);
      return;
    }

    const logEmbed = new EmbedBuilder(embed.data).addFields(
      {
        name: "New State",
        value: newState ? "Enabled" : "Disabled",
        inline: true,
      },
      {
        name: "Old State",
        value: db.enabled ? "Enabled" : "Disabled",
        inline: true,
      },
    );

    await botLogs.send({ embeds: [logEmbed], allowedMentions: { parse: [] } });
    return;
  }
}
