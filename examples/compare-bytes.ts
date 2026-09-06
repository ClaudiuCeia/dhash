import { readFile } from "node:fs/promises";
import process from "node:process";
import { compare, dhash } from "@claudiu-ceia/dhash";

const [referencePath, candidatePath] = process.argv.slice(2);
if (!referencePath || !candidatePath) {
  throw new Error(
    "Usage: compare-bytes.ts <reference-image> <candidate-image>",
  );
}

const [referenceBytes, candidateBytes] = await Promise.all([
  readFile(referencePath),
  readFile(candidatePath),
]);
const [reference, candidate] = await Promise.all([
  dhash(referenceBytes),
  dhash(candidateBytes),
]);

console.log({
  reference,
  candidate,
  distance: compare(reference, candidate),
});
