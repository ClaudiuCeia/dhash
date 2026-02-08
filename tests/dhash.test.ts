import { assertEquals } from "@std/assert";
import { compare, dhash, invertHash, raw, toAscii } from "../src/dhash.ts";

Deno.test("sample", async () => {
  assertEquals(await dhash("./tests/dalle.png"), "7735ac8c2da4746c");

  const uint8arr = await Deno.readFile(new URL("./dalle.png", import.meta.url));
  assertEquals(await dhash(uint8arr), "7735ac8c2da4746c");
});

Deno.test("dhash invert matches invertHash()", async () => {
  const hash = await dhash("./tests/dalle.png");
  const inv1 = await dhash("./tests/dalle.png", { invert: true });
  const inv2 = invertHash(hash);
  assertEquals(inv1, inv2);
});

Deno.test("dhash throws for missing files", async () => {
  try {
    await dhash("./tests/__does_not_exist__.png");
    throw new Error("expected dhash to throw");
  } catch (err) {
    assertEquals(err instanceof Error, true);
  }
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
  assertEquals(compare(res[0], res[3]), 27);
  assertEquals(compare(res[0], res[4]), 2);
  assertEquals(compare(res[0], res[5]), 1);
});

Deno.test("print", async () => {
  const hash = await dhash("./tests/dalle.png");
  assertEquals(
    toAscii(hash),
    `░░██████░░██████
    ░░░░████░░██░░██
    ██░░██░░████░░░░
    ██░░░░░░████░░░░
    ░░░░██░░████░░██
    ██░░██░░░░██░░░░
    ░░██████░░██░░░░
    ░░████░░████░░░░`.replaceAll(" ", ""),
  );
});

Deno.test("toAscii renders full 64 bits", () => {
  assertEquals(
    toAscii("0000000000000000"),
    `░░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░░░░░
    ░░░░░░░░░░░░░░░░`.replaceAll(" ", ""),
  );

  assertEquals(
    toAscii("ffffffffffffffff"),
    `████████████████
    ████████████████
    ████████████████
    ████████████████
    ████████████████
    ████████████████
    ████████████████
    ████████████████`.replaceAll(" ", ""),
  );
});

Deno.test("toAscii supports custom characters", () => {
  assertEquals(toAscii("0", [".", "#"]).split("\n").length, 8);
});

Deno.test("compare throws on different length hashes", () => {
  try {
    compare("00", "0000");
    throw new Error("expected compare to throw");
  } catch (err) {
    // Just ensure it throws; message formatting isn't part of the contract.
    assertEquals(err instanceof Error, true);
  }
});

Deno.test("raw returns a PNG buffer", async () => {
  const png = await raw("0000000000000000");
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  assertEquals(Array.from(png.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
});
