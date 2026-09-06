import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const denoJson = JSON.parse(await readFile("deno.json", "utf8"));
const denoTestJson = JSON.parse(await readFile("deno.test.json", "utf8"));

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
