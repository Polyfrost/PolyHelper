import { Events, Listener, container } from "@sapphire/framework";
import consola from "consola";
import { DiscordAPIError, roleMention } from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { SupportTeams, Users } from "../../const.js";
import { TextChannel } from "discord.js";
import {
  getTicketOwner,
  getTicketTop,
  isBumpMessage,
  isStaffPing,
  isTicket,
} from "../../lib/ticket.js";
import { Duration, Time } from "@sapphire/time-utilities";
import { Stopwatch } from "@sapphire/stopwatch";
import pMap from "p-map";
import { expireBumps } from "./expireBumps.js";
import dedent from "dedent";

@ApplyOptions<Listener.Options>({
  once: true,
  event: Events.ClientReady,
})
export class ReadyListener extends Listener<typeof Events.ClientReady> {
  public override async run() {
    const tickets = getTickets();

    const stopwatch = new Stopwatch();
    // We want the bot to prefetch and cache ticket information.
    await pMap(tickets, getTicketOwner);
    consola.success(
      `Pre-cached ${tickets.length} tickets.`,
      `Took ${stopwatch.stop().toString()}`,
    );

    await pMap(getTickets(), pinTop);
    setInterval(
      () => void pMap(getTickets(), expireTickets, { concurrency: 3 }),
      Time.Second * 30,
    );
    await pMap(getTickets(), expireBumps, { concurrency: 3 });
  }
}

const getTickets = () =>
  Array.from(container.client.channels.cache.values()).filter(isTicket);

async function expireTickets(ticket: TextChannel) {
  try {
    const support = SupportTeams[ticket.guildId];
    if (!support) return;

    const messages = await ticket.messages.fetch();
    const lastMsg = messages
      .filter((message) => message.author.id != Users.TicketTool)
      .first();
    if (!lastMsg) return;
    if (isStaffPing(lastMsg)) return;

    const lastPing = messages.filter(isStaffPing).first();
    if (lastPing) {
      const oneHr = new Duration("1h").dateFrom(lastPing.createdAt);
      if (oneHr < new Date()) return;
    }

    const ownerId = await getTicketOwner(ticket);
    if (ownerId) {
      const owner = ticket.guild.members.resolve(ownerId);
      if (!owner)
        return void pingStaff(
          ticket,
          dedent`Owner left. Please close ticket.
            (I don't have hands to do it myself...)`,
        );
    }

    if (isBumpMessage(lastMsg)) {
      const twoDays = new Duration("2d").dateFrom(lastMsg.createdAt);
      if (twoDays < new Date()) return void pingStaff(ticket, "Time to close");
    }
  } catch (e) {
    const header = `Failed to maintain ticket in ${ticket.name} in ${ticket.guild.name}:`;
    if (e instanceof DiscordAPIError) {
      if (e.code == 50001) return;
      consola.error(header, e.code, e.message);
    } else if (e instanceof Error && e.name == "ConnectTimeoutError")
      consola.error(header, "Connect Timeout Error");
    else consola.error(header, e);
  }
}

export async function pinTop(ticket: TextChannel) {
  try {
    if (ticket.lastPinAt) return;
    const top = await getTicketTop(ticket);
    if (!top || top.pinned) return;
    await top.pin();
  } catch (e) {
    const header = `Failed to pin ticket top in ${ticket.name} in ${ticket.guild.name}:`;
    if (e instanceof DiscordAPIError) {
      if (e.code == 50001) return;
      consola.error(header, e.code, e.message);
    } else if (e instanceof Error && e.name == "ConnectTimeoutError") {
      consola.error(header, "Connect Timeout Error");
    } else consola.error(header, e);
  }
}

export async function pingStaff(channel: TextChannel, msg: string) {
  const support = SupportTeams[channel.guildId];
  if (!support) return;
  return channel.send(`${roleMention(support)} ${msg}`);
}
