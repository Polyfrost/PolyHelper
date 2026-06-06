import {
  createFunctionPrecondition,
  type FunctionFallback,
} from "@sapphire/decorators";
import { BaseInteraction, Message } from "discord.js";
import { SkyClient } from "../const.ts";

export function SkyClientOnly(
  fallback: FunctionFallback = (): void => undefined,
): MethodDecorator {
  return createFunctionPrecondition(
    (context: Message | BaseInteraction) => context.guildId == SkyClient.id,
    fallback,
  );
}
