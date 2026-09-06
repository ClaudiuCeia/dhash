# Near-duplicate image comparison demo

This folder contains the Deno Deploy demo for `@claudiu-ceia/dhash`.

- Production demo: `https://dhash.claudiuceia.deno.net/`
- Deno Deploy config: `docs/deno.json`
- Server: `docs/main.tsx` with SSR HTML and the `/hash` API
- Client: `docs/client.js` with the upload, threshold, and ranking UI

## What it does

1. Accepts up to 20 images with a 10 MiB limit for each image.
2. Computes a 64-bit dHash for each image on the server.
3. Ranks images by Hamming distance from a selected reference.
4. Marks distances within a threshold selected by the user.

The threshold is an application-defined example. The demo explains that dHash is
not crop invariant and that an equal fingerprint does not prove equal files.

## Run locally

From the repository root:

```bash
deno run --config docs/deno.json \
  --allow-net=0.0.0.0:8000 \
  --allow-read=docs,node_modules \
  --allow-ffi \
  --allow-env \
  docs/main.ts
```

Then open `http://localhost:8000/`.

## Deploy

CI deploys the app with `deno deploy` and the `DENO_DEPLOY_TOKEN` secret. See
`.github/workflows/deploy-demo.yml`.
