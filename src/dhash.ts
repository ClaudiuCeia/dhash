import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { normalize, resolve } from "node:path";

/**
 * Options for {@link dhash}.
 */
export type DHashOptions = {
  /**
   * Flip the bit convention for left/right comparisons.
   *
   * Default convention is: bit=1 when left < right (increasing intensity).
   * Set invert=true to use: bit=1 when left >= right.
   */
  invert?: boolean;
};

const MASK_64 = (1n << 64n) - 1n;
const HASH_PATTERN = /^[0-9a-f]{1,16}$/i;

const parseHash = (hash: string): bigint => {
  if (!HASH_PATTERN.test(hash)) {
    throw new TypeError("Hash must contain 1 to 16 hexadecimal characters.");
  }

  return BigInt("0x" + hash);
};

/**
 * Invert a 64-bit dHash (bitwise NOT), preserving leading zeroes.
 *
 * This is useful when matching the opposite bit convention used by other
 * implementations.
 */
export const invertHash = (hash: string): string => {
  const v = parseHash(hash);
  return ((~v) & MASK_64).toString(16).padStart(16, "0");
};

/**
 * Compute the 64-bit difference hash (dHash) for an image.
 *
 * Algorithm: grayscale -> resize to 9x8 -> compare adjacent pixels left-to-right
 * to produce 64 bits -> return as 16-char hex string.
 *
 * Bit convention: by default, bit `1` means the intensity increases left-to-right
 * (`left < right`). Use `options.invert` to flip this.
 *
 * @param pathOrSrc File path (relative to the current working directory) or raw image bytes.
 * @returns 16-character lowercase hex string.
 */
export const dhash = async (
  pathOrSrc: string | Uint8Array,
  options: DHashOptions = {},
): Promise<string> => {
  let file = pathOrSrc;

  if (typeof pathOrSrc === "string") {
    const resolvedPath = resolve(normalize(pathOrSrc));

    try {
      file = await readFile(resolvedPath);
    } catch {
      throw new Error(`Failed to open "${resolvedPath}"`);
    }
  }

  const resized = await sharp(file).grayscale().resize(9, 8).raw().toBuffer();

  const out = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = resized[row * 9 + col];
      const right = resized[row * 9 + col + 1];
      const bit = left < right ? 1 : 0;
      out.push(options.invert ? 1 - bit : bit);
    }
  }
  const binary = out.join("");
  return BigInt("0b" + binary)
    .toString(16)
    .padStart(16, "0");
};

/**
 * Compare two hex hashes by computing the Hamming distance.
 *
 * Lower is more similar, higher is more different.
 */
export const compare = (hash1: string, hash2: string): number => {
  const a = parseHash(hash1);
  const b = parseHash(hash2);

  if (hash1.length !== hash2.length) {
    throw new Error(`
        Hashes should be of the same length.
        Got ${hash1} of ${hash1.length} and ${hash2} of ${hash2.length}
    `);
  }
  const xor = a ^ b;

  return xor.toString(2).split("1").length - 1;
};

/**
 * Render a hash as an 8x8 ASCII/Unicode fingerprint.
 *
 * Always renders 64 bits (leading zeros preserved). Customize the output by
 * changing the "off/on" character pair via `chars`.
 */
export const toAscii = (hash: string, chars = ["░░", "██"]): string => {
  // Use BigInt to avoid precision loss; always render 64 bits (8x8).
  const bin = parseHash(hash).toString(2).padStart(64, "0");
  let out = "";

  for (let i = 0; i < 64; i++) {
    out += bin[i] === "0" ? chars[0] : chars[1];
    if ((i + 1) % 8 === 0 && i !== 63) out += "\n";
  }

  return out;
};

/**
 * Convert a hash into an 8x8 PNG (returned as bytes).
 */
export async function raw(hash: string): Promise<Uint8Array> {
  const bin = parseHash(hash).toString(2).padStart(64, "0");

  const pixels = new Uint8Array(8 * 8); // grayscale 0–255

  for (let i = 0; i < 64; i++) {
    pixels[i] = bin[i] === "1" ? 0 : 255; // black or white
  }

  const image = sharp(pixels, {
    raw: { width: 8, height: 8, channels: 1 },
  });

  return await image.png().toBuffer();
}

/**
 * Save an 8x8 PNG fingerprint for a hash to disk.
 *
 * Note: `.png` is appended to `filePath`.
 */
export async function save(hash: string, filePath: string): Promise<void> {
  const buffer = await raw(hash);
  await writeFile(`${filePath}.png`, buffer);
}
