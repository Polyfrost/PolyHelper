import { ApplyOptions } from "@sapphire/decorators";
import { isGuildMember } from "@sapphire/discord.js-utilities";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type {
  ButtonInteraction,
  ModalActionRowComponentBuilder,
} from "discord.js";
import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { MessageFlags } from "discord.js";
import { Polyfrost } from "../../const.ts";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    if (interaction.guildId != Polyfrost.id) return;
    const { member } = interaction;
    if (!isGuildMember(member)) return false;

    if (member.roles.cache.has(Polyfrost.roles.DevAccess)) {
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "You already have access to the Development channels.",
      });
    }

    return await interaction.showModal(
      new ModalBuilder()
        .setCustomId("dev-entry")
        .setTitle("Dev Entry Form")
        .addComponents(
          new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("repo-count")
              .setLabel("How many repositories?")
              .setStyle(TextInputStyle.Short),
          ),
        ),
    );
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId != "show-dev-entry") return this.none();
    return this.some();
  }
}
