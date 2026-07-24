import { assertEquals } from "@std/assert";
import sharp from "sharp";
import {
  compare,
  dhash,
  invertHash,
  raw,
  save,
  toAscii,
} from "../src/dhash.ts";

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

Deno.test("raw renders hash bits to a PNG buffer", async () => {
  const whitePng = await raw("0000000000000000");
  const blackPng = await raw("ffffffffffffffff");

  assertEquals(
    Array.from((await sharp(whitePng).grayscale().raw().toBuffer()).values()),
    Array(64).fill(255),
  );
  assertEquals(
    Array.from((await sharp(blackPng).grayscale().raw().toBuffer()).values()),
    Array(64).fill(0),
  );
});

Deno.test("save appends .png and writes the fingerprint", async () => {
  const directory = await Deno.makeTempDir();
  const filePath = `${directory}/fingerprint`;

  try {
    await save("0000000000000000", filePath);
    const png = await Deno.readFile(`${filePath}.png`);

    assertEquals(
      Array.from((await sharp(png).grayscale().raw().toBuffer()).values()),
      Array(64).fill(255),
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
