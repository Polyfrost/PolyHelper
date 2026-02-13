import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { blue, gray, yellow } from "colorette";
import { Client } from "discord.js";
import consola from "consola";

const dev = process.env.NODE_ENV !== "production";
const style = dev ? yellow : blue;

@ApplyOptions<Listener.Options>({ once: true })
export class UserEvent extends Listener {
  public override run(client: Client) {
    const stores = [...client.stores.values()];

    for (const store of stores)
      consola.success(
        gray(
          `Loaded ${style(store.size.toString().padEnd(3, " "))} ${
            store.name
          }.`,
        ),
      );
  }
}
