import { Events, Listener } from "@sapphire/framework";
import consola from "consola";
import { Client } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { SkyClient } from "../../const.js";

@ApplyOptions<Listener.Options>({
  once: true,
  event: Events.ClientReady,
})
export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public override async run(client: Client<true>) {
    const members = client.guilds.resolve(SkyClient.id)?.members.cache;
    if (!members) return;

    for (const [id, member] of members) {
      if (!member.premiumSince) continue;
      if (member.roles.cache.has(SkyClient.roles.GiveawayBypass)) continue;

      consola.info("Giving bypass", id);
      await member.roles.add(
        SkyClient.roles.GiveawayBypass,
        "User started boosting",
      );
    }
  }
}
