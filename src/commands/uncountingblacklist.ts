import { ApplyOptions } from "@sapphire/decorators";
import { isGuildMember, isTextChannel } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import consola from "consola";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { Polyfrost } from "../const.ts";
import { isModTeam } from "../lib/permissions.ts";

@ApplyOptions<Command.Options>({
  description: "Unblacklist a user from counting",
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
          description: "User to unblacklist",
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
    if (!isGuildMember(member))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "User not found",
      });

    const isPolyfrost = interaction.guildId == Polyfrost.id;
    if (!isPolyfrost)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This command is only available in the Polyfrost server.",
      });

    const noCountingRole = Polyfrost.roles.NoCounting;
    const botLogsChannel = Polyfrost.channels.BotLogs;
    const roles = member.roles.cache;

    if (!roles.has(noCountingRole))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "User is Not Counting blacklisted",
      });

    const reason =
      interaction.options.getString("reason") || "No reason provided";
    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("Unblocked from Counting")
      .setFooter({
        text: `${member.displayName} (${member.id})`,
        iconURL: member.displayAvatarURL(),
      })
      .addFields({ name: "Reason", value: reason });
    const message = `${member.toString()} has been unblocked from counting`;

    try {
      await member.roles.add(noCountingRole);
    } catch (e) {
      consola.error("Failed to unblacklist user from counting", member, e);
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Failed to unblacklist user from counting",
      });
    }

    await interaction.reply({
      flags: interaction.options.getBoolean("silent")
        ? MessageFlags.Ephemeral
        : undefined,
      content: message,
      embeds: [embed],
      allowedMentions: { users: [member.id] },
    });

    const botLogs = interaction.client.channels.cache.get(botLogsChannel);
    if (!isTextChannel(botLogs)) {
      consola.error("Bot logs channel not found", botLogsChannel);
      return;
    }

    const logEmbed = new EmbedBuilder(embed.data).setAuthor({
      name: `${interaction.user.displayName} (${interaction.user.id})`,
      iconURL: interaction.user.displayAvatarURL(),
    });
    await botLogs.send({
      content: message,
      embeds: [logEmbed],
      allowedMentions: { parse: [] },
    });
    return;
  }
}
