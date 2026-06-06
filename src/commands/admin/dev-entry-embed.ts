import { ApplyOptions } from "@sapphire/decorators";
import { isTextBasedChannel } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import dedent from "dedent";
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { Polyfrost } from "../../const.ts";

const header = dedent`
  At Polyfrost, we love open source. What argument is there against open source? \
  It lets the community help us build the tools we all have grown to love, \
  so we welcome all to contribute their ideas.

  These channels are here to make all communication \
  regarding development at Polyfrost open for everyone to see.
`;

const line1 = dedent`
  ## To prove you are a developer who wants to contribute to our projects, \
  you have to answer the following:
`;

const question = "How many repositories are currently in the Polyfrost GitHub?";

@ApplyOptions<Command.Options>({
  description: 'Generate "Dev Entry" embed',
  requiredUserPermissions: ["Administrator"],
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder //
        .setName(this.name)
        .setDescription(this.description)
    );
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const { channel } = interaction;
    if (!isTextBasedChannel(channel)) return;

    if (interaction.guildId != Polyfrost.id) {
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Polyfrost only",
      });
    }

    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new TextDisplayBuilder().setContent(header),
        new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(line1))
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(question),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Primary)
                  .setLabel("Answer")
                  .setCustomId("show-dev-entry"),
              ),
          ),
      ],
    });
    return interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "✅",
    });
  }
}
