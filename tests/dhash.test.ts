import { test } from "bun:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp, { type Sharp } from "sharp";
import { compare, dhash, invertHash, raw, save, toAscii } from "../mod.ts";

test("sample", async () => {
  assert.deepEqual(await dhash("./tests/earthrise.jpg"), "0018001a5a0000fc");

  const uint8arr = await readFile(new URL("./earthrise.jpg", import.meta.url));
  assert.deepEqual(await dhash(uint8arr), "0018001a5a0000fc");
});

test("dhash invert matches invertHash()", async () => {
  const hash = await dhash("./tests/earthrise.jpg");
  const inv1 = await dhash("./tests/earthrise.jpg", { invert: true });
  const inv2 = invertHash(hash);
  assert.deepEqual(inv1, inv2);
});

test("dhash throws for missing files", async () => {
  const path = resolve("./tests/__does_not_exist__.png");
  await assert.rejects(() => dhash(path), {
    message: `Failed to open "${path}"`,
  });
});

test("dhash bounds encoded and decoded image sizes", async () => {
  const image = await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 3,
      background: "white",
    },
  })
    .png()
    .toBuffer();
  const directory = await mkdtemp(join(tmpdir(), "dhash-"));
  const path = `${directory}/image.png`;

  try {
    await writeFile(path, image);
    await assert.rejects(
      () => dhash(image, { maxInputBytes: image.byteLength - 1 }),
      {
        name: "RangeError",
        message: `Image exceeds the ${image.byteLength - 1}-byte input limit.`,
      },
    );
    await assert.rejects(
      () => dhash(path, { maxInputBytes: image.byteLength - 1 }),
      {
        name: "RangeError",
        message: `Image exceeds the ${image.byteLength - 1}-byte input limit.`,
      },
    );
    await assert.rejects(() => dhash(image, { limitInputPixels: 99 }), {
      message: /Input image exceeds pixel limit/,
    });
    assert.deepEqual(
      await dhash(image, { maxInputBytes: false, limitInputPixels: false }),
      "0000000000000000",
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("dhash validates image limits", async () => {
  const image = new Uint8Array();

  await assert.rejects(() => dhash(image, { maxInputBytes: 0 }), {
    name: "RangeError",
    message: "maxInputBytes must be a positive safe integer.",
  });
  await assert.rejects(
    () => dhash(image, { limitInputPixels: Number.MAX_SAFE_INTEGER + 1 }),
    {
      name: "RangeError",
      message: "limitInputPixels must be a positive safe integer.",
    },
  );
});

test("dhash includes non-square image edges", async () => {
  const makeImage = async (edge: number) => {
    const pixels = new Uint8Array(18 * 8);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 18; col++) {
        pixels[row * 18 + col] = col >= 4 && col < 14 ? (col - 4) * 25 : edge;
      }
    }
    return await sharp(pixels, {
      raw: { width: 18, height: 8, channels: 1 },
    })
      .png()
      .toBuffer();
  };

  assert.notDeepEqual(
    await dhash(await makeImage(0)),
    await dhash(await makeImage(255)),
  );
});

test("dhash respects every EXIF orientation", async () => {
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
  const transforms = [
    (source: Sharp) => source,
    (source: Sharp) => source.flop(),
    (source: Sharp) => source.rotate(180),
    (source: Sharp) => source.flip(),
    (source: Sharp) => source.flip().rotate(90),
    (source: Sharp) => source.rotate(90),
    (source: Sharp) => source.flop().rotate(90),
    (source: Sharp) => source.rotate(270),
  ];

  for (let orientation = 1; orientation <= 8; orientation++) {
    const exifOriented = await image
      .clone()
      .png()
      .withMetadata({ orientation })
      .toBuffer();
    const physicallyOriented = await transforms[orientation - 1](image.clone())
      .png()
      .toBuffer();

    assert.deepEqual(
      await dhash(exifOriented),
      await dhash(physicallyOriented),
    );
  }
});

