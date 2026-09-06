import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import { compare, dhash } from "../mod.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixtureDirectory = join(root, "tests");
const readmeDirectory = join(root, "docs", "readme");
const sourcePath = join(fixtureDirectory, "earthrise.jpg");
const sourceUrl =
  "https://upload.wikimedia.org/wikipedia/commons/a/a8/NASA-Apollo8-Dec24-Earthrise.jpg";
const sourceSha256 =
  "24fd2a4f833534ca6741ed96d03b028ac1d8fda2cd129ded4d208535f541d4da";

const paths = {
  reference: sourcePath,
  watermark: join(fixtureDirectory, "earthrise-watermark.jpg"),
  stickers: join(fixtureDirectory, "earthrise-stickers.jpg"),
  heavyWatermark: join(fixtureDirectory, "earthrise-heavy-watermark.jpg"),
  crop: join(fixtureDirectory, "earthrise-crop.jpg"),
};

const svg = (content: string) =>
  Buffer.from(
    `<svg width="1200" height="1200" xmlns="http://www.w3.org/2000/svg">${content}</svg>`,
  );

const writeJpeg = async (
  path: string,
  overlays: OverlayOptions[] = [],
): Promise<void> => {
  await sharp(sourcePath)
    .resize(1200, 1200, { fit: "fill" })
    .composite(overlays)
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(path);
};

await mkdir(readmeDirectory, { recursive: true });

const source = await readFile(sourcePath);
assert.equal(
  createHash("sha256").update(source).digest("hex"),
  sourceSha256,
  `Unexpected source image. Download ${sourceUrl}`,
);

await writeJpeg(paths.watermark, [
  {
    input: svg(`
      <rect x="760" y="1055" width="390" height="88" rx="18" fill="#08111f" fill-opacity="0.64"/>
      <text x="955" y="1112" text-anchor="middle" fill="white" fill-opacity="0.92"
        font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="5">DHASH TEST</text>
    `),
  },
]);

await writeJpeg(paths.stickers, [
  {
    input: svg(`
      <g font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">
        <circle cx="178" cy="190" r="56" fill="#f97316" fill-opacity="0.88" stroke="white" stroke-width="10"/>
        <text x="178" y="207" fill="white" font-size="42">64</text>
        <circle cx="1014" cy="332" r="48" fill="#06b6d4" fill-opacity="0.88" stroke="white" stroke-width="10"/>
        <text x="1014" y="349" fill="white" font-size="44">+</text>
        <rect x="902" y="924" width="178" height="78" rx="39" fill="#a3e635" fill-opacity="0.88" stroke="white" stroke-width="10"/>
        <text x="991" y="976" fill="#172033" font-size="28">MATCH</text>
      </g>
    `),
  },
]);

await writeJpeg(paths.heavyWatermark, [
  {
    input: svg(`
      <g transform="rotate(-24 600 600)">
        <rect x="-180" y="512" width="1560" height="176" fill="#7f1d1d" fill-opacity="0.48"/>
        <text x="600" y="626" text-anchor="middle" fill="white" fill-opacity="0.78"
          font-family="Arial, sans-serif" font-size="78" font-weight="700" letter-spacing="12">WATERMARK</text>
      </g>
    `),
  },
]);

await sharp(sourcePath)
  .extract({ left: 700, top: 120, width: 1400, height: 1400 })
  .resize(1200, 1200, { fit: "fill" })
  .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
  .toFile(paths.crop);

const [reference, watermark, stickers, heavyWatermark, crop] = await Promise
  .all([
    dhash(paths.reference),
    dhash(paths.watermark),
    dhash(paths.stickers),
    dhash(paths.heavyWatermark),
    dhash(paths.crop),
  ]);
const hashes = { reference, watermark, stickers, heavyWatermark, crop };
const distances = Object.fromEntries(
  Object.entries(hashes).map(([name, hash]) => [
    name,
    compare(reference, hash),
  ]),
);

const thumbnails: Array<[keyof typeof paths, string]> = [
  ["reference", "original.webp"],
  ["watermark", "watermark.webp"],
  ["stickers", "stickers.webp"],
  ["heavyWatermark", "heavy-watermark.webp"],
  ["crop", "crop.webp"],
];
for (const [name, output] of thumbnails) {
  await sharp(paths[name])
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(join(readmeDirectory, output));
}

const previewSvg = Buffer.from(`
  <svg width="1280" height="640" xmlns="http://www.w3.org/2000/svg">
    <rect width="1280" height="640" fill="#07111f"/>
    <circle cx="1170" cy="50" r="310" fill="#0e7490" fill-opacity="0.22"/>
    <circle cx="1020" cy="670" r="390" fill="#65a30d" fill-opacity="0.12"/>
    <text x="64" y="80" fill="#a3e635" font-family="Arial, sans-serif" font-size="30" font-weight="700" letter-spacing="7">DHASH</text>
    <text x="64" y="132" fill="white" font-family="Arial, sans-serif" font-size="34" font-weight="700">64-bit near-duplicate image hashing</text>
    <text x="64" y="174" fill="#b7c4d6" font-family="Arial, sans-serif" font-size="23">Compare perceptual fingerprints by Hamming distance</text>
    <text x="92" y="585" fill="#b7c4d6" font-family="Arial, sans-serif" font-size="20">reference - distance 0</text>
    <text x="620" y="382" fill="#b7c4d6" font-family="Arial, sans-serif" font-size="20">watermark - distance ${distances.watermark}</text>
    <text x="924" y="382" fill="#b7c4d6" font-family="Arial, sans-serif" font-size="20">stickers - distance ${distances.stickers}</text>
    <text x="620" y="585" fill="#b7c4d6" font-family="Arial, sans-serif" font-size="20">heavy overlay - distance ${distances.heavyWatermark}</text>
    <text x="924" y="585" fill="#b7c4d6" font-family="Arial, sans-serif" font-size="20">crop - distance ${distances.crop}</text>
  </svg>
`);

const previewImages = await Promise.all([
  sharp(paths.reference).resize(500, 360, { fit: "cover" }).png().toBuffer(),
  sharp(paths.watermark).resize(272, 158, { fit: "cover" }).png().toBuffer(),
  sharp(paths.stickers).resize(272, 158, { fit: "cover" }).png().toBuffer(),
  sharp(paths.heavyWatermark)
    .resize(272, 158, { fit: "cover" })
    .png()
    .toBuffer(),
  sharp(paths.crop).resize(272, 158, { fit: "cover" }).png().toBuffer(),
]);

await sharp(previewSvg)
  .composite([
    { input: previewImages[0], left: 64, top: 202 },
    { input: previewImages[1], left: 620, top: 202 },
    { input: previewImages[2], left: 924, top: 202 },
    { input: previewImages[3], left: 620, top: 405 },
    { input: previewImages[4], left: 924, top: 405 },
  ])
  .png()
  .toFile(join(readmeDirectory, "social-preview.png"));

console.log(JSON.stringify({ hashes, distances }, null, 2));
