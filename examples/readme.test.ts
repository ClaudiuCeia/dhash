import { test } from "bun:test";
import assert from "node:assert/strict";
import { compare, dhash } from "@claudiu-ceia/dhash";

export const README_DISTANCES = {
  reference: 0,
  watermark: 2,
  stickers: 9,
  heavyWatermark: 15,
  crop: 22,
} as const;

test("README image comparison", async () => {
  const [reference, watermark, stickers, heavyWatermark, crop] =
    await Promise.all([
      dhash("./tests/earthrise.jpg"),
      dhash("./tests/earthrise-watermark.jpg"),
      dhash("./tests/earthrise-stickers.jpg"),
      dhash("./tests/earthrise-heavy-watermark.jpg"),
      dhash("./tests/earthrise-crop.jpg"),
    ]);

  assert.equal(compare(reference, reference), README_DISTANCES.reference);
  assert.equal(compare(reference, watermark), README_DISTANCES.watermark);
  assert.equal(compare(reference, stickers), README_DISTANCES.stickers);
  assert.equal(
    compare(reference, heavyWatermark),
    README_DISTANCES.heavyWatermark,
  );
  assert.equal(compare(reference, crop), README_DISTANCES.crop);
});
