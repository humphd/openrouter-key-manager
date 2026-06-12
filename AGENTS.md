# AGENTS.md

## Project overview

- Project: `openrouter-key-manager`
- Purpose: Node.js library and CLI for creating and managing OpenRouter.ai Provisioning API keys.
- Language/runtime: TypeScript on Node.js, ESM (`"type": "module"`).
- Package manager: `pnpm`
- Build output: `dist/`

## Repository layout

- `src/index.ts` — public library exports
- `src/commands/` — command implementations for CLI/library operations
- `src/lib/` — shared helpers for API access, parsing, formatting, reports, and validation
- `src/utils/` — config and error utilities
- `src/**/*.test.ts` — unit tests colocated with source
- `src/e2e.test.ts` — end-to-end CLI tests against a real provisioning key
- `README.md` — user-facing documentation and CLI examples
- `dist/` — compiled output; do not edit by hand

## Dev workflow

Use `pnpm` for all tasks:

```bash
pnpm install
pnpm build
pnpm test
pnpm check
```

Common scripts from `package.json`:

- `pnpm build` — compile TypeScript with `tsc`
- `pnpm clean` — remove `dist/`
- `pnpm typecheck` — run TypeScript without emitting output
- `pnpm lint` — run `oxlint`
- `pnpm prettier` — format the repo
- `pnpm prettier-check` — check formatting
- `pnpm test` — run unit tests
- `pnpm test:unit` — run unit tests, excluding e2e
- `pnpm test:e2e` — build first, then run `src/e2e.test.ts`
- `pnpm check` — formatting, typecheck, lint, and tests

## Coding guidelines

- Preserve ESM-style imports/exports and `.js` extension usage in TypeScript import paths where already used.
- Keep public exports in `src/index.ts` in sync when adding or renaming library APIs.
- Prefer small, focused utilities in `src/lib/` and `src/utils/` over duplicating logic across commands.
- Keep CLI/library behavior aligned with the README examples and documented options.
- Do not edit generated files in `dist/`; change source files and rebuild.
- Maintain existing formatting style; run Prettier after non-trivial edits.

## Testing guidance

- Add or update colocated unit tests for logic changes whenever possible.
- Vitest is configured for `src/**/*.test.ts` in a Node environment.
- Coverage excludes compiled output, tests, and `bin/**`.
- `src/e2e.test.ts` requires a real `OPENROUTER_PROVISIONING_KEY` and built CLI output in `dist/bin/cli.js`.
- Prefer `pnpm test:unit` for local iteration; reserve e2e for changes that affect real CLI/API behavior.

## Environment and secrets

- The main runtime secret is `OPENROUTER_PROVISIONING_KEY`.
- Never commit real API keys, provisioning keys, or generated CSV files containing live keys.
- Be careful with test fixtures and output files: this project’s workflows can produce sensitive key material.

## When making changes

- Update `README.md` if CLI flags, behavior, output formats, or examples change.
- If adding a new command, ensure:
  - implementation exists under `src/commands/`
  - types/exports are added in `src/index.ts`
  - tests are added or updated
  - docs/examples in `README.md` are updated
- If changing file parsing, output formatting, or naming behavior, check related helpers in:
  - `src/lib/file-parser.ts`
  - `src/lib/output-formatter.ts`
  - `src/lib/key-formatter.ts`
  - `src/lib/validators.ts`

## Agent-specific notes

- Prefer reading and editing source under `src/` instead of inspecting `dist/`.
- Use `read` for file inspection, `bash` for search/discovery, `edit` for targeted changes, and `write` only for new files or full rewrites.
- Keep changes minimal and consistent with the existing architecture.
- Complete OpenRouter OpenAPI Spec at <https://openrouter.ai/openapi.json>, SDK is in node_modules if you need to read code
