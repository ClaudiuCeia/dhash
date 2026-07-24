import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  compare,
  dhash,
  invertHash,
  raw,
  save,
  toAscii,
} from "@claudiu-ceia/dhash";

const fixtures = process.env.DHASH_FIXTURES;
assert.ok(fixtures, "DHASH_FIXTURES must point to the image fixtures");

const expected = {
  "dalle.png": "7735ac8c2da4746c",
  "dalle-copyright.png": "7735ac0c2da4746c",
  "dalle-bolder-copyright.jpeg": "7735ac852da4746c",
  "dalle-crop.jpeg": "19e52b2908084d6c",
  "dalle-edited.jpeg": "77352c0c2da4746c",
  "dalle-stickers.jpeg": "77358c8c2da4746c",
};

const hashes = [];
for (const [name, expectedHash] of Object.entries(expected)) {
  const path = join(fixtures, name);
  const pathHash = await dhash(path);
  const bytesHash = await dhash(await readFile(path));
  assert.equal(pathHash, expectedHash);
  assert.equal(bytesHash, expectedHash);
  hashes.push(pathHash);
}

assert.equal(compare(hashes[0], hashes[1]), 1);
assert.equal(compare(hashes[0], hashes[2]), 2);
assert.equal(compare(hashes[0], hashes[3]), 27);
assert.equal(compare(hashes[0], hashes[4]), 2);
assert.equal(compare(hashes[0], hashes[5]), 1);
assert.equal(invertHash(invertHash(hashes[0])), hashes[0]);
assert.equal(toAscii(hashes[0]).split("\n").length, 8);

const png = await raw(hashes[0]);
assert.deepEqual(
  Array.from(png.slice(0, 8)),
  [137, 80, 78, 71, 13, 10, 26, 10],
);

const output = join(process.cwd(), "fingerprint");
await save(hashes[0], output);
assert.deepEqual(
  Array.from((await readFile(output + ".png")).slice(0, 8)),
  [137, 80, 78, 71, 13, 10, 26, 10],
);

await assert.rejects(() => dhash(join(fixtures, "missing.png")));
