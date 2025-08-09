import { ApplyOptions } from "@sapphire/decorators";
import { Subcommand } from "@sapphire/plugin-subcommands";
import { getTicketOwner, getTicketTop, isTicket } from "../lib/ticket.js";
import {
  ChannelType,
  Colors,
  ContainerBuilder,
  hideLinkEmbed,
  hyperlink,
  MessageFlags,
  TextDisplayBuilder,
  userMention,
} from "discord.js";
import { getDiscords, getMods, getPacks } from "../lib/data.ts";
import { z } from "zod";
import { Emojis } from "../const.ts";
import { getUpdatePerms } from "../lib/update.ts";
import { getCrashes } from "../listeners/resps/handleLogs.ts";

@ApplyOptions<Subcommand.Options>({
  description: "Debug commands... for debugging... (DEBUG)",
  subcommands: [
    { name: "ticket", chatInputRun: "ticketDebug" },
    { name: "json", chatInputRun: "jsonDebug" },
  ],
})
export class UserCommand extends Subcommand {
  override registerApplicationCommands(registry: Subcommand.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description) // Needed even though base command isn't displayed to end user
        .addSubcommand((command) =>
          command
            .setName("ticket")
            .setDescription("Get information about this ticket (DEBUG)")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Ticket channel")
                .addChannelTypes(ChannelType.GuildText),
            ),
        )
        .addSubcommand((command) =>
          command
            .setName("json")
            .setDescription(
              "Parse all tracked JSONs and print any errors (DEBUG)",
            ),
        ),
    );
  }

  public async ticketDebug(
    interaction: Subcommand.ChatInputCommandInteraction,
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel =
      interaction.options.getChannel("channel", false, [
        ChannelType.GuildText,
      ]) || interaction.channel;

    if (!isTicket(channel)) return interaction.editReply("not a ticket");

    const owner = await getTicketOwner(channel);
    const ownerMsg = owner ? userMention(owner) : "Not Found";

    const top = await getTicketTop(channel);
    const topMsg = top ? top.url : "Not Found";

    return interaction.editReply({
      content: `Owner: ${ownerMsg}\nTop: ${topMsg}`,
      allowedMentions: { parse: [] },
    });
  }

  public async jsonDebug(interaction: Subcommand.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const components = [];

    const baseURL =
      "https://github.com/SkyblockClient/SkyblockClient-REPO/blob/main/files";
    components.push(
      await tryParse(
        hyperlink("mods.json", hideLinkEmbed(`${baseURL}/mods.json`)),
        getMods,
      ),
    );
    components.push(
      await tryParse(
        hyperlink("packs.json", hideLinkEmbed(`${baseURL}/packs.json`)),
        getPacks,
      ),
    );
    components.push(
      await tryParse(
        hyperlink("discords.json", hideLinkEmbed(`${baseURL}/discords.json`)),
        getDiscords,
      ),
    );
    components.push(
      await tryParse(
        hyperlink(
          "update_perms.json",
          hideLinkEmbed(`${baseURL}/update_perms.json`),
        ),
        getUpdatePerms,
      ),
    );
    components.push(
      await tryParse(
        hyperlink(
          "crashes.json",
          hideLinkEmbed(
            "https://github.com/Polyfrost/CrashData/blob/main/crashes.json",
          ),
        ),
        getCrashes,
      ),
    );

    return interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components,
      allowedMentions: { parse: [] },
    });
  }
}

async function tryParse(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    return new TextDisplayBuilder().setContent(
      `${Emojis.Check} Successfully parsed ${name}`,
    );
  } catch (e) {
    let error = `**Unknown error while testing ${name}**`;
    if (e instanceof z.ZodError)
      error = `**Failed to parse ${name}**\n${z.prettifyError(e)}`;
    else console.error(`DEBUG Failed to parse ${name}`, e);
    return new ContainerBuilder()
      .setAccentColor(Colors.Red)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${Emojis.Cross} ${error}`),
      );
  }
}
