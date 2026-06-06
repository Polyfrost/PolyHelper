import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import consola from "consola";
import { MessageFlags } from "discord.js";
import { Polyfrost, shrug, SkyClient } from "../../const.ts";
import { invalidateTrackedData } from "../../lib/data.ts";
import { formatUser } from "../../lib/logHelper.ts";

@ApplyOptions<Command.Options>({
  description: "Clears the data (eg mods, autoresponses, etc) caches",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const { client, user } = interaction;

    const scMember = client.guilds.resolve(SkyClient.id)?.members.resolve(user);
    const pfMember = client.guilds.resolve(Polyfrost.id)?.members.resolve(user);

    const canDo = scMember?.roles.cache.has(SkyClient.roles.GitHubKeeper) ||
      scMember?.permissions.has("Administrator") ||
      pfMember?.permissions.has("Administrator") ||
      false;

    if (!canDo) {
      consola.success(`${formatUser(user)} has been validated.`);
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "No invalidating, but I can validate you instead.",
      });
    }

    invalidateTrackedData();
    return await interaction.reply(`cache cleared. no haiku for you. ${shrug}`);
  }
}
