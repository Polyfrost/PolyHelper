import { ApplyOptions } from "@sapphire/decorators";
import { isGuildMember } from "@sapphire/discord.js-utilities";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import { Polyfrost } from "../../const.ts";
import { getRepoCount } from "../../lib/GHAPI.ts";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
})
export class ModalHandler extends InteractionHandler {
  public async run(interaction: ModalSubmitInteraction) {
    if (interaction.guildId != Polyfrost.id) return;
    const { member } = interaction;
    if (!isGuildMember(member)) return false;

    if (member.roles.cache.has(Polyfrost.roles.DevAccess)) {
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "You already have access to the Development channels.",
      });
    }

    const userAnswer = parseInt(
      interaction.fields.getTextInputValue("repo-count"),
    );
    const answer = await getRepoCount();

    if (userAnswer != answer) {
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Your answer was incorrect. Try again.",
      });
    }

    await member.roles.add(Polyfrost.roles.DevAccess);
    return await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "You should now have access to the Development channels.",
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (interaction.customId != "dev-entry") return this.none();

    return this.some();
  }
}
