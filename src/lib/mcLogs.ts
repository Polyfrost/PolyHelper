import { FetchResultTypes, fetch } from "@sapphire/fetch";
import { Time } from "@sapphire/time-utilities";
import ExpiryMap from "expiry-map";
import pMemoize from "p-memoize";
import { z } from "zod";

const baseURL = "https://api.mclo.gs/1";
export const maxSize = 10_485_760;

const APIError = z.object({
  success: z.literal(false),
  error: z.string(),
});
type APIError = z.infer<typeof APIError>;

const PostLog = z.object({
  success: z.literal(true),
  id: z.string(),
});
type PostLog = z.infer<typeof PostLog>;

const PostLogRes = z.discriminatedUnion("success", [PostLog, APIError]);
type PostLogRes = z.infer<typeof PostLogRes>;

type LogType = { id: string };

export class Log {
  readonly id: string;
  constructor(id: string | LogType) {
    this.id = getMCLogID(id);
  }

  get url() {
    return `https://mclo.gs/${this.id}`;
  }

  get raw() {
    return `${baseURL}/raw/${this.id}`;
  }

  getRaw() {
    return getRawLog(this.id);
  }
  getInsights() {
    return getLogInsights(this.id);
  }
}

export async function postLog(text: string): Promise<Log> {
  const params = new URLSearchParams({ content: text.substring(0, maxSize) });
  const data = await fetch(`${baseURL}/log`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const res = PostLogRes.parse(data);
  if (!res.success) throw new Error(res.error);
  return new Log(res);
}

const getMCLogID = (log: string | LogType) =>
  encodeURIComponent(
    typeof log == "string" ? log.split("/").pop() || "" : log.id,
  );

async function _getRawLog(log: string | LogType): Promise<string> {
  const id = getMCLogID(log);
  return fetch(`${baseURL}/raw/${id}`, FetchResultTypes.Text);
}
export const getRawLog = pMemoize(_getRawLog, {
  cacheKey: ([log]) => getMCLogID(log),
  cache: new ExpiryMap(Time.Hour),
});

enum Level {
  EMERGENCY,
  ALERT,
  CRITICAL,
  ERROR,
  WARNING,
  NOTICE,
  INFO,
  DEBUG,
}

const EntryLevel = z.enum(Level);
type EntryLevel = z.infer<typeof EntryLevel>;
const EntryLine = z.object({
  number: z.number(),
  content: z.string(),
});
const AnalysisEntry = z.object({
  level: EntryLevel,
  time: z.null(),
  prefix: z.string(),
  lines: z.array(EntryLine),
});

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
        entry: AnalysisEntry,
        solutions: z.array(z.object({ message: z.string() })),
      }),
    ),
    information: z.array(
      z.object({
        message: z.string(),
        counter: z.number(),
        label: z.string(),
        value: z.string(),
        entry: AnalysisEntry,
      }),
    ),
  }),
});
type LogInsights = z.infer<typeof LogInsights>;

async function _getLogInsights(log: string | LogType) {
  const id = getMCLogID(log);
  const data = await fetch(`${baseURL}/insights/${id}`);
  return LogInsights.parse(data);
}
export const getLogInsights = pMemoize(_getLogInsights, {
  cacheKey: ([log]) => getMCLogID(log),
  cache: new ExpiryMap(Time.Hour),
});
