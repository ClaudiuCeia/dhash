import sharp from "sharp";
import { normalize, resolve } from "@std/path";

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

export const invertHash = (hash: string): string => {
  const v = BigInt("0x" + hash);
  return ((~v) & MASK_64).toString(16).padStart(16, "0");
};

export const dhash = async (
  pathOrSrc: string | Uint8Array,
  options: DHashOptions = {},
): Promise<string> => {
  let file = pathOrSrc;

  if (typeof pathOrSrc === "string") {
    const resolvedPath = resolve(Deno.cwd(), normalize(pathOrSrc));

    try {
      file = await Deno.readFile(resolvedPath);
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

export const compare = (hash1: string, hash2: string): number => {
  if (hash1.length !== hash2.length) {
    throw new Error(`
        Hashes should be of the same length.
        Got ${hash1} of ${hash1.length} and ${hash2} of ${hash2.length}
    `);
  }
  const a = BigInt("0x" + hash1);
  const b = BigInt("0x" + hash2);
  const xor = a ^ b;

  return xor.toString(2).split("1").length - 1;
};

export const toAscii = (hash: string, chars = ["░░", "██"]): string => {
  // Use BigInt to avoid precision loss; always render 64 bits (8x8).
  const bin = BigInt("0x" + hash).toString(2).padStart(64, "0");
  let out = "";

  for (let i = 0; i < 64; i++) {
    out += bin[i] === "0" ? chars[0] : chars[1];
    if ((i + 1) % 8 === 0 && i !== 63) out += "\n";
  }

  return out;
};

export async function raw(hash: string): Promise<Uint8Array> {
  const bin = BigInt("0x" + hash).toString(2).padStart(64, "0");

  const pixels = new Uint8Array(8 * 8); // grayscale 0–255

  for (let i = 0; i < 64; i++) {
    pixels[i] = bin[i] === "1" ? 0 : 255; // black or white
  }

  const image = sharp(pixels, {
    raw: { width: 8, height: 8, channels: 1 },
  });

  return await image.png().toBuffer();
}

export async function save(hash: string, filePath: string): Promise<void> {
  const buffer = await raw(hash);
  await Deno.writeFile(`${filePath}.png`, buffer);
}
