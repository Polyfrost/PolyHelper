import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { unorderedList } from "discord.js";
import { getPacks, Pack } from "../../lib/data.ts";

enum PackType {
  Skyblock,
  PvP,
  Other,
}

@ApplyOptions<Command.Options>({
  description: "Lists all the packs in SkyClient",
  aliases: ["packlist"],
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
    const packs = (await getPacks()).filter((pack) => !pack.hidden);

    const packType = (pack: Pack) =>
      pack.categories?.includes("1;All Skyblock")
        ? PackType.Skyblock
        : pack.categories?.includes("3;All PvP")
        ? PackType.PvP
        : PackType.Other;
    const formatPacks = (type: PackType) =>
      unorderedList(
        packs
          .filter((pack) => packType(pack) == type)
          .map(
            (pack) =>
              `${pack.display} by ${pack.creator}: \`/pack ${pack.id}\``,
          ),
      );

    const color = (await interaction.guild?.members.fetch(interaction.user))
      ?.displayColor || 0x8ff03f;
    return interaction.reply({
      embeds: [
        {
          color,
          title: "Skyblock",
          description: formatPacks(PackType.Skyblock),
        },
        { color, title: "PvP", description: formatPacks(PackType.PvP) },
        { color, title: "Other", description: formatPacks(PackType.Other) },
      ],
    });
  }
}
