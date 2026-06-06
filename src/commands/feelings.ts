import { ApplyOptions } from "@sapphire/decorators";
import { Command } from "@sapphire/framework";
import dedent from "dedent";
import { ApplicationCommandOptionType } from "discord.js";
import { isSupportTeam } from "../lib/ticket.ts";

@ApplyOptions<Command.Options>({
  description: "Bots have feelings too",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand({
      name: this.name,
      description: this.description,
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: "snarky-remark",
          description: "Snarky remark to add at the end",
          required: false,
          choices: [
            { name: "Already gave solution", value: "solution" },
            { name: "Follow the instructions", value: "instructions" },
          ],
        },
        {
          type: ApplicationCommandOptionType.User,
          name: "mention",
          description: "User to mention (Support Team only)",
          required: false,
        },
      ],
    });
  }

  public override async chatInputRun(
    interaction: Command.ChatInputCommandInteraction,
  ) {
    const mention = interaction.options.getUser("mention", false);
    const mentionText = isSupportTeam(interaction.member) && mention
      ? `${mention.toString()} `
      : "";

    let reply = dedent`
      I may be a bot, but that doesn't mean I don't have feelings.
      ${mentionText}Please stop ignoring me. :(
    `;
    reply += "\n\n";
    switch (interaction.options.getString("snarky-remark", false)) {
      case "instructions":
        reply += "(Please follow the instructions I posted above)";
        break;
      case "solution":
        reply += "(I already gave you the solution to your problem)";
    }
    return await interaction.reply(reply);
  }
}
