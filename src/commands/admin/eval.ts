import { inspect } from "node:util";
import { ApplyOptions } from "@sapphire/decorators";
import { type Args, Command } from "@sapphire/framework";
// import { Type } from "@sapphire/type";
import { send } from "@sapphire/plugin-editable-commands";
import consola from "consola";
import { codeBlock, type Message } from "discord.js";

@ApplyOptions<Command.Options>({
  aliases: ["ev"],
  description: "Evals any JavaScript code",
  quotes: [],
  preconditions: ["OwnerOnly"],
  flags: ["async", "hidden", "showHidden", "silent", "s"],
  options: ["depth"],
})
export class UserCommand extends Command {
  public override async messageRun(message: Message, args: Args) {
    const code = await args.rest("string");

    const { result, success } = await this.eval(message, code, {
      async: args.getFlags("async"),
      depth: Number(args.getOption("depth")) || 0,
      showHidden: args.getFlags("hidden", "showHidden"),
    });

    if (args.getFlags("silent", "s")) return;

    const output = success
      ? codeBlock("js", result)
      : `**ERROR**: ${codeBlock("bash", result)}`;

    if (output.length > 2000) {
      return send(message, {
        content: `Output was too long... sent the result as a file.`,
        files: [{ attachment: Buffer.from(result), name: "output.js" }],
      });
    }

    return send(message, `${output}`);
  }

  private async eval(
    message: Message,
    code: string,
    flags: { async: boolean; depth: number; showHidden: boolean },
  ) {
    if (flags.async) code = `(async () => {\n${code}\n})();`;

    // deno-lint-ignore no-unused-vars
    const { channel, guild, client, author } = message;

    let success = true;
    let ret: unknown;

    try {
      ret = await eval(code);
    } catch (error) {
      if (error && error instanceof Error && error.stack) consola.error(error);
      ret = error;
      success = false;
    }

    const result = inspect(ret, {
      depth: flags.depth,
      showHidden: flags.showHidden,
    });
    return { result, success };
  }
}