test("dhash composites transparent pixels on white", async () => {
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
    })
      .png()
      .toBuffer();
  };
  const white = await sharp({
    create: {
      width: 9,
      height: 8,
      channels: 3,
      background: "white",
    },
  })
    .png()
    .toBuffer();

  assert.deepEqual(
    await dhash(await makeImage((i) => i % 256)),
    await dhash(white),
  );
  assert.deepEqual(
    await dhash(await makeImage((i) => 255 - (i % 256))),
    await dhash(white),
  );
});

test("dhash uses the first animated image frame", async () => {
  const width = 9;
  const height = 8;
  const channels = 3;
  const first = new Uint8Array(width * height * channels);
  const second = new Uint8Array(width * height * channels);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      for (let channel = 0; channel < channels; channel++) {
        first[(row * width + col) * channels + channel] = col * 28;
        second[(row * width + col) * channels + channel] = (8 - col) * 28;
      }
    }
  }
  const pages = new Uint8Array(first.length + second.length);
  pages.set(first);
  pages.set(second, first.length);
  const animated = await sharp(pages, {
    raw: {
      width,
      height: height * 2,
      channels,
      pageHeight: height,
    },
  })
    .gif({ loop: 0, delay: [100, 100] })
    .toBuffer();
  const firstFrame = await sharp(first, {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer();

  assert.deepEqual(await dhash(animated), await dhash(firstFrame));
});

test("toAscii renders full 64 bits", () => {
  assert.deepEqual(
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

  assert.deepEqual(
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

test("toAscii supports custom characters", () => {
  assert.deepEqual(toAscii("0", [".", "#"]).split("\n").length, 8);
});

test("compare throws on different length hashes", () => {
  assert.throws(() => compare("00", "0000"), {
    message: 'Hashes must have the same length. Got "00" (2) and "0000" (4).',
  });
});

test("hash APIs reject invalid 64-bit hex values", async () => {
  const invalidHashes = ["", "not-hex", "10000000000000000"];
  const message = "Hash must contain 1 to 16 hexadecimal characters.";

  for (const hash of invalidHashes) {
    assert.throws(() => invertHash(hash), { name: "TypeError", message });
    assert.throws(() => compare(hash, hash), { name: "TypeError", message });
    assert.throws(() => toAscii(hash), { name: "TypeError", message });
    await assert.rejects(() => raw(hash), { name: "TypeError", message });
    await assert.rejects(() => save(hash, "unused"), {
      name: "TypeError",
      message,
    });
  }
});

test("hash APIs accept short uppercase values", async () => {
  assert.deepEqual(invertHash("A"), "fffffffffffffff5");
  assert.deepEqual(compare("A", "a"), 0);
  assert.deepEqual(toAscii("A"), toAscii("a"));
  assert.deepEqual(await raw("A"), await raw("a"));

  const directory = await mkdtemp(join(tmpdir(), "dhash-"));
  try {
    await save("A", `${directory}/uppercase`);
    assert.deepEqual(
      Array.from(await readFile(`${directory}/uppercase.png`)),
      Array.from(await raw("a")),
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});

test("raw renders hash bits to a PNG buffer", async () => {
  const whitePng = await raw("0000000000000000");
  const blackPng = await raw("ffffffffffffffff");

  assert.deepEqual(
    Array.from((await sharp(whitePng).grayscale().raw().toBuffer()).values()),
    Array(64).fill(255),
  );
  assert.deepEqual(
    Array.from((await sharp(blackPng).grayscale().raw().toBuffer()).values()),
    Array(64).fill(0),
  );
});

test("save appends .png and writes the fingerprint", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dhash-"));
  const filePath = `${directory}/fingerprint`;

  try {
    await save("0000000000000000", filePath);
    const png = await readFile(`${filePath}.png`);

    assert.deepEqual(
      Array.from((await sharp(png).grayscale().raw().toBuffer()).values()),
      Array(64).fill(255),
    );
  } finally {
    await rm(directory, { recursive: true });
  }
});
