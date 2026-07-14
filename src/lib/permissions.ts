import { isGuildMember } from "@sapphire/discord.js-utilities";
import type { FirstArgument } from "@sapphire/utilities";
import { Polyfrost } from "../const.ts";

export function isModTeam(member: FirstArgument<typeof isGuildMember>) {
  if (!isGuildMember(member)) return false;
  return (
    member.permissions.has("Administrator") ||
    member.roles.cache.hasAny(Polyfrost.roles.ModTeam)
  );
}
