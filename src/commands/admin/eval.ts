import { ApplyOptions } from "@sapphire/decorators";
import { Command, type Args } from "@sapphire/framework";
import { send } from "@sapphire/plugin-editable-commands";
// import { Type } from "@sapphire/type";
import { codeBlock, isThenable } from "@sapphire/utilities";
import type { Message } from "discord.js";
import { inspect } from "util";
import consola from "consola";

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

    const { result, success, type } = await this.eval(message, code, {
      async: args.getFlags("async"),
      depth: Number(args.getOption("depth")) || 0,
      showHidden: args.getFlags("hidden", "showHidden"),
    });

    if (args.getFlags("silent", "s")) return;

    const output = success
      ? codeBlock("js", result)
      : `**ERROR**: ${codeBlock("bash", result)}`;

    const typeFooter = `**Type**: ${codeBlock("typescript", type)}`;

    if (output.length > 2000) {
      return send(message, {
        content: `Output was too long... sent the result as a file.\n${typeFooter}`,
        files: [{ attachment: Buffer.from(result), name: "output.js" }],
      });
    }

    return send(message, `${output}\n${typeFooter}`);
  }

  private async eval(
    message: Message,
    code: string,
    flags: { async: boolean; depth: number; showHidden: boolean },
  ) {
    if (flags.async) code = `(async () => {\n${code}\n})();`;

    // @ts-expect-error shortcuts for eval
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { channel, guild, client, author } = message;

    let success = true;
    let ret: unknown;

    try {
      ret = eval(code);
    } catch (error) {
      if (error && error instanceof Error && error.stack) consola.error(error);
      ret = error;
      success = false;
    }

    const type = "unknown"; // new Type(ret).toString();
    // eslint-disable-next-line @typescript-eslint/await-thenable
    if (isThenable(ret)) ret = await ret;

    const result = inspect(ret, {
      depth: flags.depth,
      showHidden: flags.showHidden,
    });
    return { result, success, type };
  }
}
