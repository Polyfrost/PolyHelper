import { ApplyOptions } from "@sapphire/decorators";
import { container, Events, Listener } from "@sapphire/framework";
import { Time } from "@sapphire/time-utilities";
import { envParseString } from "@skyra/env-utilities";
import consola from "consola";
import { Client, type UserResolvable } from "discord.js";
import { format } from "prettier";
import { z } from "zod";
import { Polyfrost, SkyClient } from "../../const.ts";
import { BoostersDB } from "../../lib/db.ts";
import { readGHFile, writeGHFile } from "../../lib/GHAPI.ts";

@ApplyOptions<Listener.Options>({
  name: "boost-maintain",
  once: true,
  event: Events.ClientReady,
})
export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public override async run(client: Client<true>) {
    if (!envParseString("GH_KEY", null)) {
      return consola.error("Missing GitHub API Key!");
    }
    await run(client);
    setInterval(() => void run(client), Time.Minute * 5);
  }
}

const owner = "SkyblockClient";
const repo = "Website";
const path = "docs/assets/tags.json";
const TagName = "Supporter";

const TagsJSON = z.object({
  tags: z.record(
    z.string(),
    z.tuple([z.string(), z.string()]).or(z.tuple([z.string()])),
  ),
  perms: z
    .record(z.string(), z.array(z.string()))
    .and(z.object({ [TagName]: z.array(z.string()) })),
  whitelist: z.boolean(),
  whitelisted: z.array(z.string()),
});

export async function run(client: Client<true>) {
  try {
    const members = client.guilds.cache.get(SkyClient.id)?.members;
    if (!members) return;
    const db = BoostersDB.data;
    const supporters: string[] = [];
    for (const [discordID, mcUUID] of Object.entries(db)) {
      if (await isSupporter(discordID)) supporters.push(mcUUID);
    }
    supporters.sort();

    await updateBoosters(supporters);
  } catch (e) {
    consola.error("Failed to update tags", e);
  }
}

export async function isSupporter(userID: UserResolvable) {
  const { client } = container;

  try {
    const guild = await client.guilds.fetch(SkyClient.id);
    const members = guild?.members;
    const member = await members.fetch(userID);
    if (member && member.premiumSince) return true;
    // deno-lint-ignore no-empty
  } catch {}

  try {
    const guild = await client.guilds.fetch(Polyfrost.id);
    const members = guild?.members;
    const member = await members.fetch(userID);
    if (member && member.roles.cache.has(Polyfrost.roles.Testers)) return true;
    // deno-lint-ignore no-empty
  } catch {}

  return false;
}

async function updateBoosters(supporters: string[]) {
  const oldFile = await readGHFile(owner, repo, path);
  const tags = TagsJSON.parse(JSON.parse(oldFile.content));
  tags.perms[TagName] = supporters;

  const content = await format(JSON.stringify(tags), { parser: "json" });
  await writeGHFile(oldFile, content, "chore: update supporter list");
}
