import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { MessageFlags } from "discord.js";
import { Emojis, Polyfrost } from "../../const.ts";
import { invalidateTrackedData } from "../../lib/data.ts";

@ApplyOptions<Command.Options>({
  description: "Clears the data caches",
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
    const pfMember = client.guilds.resolve(Polyfrost.id)?.members.resolve(user);
    const canDo = pfMember?.permissions.has("Administrator");

    if (!canDo) {
      // consola.success(`${formatUser(user)} has been validated.`);
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "No invalidating, but I can validate you instead.",
      });
    }

    invalidateTrackedData();
    return await interaction.reply(`${Emojis.Check} Cache cleared.`);
  }
}
