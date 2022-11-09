import {
  decode,
  GIF,
  Image,
} from "https://deno.land/x/imagescript@v1.2.14/mod.ts";
import { normalize, join } from "https://deno.land/std@0.153.0/path/mod.ts";

export const dhash = async (pathOrSrc: string | Uint8Array) => {
  let file = pathOrSrc;

  if (typeof pathOrSrc === "string") {
    const resolvedPath = join(Deno.cwd(), normalize(pathOrSrc));

    try {
      file = await Deno.readFile(resolvedPath);
    } catch {
      throw new Error(`Failed to open "${resolvedPath}"`);
    }
  }

  const image = await decode(file);
  if (image instanceof GIF) {
    throw new Error("GIF not supported");
  }

  const grayscale = image.saturation(0);
  const resized = grayscale.resize(9, 8);

  const out = [];
  for (let x = 1; x <= resized.height; x++) {
    for (let y = 1; y <= resized.height; y++) {
      const left = resized.getPixelAt(x, y);
      const right = resized.getPixelAt(x + 1, y);
      out.push(left < right ? 1 : 0);
    }
  }

  return parseInt(out.join(""), 2).toString(16);
};

export const compare = (hash1: string, hash2: string) => {
  if (hash1.length !== hash2.length) {
    throw new Error(`
        Hashes should be of the same length.
        Got ${hash1} of ${hash1.length} and ${hash2} of ${hash2.length}
    `);
  }

  let counter = 0;
  for (const [idx, c] of hash1.split("").entries()) {
    if (c !== hash2[idx]) {
      counter++;
    }
  }

  return counter;
};

export const toAscii = (hash: string, chars = ["░░", "██"]) => {
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

export const raw = async (hash: string): Promise<Uint8Array> => {
  const bin = parseInt(hash, 16).toString(2).split("");
  const out = new Image(8, 8);

  const white = Image.rgbToColor(255, 255, 255);
  const black = Image.rgbToColor(0, 0, 0);

  let column = 1;
  let row = 1;
  for (const bit of bin) {
    console.log(column, row);
    out.setPixelAt(column, row, parseInt(bit) === 1 ? black : white);
    row++;
    if (row === 9) {
      column++;
      row = 1;
    }
  }

  out.setPixelAt(8, 8, white);
  return await out.encode();
};

export const save = async (hash: string, file: string): Promise<void> => {
  const enc = await raw(hash);
  await Deno.writeFile(`${file}.png`, enc);
};
