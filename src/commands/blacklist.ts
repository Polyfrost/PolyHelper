import { ApplyOptions } from "@sapphire/decorators";
import { isGuildMember, isTextChannel } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import consola from "consola";
import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { Polyfrost, SkyClient } from "../const.ts";

@ApplyOptions<Command.Options>({
  description: "Blacklist a user from giveaways",
  requiredUserPermissions: ["ManageRoles"],
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
    const member = interaction.options.getMember("user");
    if (!isGuildMember(member)) return;

    const isSkyClient = interaction.guildId == SkyClient.id;
    const isPolyfrost = interaction.guildId == Polyfrost.id;
    if (!isSkyClient && !isPolyfrost) return;

    const noGiveawaysRole = isSkyClient
      ? SkyClient.roles.NoGiveaways
      : Polyfrost.roles.NoGiveaways;
    const botLogsChannel = isSkyClient
      ? SkyClient.channels.BotLogs
      : Polyfrost.channels.BotLogs;
    const roles = member.roles.cache;

    if (roles.has(noGiveawaysRole))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "User is already blacklisted",
      });
    if (roles.has(SkyClient.roles.CoolPeople))
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "User is too cool 😎",
      });

    try {
      await member.roles.add(noGiveawaysRole);

      const reason =
        interaction.options.getString("reason") || "No reason provided";

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Blocked from Giveaways")
        .setFooter({
          text: `${member.displayName} (${member.id})`,
          iconURL: member.displayAvatarURL(),
        })
        .addFields({ name: "Reason", value: reason });

      const message = `${member.toString()} has been blocked from giveaways`;
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
      consola.error(e);
    }
    return;
  }
}
