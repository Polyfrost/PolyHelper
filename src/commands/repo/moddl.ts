import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { APIEmbed } from 'discord.js';
import { hyperlink, unorderedList } from 'discord.js';
import { DownloadableMod, getMods } from '../../data.js';

enum ItemType {
	Bundle,
	Skyblock,
	PvP,
	Other,
}

@ApplyOptions<Command.Options>({
	description: 'Gives you all of the mods/packs\' links',
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
		const items = DownloadableMod.array()
			.parse(await getMods())
			.filter(item => !item.hidden);
		const categorizeItem = (item: DownloadableMod) =>
			item.packages
				? ItemType.Bundle
				: item.categories?.includes('2;All Skyblock')
				|| item.categories?.includes('1;All Skyblock')
					? ItemType.Skyblock
					: item.categories?.includes('5;All PvP')
					|| item.categories?.includes('3;All PvP')
						? ItemType.PvP
						: ItemType.Other;
		const listItems = (type: ItemType) =>
			unorderedList(
				items
					.filter(item => categorizeItem(item) === type)
					.map(item => hyperlink(item.file, encodeURI(item.download))),
			);

		const embeds: (APIEmbed & { description: string })[] = [];
		const color = interaction.guild?.members.resolve(interaction.user)?.displayColor || 0x8FF03F;
		Object.entries({
			Bundles: listItems(ItemType.Bundle),
			Skyblock: listItems(ItemType.Skyblock),
			PvP: listItems(ItemType.PvP),
			Other: listItems(ItemType.Other),
		// eslint-disable-next-line array-callback-return
		}).map(([title, items]) => {
			if (items)
				embeds.push({
					title,
					color,
					description: items,
				});
		});
		const totalLength = embeds.reduce((a, b) => a + b.description.length, 0);
		if (totalLength > 5000) {
			await interaction.reply({ embeds: embeds.slice(0, -1) });
			await interaction.channel?.send({ embeds: embeds.slice(-1) });
			return;
		}
		return interaction.reply({ embeds });
	}
}
