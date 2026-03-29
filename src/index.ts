import { SapphireClient, LogLevel, type ILogger } from "@sapphire/framework";
import { GatewayIntentBits, Partials } from "discord.js";
import "@sapphire/plugin-editable-commands/register";
import { setup } from "@skyra/env-utilities";
import consola from "consola";

setup();

const consolaLogger: ILogger = {
  has: (level) => level >= LogLevel.Debug,
  trace: (...args: any[]) => consola.trace.raw(...args),
  debug: (...args: any[]) => consola.debug.raw(...args),
  info: (...args: any[]) => consola.info.raw(...args),
  warn: (...args: any[]) => consola.warn.raw(...args),
  error: (...args: any[]) => consola.error.raw(...args),
  fatal: (...args: any[]) => consola.fatal.raw(...args),
  write: (level, ...args: any[]) => {
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
