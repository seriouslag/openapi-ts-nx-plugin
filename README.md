# @seriouslag/nx-openapi-ts-plugin

[![NPM Version](https://img.shields.io/npm/v/%40seriouslag%2Fnx-openapi-ts-plugin?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40seriouslag%2Fnx-openapi-ts-plugin)](https://www.npmjs.com/package/@seriouslag/nx-openapi-ts-plugin)
[![CI](https://github.com/seriouslag/openapi-ts-nx-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/seriouslag/openapi-ts-nx-plugin/actions/workflows/ci.yml)

An [Nx](https://nx.dev) plugin that generates TypeScript API client libraries from OpenAPI specs — powered by [`@hey-api/openapi-ts`](https://github.com/hey-api/openapi-ts) — and keeps them up to date as your API evolves.

Point the generator at a spec (local file or URL) and it scaffolds a client library that is correctly wired into your Nx workspace: tags, TypeScript project references, and an implicit dependency on the project that produces the spec. From then on, a single cached Nx target regenerates the client only when the spec actually changes.

## Why use it?

- **One command from spec to library** — scaffolds a buildable TypeScript client library with SDK functions, types, and your choice of HTTP client (`fetch`, `axios`, ...).
- **Correct Nx graph wiring** — generated projects participate in the dependency graph, so the client regenerates after the spec-producing project builds.
- **Cache-aware updates** — the `updateApi` target fetches the spec and diffs it against a cached copy; client code is only regenerated when the API actually changed, so Nx computation caching keeps CI fast.
- **Inferred targets** — the plugin detects `openapi-ts.config.*` files and infers `generateApi`/`updateApi` targets automatically, no `project.json` boilerplate required.
- **Version-aligned with `@hey-api/openapi-ts`** — the plugin's `major.minor` always matches the bundled openapi-ts version, so you always know which codegen you are getting.

## Quick start

```bash
npm install -D @seriouslag/nx-openapi-ts-plugin
```

Register the inferred-tasks plugin in `nx.json` (required for the default generator setup):

```json
{
  "plugins": ["@seriouslag/nx-openapi-ts-plugin/plugin"]
}
```

Generate a client library and keep it up to date:

```bash
# Scaffold a client library from a spec
npx nx g @seriouslag/nx-openapi-ts-plugin:openapi-client my-api \
  --scope=@my-org \
  --spec=https://petstore3.swagger.io/api/v3/openapi.json

# Later: fetch the spec, diff it, and regenerate the client only if it changed
npx nx run @my-org/my-api:updateApi
```

📖 **[Full plugin documentation →](./packages/nx-plugin/README.md)** — generators, executors, inferred tasks, and all options.

## Repository layout

| Path                  | Contents                                                             |
| --------------------- | -------------------------------------------------------------------- |
| `packages/nx-plugin/` | The published plugin: `@seriouslag/nx-openapi-ts-plugin`             |
| `apps/test-plugin/`   | React playground used to exercise the plugin locally (not published) |

## Development

### Prerequisites

This repo is pinned to **pnpm 11** via the `packageManager` field in `package.json`. Use [Corepack](https://nodejs.org/api/corepack.html) so your local pnpm matches the pinned version (and CI):

```bash
corepack enable
```

Corepack ships with Node and will automatically run the pinned pnpm version inside this repo. Running an older pnpm (e.g. pnpm 9) here will not honour the `allowBuilds` setting and installs may fail with `ERR_PNPM_IGNORED_BUILDS`.

### Common tasks

```bash
pnpm install                                        # install dependencies
pnpm run build                                      # build all projects
pnpm run lint                                       # lint (auto-fix runs on pre-commit via lefthook)
pnpm run typecheck                                  # typecheck
pnpm run test                                       # unit tests
pnpm nx run @seriouslag/nx-openapi-ts-plugin:e2e    # e2e tests (requires build output)
```

### Trying the plugin locally

```bash
# Build the plugin, then run the generator to create a package in this workspace
npx nx run @seriouslag/nx-openapi-ts-plugin:build && \
  npx nx g @seriouslag/nx-openapi-ts-plugin:openapi-client pokemon-api \
    --directory ./packages \
    --scope @test-api \
    --client @hey-api/client-fetch \
    --spec https://raw.githubusercontent.com/seriouslag/pokemon-api-spec/refs/heads/main/spec.yaml \
    --plugins @tanstack/react-query \
    --private false \
    --verbose

# Install happens automatically after the new package is generated.

# Run the executor to update the generated package
npx nx run @test-api/pokemon-api:updateApi
# There will be no update since the spec is the same. Nx caches this result;
# for a new result the spec must change, or use the flags below.

# To test an update: either change the source spec, or edit one of the route paths
# in the cached spec at ./packages/pokemon-api/src/spec.yaml — then force a rerun:
npx nx run @test-api/pokemon-api:updateApi --skip-nx-cache --force
```

### Versioning policy

The plugin version mirrors `@hey-api/openapi-ts`: `major.minor` must match, and the patch must be ≥ the openapi-ts patch (plugin-only fixes bump the patch). **Never edit `packages/nx-plugin/package.json` `version` manually** — the release pipeline owns it. Use the scripts instead:

```bash
pnpm run version:check:nx-plugin   # verify the current version satisfies the policy
pnpm run version:sync:nx-plugin    # sync the version to match the openapi-ts dep exactly
pnpm run version:bump:nx-plugin    # bump the patch for plugin-only releases
```

The check also verifies that our `@hey-api/codegen-core` range admits the version `@hey-api/openapi-ts` pins. The two must resolve to a single install — the plugin reads a project's `openapi-ts.config.*` with that package's config loader, and two copies would mean reading the config with a different loader than the generator uses, silently dropping plugin options.

Automation keeps this running hands-free:

- `sync-openapi.yml` checks npm daily and updates `@hey-api/openapi-ts` in this repo.
- `release.yml` bumps the version, generates the changelog with git-cliff, tags, and dispatches the npm publish (with provenance).

### Preview releases from PRs

Comment `/preview` on a pull request (write access required) and the workflow publishes a prerelease build tagged `pr-<pr-number>`:

```bash
pnpm add -D @seriouslag/nx-openapi-ts-plugin@pr-<pr-number>
```

Re-running `/preview` updates the same dist-tag with the latest build.

## License

[MIT](./packages/nx-plugin/LICENSE.md)
