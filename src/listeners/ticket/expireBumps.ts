import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener } from "@sapphire/framework";
import { Message, TextChannel } from "discord.js";
import { isBumpMessage, isStaffPing, isTicket } from "../../lib/ticket.js";
import { SupportTeams, Users } from "../../const.js";
import { assert } from "@std/assert";

/**
 * Deletes the "If you do not respond in [...], your ticket will be closed"
 * embed when a new message is sent.
 *
 * Also deletes it on all old bot messages (ran from `./maintain.ts`)
 */
@ApplyOptions<Listener.Options>({
  event: Events.MessageCreate,
})
export class UserEvent extends Listener<typeof Events.MessageCreate> {
  public override async run(message: Message<true>) {
    if (!isTicket(message.channel)) return;
    await expireBumps(message.channel);
  }
}

export async function expireBumps(ticket: TextChannel) {
  try {
    const support = SupportTeams[ticket.guildId];
    if (!support) return;

    const messages = await ticket.messages.fetch();
    const lastMsg = messages
      .filter((message) => message.author.id != Users.TicketTool)
      .filter((message) => !isStaffPing(message))
      .first();
    const bumps = messages.filter(isBumpMessage);
    if (!lastMsg) return;

    for (const bump of bumps.values()) {
      if (lastMsg.id == bump.id) continue;

      assert(bump.embeds[0]);
      await bump.edit({
        embeds: [bump.embeds[0]],
      });
    }
  } catch {
    /* empty */
  }
}
