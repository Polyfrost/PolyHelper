import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import dedent from "dedent";
import type { ButtonInteraction } from "discord.js";
import { ButtonStyle, ComponentType } from "discord.js";
import { isTicket, setTicketOpen } from "../../lib/ticket.ts";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const { channel } = interaction;
    if (!isTicket(channel)) return;

    const ticketType = interaction.customId.split("|")[1] || "";
    const ticketTypeName = {
      modsUpdating: "Mods aren't updating",
      crash: "Crashing",
      install: "Help with installer",
      mods: "Help with mods",
      other: "Other",
    }[ticketType];
    const ticketTypeDesc = `**Ticket category**: ${ticketTypeName}`;
    if (ticketType == "crash") {
      return interaction.update({
        content: ticketTypeDesc +
          "\nSo we can fix your crash, what do you see when you crash?",
        components: [
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                customId: "ticketCategorizeCrash|CP",
                label: 'The game says "Minecraft has crashed!"',
                style: ButtonStyle.Primary,
              },
              {
                type: ComponentType.Button,
                customId: "ticketCategorizeCrash|launcher",
                label: 'The launcher says "Game crashed!"',
                style: ButtonStyle.Primary,
              },
            ],
          },
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                customId: "ticketCategorizeCrash|other",
                label: "Something else (like the game closing)",
                style: ButtonStyle.Secondary,
              },
            ],
          },
        ],
      });
    } else if (ticketType == "modsUpdating") {
      await setTicketOpen(channel, true);
      return interaction.update({
        content: ticketTypeDesc,
        embeds: [
          {
            title: "Instructions",
            description: dedent`
                Most mod updating issues can be fixed by switching launchers:
                https://microcontrollersdev.github.io/Alternatives/launcher/home
                - If you have any trouble with the guide, describe your problem here
                - Otherwise, if your issue is resolved, please close the ticket above
              `,
          },
        ],
        components: [], // components stay behind without this
      });
    } else {
      await setTicketOpen(channel, true);
      return interaction.update({
        content: ticketTypeDesc,
        embeds: [
          {
            description: dedent`
                Please describe your problem so we can help you.
                Expect a response within the next day. Support Team has already been pinged.
              `,
          },
        ],
        components: [], // components stay behind without this
      });
    }
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("ticketCategorize|")) {
      return this.none();
    }
    return this.some();
  }
}
