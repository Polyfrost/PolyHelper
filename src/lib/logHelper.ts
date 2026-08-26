import { type ChannelTypes, isDMChannel } from "@sapphire/discord.js-utilities";
import { GuildMember, User } from "discord.js";

export function formatChannel(channel: ChannelTypes): string {
  const name = isDMChannel(channel) ? "DM" : `#${channel.name}`;
  return `${name} (${channel.id})`;
}

export function formatUser(user: User): string;
export function formatUser(member: GuildMember): string;
export function formatUser(userOrMember: User | GuildMember): string {
  const user: User =
    userOrMember instanceof GuildMember ? userOrMember.user : userOrMember;
  return `${user.tag} (${user.id})`;
}
