import { ApplyOptions } from "@sapphire/decorators";
import { isGuildMember, isTextChannel } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import logger from "../lib/logger.ts";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { Polyfrost, SkyClient } from "../const.ts";
import { isSupportTeam } from "../lib/ticket.ts";
import type { FirstArgument } from "@sapphire/utilities";

@ApplyOptions<Command.Options>({
  description: "Blacklist a user from counting",
  requiredClientPermissions: ["ManageRoles"],
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          type: ApplicationCommandOptionType.User,
          name: "user",
          description: "User to blacklist",
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: "reason",
          description: "Reason to log",
        },
        {
          type: ApplicationCommandOptionType.Boolean,
          name: "silent",
          description: "Silent",
        },
      ],
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    if (!isModTeam(interaction.member))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "❔",
      });
    const member = interaction.options.getMember("user");
    if (!isGuildMember(member)) return;

    const isPolyfrost = interaction.guildId == Polyfrost.id;
    if (!isPolyfrost)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This command is only available in the Polyfrost server.",
      });

    const noCountingRole = Polyfrost.roles.NoCounting;
    const botLogsChannel = Polyfrost.channels.BotLogs;
    const roles = member.roles.cache;

    if (roles.has(noCountingRole))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "User is already Counting blacklisted",
      });

    try {
      await member.roles.add(noCountingRole);

      const reason =
        interaction.options.getString("reason") || "No reason provided";

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Blocked from Counting")
        .setFooter({
          text: `${member.displayName} (${member.id})`,
          iconURL: member.displayAvatarURL(),
        })
        .addFields({ name: "Reason", value: reason });

      const message = `${member.toString()} has been blocked from counting`;
      await interaction.reply({
        flags: interaction.options.getBoolean("silent")
          ? MessageFlags.Ephemeral
          : undefined,
        content: message,
        embeds: [embed],
        allowedMentions: { users: [member.id] },
      });

      const botLogs = interaction.client.channels.cache.get(botLogsChannel);
      if (!isTextChannel(botLogs)) return;

      embed.setAuthor({
        name: `${interaction.user.displayName} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL(),
      });
      await botLogs.send({
        content: message,
        embeds: [embed],
        allowedMentions: { parse: [] },
      });
    } catch (e) {
      logger.error(e);
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Failed to blacklist user from counting. Please try again.",
      });
    }

  }
}

export function isModTeam(member: FirstArgument<typeof isGuildMember>) {
  if (!isGuildMember(member)) return false;
  return (
    member.permissions.has("Administrator") ||
    member.roles.cache.hasAny(
      SkyClient.roles.ModTeam,
      Polyfrost.roles.ModTeam,
    )
  );
}
