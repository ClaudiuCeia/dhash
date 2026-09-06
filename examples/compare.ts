import process from "node:process";
import { compare, dhash } from "@claudiu-ceia/dhash";

const [referencePath, candidatePath] = process.argv.slice(2);
if (!referencePath || !candidatePath) {
  throw new Error("Usage: compare.ts <reference-image> <candidate-image>");
}

const [reference, candidate] = await Promise.all([
  dhash(referencePath),
  dhash(candidatePath),
]);

console.log({
  reference,
  candidate,
  distance: compare(reference, candidate),
});
