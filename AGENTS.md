# Repository Guidelines

## Project Structure & Module Organization

- `mod.ts`: public entrypoint; re-exports the library API.
- `src/`: implementation (currently `src/dhash.ts`).
- `tests/`: shared Bun/Deno tests (`*.test.ts`) and image fixtures.
- `package.json`: Bun-first development dependencies and scripts.
- `deno.json`: JSR package metadata and Deno compatibility tasks.

Keep public exports flowing through `mod.ts`. If you add a new public
function/type, export it from `mod.ts` and add/adjust tests under `tests/`.

## Build, Test, and Development Commands

- `bun run check`: runs formatting, linting, TypeScript, CSS, and library tests.
- `bun test`: runs the shared library suite with Bun.
- `bun run check:deno`: validates the library and demo with Deno.
- `bun run check:npm`: builds and tests the generated npm package with Bun and
  Node.js.
- `bun run pack:npm`: builds `dhash.tgz` for npm.

## Coding Style & Naming Conventions

- TypeScript; follow `oxfmt` output for shared library code and tests. Deno-only
  scripts and demo code remain formatted by `deno fmt`.
- Prefer runtime-neutral Node APIs in shared library code and tests. Use
  `@std/*` imports via import mappings only in Deno-specific scripts or demo
  code.
- Naming:
  - exported functions: `camelCase` (e.g. `toAscii`, `compare`).
  - test files: `*.test.ts`.

## Testing Guidelines

- Use `test` from `bun:test` and runtime-neutral Node APIs in shared library
  tests. `deno.test.json` remaps `bun:test` for Deno compatibility.
- Optional coverage: `bun run coverage`.
- If you change hashing behavior, update expected hashes and/or fixtures in
  `tests/` intentionally (include rationale in the PR).

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits in this repo: `feat: ...`,
  `fix: ...`, `chore: ...`, optionally scoped like `fix(dhash): ...`.
- PRs should include:
  - what changed and why (short, concrete),
  - how to verify (e.g. `deno task test`),
  - notes on permission changes or dependency changes (especially
    `npm:sharp@...`) and any lockfile updates.

## Publishing

- Bump `version` in both `package.json` and `deno.json`.
- Validate locally: `bun run check`, `bun run check:deno`, and
  `bun run check:npm`.
- Preview package contents: `deno publish --dry-run`.
- Build the npm package: `bun run pack:npm`.
- Publish to JSR: `deno publish` (auth via token/login).
- Publish to npm: `bun run pack:npm` then `npm publish dhash.tgz`.
- CI publish: push a stable semver tag matching `deno.json`’s version (e.g.
  `v0.2.0`). The `publish-npm.yml` workflow validates once, publishes the tested
  npm artifact through trusted publishing (OIDC), publishes to JSR through its
  tokenless GitHub Actions flow, then creates the GitHub Release using notes
  generated from the git log since the previous `v*` tag.
