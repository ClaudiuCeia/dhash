# dHash Demo (Deno Deploy)

This folder contains a small, deployable demo app for the `@claudiu-ceia/dhash`
library.

- Production demo: `https://dhash.claudiuceia.deno.net/`
- Deno Deploy config: `docs/deno.json`
- Server: `docs/main.tsx` (SSR HTML + `/hash` API)
- Client: `docs/client.js` (upload UI, hashing, sorting)

## What It Does

1. Upload up to 20 images (max 10MB each).
2. Computes a 64-bit dHash for each image by calling `POST /hash`.
3. Sorts images by similarity (Hamming distance) to a reference image you set by
   clicking a card.

Everything is in-memory; no persistence.

## Run Locally

From the repo root:

```bash
deno run -A --config docs/deno.json docs/main.ts
```

Then open `http://localhost:8000/`.

## Deploy

This app is intended to be deployed from CI using `deno deploy` and the
`DENO_DEPLOY_TOKEN` secret. See `.github/workflows/deploy-demo.yml`.
