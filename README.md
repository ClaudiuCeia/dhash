# dhash

_A `dhash` implementation for Deno._

A fast algorithm that allows checking if two images are "kind of" the same (the
same source image, slightly modified). Examples:

- A resized, compressed, slightly cropped, or color-altered image compared with
  the original
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

You can compare dhash values by simply computing the Hamming distance between
them:

- A distance of 0 represents an identical, or very similar image
- A distance greater than 10 means that you're most likely dealing with a
  different image
- A distance between 1 and 10 may indicate that you're dealing with variations
  of the same base image

```ts
import { compare, dhash } from "jsr:@claudiu-ceia/dhash";

const [hash1, hash2] = await Promise.all([
  dhash("./tests/dalle.png"),
  dhash("./tests/dalle-copyright.png"),
]);

console.log(compare(hash1, hash2));
```

Bit convention: this implementation sets bit `1` when the pixel intensity
increases left-to-right (`left < right`). Use `dhash(src, { invert: true })` if
you need the opposite convention to match another implementation.

## API

In addition to `dhash()` and `compare()`:

```ts
toAscii(hash: string, chars?: [string, string]): string
raw(hash: string): Promise<Uint8Array> // PNG bytes for the 8x8 fingerprint
save(hash: string, filePath: string): Promise<void> // writes `${filePath}.png`
```

`toAscii()` always renders an 8x8 matrix (64 bits); leading zero bits are
preserved.

## Development

- Run all checks: `deno task check`.
- Run only tests: `deno task test` (requires
  `--allow-read --allow-write --allow-ffi --allow-env` because `sharp` uses
  native bindings, reads fixtures, and the `save()` test writes to a temporary
  directory).
- Preview the JSR package: `deno publish --dry-run`.

## License

MIT © [Claudiu Ceia](https://github.com/ClaudiuCeia)
