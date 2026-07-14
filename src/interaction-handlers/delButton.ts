import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import consola from "consola";
import { type ButtonInteraction, MessageFlags } from "discord.js";
import { Polyfrost } from "../const.ts";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    try {
      if (!interaction.inCachedGuild()) return;
      const respondedTo = interaction.customId.split("|").at(1);
      if (
        respondedTo == interaction.member.id ||
        interaction.member.permissions.has("ManageMessages") ||
        interaction.member.roles.cache.has(Polyfrost.roles.SupportTeam)
      ) {
        return await interaction.message.delete();
      } else {
        return await interaction.reply({
          flags: MessageFlags.Ephemeral,
          content: "You don't have permission to delete this.",
        });
      }
    } catch (e) {
      consola.warn("could not delete", interaction.message, e);
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "could not delete",
      });
    }
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("deleteResp")) return this.none();

    return this.some();
  }
}
