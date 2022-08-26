import { assertEquals } from "https://deno.land/std@0.149.0/testing/asserts.ts";
import { compare, dhash, toAscii } from "../src/dhash.ts";

Deno.test("sample", async () => {
  assertEquals(await dhash("./tests/dalle.png"), "5c20c6b680f80800");
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

  assertEquals(compare(res[0], res[1]), 0);
  assertEquals(compare(res[0], res[2]), 5);
  assertEquals(compare(res[0], res[3]), 14);
  assertEquals(compare(res[0], res[4]), 7);
  assertEquals(compare(res[0], res[5]), 6);
});

Deno.test("print", async () => {
  const hash = await dhash("./tests/dalle.png");
  assertEquals(
    toAscii(hash),
    `██░░██████░░░░░░
    ░░██░░░░░░░░░░██
    ██░░░░░░████░░██
    ░░████░░████░░██
    ░░░░░░░░░░░░░░██
    ████████░░░░░░░░
    ░░░░░░██░░░░░░░░
    ░░░░░░░░░░░░░░░░`.replaceAll(" ", "")
  );
});
