import { Time } from "@sapphire/time-utilities";
import ExpiryMap from "expiry-map";
import { z } from "zod";
import ky from "ky";

const api = ky.create({
  baseUrl: "https://api.mclo.gs/1/",
});

export const limits = await api.post("limits").json(z.object({
  storageTime: z.number(),
  maxLength: z.number(),
  maxLines: z.number(),
}));

const APIError = z.object({
  success: z.literal(false),
  error: z.string(),
});
type APIError = z.infer<typeof APIError>;

export const PostLogMetadata = z.object({
  key: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
  ]),
  label: z.string().nullable().default(null),
  visible: z.boolean().default(false),
});
export type PostLogMetadata = z.input<typeof PostLogMetadata>;

// https://github.com/aternosorg/codex/blob/master/src/Log/Level.php
// https://github.com/aternosorg/codex-minecraft/blob/master/src/Parser/ReportLevel.php
enum Level {
  EMERGENCY,
  ALERT,
  CRITICAL,
  ERROR,
  WARNING,
  NOTICE,
  INFO,
  DEBUG,
  TITLE,
  COMMENT,
  STACKTRACE,
}

const EntryLevel = z.enum(Level);
type EntryLevel = z.infer<typeof EntryLevel>;
const EntryLine = z.object({
  number: z.number(),
  content: z.string(),
});
const ParsedEntry = z.object({
  level: EntryLevel,
  time: z.null(),
  prefix: z.string().nullable(),
  lines: z.array(EntryLine),
});
type ParsedEntry = z.infer<typeof ParsedEntry>;

const LogInsights = z.object({
  id: z.string(),
  name: z.string().nullable(),
  type: z.string(),
  version: z.string().nullable(),
  title: z.string(),
  analysis: z.object({
    problems: z.array(
      z.object({
        message: z.string(),
        counter: z.number(),
        entry: ParsedEntry,
        solutions: z.array(z.object({ message: z.string() })),
      }),
    ),
    information: z.array(
      z.object({
        message: z.string(),
        counter: z.number(),
        label: z.string(),
        value: z.string(),
        entry: ParsedEntry,
      }),
    ),
  }),
});
type LogInsights = z.infer<typeof LogInsights>;

export const APILog = z.object({
  success: z.literal(true),
  id: z.string(),
  source: z.string().nullable(),
  created: z.number(),
  expires: z.number(),
  size: z.number(),
  lines: z.number(),
  errors: z.number(),
  url: z.string(),
  raw: z.string(),
  token: z.string().optional(),
  metadata: z.array(PostLogMetadata),
  content: z.object({
    insights: LogInsights.optional(),
    raw: z.string().optional(),
    parsed: z.array(ParsedEntry).optional(),
  }).default({}),
});
export type APILog = z.infer<typeof APILog>;

const LogResults = z.discriminatedUnion("success", [APILog, APIError]);
type LogResults = z.infer<typeof LogResults>;

export type LogType = { id: string };

const logCache = new ExpiryMap<string, APILog>(Time.Hour);

export interface PostLogOptions {
  source?: string;
  metadata?: PostLogMetadata[];
}
export async function postLog(
  content: string,
  opts: PostLogOptions = {},
): Promise<APILog> {
  const res = await api.post(`log`, {
    json: {
      content: content.substring(0, limits.maxLength),
      ...opts,
    },
  }).json(LogResults);
  if (!res.success) throw new Error(res.error);

  logCache.set(res.id, res);
  return res;
}

const getMCLogID = (log: string | LogType) =>
  encodeURIComponent(
    typeof log == "string" ? log.split("/").pop() || "" : log.id,
  );

type GetLogResult<
  R extends boolean,
  P extends boolean,
  I extends boolean,
> = APILog & {
  content: {
    insights: I extends true ? LogInsights : LogInsights | undefined;
    raw: R extends true ? string : string | undefined;
    parsed: P extends true ? ParsedEntry[] : ParsedEntry[] | undefined;
  };
};

export async function getLog<
  R extends boolean = false,
  P extends boolean = false,
  I extends boolean = false,
>(
  logID: string | LogType,
  opts: {
    raw?: R;
    parsed?: P;
    insights?: I;
  } = {},
): Promise<GetLogResult<R, P, I>> {
  const id = getMCLogID(logID);
  let cached = logCache.get(id);
  if (cached) {
    if (
      (!opts.raw || cached.content.raw) &&
      (!opts.parsed || cached.content.parsed) &&
      (!opts.insights || cached.content.insights)
    ) {
      return cached as GetLogResult<R, P, I>;
    }
  }

  const res = await api.get(`log/${id}`, {
    searchParams: opts as Record<string, boolean>,
  }).json(LogResults);
  if (!res.success) throw new Error(res.error);

  // In case of race condition
  cached = logCache.get(id);
  if (cached) {
    res.token ||= cached.token;
    res.content.raw ||= cached.content.raw;
    res.content.insights ||= cached.content.insights;
    res.content.parsed ||= cached.content.parsed;
  }

  logCache.set(id, res);
  return res as GetLogResult<R, P, I>;
}

export async function getRawLog(logID: string | LogType): Promise<string> {
  return (await getLog(logID, { raw: true })).content.raw;
}

export async function getLogInsights(logID: string | LogType) {
  return (await getLog(logID, { raw: true })).content.insights;
}
