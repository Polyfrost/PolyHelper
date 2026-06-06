import { ApplyOptions } from "@sapphire/decorators";
import { isTextBasedChannel } from "@sapphire/discord.js-utilities";
import { Command } from "@sapphire/framework";
import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  unorderedList,
} from "discord.js";
import { assetsBase, EmojiIDs } from "../../const.ts";

const windowsURL = "https://github.com/nacrt/SkyblockClient/releases/latest";
const javaURL =
  "https://github.com/koxx12-dev/Skyclient-installer-Java/releases/latest";
const martURL = "https://mart.skyclient.co/";

@ApplyOptions<Command.Options>({
  description: 'Generate "Download SkyClient" embed',
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
    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(`${assetsBase}/header.png`),
        ),
        new ContainerBuilder()
          .setAccentColor(0x00a4ef)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Windows Installer"),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Link)
                  .setEmoji(EmojiIDs.Windows)
                  .setLabel("Download")
                  .setURL(windowsURL),
              ),
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              unorderedList(["**Recommended**", "Requires Windows 10 / 11"]),
            ),
          ),
        new ContainerBuilder()
          .setAccentColor(0xe76f00)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Java Installer"),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Link)
                  .setEmoji(EmojiIDs.Java)
                  .setLabel("Download")
                  .setURL(javaURL),
              ),
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              unorderedList([
                "Recommended for **Mac and Linux**",
                "Works on Windows, Mac, and Linux",
                "**Requires Java** to be installed",
              ]),
            ),
          ),
        new ContainerBuilder()
          .setAccentColor(0x229342)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## Web Installer (Mart)"),
              )
              .setButtonAccessory(
                new ButtonBuilder()
                  .setStyle(ButtonStyle.Link)
                  .setEmoji(EmojiIDs.Chrome)
                  .setLabel("Launch")
                  .setURL(martURL),
              ),
          )
          .addSeparatorComponents(new SeparatorBuilder())
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              unorderedList([
                "Runs in your **web browser**",
                "**No download required**",
                "Recommended for **Steam Deck**",
                "Does not work in some browsers, like Brave and Firefox",
              ]),
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
