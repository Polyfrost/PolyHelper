import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type {
	InteractionReplyOptions,
} from 'discord.js';
import {
	ApplicationCommandOptionType,
	EmbedBuilder,
} from 'discord.js';
import { Discord, getJSON, queryData } from '../../data.js';
import { repoFilesURL } from '../../const.js';

@ApplyOptions<Command.Options>({
	description: 'Gives the link to a discord',
})
export class UserCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand({
			name: this.name,
			description: this.description,
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: 'discord',
					description: 'Discord server to search for',
					required: true,
					autocomplete: true,
				},
			],
		});
	}

	public override async chatInputRun(
		interaction: Command.ChatInputCommandInteraction,
	) {
		const query = interaction.options.getString('discord', true);

		const data = await getJSON('discords');
		const items = Discord.array().parse(data);
		const item = queryData(items, query);
		if (!item)
			return interaction.reply({ content: `No Discord found` });

		return interaction.reply(getDiscordEmbed(item));
	}
}

export function getDiscordEmbed(item: Discord): InteractionReplyOptions {
	const embed = new EmbedBuilder({
		color: 0x8FF03F,
		title: item.fancyname,
	});
	if (item.icon)
		embed.setThumbnail(
      `${repoFilesURL}/discords/${encodeURIComponent(item.icon)}`,
		);
	if (item.description)
		embed.setDescription(item.description);

	return {
		content: `discord.gg/${item.code}`,
		embeds: [embed],
	};
}
