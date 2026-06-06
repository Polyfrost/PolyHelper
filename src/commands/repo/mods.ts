import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import { inlineCode, unorderedList } from "discord.js";
import { getMods, Mod } from "../../lib/data.ts";

enum ModType {
  Bundle,
  Skyblock,
  PvP,
  Other,
}

@ApplyOptions<Command.Options>({
  description: "Lists all the mods in SkyClient",
  aliases: ["modlist"],
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
    const mods = (await getMods()).filter((mod) => !mod.hidden);

    const modType = (mod: Mod) =>
      mod.packages
        ? ModType.Bundle
        : mod.categories?.includes("2;All Skyblock")
        ? ModType.Skyblock
        : mod.categories?.includes("5;All PvP")
        ? ModType.PvP
        : ModType.Other;
    const formatMods = (type: ModType) =>
      unorderedList(
        mods
          .filter((pack) => modType(pack) == type)
          .map((mod) => `${mod.display} by ${mod.creator}: \`/mod ${mod.id}\``),
      );

    const bundleStr = unorderedList(
      mods
        .filter((mod) => modType(mod) == ModType.Bundle)
        .map((mod) => {
          if (!mod.packages) return ""; // unreachable
          const mods = [mod.id, ...mod.packages].map(inlineCode).join(", ");
          return `${mod.display}: ` + mods;
        }),
    );
    const color = (await interaction.guild?.members.fetch(interaction.user))
      ?.displayColor || 0x8ff03f;
    return interaction.reply({
      embeds: [
        { color, title: "Bundles", description: bundleStr },
        { color, title: "Skyblock", description: formatMods(ModType.Skyblock) },
        { color, title: "PvP", description: formatMods(ModType.PvP) },
        { color, title: "Other", description: formatMods(ModType.Other) },
      ],
    });
  }
}
