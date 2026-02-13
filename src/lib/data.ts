import { fetch, FetchResultTypes } from "@sapphire/fetch";
import { z } from "zod";
import { repoFilesURL } from "../const.js";
import { levenshteinDistance } from "@std/text";
import pMemoize, { pMemoizeClear } from "p-memoize";
import ExpiryMap from "expiry-map";
import { Time } from "@sapphire/time-utilities";
import { filterNullish } from "@sapphire/utilities";
import {
  EmbedBuilder,
  hyperlink,
  type InteractionReplyOptions,
} from "discord.js";
import { MessageBuilder } from "@sapphire/discord.js-utilities";
import { getRepoCount } from "./GHAPI.ts";
import consola from "consola";

async function _getTrackedJSON(url: string): Promise<unknown> {
  consola.info("refetching", url);
  try {
    const resp = await fetch(url, FetchResultTypes.Result);
    if (!resp.ok) throw new Error(`http error ${resp.statusText}`);
    return resp.json();
  } catch (e) {
    consola.error(`error while fetching ${url}`, e);
    throw new Error(`error while fetching ${url}`, { cause: e });
  }
}
const getTrackedJSON = pMemoize(_getTrackedJSON, {
  cache: new ExpiryMap(Time.Hour),
});

export async function getTrackedData(url: string): Promise<unknown>;
export async function getTrackedData<T extends z.core.$ZodType>(
  url: string,
  schema: T,
): Promise<z.output<T>>;
export async function getTrackedData(
  url: string,
  schema: z.core.$ZodType = z.unknown(),
): Promise<unknown> {
  const resp = await getTrackedJSON(url);
  return z.parse(schema, resp);
}

export async function getJSON(
  repo: string,
  branch: string,
  path: string,
): Promise<unknown>;
export async function getJSON<T extends z.core.$ZodType>(
  repo: string,
  branch: string,
  path: string,
  schema: T,
): Promise<z.output<T>>;
export async function getJSON(
  repo: string,
  branch: string,
  path: string,
  schema: z.core.$ZodType = z.unknown(),
): Promise<unknown> {
  return await getTrackedData(
    `https://github.com/${repo}/raw/${branch}/${path}`,
    schema,
  );
}

export async function getRepoJSON(filename: string): Promise<unknown>;
export async function getRepoJSON<T extends z.core.$ZodType>(
  filename: string,
  schema: T,
): Promise<z.output<T>>;
export async function getRepoJSON(
  filename: string,
  schema: z.core.$ZodType = z.unknown(),
): Promise<unknown> {
  return await getJSON(
    "SkyblockClient/SkyblockClient-REPO",
    "main",
    `files/${filename}.json`,
    schema,
  );
}

export function invalidateTrackedData() {
  pMemoizeClear(getTrackedJSON);
  pMemoizeClear(getRepoCount);
}

export const DataType = z.enum(["mods", "packs"]);
export type DataType = z.infer<typeof DataType>;

export const Data = z.looseObject({
  id: z.string(),
  nicknames: z.array(z.string()).optional(),
  display: z.string().optional(),
});
export type Data = z.infer<typeof Data>;

// const Action = z.object({
// 	icon: z.string().optional(),
// 	text: z.string().optional(),
// 	link: z.string().optional(),
// 	method: z.enum(['hover']).optional(),
// 	document: z.string().optional()
// });

export const Downloadable = Data.extend({
  display: z.string(),
  // enabled: z.boolean().optional(),
  creator: z.string().optional(),
  description: z.string(),
  icon: z.string().optional(),
  // icon_scaling: z.literal('pixel').optional(),
  // discordcode: z.string().optional(),
  // actions: Action.array().optional(),
  categories: z.array(z.string()).optional(),
  hidden: z.boolean().optional(),

  file: z.string(),
  url: z.string().optional(),
  hash: z.string().optional(),
  sha256: z.string().optional(),
});
export type Downloadable = z.infer<typeof Downloadable>;

