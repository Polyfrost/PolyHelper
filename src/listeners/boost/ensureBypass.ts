import { Events, Listener, container } from '@sapphire/framework';
import type { Client } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Roles, Servers } from '../../const.js';

@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
})
export class ReadyListener extends Listener<typeof Events.ClientReady> {
	public override async run(client: Client<true>) {
		const members = client.guilds.resolve(Servers.SkyClient)?.members.cache;
		if (!members)
			return;

		for (const [id, member] of members) {
			if (!member.premiumSince)
				continue;
			if (member.roles.cache.has(Roles.GiveawayBypass))
				continue;

			container.logger.info('Giving bypass', id);
			await member.roles.add(Roles.GiveawayBypass, 'User started boosting');
		}
	}
}
