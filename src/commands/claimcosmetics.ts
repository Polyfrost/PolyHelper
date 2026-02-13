import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import consola from "consola";
import {
  ApplicationCommandOptionType,
  channelMention,
  MessageFlags,
} from "discord.js";
import { Polyfrost, SkyClient } from "../const.ts";
import { getMCProfile } from "../lib/mcAPI.ts";
import { BoostersDB } from "../lib/db.ts";
import dedent from "dedent";
import { isSupporter } from "../listeners/boost/maintain.ts";

@ApplyOptions<Command.Options>({
  description: "Claims your in-game rank for supporting",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "username",
          description: "Minecraft Username",
          required: true,
        },
      ],
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const supporter = await isSupporter(interaction.user);

    const mcName = interaction.options.getString("username", true);
    const profile = await getMCProfile(mcName);
    if (!profile)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content:
          "Couldn't find this Minecraft account. Did you type it correctly?",
      });

    consola.info(
      "Saving Supporter",
      supporter,
      interaction.user.id,
      profile.id,
    );
    await BoostersDB.update((data) => {
      data[interaction.user.id] = profile.id;
    });

    if (supporter)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: dedent`
          # Thanks for the support! <3
          Your in-game rank will be applied to ${profile.name} in 5-10 minutes.
          -# [SkyClient Cosmetics](<https://modrinth.com/mod/scc>) is required to see the rank.
          -# If you don't see it, you may have to type \`/scc reload\` in game.
        `,
      });
    else if (interaction.guildId == SkyClient.id)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: dedent`
          **You don't appear to be supporting us.**
          Give us a boost to receive an in-game role with SkyClient Cosmetics!
        `,
      });
    else if (interaction.guildId == Polyfrost.id)
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: dedent`
          **You don't appear to be supporting us.**
          Join our Patreon to receive an in-game role with SkyClient Cosmetics!
          Find out more here: ${channelMention(Polyfrost.channels.PatreonAd)}
        `,
      });
    // This will happen in DMs
    else
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "**You don't appear to be supporting us.**",
      });
  }
}