export const Mod = Downloadable.extend({
  command: z.string().optional(),
  // warning: z
  // 	.object({
  // 		lines: z.string().array()
  // 	})
  // 	.optional(),
  // update_to_ids: z.string().array().optional(),
  // files: z.string().array().optional(),
  forge_id: z.string().optional(),
  packages: z.array(z.string()).optional(),
}).transform((v) => ({
  ...v,
  download: v.url || `${repoFilesURL}/mods/${v.file}`,
}));
export type Mod = z.output<typeof Mod>;

export const Pack = Downloadable.extend({
  screenshot: z.string().optional(),
}).transform((v) => ({
  ...v,
  download: v.url || `${repoFilesURL}/packs/${v.file}`,
}));
export type Pack = z.output<typeof Pack>;

export const Discord = Data.extend({
  icon: z.string().optional(),
  description: z.string().optional(),
  // partner: z.boolean().optional(),
  // type: DataType.optional(),
  code: z.string(),
  fancyname: z.string().optional(),
  // mods: z.string().array().optional(),
  // packs: z.string().array().optional()
});
export type Discord = z.infer<typeof Discord>;

export const Mods = z.array(Mod);
export const Packs = z.array(Pack);
export const Discords = z.array(Discord);

export const getMods = async () => await getRepoJSON("mods", Mods);
export const getPacks = async () => await getRepoJSON("packs", Packs);
export const getDiscords = async () => await getRepoJSON("discords", Discords);

export const queryData = <T extends Data>(items: T[], query: string) =>
  items.find((opt) => getDistance(opt, query) == 0);

export const probableMatches = <T extends Data>(items: T[], query: string) => {
  return (
    !query
      ? items
      : items.sort((a, b) => getDistance(a, query) - getDistance(b, query))
  ).slice(0, 25);
};

export function getDistance(item: Data, query: string) {
  const distances = [item.id, item.display, ...(item.nicknames || [])]
    .filter(filterNullish)
    .map((name) => name.toLowerCase())
    .map((name) => levenshteinDistance(query.toLowerCase(), name));
  return Math.min(...distances);
}

const isMod = (obj: unknown): obj is Mod => Mod.safeParse(obj).success;
const isPack = (obj: unknown): obj is Pack => Pack.safeParse(obj).success;

export async function getDownloadableMessage(
  downloadable: Mod | Pack,
  bundledIn?: string,
): Promise<InteractionReplyOptions> {
  const message = new MessageBuilder();
  const embed = new EmbedBuilder({
    color: downloadable.hash
      ? Number("0x" + downloadable.hash.slice(0, 6))
      : undefined,
    title: downloadable.display,
    description: downloadable.description,
    footer: { text: `Created by ${downloadable.creator}` },
  });
  if (downloadable.icon)
    embed.setThumbnail(
      `${repoFilesURL}/icons/${encodeURIComponent(downloadable.icon)}`,
    );
  if (isPack(downloadable) && downloadable.screenshot)
    embed.setImage(downloadable.screenshot);
  if (downloadable.hidden)
    embed.addFields({
      name: "Note",
      value:
        "This item is hidden, so it won't show up in the normal installer. " +
        (bundledIn
          ? `You can get it in the bundle ${bundledIn}.`
          : "It might be internal or outdated."),
    });

  const mods = await getMods();
  const downloads: string[] = [
    hyperlink(downloadable.file, downloadable.download),
  ];
  if (isMod(downloadable) && downloadable.packages) {
    for (const pkgName of downloadable.packages) {
      const mod = mods.find((mod) => mod.id == pkgName);
      if (mod) downloads.push(hyperlink(mod.file, mod.download));
      else downloads.push(pkgName);
    }
  }
  embed.addFields({
    name: downloads.length > 1 ? "Downloads" : "Download",
    value: downloads.join("\n"),
    inline: downloads.length == 1,
  });

  if (isMod(downloadable) && downloadable.command)
    embed.addFields({
      name: "Config Command",
      value: downloadable.command,
      inline: true,
    });

  return message.setEmbeds([embed]);
}
