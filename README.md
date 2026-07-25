# dhash

_A `dhash` implementation for Deno and Node.js._

A fast algorithm that allows checking if two images are "kind of" the same (the
same source image, slightly modified). Examples:

- A resized, compressed, or color-altered image compared with the original
- A watermarked image versus its source
- Meme images (mostly the same template, different text)

It does this by computing a `perceptual hash` of each image and then using it to
compare similarity.

```
Perceptual hashing is the use of a fingerprinting algorithm that produces a 
snippet or fingerprint of various forms of multimedia.
```

Based on the
["Kind of Like That"](https://www.hackerfactor.com/blog/?/archives/529-Kind-of-Like-That.html)
article by [Dr. Neal Krawetz](https://www.hackerfactor.com/about.php).

## Demo

Live demo (Deno Deploy): https://dhash.claudiuceia.deno.net/

The demo source lives in `docs/` (`docs/main.tsx`, `docs/client.js`) and is
deployed separately from the JSR package.

## Usage

Install from JSR with Deno, or directly from npm with Node.js:

```sh
deno add jsr:@claudiu-ceia/dhash
npm install @claudiu-ceia/dhash
```

The JSR package supports Deno 2.6 or newer. The npm package is ESM-only and
supports Node.js 22 or newer. Images are auto-oriented from metadata, converted
to grayscale, composited on white when transparent, and resized in full to 9x8
without cropping. Multi-frame images use their first frame.

You can compare dhash values by simply computing the Hamming distance between
them:

- A distance of 0 represents an identical, or very similar image
- A distance greater than 10 often indicates a different image
- A distance between 1 and 10 may indicate variations of the same base image

These thresholds are starting points, not guarantees; calibrate them against
your data. dHash is not crop or translation invariant. For example, the cropped
fixture in this repository has a distance of 23 from its source.

```ts
import { compare, dhash } from "@claudiu-ceia/dhash";

const [hash1, hash2] = await Promise.all([
  dhash("./tests/dalle.png"),
  dhash("./tests/dalle-copyright.png"),
]);

console.log(compare(hash1, hash2));
```

Bit convention: this implementation sets bit `1` when the pixel intensity
increases left-to-right (`left < right`). Use `dhash(src, { invert: true })` if
you need the opposite convention to match another implementation.

With Deno, hashing needs read access to Sharp's native package plus FFI and
environment access. Path inputs additionally need read access to the image, and
`save()` needs write access to its destination. Grant only the paths required by
your application.

## API

```ts
dhash(
  source: string | Uint8Array,
  options?: DHashOptions,
): Promise<string>
compare(hash1: string, hash2: string): number
invertHash(hash: string): string
toAscii(hash: string, chars?: readonly [string, string]): string
raw(hash: string): Promise<Uint8Array> // PNG bytes for the 8x8 fingerprint
save(hash: string, filePath: string): Promise<void> // writes `${filePath}.png`
```

`DHashOptions` supports `invert`, `maxInputBytes`, and `limitInputPixels`.
Encoded inputs default to a 64 MiB limit and decoded inputs to 64 megapixels;
set either limit to `false` only when the caller provides equivalent controls.

Hash helpers accept 1 to 16 case-insensitive hexadecimal characters. Values
passed to `compare()` must use the same textual length. `invertHash()` returns a
zero-padded 16-character hash.

`toAscii()` always renders an 8x8 matrix (64 bits); leading zero bits are
preserved.

## Development

- Run all checks: `deno task check`.
- Build, install, and test the npm package with Node.js: `deno task check:npm`.
- Try the experimental TypeScript 7 native checker: `deno task check:ts7`.
  Release CI continues to use Deno's stable default checker.
- Run only tests: `deno task test` (requires
  `--allow-read --allow-write --allow-ffi --allow-env` because `sharp` uses
  native bindings, reads fixtures, and the `save()` test writes to a temporary
  directory).
- Preview the JSR package: `deno publish --dry-run`.
- Build the npm package: `deno task pack:npm`.

## License

MIT © [Claudiu Ceia](https://github.com/ClaudiuCeia)
