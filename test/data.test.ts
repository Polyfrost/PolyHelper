import { assert } from "@std/assert";
import { getMods, getPacks } from "../src/lib/data.ts";

Deno.test("getMods", async () => {
  assert(await getMods());
});

Deno.test("getPacks", async () => {
  assert(await getPacks());
});
