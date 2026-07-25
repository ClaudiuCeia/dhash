import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { resolve } from "node:path";
import sharp from "sharp";
import { compare, dhash, invertHash, raw, save, toAscii } from "../mod.ts";

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
  const path = resolve("./tests/__does_not_exist__.png");
  const error = await assertRejects(() => dhash(path), Error);
  assertEquals(error.message, `Failed to open "${path}"`);
});

Deno.test("dhash bounds encoded and decoded image sizes", async () => {
  const image = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: "white",
    },
  }).png().toBuffer();
  const directory = await Deno.makeTempDir();
  const path = `${directory}/image.png`;

  try {
    await Deno.writeFile(path, image);
    await assertRejects(
      () => dhash(image, { maxInputBytes: image.byteLength - 1 }),
      RangeError,
      `Image exceeds the ${image.byteLength - 1}-byte input limit.`,
    );
    await assertRejects(
      () => dhash(path, { maxInputBytes: image.byteLength - 1 }),
      RangeError,
      `Image exceeds the ${image.byteLength - 1}-byte input limit.`,
    );
    await assertRejects(
      () => dhash(image, { limitInputPixels: 99 }),
      Error,
      "Input image exceeds pixel limit",
    );
    assertEquals(
      await dhash(image, { maxInputBytes: false, limitInputPixels: false }),
      "0000000000000000",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("dhash validates image limits", async () => {
  const image = new Uint8Array();

  await assertRejects(
    () => dhash(image, { maxInputBytes: 0 }),
    RangeError,
    "maxInputBytes must be a positive safe integer.",
  );
  await assertRejects(
    () => dhash(image, { limitInputPixels: Number.MAX_SAFE_INTEGER + 1 }),
    RangeError,
    "limitInputPixels must be a positive safe integer.",
  );
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
  const error = assertThrows(() => compare("00", "0000"), Error);
  assertEquals(
    error.message,
    'Hashes must have the same length. Got "00" (2) and "0000" (4).',
  );
});

Deno.test("hash APIs reject invalid 64-bit hex values", async () => {
  const invalidHashes = ["", "not-hex", "10000000000000000"];
  const message = "Hash must contain 1 to 16 hexadecimal characters.";

  for (const hash of invalidHashes) {
    assertEquals(
      assertThrows(() => invertHash(hash), TypeError).message,
      message,
    );
    assertEquals(
      assertThrows(() => compare(hash, hash), TypeError).message,
      message,
    );
    assertEquals(assertThrows(() => toAscii(hash), TypeError).message, message);
    assertEquals(
      (await assertRejects(() => raw(hash), TypeError)).message,
      message,
    );
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
