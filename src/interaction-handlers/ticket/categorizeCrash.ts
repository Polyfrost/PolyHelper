import { ApplyOptions } from "@sapphire/decorators";
import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import dedent from "dedent";
import type { ButtonInteraction } from "discord.js";
import { assetsBase } from "../../const.ts";
import { isTicket, setTicketOpen } from "../../lib/ticket.ts";

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ButtonHandler extends InteractionHandler {
  public async run(interaction: ButtonInteraction) {
    const { channel } = interaction;
    if (!isTicket(channel)) return;

    const origContent = interaction.message.content;
    const crashType = interaction.customId.split("|")[1] || "";
    const crashTypeName = {
      CP: "CrashPatch",
      launcher: "Launcher",
      other: "Other",
    }[crashType];
    await interaction.update({
      content: `${origContent.split("\n")[0]}
**Crash type**: ${crashTypeName}`,
      components: [], // components stay behind without this
    });

    await setTicketOpen(channel, true);
    switch (crashType) {
      case "CP":
        return channel.send({
          embeds: [
            {
              title: "Instructions",
              description: dedent`
                Please follow these steps from the CrashPatch screen:
                1. Click the copy icon on the right side and paste the results here.
                2. Expect a response within the next day. Support Team has already been pinged.
              `,
            },
          ],
        });
      case "launcher":
        return channel.send({
          embeds: [
            {
              title: "Prism Launcher",
              color: 0xdf6277,
              description: dedent`
                1. Recreate the crash. The log should automatically open
                2. Click "Copy" on the top right and paste the log here
              `,
              thumbnail: { url: `${assetsBase}/prismicon.png` },
            },
            {
              title: "Modrinth Launcher",
              color: 0x1bd96a,
              description: dedent`
                1. Within your SkyClient instance, go to the "Logs" tab
                2. Make sure "Live Log" is select on the top left
                3. Click "Copy" on the top right and paste the log here
              `,
              thumbnail: { url: `${assetsBase}/mricon.png` },
            },
            {
              title: "Minecraft Launcher (Official Launcher)",
              color: 0x52a535,
              description:
                "1. Open your SkyClient folder. See this: https://youtu.be/BHIM2htfMk8",
              fields: [
                {
                  name:
                    'If you saw a "View Crash Report" button in the launcher:',
                  value:
                    "- Go to the `crash-reports` folder and upload the most recent file here",
                },
                {
                  name: "If you didn't see the button:",
                  value:
                    "- Go to the `logs` folder and upload the file called `latest` here",
                },
              ],
              thumbnail: { url: `${assetsBase}/mcicon.png` },
            },
            {
              title: "Instructions",
              description: dedent`
                Please send a log using the steps above, depending on what launcher you use.
                Once the file is uploaded, expect a response within the next day.
                Our Support Team has already been notified.
              `,
            },
          ],
        });
      case "other":
        return channel.send(
          dedent`
            Please describe your crash so we can help you.
            Expect a response within the next day. Support Team has already been pinged.
          `,
        );
    }
    return;
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("ticketCategorizeCrash|")) {
      return this.none();
    }
    return this.some();
  }
}
