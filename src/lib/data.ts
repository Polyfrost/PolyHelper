import { Time } from "@sapphire/time-utilities";
import consola from "consola";
import ExpiryMap from "expiry-map";
import pMemoize, { pMemoizeClear } from "p-memoize";
import { z } from "zod";
import { getRepoCount } from "./GHAPI.ts";
import ky from "ky";

async function _getTrackedJSON(url: string): Promise<unknown> {
  consola.info("refetching", url);
  return await ky(url).json();
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

export function invalidateTrackedData() {
  pMemoizeClear(getTrackedJSON);
  pMemoizeClear(getRepoCount);
}
