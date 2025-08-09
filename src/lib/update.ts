import { GuildMember } from "discord.js";
import { getRepoJSON } from "./data.js";
import { z } from "zod";
import { SkyClient, isDevUser, Users } from "../const.js";

const Permission = z.enum(["update", "approve"]);
type Permission = z.infer<typeof Permission>;

const UpdatePerm = z.object({
  github: z.string(),
  mods: z.record(z.string(), Permission).optional(),
  packs: z.record(z.string(), Permission).optional(),
});
const UpdatePerms = z.record(z.string(), UpdatePerm);

export const getUpdatePerms = async () =>
  await getRepoJSON("update_perms", UpdatePerms);

export async function checkMember(member: GuildMember): Promise<
  | { all: true }
  | {
      all: false;
      mods: Record<string, Permission>;
      packs: Record<string, Permission>;
    }
> {
  if (member.roles.cache.has(SkyClient.roles.GitHubKeeper))
    return { all: true };
  if (isDevUser && member.id == Users.BotDev) return { all: true };

  const owners = await getUpdatePerms();
  const data = owners[member.id];
  return {
    all: false,
    mods: data?.mods || {},
    packs: data?.packs || {},
  };
}

export async function hasPermission(
  member: GuildMember,
  requires: Permission,
  type: "mod" | "pack",
  id: string,
): Promise<boolean> {
  const perms = await checkMember(member);
  if (perms.all) return true;

  const perms2 = perms[`${type}s`];
  const perm = perms2[id];

  if (perm == "update") return true;
  if (perm == "approve") return requires == "approve";
  return false;
}
