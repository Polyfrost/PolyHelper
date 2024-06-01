import { Events, Listener, container } from '@sapphire/framework';
import type { Client, TextChannel } from 'discord.js';
import { DiscordAPIError, roleMention } from 'discord.js';
import { ApplyOptions } from '@sapphire/decorators';
import { Duration, Time } from '@sapphire/time-utilities';
import { Servers, Users } from '../../const.js';
import { getTicketOwner, getTicketTop, isTicket } from '../../lib/ticket.js';

const SupportTeams: Record<string, string> = {
	[Servers.SkyClient]: '931626562539909130',
	'822066990423605249': '997376364460114001',
	[Servers.Dev]: '1240761899092803715',
};

@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
})
export class ReadyListener extends Listener<typeof Events.ClientReady> {
	public override async run(client: Client<true>) {
		await run(client);
		setInterval(() => run(client), Time.Second * 30);
	}
}

export async function run(client: Client<true>) {
	const tickets = Array.from(client.channels.cache.values()).filter(isTicket);
	// await Promise.all(tickets.map(maintainTicket));
	for (const ticket of tickets) await maintainTicket(ticket);

	for (const ticket of tickets)
		try {
			if (ticket.lastPinAt)
				continue;
			const top = await getTicketTop(ticket);
			await top?.pin();
		}
		catch (e) {
			const header = `Failed to pin ticket top in ${ticket.name} in ${ticket.guild.name}:`;
			if (e instanceof DiscordAPIError) {
				if (e.code === 50001)
					return;
				container.logger.error(header, e.code, e.message);
			}
			else if (e instanceof Error && e.name === 'ConnectTimeoutError') {
				container.logger.error(header, 'Connect Timeout Error');
			}
			else { container.logger.error(header, e); }
		}
}

async function maintainTicket(ticket: TextChannel) {
	try {
		const support = SupportTeams[ticket.guildId];
		if (!support)
			return;

		const messages = await ticket.messages.fetch();
		const lastMessage = messages
			.filter(message => message.author.id !== Users.TicketTool)
			.first();
		if (!lastMessage)
			return;
		const meLast = lastMessage.author.id === ticket.client.user.id;
		if (meLast && lastMessage.content.startsWith(roleMention(support)))
			return;

		const ownerId = await getTicketOwner(ticket);
		if (ownerId) {
			const owner = ticket.guild.members.resolve(ownerId);
			if (!owner)
				return pingStaff(ticket, 'owner left');
		}

		if (
			meLast
			&& lastMessage.embeds.some(
				embed => embed.title === 'Do you still need help?',
			)
		) {
			// last message was bump
			const twoDays = new Duration('2d').dateFrom(lastMessage.createdAt);
			if (twoDays < new Date())
				return pingStaff(ticket, 'time to close');
		}
	}
	catch (e) {
		const header = `Failed to maintain ticket in ${ticket.name} in ${ticket.guild.name}:`;
		if (e instanceof DiscordAPIError) {
			if (e.code === 50001)
				return;
			container.logger.error(header, e.code, e.message);
		}
		else if (e instanceof Error && e.name === 'ConnectTimeoutError') {
			container.logger.error(header, 'Connect Timeout Error');
		}
		else { container.logger.error(header, e); }
	}
}

async function pingStaff(channel: TextChannel, msg: string) {
	const support = SupportTeams[channel.guildId];
	if (!support)
		return;
	channel.send(`${roleMention(support)} ${msg}`);
}
