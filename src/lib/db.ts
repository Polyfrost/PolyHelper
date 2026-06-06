import * as fs from "node:fs/promises";
import { join } from "node:path";
import { envParseString } from "@skyra/env-utilities";
import { type Snowflake } from "discord.js";
import { JSONFilePreset } from "lowdb/node";

const baseDir = envParseString("DB_DIR", "db");

try {
  await fs.mkdir(baseDir);
} catch {
  // Directory already exists
}

type BoostersDB = Record<Snowflake, string>;
export const BoostersDB = await JSONFilePreset<BoostersDB>(
  join(baseDir, "boosters.json"),
  {},
);

export type Approver = {
  name: string;
  id: Snowflake;
};
export type PartialUpdate = {
  id: string;
  url: string;
  hash: string;
  sha256: string;
  file: string;
  pingMsg?: string;
  approvers: Approver[];
};
export type ModUpdate = PartialUpdate & {
  type: "mod";
  beta: boolean;
};
export type PackUpdate = PartialUpdate & { type: "pack" };

export type PendingUpdate = ModUpdate | PackUpdate;
type PendingUpdatesDB = Record<string, PendingUpdate>;
export const PendingUpdatesDB = await JSONFilePreset<PendingUpdatesDB>(
  join(baseDir, "pendingUpdates.json"),
  {},
);
