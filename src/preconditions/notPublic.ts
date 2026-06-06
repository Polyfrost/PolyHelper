import { Precondition } from "@sapphire/framework";
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message,
} from "discord.js";
import { DevServer, isDevUser, SkyClient } from "../const.ts";

export class UserPrecondition extends Precondition {
  public override messageRun(message: Message) {
    return this.inPrivate(message.guildId);
  }

  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.inPrivate(interaction.guildId);
  }

  public override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.inPrivate(interaction.guildId);
  }

  private inPrivate(guildId: string | null) {
    return isSkyClient(guildId) ? this.ok() : this.error();
  }
}

export const isSkyClient = (guildId: string | null) =>
  guildId == SkyClient.id || (guildId == DevServer.id && isDevUser);

export const notSkyClient = (guildId: string | null) => !isSkyClient(guildId);

declare module "@sapphire/framework" {
  interface Preconditions {
    notPublic: never;
  }
}
