import {
  type ChannelTypes,
  isGuildMember,
  isTextChannel,
} from "@sapphire/discord.js-utilities";
import { Time } from "@sapphire/time-utilities";
import { type FirstArgument, type Nullish, sleep } from "@sapphire/utilities";
import consola from "consola";
import {
  CategoryChannel,
  ChannelType,
  Message,
  roleMention,
  TextChannel,
} from "discord.js";
import pMemoize from "p-memoize";
import { DevServer, Polyfrost, SupportTeams } from "../const.ts";
import { formatChannel } from "./logHelper.ts";

export async function setTicketOpen(
  channel: ChannelTypes,
  open: boolean = true,
) {
  if (open == undefined || open == null) {
    throw new Error(`open undefined WHY IS THIS HAPPENING`);
  }
  const header = `${open ? "Opening" : "Closing"} ${formatChannel(channel)}`;
  if (!isTicket(channel)) {
    consola.warn(header, "Not a ticket");
    return;
  }

  const owner = await getTicketOwner(channel);
  if (owner) {
    consola.info(header, "for", owner);
    await channel.permissionOverwrites.edit(owner, { SendMessages: open });
  } else consola.warn(header, "Failed to find owner");
}

async function _getTicketTop(ticket: ChannelTypes) {
  if (!isTicket(ticket)) return;

  await sleep(Time.Second * 2);
  const msgs = await ticket.messages.fetch({ limit: 3, after: "0" });
  for (const msg of msgs.values()) {
    if (!msg) continue;
    if (!msg.author.bot) continue;
    if (!getMentionInMessage(msg)) continue;
    return msg;
  }
  return;
}
export const getTicketTop = pMemoize(_getTicketTop, {
  cacheKey: ([channel]) => channel.id,
});

const mentionRegex = /<@!?(?<id>\d{17,20})>/;
function getMentionInMessage(msg: Message) {
  const match = msg.content.match(mentionRegex);
  if (match) return match[1];

  for (const embed of msg.embeds) {
    const match = embed.description?.match(mentionRegex);
    if (match) return match[1];
  }
  return;
}

export async function getTicketOwner(ticket: ChannelTypes) {
  if (!isTicket(ticket)) return;

  const pin = await getTicketTop(ticket);
  if (!pin) return;

  return getMentionInMessage(pin);
}

export function isTicket(
  channel: ChannelTypes | Nullish,
): channel is TextChannel {
  if (!isTextChannel(channel)) return false;
  if (channel.name == "ticket-logs" || channel.name == "ticket-transcripts") {
    return false;
  }
  if (channel.name.startsWith("ticket-")) return true;
  if (channel.parentId == Polyfrost.categories.BugReports) return true;
  return false;
}

export function isSupportTeam(member: FirstArgument<typeof isGuildMember>) {
  if (!isGuildMember(member)) return false;
  return (
    member.permissions.has("Administrator") ||
    member.permissions.has("ManageMessages") ||
    member.roles.cache.hasAny(
      Polyfrost.roles.SupportTeam,
      Polyfrost.roles.ModTeam,
      Polyfrost.roles.PolyTeam,
      DevServer.roles.SupportTeam,
    )
  );
}

export const isBumpMessage = (msg: Message) =>
  msg.author.id == msg.client.user.id &&
  msg.embeds.some((embed) => embed.title == "Do you still need help?");

export function isStaffPing(msg: Message) {
  const { guild } = msg;
  if (!guild) return false;
  const support = SupportTeams[guild.id];
  if (!support) return false;
  return (
    msg.author.id == msg.client.user.id &&
    msg.content.startsWith(roleMention(support))
  );
}

export async function findNormalTicketCategory(
  channel: TextChannel,
): Promise<CategoryChannel | undefined> {
  const parentChannelName = channel.parent?.name;
  if (!parentChannelName) return;
  return await channel.guild.channels.fetch().then((channels) =>
    channels
      .filter((channel) => channel?.type === ChannelType.GuildCategory)
      .filter(
        (category) =>
          category.name === parentChannelName.replaceAll("pinned-", ""),
      )
      .first(),
  );
}

export async function findPinnedTicketCategory(
  channel: TextChannel,
): Promise<CategoryChannel | undefined> {
  const parentChannelName = channel.parent?.name;
  if (!parentChannelName) return;
  return await channel.guild.channels.fetch().then((channels) =>
    channels
      .filter((channel) => channel?.type === ChannelType.GuildCategory)
      .filter((category) => category.name === `pinned-${parentChannelName}`)
      .first(),
  );
}

export function isPinned(channel: TextChannel) {
  return channel.parent?.name.startsWith("pinned-") ?? false;
}
