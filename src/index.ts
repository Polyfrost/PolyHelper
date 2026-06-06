import { type ILogger, LogLevel, SapphireClient } from "@sapphire/framework";
import "@sapphire/plugin-editable-commands/register";
import { setup } from "@skyra/env-utilities";
import consola from "consola";
import { GatewayIntentBits, Partials } from "discord.js";

setup();

const consolaLogger: ILogger = {
  has: (level) => level >= LogLevel.Debug,
  trace: (...args: unknown[]) => consola.trace.raw(...args),
  debug: (...args: unknown[]) => consola.debug.raw(...args),
  info: (...args: unknown[]) => consola.info.raw(...args),
  warn: (...args: unknown[]) => consola.warn.raw(...args),
  error: (...args: unknown[]) => consola.error.raw(...args),
  fatal: (...args: unknown[]) => consola.fatal.raw(...args),
  write: (level, ...args: unknown[]) => {
    switch (level) {
      case LogLevel.Trace:
        return consola.trace.raw(...args);
      case LogLevel.Debug:
        return consola.debug.raw(...args);
      case LogLevel.Info:
        return consola.info.raw(...args);
      case LogLevel.Warn:
        return consola.warn.raw(...args);
      case LogLevel.Error:
        return consola.error.raw(...args);
      case LogLevel.Fatal:
        return consola.fatal.raw(...args);
      default:
        return consola.log.raw(...args);
    }
  },
};

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
  logger: { instance: consolaLogger },
  loadMessageCommandListeners: true,
});

consola.info("Connecting...");
await client.login();
consola.success("Connected");

declare module "@skyra/env-utilities" {
  interface Env {
    DB_DIR: string;
    GH_KEY: string;
    SB_KEY: string;
  }
}
