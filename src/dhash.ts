import sharp from "npm:sharp@0.34.1";
import { normalize, resolve } from "@std/path";

export const dhash = async (
  pathOrSrc: string | Uint8Array,
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
      out.push(left < right ? 1 : 0);
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
  const bin = parseInt(hash, 16).toString(2).split("");
  let counter = 0;
  let row = "";
  for (const bit of bin) {
    row += bit === "0" ? chars[0] : chars[1];
    counter++;
    if (counter === 8) {
      row += "\n";
      counter = 0;
    }
  }
  return row + chars[0];
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