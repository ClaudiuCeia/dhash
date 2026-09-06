import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { publicPackageMetadata } from "./package_metadata.ts";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const denoJson = JSON.parse(await readFile("deno.json", "utf8"));
const denoTestJson = JSON.parse(await readFile("deno.test.json", "utf8"));
const readme = await readFile("README.md", "utf8");
const readmeTest = await readFile("examples/readme.test.ts", "utf8");

const expectedDescription =
  "Compute 64-bit dHash perceptual hashes and compare near-duplicate images.";
const expectedHomepage = "https://dhash.claudiuceia.deno.net/";
const requiredKeywords = [
  "dhash",
  "perceptual-hash",
  "near-duplicate",
  "duplicate-detection",
  "image-deduplication",
];

assert.equal(
  packageJson.version,
  denoJson.version,
  "package.json and deno.json versions must match",
);
assert.equal(
  `npm:sharp@${packageJson.dependencies.sharp}`,
  denoJson.imports.sharp,
  "package.json and deno.json Sharp versions must match",
);
assert.equal(
  denoTestJson.imports.sharp,
  denoJson.imports.sharp,
  "deno.test.json and deno.json Sharp versions must match",
);

assert.equal(packageJson.description, expectedDescription);
assert.equal(packageJson.homepage, expectedHomepage);
for (const keyword of requiredKeywords) {
  assert.ok(
    packageJson.keywords.includes(keyword),
    `Missing keyword: ${keyword}`,
  );
}

const packedMetadata = publicPackageMetadata(packageJson, {});
for (const field of [
  "description",
  "homepage",
  "repository",
  "bugs",
  "keywords",
  "engines",
  "sideEffects",
] as const) {
  assert.deepEqual(
    packedMetadata[field],
    packageJson[field],
    `npm packing must copy ${field} from package.json`,
  );
}
assert.equal(packedMetadata.dependencies.sharp, packageJson.dependencies.sharp);

assert.match(readme, /from "@claudiu-ceia\/dhash"/);
assert.match(readme, /from "jsr:@claudiu-ceia\/dhash"/);
const readmeDistances = [
  ["reference", 0],
  ["watermark", 2],
  ["stickers", 9],
  ["heavyWatermark", 15],
  ["crop", 22],
] as const;
assert.match(
  readme,
  new RegExp(
    readmeDistances
      .map(([, distance]) => `<td>distance ${distance}</td>`)
      .join("\\s*"),
  ),
  "README fixture distance columns are out of sync",
);
for (const [name, distance] of readmeDistances) {
  assert.match(
    readmeTest,
    new RegExp(`${name}:\\s*${distance},`),
    `README ${name} distance is not backed by its test`,
  );
}
