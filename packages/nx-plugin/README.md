# @seriouslag/nx-openapi-ts-plugin

[![NPM Version](https://img.shields.io/npm/v/%40seriouslag%2Fnx-openapi-ts-plugin?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40seriouslag%2Fnx-openapi-ts-plugin)](https://www.npmjs.com/package/@seriouslag/nx-openapi-ts-plugin)

An [Nx](https://nx.dev) plugin that generates TypeScript API client libraries from OpenAPI specs — powered by [`@hey-api/openapi-ts`](https://github.com/hey-api/openapi-ts) — and keeps them up to date as your API evolves.

Point the generator at a spec (local file or URL) and it scaffolds a client library that is correctly wired into your Nx workspace. From then on, a single cached Nx target regenerates the client only when the spec actually changes.

## Why this plugin?

- **One command from spec to library** — scaffolds a buildable TypeScript client library with SDK functions, types, and your choice of HTTP client (`fetch`, `axios`, ...).
- **Correct Nx graph wiring** — generated projects get tags and TypeScript project references. If the spec file lives in another project in your workspace, that project becomes an implicit dependency, so the client regenerates after the spec producer builds.
- **Cache-aware updates** — the `update-api` executor fetches the spec and diffs it against a cached copy. Client code is only regenerated when the API actually changed, so Nx computation caching keeps CI fast.
- **Inferred targets** — the plugin detects `openapi-ts.config.*` files and infers `generateApi`/`updateApi` targets automatically, no `project.json` boilerplate required.
- **Version-aligned with `@hey-api/openapi-ts`** — see [Versioning](#versioning).

## Installation

```bash
npm install -D @seriouslag/nx-openapi-ts-plugin
# or
pnpm add -D @seriouslag/nx-openapi-ts-plugin
```

Then register the inferred-tasks plugin in your `nx.json`:

```json
{
  "plugins": ["@seriouslag/nx-openapi-ts-plugin/plugin"]
}
```

> **Note:** this step is required for the default generator setup. The `openapi-client` generator uses inferred tasks by default (`useInferredTasks: true`), meaning generated projects have no explicit targets in `project.json` — the plugin infers them from the project's `openapi-ts.config.*` file. If you skip plugin registration, targets like `updateApi` will not exist. Alternatively, generate with `--useInferredTasks=false` to write explicit targets instead.

## Quick start

```bash
# Generate a client library from a spec
npx nx g @seriouslag/nx-openapi-ts-plugin:openapi-client my-api \
  --scope=@my-org \
  --spec=https://petstore3.swagger.io/api/v3/openapi.json

# Later: fetch the spec, diff it, and regenerate the client only if it changed
npx nx run @my-org/my-api:updateApi
```

## Generators

### openapi-client

Scaffolds a new API client library from an OpenAPI spec. Run without arguments for interactive prompts:

```bash
npx nx g @seriouslag/nx-openapi-ts-plugin:openapi-client
```

Or fully specified:

```bash
npx nx g @seriouslag/nx-openapi-ts-plugin:openapi-client my-api \
  --scope=@my-org \
  --directory=libs \
  --spec=./api/spec.yaml \
  --client=@hey-api/client-fetch \
  --plugins=@tanstack/react-query \
  --tags=api,openapi
```

[Additional docs](./src/generators/openapi-client/README.md)

#### Options

<!-- options:openapi-client:start -->

| Option              | Type       | Default                 | Description                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`              | `string`   | _required_              | The name of the project.                                                                                                                                                                                                                                                                                                                                                                              |
| `scope`             | `string`   | _required_              | The scope of the project.                                                                                                                                                                                                                                                                                                                                                                             |
| `spec`              | `string`   | _required_              | Path to the OpenAPI spec file (URL or local path).                                                                                                                                                                                                                                                                                                                                                    |
| `directory`         | `string`   | `libs`                  | Directory where the library will be created.                                                                                                                                                                                                                                                                                                                                                          |
| `client`            | `string`   | `@hey-api/client-fetch` | The type of client to generate (@hey-api/client-fetch, @hey-api/client-axios, etc). Pin a version with e.g. @hey-api/client-fetch@1.x.x.                                                                                                                                                                                                                                                              |
| `plugins`           | `string[]` | `[]`                    | The plugins to be provided to @hey-api/openapi-ts.                                                                                                                                                                                                                                                                                                                                                    |
| `tags`              | `string[]` | `api,openapi`           | Tags to add to the library (comma-separated). Specifying this option replaces the defaults.                                                                                                                                                                                                                                                                                                           |
| `test`              | `string`   | `none`                  | The test runner to use. One of: `none`, `vitest`, `jest`.                                                                                                                                                                                                                                                                                                                                             |
| `private`           | `boolean`  | `true`                  | Whether to make the generated package private. Set to false if you want to publish the package.                                                                                                                                                                                                                                                                                                       |
| `asClass`           | `boolean`  | `false`                 | Whether to use the class style for the generated code. Currently not working.                                                                                                                                                                                                                                                                                                                         |
| `baseTsConfigName`  | `string`   | —                       | The name of the base tsconfig file that contains the compiler paths used to resolve the imports. Use this if the base tsconfig file is in the workspace root. If provided with a baseTsConfigPath then the baseTsConfigName will be added to the path. Do not use this if the baseTsConfigPath is a file.                                                                                             |
| `baseTsConfigPath`  | `string`   | —                       | The path to the base tsconfig file that contains the compiler paths used to resolve the imports. Use this if the base tsconfig file is not in the workspace root. This can be a file or a directory. If it is a directory and the baseTsConfigName is provided then the baseTsConfigName will be added to the path. If it is a file and the baseTsConfigName is provided then there will be an error. |
| `serveCmdName`      | `string`   | —                       | The command name used to serve the implicit dependencies when watching for spec changes. Defaults to `serve`.                                                                                                                                                                                                                                                                                         |
| `projectReferences` | `boolean`  | `true`                  | Whether to add TypeScript project references for the generated project.                                                                                                                                                                                                                                                                                                                               |
| `useInferredTasks`  | `boolean`  | `true`                  | Whether to use Nx inferred tasks instead of explicit targets. When true, the generator will only create minimal project configuration and rely on the plugin to infer targets from openapi-ts.config.\*. Requires the plugin to be registered in nx.json.                                                                                                                                             |

<!-- options:openapi-client:end -->

### openapi-config

Generates an `openapi-ts.config.*` file for an **existing** Nx project. Use it to:

- Add inferred OpenAPI targets to an existing project.
- Migrate a manually configured project to plugin-managed config.
- Recreate the config with different options (`spec`, `output`, `plugins`, `extension`).

Use `openapi-client` instead when you need to scaffold a brand-new client library.

```bash
# Interactive: prompts for the spec when --spec is not passed
npx nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api

# Non-interactive (CI-friendly)
npx nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api --spec=./api/spec.yaml
```

[Additional docs](./src/generators/openapi-config/README.md)

#### Options

<!-- options:openapi-config:start -->

| Option      | Type       | Default                            | Description                                                                       |
| ----------- | ---------- | ---------------------------------- | --------------------------------------------------------------------------------- |
| `project`   | `string`   | _required_                         | Project name that should receive the openapi-ts config.                           |
| `spec`      | `string`   | —                                  | OpenAPI input path or URL.                                                        |
| `output`    | `string`   | `src/generated`                    | Generated output path.                                                            |
| `client`    | `string`   | `@hey-api/client-fetch`            | Client plugin to include.                                                         |
| `plugins`   | `string[]` | `@hey-api/typescript,@hey-api/sdk` | Additional plugins to include (defaults to @hey-api/typescript and @hey-api/sdk). |
| `extension` | `string`   | `ts`                               | Config file extension. One of: `ts`, `js`, `mjs`, `cjs`.                          |
| `overwrite` | `boolean`  | `false`                            | Overwrite the config file if it already exists.                                   |

<!-- options:openapi-config:end -->

## Executors

### update-api

Fetches the OpenAPI spec, compares it against the cached copy, and regenerates the client only if the API changed. Generated projects come pre-wired with this executor (or an inferred `updateApi` target), with options populated by the generator:

```bash
npx nx run @my-org/my-api:updateApi
```

#### Options

<!-- options:update-api:start -->

| Option      | Type                   | Default                 | Description                                                                                                                       |
| ----------- | ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `name`      | `string`               | _required_              | The name of the project.                                                                                                          |
| `scope`     | `string`               | _required_              | The scope of the project.                                                                                                         |
| `spec`      | `string`               | _required_              | Path to the OpenAPI spec file (URL or local path).                                                                                |
| `directory` | `string`               | `libs`                  | Directory where the library will be created.                                                                                      |
| `client`    | `string`               | `@hey-api/client-fetch` | The type of client to generate (@hey-api/client-fetch, @hey-api/client-axios, etc).                                               |
| `plugins`   | `(string \| object)[]` | `[]`                    | The plugins to be provided to @hey-api/openapi-ts. Items are plugin names or objects like { "name": "...", "asClass": true }.     |
| `force`     | `boolean`              | `false`                 | If true, the Client code will be regenerated even if the spec has not changed, also pass --skip-nx-cache to avoid caching issues. |
| `watch`     | `boolean`              | `false`                 | If true, the client will be watched for changes and regenerated when they occur.                                                  |

<!-- options:update-api:end -->

#### Spec file notes

- If the spec is a **relative path** to a file inside another workspace project, that project is added as an implicit dependency — the assumption is that it generates the spec on build.
- If the spec is a **URL**, it is fetched during cache checks to determine whether the client code needs to be regenerated.

## Inferred tasks

When the plugin is registered in `nx.json` (see [Installation](#installation)), it detects `openapi-ts.config.{ts,js,mjs,cjs}` files and creates targets for those projects automatically:

- **`generateApi`** — runs `@hey-api/openapi-ts` using the project's config file.
- **`updateApi`** — runs the [`update-api` executor](#update-api) to fetch and compare specs, regenerating only if the API changed.

Target names and tags are configurable:

```json
{
  "plugins": [
    {
      "plugin": "@seriouslag/nx-openapi-ts-plugin/plugin",
      "options": {
        "generateApiTargetName": "generateApi",
        "updateApiTargetName": "updateApi",
        "buildTargetName": "build",
        "tags": ["api", "openapi"]
      }
    }
  ]
}
```

<!-- options:plugin:start -->

| Option                  | Type       | Default       | Description                           |
| ----------------------- | ---------- | ------------- | ------------------------------------- |
| `generateApiTargetName` | `string`   | `generateApi` | The name of the generateApi target.   |
| `updateApiTargetName`   | `string`   | `updateApi`   | The name of the updateApi target.     |
| `buildTargetName`       | `string`   | `build`       | The name of the build target.         |
| `tags`                  | `string[]` | —             | Tags to add to the inferred projects. |

<!-- options:plugin:end -->

## Versioning

This package's version tracks `@hey-api/openapi-ts`: the `major.minor` always matches the bundled openapi-ts version, and the patch may be higher for plugin-only fixes. For example, plugin `0.99.5` bundles openapi-ts `0.99.x`. A daily automation picks up new openapi-ts releases and publishes a matching plugin version.

## Contributing

Issues and PRs are welcome at [seriouslag/openapi-ts-nx-plugin](https://github.com/seriouslag/openapi-ts-nx-plugin). See the repo README for development setup, the release pipeline, and how to get preview builds published from PRs.

## License

[MIT](https://github.com/seriouslag/openapi-ts-nx-plugin/blob/main/packages/nx-plugin/LICENSE.md)
