import { ApplyOptions } from "@sapphire/decorators";
import { isGuildBasedChannel } from "@sapphire/discord.js-utilities";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { assert } from "@std/assert";
import type { ButtonInteraction } from "discord.js";
import { roleMention, userMention } from "discord.js";
import { SkyClient } from "../../const.ts";
import { PendingUpdatesDB } from "../../lib/db.ts";
import { getUpdatePerms } from "../../lib/update.ts";
import { notSkyClient } from "../../preconditions/notPublic.ts";
import { generateMessage } from "./updateCheck2.ts";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (notSkyClient(interaction.guildId)) return;
    const { channel, message } = interaction;
    assert(isGuildBasedChannel(channel));

    const pendingUpdates = PendingUpdatesDB.data;
    const data = pendingUpdates[message.id];
    assert(data);

    const url =
      `https://discord.com/channels/${channel.guildId}/${channel.id}/${message.id}`;
    const mentions: string[] = [];
    mentions.push(roleMention(SkyClient.roles.GitHubKeeper));

    const perms = await getUpdatePerms();
    for (const [userId, perm] of Object.entries(perms)) {
      const ids = (data.type == "mod" ? perm.mods : perm.packs) || {};
      if (Object.keys(ids).includes(data.id)) {
        mentions.push(userMention(userId));
      }
    }

    const pingMsg = await channel.send(`${mentions.join(" ")} ${url}`);
    await PendingUpdatesDB.update((data) => {
      const update = data[message.id];
      assert(update);
      update.pingMsg = pingMsg.id;
    });

    return interaction.update(generateMessage(interaction, data));
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId !== "updateCheck1") return this.none();
    return this.some();
  }
}
