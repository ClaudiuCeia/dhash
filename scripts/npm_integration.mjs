import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
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
  "earthrise.jpg": "0018001a5a0000fc",
  "earthrise-watermark.jpg": "0018001a5a0000f0",
  "earthrise-stickers.jpg": "809a021a5a0606f8",
  "earthrise-heavy-watermark.jpg": "00210f38f800a0fc",
  "earthrise-crop.jpg": "0000002000b0b210",
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

assert.equal(compare(hashes[0], hashes[1]), 2);
assert.equal(compare(hashes[0], hashes[2]), 9);
assert.equal(compare(hashes[0], hashes[3]), 15);
assert.equal(compare(hashes[0], hashes[4]), 22);
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
