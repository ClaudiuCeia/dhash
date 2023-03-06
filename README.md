# dhash 
_A `dhash` implementation for Deno._

A fast algorithm that allows checking if two images are "kind of" the same (the same source image, slightly modified). Examples:

- A resized, compressed, slightly cropped, or color-altered image compared with the original
- A watermarked image versus it's source 
- Meme images (mostly the same template, different text)

It does this by computing a `perceptual hash` of each image and then using it to compare similarity.

```
Perceptual hashing is the use of a fingerprinting algorithm that produces a 
snippet or fingerprint of various forms of multimedia.
```


Based on the
["Kind of Like That"](https://www.hackerfactor.com/blog/?/archives/529-Kind-of-Like-That.html)
article by [Dr. Neal Krawetz](https://www.hackerfactor.com/about.php).

## Usage

You can compare dhash values by simply computing the Hamming distance between
them:

- A distance of 0 represents an identical, or very similar image
- A distance greater than 10 means that you're most likely dealing with a
  different image
- A distance between 1 and 10 may indicate that you're dealing with variations
  of the same base image

```ts
const [hash1, hash2] = await Promise.all([
  dhash("./tests/dalle.png"),
  dhash("./tests/dalle-copyright.png"),
]);

console.log(compare(hash1, hash2));
```

There are also two functions that you may use to display the fingerprint in a
non-hash form:

```ts
/**
     *  toAscii will return the fingerprint represented as a matrix of
     *  black/white pixels, represented by default through unicode low density
     *  and full blocks, ie:
     *
     *   ██░░██████░░░░░░
     *   ░░██░░░░░░░░░░██
     *   ██░░░░░░████░░██
     *   ░░████░░████░░██
     *   ░░░░░░░░░░░░░░██
     *   ████████░░░░░░░░
     *   ░░░░░░██░░░░░░░░
     *   ░░░░░░░░░░░░░░░░
     * /
    toAscii(hash: string, chars: [string, string]): string

    /**
     * save will render the fingerprint as an 8x8px PNG file with black and
     * white pixels, at the specified path.
     *
     * async save(hash: string, file: string): Promise<void>
     */
```

## License

MIT © [Claudiu Ceia](https://github.com/ClaudiuCeia)
