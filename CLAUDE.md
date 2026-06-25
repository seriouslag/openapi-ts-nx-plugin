# CLAUDE.md — Project guide for AI assistants

This file captures the non-obvious rules and invariants for this repo. Read it before making any commits, version changes, or CI modifications.

---

## Repo layout

```
/
├── packages/nx-plugin/   # @seriouslag/nx-openapi-ts-plugin — the only published package
├── apps/test-plugin/     # React playground (not published)
├── .github/workflows/    # CI, release, publish, sync pipelines
├── cliff.toml            # git-cliff changelog config
└── renovate.json         # Renovate dependency update config
```

---

## Commit conventions

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/). The `cliff.toml` config parses these to generate `CHANGELOG.md` on every release.

**Format:** `type(scope): description`

| Type       | Use for                                |
| ---------- | -------------------------------------- |
| `feat`     | New user-facing feature                |
| `fix`      | Bug fix                                |
| `docs`     | Documentation only                     |
| `refactor` | Code change with no behavior change    |
| `test`     | Adding or fixing tests                 |
| `ci`       | CI workflow changes                    |
| `chore`    | Maintenance (dep bumps, tooling, etc.) |
| `perf`     | Performance improvement                |

**Scope** should be the affected area: `nx-plugin`, `release`, `deps`, etc.

**Breaking changes:** append `!` after the type/scope — e.g. `feat(nx-plugin)!: rename option` — or add a `BREAKING CHANGE:` footer. cliff groups these prominently in the changelog.

### Reserved commit patterns — never write these manually

| Pattern                                           | Owner                  | Why                                                                     |
| ------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `chore(release): vX.Y.Z`                          | `release.yml` bot      | Triggers the infinite-loop guard; writing it manually skips the release |
| `chore(deps): bump @hey-api/openapi-ts to ^X.Y.Z` | `sync-openapi.yml` bot | Version-mirror logic runs only in that workflow                         |

Writing either pattern manually will either silently skip a release (the `release.yml` guard filters on this prefix) or produce a version that violates the policy check and breaks CI.

---

## Versioning — the mirror constraint

**The plugin version must mirror `@hey-api/openapi-ts`:** `major.minor` must match, and `patch` must be ≥ the openapi-ts patch.

Examples of valid versions when openapi-ts is `0.99.0`:

- `0.99.0` ✅
- `0.99.3` ✅ (plugin-only patch releases)
- `0.99` ✅
- `1.0.0` ❌ (major mismatch)
- `0.98.5` ❌ (minor mismatch)

**Never manually edit `packages/nx-plugin/package.json` `version`.** The release pipeline owns this field. Use the scripts instead:

```bash
# Check whether the current version satisfies the policy
pnpm run version:check:nx-plugin

# Sync the plugin version to match the current openapi-ts dep exactly
pnpm run version:sync:nx-plugin

# Bump the plugin patch (for plugin-only changes when openapi-ts hasn't changed)
pnpm run version:bump:nx-plugin
```

The version check runs on every CI push and every publish. A misaligned version will fail CI.

---

## Release pipeline

```
push to main (packages/nx-plugin/**)
  └─► release.yml
        ├─ determines mode: sync | patch | none
        ├─ bumps packages/nx-plugin/package.json (if needed)
        ├─ runs git-cliff → prepends entry to CHANGELOG.md
        ├─ commits "chore(release): vX.Y.Z" + pushes tag
        └─► dispatches publish.yml
              └─ npm publish --provenance (OIDC, no token)
```

Key facts:

- `release.yml` pushes directly to `main` (no PR). Branch protection must allow the `github-actions[bot]`.
- A tag push made with `GITHUB_TOKEN` does not trigger workflows — that is why `publish.yml` is dispatched manually via `gh workflow run`.
- Preview releases are triggered by a `/preview` comment on a PR (requires write permission).

---

## Development workflow

```bash
# Install
pnpm install

# Build all
pnpm run build

# Lint (auto-fix on pre-commit via lefthook)
pnpm run lint

# Typecheck
pnpm run typecheck

# Unit tests
pnpm run test

# E2e tests (requires build output)
pnpm nx run @seriouslag/nx-openapi-ts-plugin:e2e
```

Pre-commit hooks (lefthook) run ESLint with auto-fix and Prettier on staged files automatically.

---

## Test structure

| Suite | Config                | Pattern                   | Notes                                                                   |
| ----- | --------------------- | ------------------------- | ----------------------------------------------------------------------- |
| Unit  | `vite.config.mts`     | `src/**/*.{spec,test}.ts` | Mocks `@nx/devkit`, `createClient`, etc.                                |
| E2e   | `vite.e2e.config.mts` | `src/**/*.e2e.ts`         | Uses real build output and real codegen. Requires `build` to run first. |

E2e tests that run real codegen (`openapiClient.codegen.e2e.ts`, `swagger-codegen.e2e.ts`) use `mkdtempSync` temp directories and clean up in `afterEach`. They do not mock `@hey-api/openapi-ts`.

No coverage threshold is currently enforced, but coverage is collected via `@vitest/coverage-v8`.

---

## Key integration points to watch

These dependencies have unusual constraints or update risks:

| Dep                                                   | Risk                                      | Notes                                                                                                                                                         |
| ----------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@hey-api/openapi-ts`                                 | Version-mirror constraint                 | Managed by `sync-openapi.yml`. Do not let Renovate touch it (excluded in `renovate.json`).                                                                    |
| `@nx/devkit`                                          | Generator API surface                     | Nx major versions may rename or remove tree/generator APIs. Pin upgrades and run full e2e suite after.                                                        |
| `swagger2openapi`                                     | Potentially abandoned (last release 2022) | Used only in `compareSpecs` for diff detection. Guarded by `utils.compare-spec.spec.ts`.                                                                      |
| `@hey-api/json-schema-ref-parser`                     | ESM-only                                  | Loaded via dynamic `import()` in CJS build. Do not change to a static `require()`.                                                                            |
| `latest-version`                                      | ESM-only                                  | Same constraint as above.                                                                                                                                     |
| EJS templates in `generators/openapi-client/files/**` | Silent breakage                           | These are copied verbatim at generation time. Changes to `@nx/devkit` `generateFiles` API or template variable names fail at generation time, not build time. |

---

## Changelog

`CHANGELOG.md` is auto-generated from `v0.99.3` onwards. git-cliff reads conventional commits between the last tag and the new tag and prepends an entry on every release. The `cliff.toml` at the repo root controls grouping and formatting.

- Do not hand-edit `CHANGELOG.md` above the `<!-- ... -->` comment line.
- Do not add entries manually — they will be overwritten on the next release.
- History before `v0.99.3` was maintained manually and stops at `0.0.3`.
