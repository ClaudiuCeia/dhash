import { assertEquals } from "https://deno.land/std@0.149.0/testing/asserts.ts";
import { join, normalize } from "https://deno.land/std@0.153.0/path/mod.ts";
import { compare, dhash, toAscii } from "../src/dhash.ts";

Deno.test("sample", async () => {
  assertEquals(await dhash("./tests/dalle.png"), "7735ac8c2da4746c");

  const __dirname = new URL(".", import.meta.url).pathname;
  const resolvedPath = join(__dirname, normalize("dalle.png"));
  const uint8arr = await Deno.readFile(resolvedPath);
  assertEquals(await dhash(uint8arr), "7735ac8c2da4746c");
});

Deno.test("comparison", async () => {
  const res = await Promise.all([
    dhash("./tests/dalle.png"),
    dhash("./tests/dalle-copyright.png"),
    dhash("./tests/dalle-bolder-copyright.jpeg"),
    dhash("./tests/dalle-crop.jpeg"),
    dhash("./tests/dalle-edited.jpeg"),
    dhash("./tests/dalle-stickers.jpeg"),
  ]);

  assertEquals(compare(res[0], res[1]), 1);
  assertEquals(compare(res[0], res[2]), 2);
  assertEquals(compare(res[0], res[3]), 28);
  assertEquals(compare(res[0], res[4]), 2);
  assertEquals(compare(res[0], res[5]), 1);
});

Deno.test("print", async () => {
  const hash = await dhash("./tests/dalle.png");
  assertEquals(
    toAscii(hash),
    `██████░░██████░░
    ░░████░░██░░████
    ░░██░░████░░░░██
    ░░░░░░████░░░░░░
    ░░██░░████░░████
    ░░██░░░░██░░░░░░
    ██████░░██░░░░░░
    ░░░░░░░░░░░░░░░░`.replaceAll(" ", "")
  );
});
