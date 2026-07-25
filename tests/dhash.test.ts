import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import { resolve } from "node:path";
import sharp from "sharp";
import { compare, dhash, invertHash, raw, save, toAscii } from "../mod.ts";

Deno.test("sample", async () => {
  assertEquals(await dhash("./tests/dalle.png"), "0c7725cc0d25746c");

  const uint8arr = await Deno.readFile(new URL("./dalle.png", import.meta.url));
  assertEquals(await dhash(uint8arr), "0c7725cc0d25746c");
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

Deno.test("dhash includes non-square image edges", async () => {
  const makeImage = async (edge: number) => {
    const pixels = new Uint8Array(18 * 8);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 18; col++) {
        pixels[row * 18 + col] = col >= 4 && col < 14 ? (col - 4) * 25 : edge;
      }
    }
    return await sharp(pixels, {
      raw: { width: 18, height: 8, channels: 1 },
    }).png().toBuffer();
  };

  assertNotEquals(
    await dhash(await makeImage(0)),
    await dhash(await makeImage(255)),
  );
});

Deno.test("dhash respects EXIF orientation", async () => {
  const width = 12;
  const height = 8;
  const pixels = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      pixels[row * width + col] = col < 4 ? 20 : row < 4 ? 100 : 240;
    }
  }

  const image = sharp(pixels, {
    raw: { width, height, channels: 1 },
  });
  const exifOriented = await image.clone().png().withMetadata({
    orientation: 6,
  }).toBuffer();
  const physicallyRotated = await image.clone().rotate(90).png().toBuffer();

  assertEquals(await dhash(exifOriented), await dhash(physicallyRotated));
});

Deno.test("dhash composites transparent pixels on white", async () => {
  const makeImage = async (hiddenValue: (index: number) => number) => {
    const pixels = new Uint8Array(9 * 8 * 4);
    for (let i = 0; i < 9 * 8; i++) {
      pixels[i * 4] = hiddenValue(i);
      pixels[i * 4 + 1] = hiddenValue(i + 1);
      pixels[i * 4 + 2] = hiddenValue(i + 2);
      pixels[i * 4 + 3] = 0;
    }
    return await sharp(pixels, {
      raw: { width: 9, height: 8, channels: 4 },
    }).png().toBuffer();
  };
  const white = await sharp({
    create: {
      width: 9,
      height: 8,
      channels: 3,
      background: "white",
    },
  }).png().toBuffer();

  assertEquals(
    await dhash(await makeImage((i) => i % 256)),
    await dhash(white),
  );
  assertEquals(
    await dhash(await makeImage((i) => 255 - (i % 256))),
    await dhash(white),
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
  assertEquals(compare(res[0], res[2]), 7);
  assertEquals(compare(res[0], res[3]), 22);
  assertEquals(compare(res[0], res[4]), 1);
  assertEquals(compare(res[0], res[5]), 4);
});

Deno.test("print", async () => {
  const hash = await dhash("./tests/dalle.png");
  assertEquals(
    toAscii(hash),
    `░░░░░░░░████░░░░
    ░░██████░░██████
    ░░░░██░░░░██░░██
    ████░░░░████░░░░
    ░░░░░░░░████░░██
    ░░░░██░░░░██░░██
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
