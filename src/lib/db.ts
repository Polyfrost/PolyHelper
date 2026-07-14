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
