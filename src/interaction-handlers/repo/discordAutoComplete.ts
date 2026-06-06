import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  type ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
} from "discord.js";
import { Discords, getRepoJSON, probableMatches } from "../../lib/data.ts";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Autocomplete,
})
export class AutocompleteHandler extends InteractionHandler {
  public override async run(
    interaction: AutocompleteInteraction,
    result: ApplicationCommandOptionChoiceData[],
  ) {
    return await interaction.respond(result);
  }

  public override async parse(interaction: AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true);
    const { value } = focusedOption;
    switch (focusedOption.name) {
      case "discord": {
        const items: ApplicationCommandOptionChoiceData[] = probableMatches(
          await getRepoJSON("discords", Discords),
          value,
        ).map((v) => ({
          name: v.fancyname || v.id,
          value: v.id,
        }));
        return this.some(items);
      }
      default:
        return this.none();
    }
  }
}
