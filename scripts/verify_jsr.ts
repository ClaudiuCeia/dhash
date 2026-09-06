import { resolve } from "node:path";

type ManifestEntry = {
  size: number;
  checksum: string;
};

const version = Deno.args[0];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error("A stable package version is required.");
}
const root = resolve(Deno.args[1] ?? ".");
const config = JSON.parse(await Deno.readTextFile(`${root}/deno.json`)) as {
  name: string;
  version: string;
  imports?: Record<string, string>;
};
if (config.name !== "@claudiu-ceia/dhash" || config.version !== version) {
  throw new Error("Local package identity does not match the JSR version.");
}

const response = await fetch(
  `https://jsr.io/@claudiu-ceia/dhash/${version}_meta.json`,
  { headers: { accept: "application/json" } },
);
if (!response.ok) {
  throw new Error(`JSR metadata returned HTTP ${response.status}.`);
}
const metadata = await response.json() as {
  manifest?: Record<string, ManifestEntry>;
};
if (!metadata.manifest) throw new Error("JSR metadata has no manifest.");

const expectedFiles = [
  "/LICENSE",
  "/README.md",
  "/deno.json",
  "/docs/readme/README.md",
  "/docs/readme/crop.webp",
  "/docs/readme/heavy-watermark.webp",
  "/docs/readme/original.webp",
  "/docs/readme/stickers.webp",
  "/docs/readme/watermark.webp",
  "/mod.ts",
  "/src/dhash.ts",
];
const publishedFiles = Object.keys(metadata.manifest).sort();
if (JSON.stringify(publishedFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error("Published JSR file list differs from the local package.");
}

const encoder = new TextEncoder();
for (const path of expectedFiles) {
  let bytes = await Deno.readFile(root + path);
  if (/\.[cm]?[jt]sx?$/.test(path)) {
    let source = new TextDecoder().decode(bytes);
    for (const [specifier, target] of Object.entries(config.imports ?? {})) {
      source = source.replaceAll(`"${specifier}"`, `"${target}"`)
        .replaceAll(`'${specifier}'`, `'${target}'`);
    }
    bytes = encoder.encode(source);
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const checksum = "sha256-" + Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  const published = metadata.manifest[path];
  if (published.size !== bytes.byteLength || published.checksum !== checksum) {
    throw new Error(`Published JSR file differs from local source: ${path}`);
  }
}

console.log(`Verified @claudiu-ceia/dhash@${version} on JSR.`);
