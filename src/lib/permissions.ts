import { isGuildMember } from "@sapphire/discord.js-utilities";
import type { FirstArgument } from "@sapphire/utilities";
import { SkyClient, Polyfrost } from "../const.ts";

export function isModTeam(member: FirstArgument<typeof isGuildMember>) {
  if (!isGuildMember(member)) return false;
  return (
    member.permissions.has("Administrator") ||
    member.roles.cache.hasAny(SkyClient.roles.ModTeam, Polyfrost.roles.ModTeam)
  );
}
