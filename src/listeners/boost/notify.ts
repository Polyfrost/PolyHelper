import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import consola from "consola";
import {
  type PartialGuildMember,
  GuildMember,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";
import { SkyClient } from "../../const.js";
import { isTextChannel } from "@sapphire/discord.js-utilities";
import { formatUser } from "../../lib/logHelper.js";
import dedent from "dedent";

/** Tracks when people (un)boost */
@ApplyOptions<Listener.Options>({
  event: Events.GuildMemberUpdate,
})
export class UserEvent extends Listener<typeof Events.GuildMemberUpdate> {
  public override async run(
    oldUser: GuildMember | PartialGuildMember,
    user: GuildMember,
  ) {
    if (user.guild.id != SkyClient.id) return;

    const botLogs = user.client.channels.cache.get(SkyClient.channels.BotLogs);

    if (oldUser.premiumSince && !user.premiumSince) {
      consola.info("Boost stop", user.id);
      if (isTextChannel(botLogs))
        await botLogs.send(`${formatUser(user)} stopped boosting`);
      if (!user.roles.cache.has(SkyClient.roles.GiveawayDonor))
        await user.roles.remove(
          SkyClient.roles.GiveawayBypass,
          "Stopped boosting",
        );
    } else if (!oldUser.premiumSince && user.premiumSince) {
      consola.info("Boost start", user.id);
      if (isTextChannel(botLogs))
        await botLogs.send(`${formatUser(user)} started boosting`);

      await user.roles.add(
        SkyClient.roles.GiveawayBypass,
        "User started boosting",
      );

      const general = await user.client.channels.fetch(
        SkyClient.channels.General,
      );
      if (!isTextChannel(general)) return;

      const compRow = new ActionRowBuilder<ButtonBuilder>();
      compRow.addComponents(
        new ButtonBuilder({
          style: ButtonStyle.Primary,
          label: "Claim Rank",
          customId: "claimboost",
        }),
      );
      return general.send({
        content: dedent`
          ${user.toString()} **Thank you for boosting!!!** <3
          Use the \`/claimcosmetics\` command on Discord to claim your in-game rank.
        `,
        allowedMentions: { users: [user.id] },
        // components: [compRow] // TODO
      });
    }
    return;
  }
}
