import { SapphireClient } from "@sapphire/framework";
import { GatewayIntentBits, Partials } from "discord.js";
import "@sapphire/plugin-editable-commands/register";
import "@sapphire/plugin-logger/register";
import { setup } from "@skyra/env-utilities";
import consola from "consola";

setup();

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
