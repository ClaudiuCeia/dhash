# Repository Guidelines

## Project Structure & Module Organization

- `mod.ts`: public entrypoint; re-exports the library API.
- `src/`: implementation (currently `src/dhash.ts`).
- `tests/`: Deno tests (`*.test.ts`) and image fixtures used by the tests.
- `deno.json`: package metadata, import map, and tasks.

Keep public exports flowing through `mod.ts`. If you add a new public
function/type, export it from `mod.ts` and add/adjust tests under `tests/`.

## Build, Test, and Development Commands

- `deno task test`: runs the full test suite with the required permissions
  (`--allow-read --allow-ffi --allow-env`).
- `deno test`: useful for quick runs; mirror the permissions from
  `deno task test` if tests fail due to denied access.
- `deno fmt`: format the repo (preferred before committing).
- `deno lint`: run Deno’s linter on TypeScript sources.
- `deno check mod.ts`: type-check the public surface area.

## Coding Style & Naming Conventions

- TypeScript for Deno; follow `deno fmt` output (2-space indent, trailing commas
  where applicable).
- Prefer `@std/*` imports via `deno.json` import mappings (avoid ad-hoc path
  utilities).
- Naming:
  - exported functions: `camelCase` (e.g. `toAscii`, `compare`).
  - test files: `*.test.ts`.

## Testing Guidelines

- Use `Deno.test(...)` with `@std/assert`-style assertions (follow existing
  patterns in `tests/dhash.test.ts`).
- Optional coverage: `deno test --coverage=coverage` then
  `deno coverage coverage` (output is ignored via `.gitignore`).
- If you change hashing behavior, update expected hashes and/or fixtures in
  `tests/` intentionally (include rationale in the PR).

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits in this repo: `feat: ...`,
  `fix: ...`, `chore: ...`, optionally scoped like `fix(dhash): ...`.
- PRs should include:
  - what changed and why (short, concrete),
  - how to verify (e.g. `deno task test`),
  - notes on permission changes or dependency changes (especially
    `npm:sharp@...`) and any `deno.lock` updates.

## Publishing

- Bump `version` in `deno.json`.
- Validate locally: `deno fmt`, `deno lint`, `deno task test`.
- Preview package contents: `deno publish --dry-run`.
- Preview the npm package: `deno pack --dry-run --ignore=deno.lock`.
- Publish to JSR: `deno publish` (auth via token/login).
- Publish to npm: `deno pack --ignore=deno.lock --output dhash.tgz` then
  `npm publish dhash.tgz --access public`.
- CI publish: push a semver tag matching `deno.json`’s version (e.g. `v0.2.0`).
  GitHub Actions will run checks, publish to JSR via its tokenless GitHub
  Actions flow (OIDC), and publish to npm using the `NPM_TOKEN` repository
  secret. JSR publishing requires linking the package to this GitHub repo in the
  JSR package settings.
- CI also creates a GitHub Release for the tag using release notes generated
  from the git log since the previous `v*` tag.
