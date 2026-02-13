import {
  EmbedBuilder,
  Message,
  escapeMarkdown,
  unorderedList,
} from "discord.js";
import { Polyfrost, SkyClient } from "../../const.js";
import { Events, Listener } from "@sapphire/framework";
import consola from "consola";
import { ApplyOptions } from "@sapphire/decorators";
import {
  isGuildBasedChannel,
  isTextChannel,
} from "@sapphire/discord.js-utilities";
import { isTicket } from "../../lib/ticket.js";

const streaks: Record<string, string[]> = {};
const ignoredChannels = [
  // Polyfrost
  "1053827347469570158", // #bot-land
  "1057847561597239336", // #counting
  Polyfrost.channels.TestingChat,

  // SkyClient
  SkyClient.channels.BotCommands,
  "1135190905373081650", // #the-void
  SkyClient.channels.Trolling,
];

/** Flags users who are spamming for giveaways */
@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
})
export class MessageListener extends Listener<typeof Events.MessageCreate> {
  public override async run(message: Message) {
    const { author, guild, content, channel, client } = message;
    if (author.bot || !guild) return;
    const member = guild.members.cache.get(author.id);
    if (!member) return;

    const isSkyClient = guild.id == SkyClient.id;
    const isPolyfrost = guild.id == Polyfrost.id;

    if (!isSkyClient && !isPolyfrost) return;
    if (!isGuildBasedChannel(channel)) return;
    if (isTicket(channel)) return;

    const noGiveawaysRole = isSkyClient
      ? SkyClient.roles.NoGiveaways
      : Polyfrost.roles.NoGiveaways;
    const botLogsChannel = isSkyClient
      ? SkyClient.channels.BotLogs
      : Polyfrost.channels.BotLogs;
    const roles = member.roles.cache;

    if (ignoredChannels.includes(channel.id)) return;
    if (roles.has(SkyClient.roles.CoolPeople)) return;
    if (roles.has(SkyClient.roles.GiveawayBypass)) return;
    if (roles.has(noGiveawaysRole)) return; // already has no giveaways

    let streak = streaks[author.id];
    if (!streak) {
      streak = [];
      streaks[author.id] = streak;
    }

    const words = content.match(/[\w'`´]+/g);
    const isShort = !words || words.length < 3;
    if (!content) return;
    if (isShort) streak.push(content);
    else streak.length = 0;

    if (streak.length != 6) return;

    try {
      await member.roles.add(noGiveawaysRole);
      delete streaks[author.id];

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Blocked from Giveaways")
        .setFooter({
          text: `${member.displayName} (${member.id})`,
          iconURL: member.displayAvatarURL(),
        })
        .addFields({
          name: "Reason",
          value: "6 low effort messages in a row",
        });

      const message = `${member.toString()} has been blocked from giveaways`;
      await channel.send({
        content: message,
        embeds: [embed],
        allowedMentions: { users: [member.id] },
      });

      const botLogs = client.channels.cache.get(botLogsChannel);
      if (!isTextChannel(botLogs)) return;

      embed.addFields({
        name: "Messages",
        value: unorderedList(
          streak.map((v) => escapeMarkdown(v) || "*(No text)*"),
        ),
      });
      await botLogs.send({
        content: message,
        embeds: [embed],
        allowedMentions: { parse: [] },
      });
    } catch (e) {
      consola.error(e);
    }
  }
}
