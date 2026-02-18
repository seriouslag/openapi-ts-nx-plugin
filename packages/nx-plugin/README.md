# @seriouslag/nx-openapi-ts-plugin

This plugin provides a generator and executor for generating and updating OpenAPI clients using the `@hey-api/openapi-ts` library. This can be tied in to automation and CI workflows to ensure your API clients are always up to date.

## Installation

```bash
npm install -D @seriouslag/nx-openapi-ts-plugin
```

## Versioning Policy

This package version tracks `@hey-api/openapi-ts`:

- For upstream releases, match `@hey-api/openapi-ts` exactly.
  Example: if openapi-ts is `0.93.0`, plugin release is `0.93.0`.
- For plugin-only releases, bump patch by one while keeping major/minor aligned.
  Example: `0.93.0` -> `0.93.1`.
- If openapi-ts later catches up to the same patch, release at that exact upstream version.
  Example: plugin `0.93.1` and openapi-ts `0.93.1` are aligned.

Helpful commands:

```bash
# verify policy
pnpm run version:check:nx-plugin

# set package version to match @hey-api/openapi-ts
pnpm run version:sync:nx-plugin

# bump patch for plugin-only releases
pnpm run version:bump:nx-plugin
```

## Usage

### Generators

#### openapi-client

[Docs](./src/generators/openapi-client/README.md)

This plugin provides a generator for generating OpenAPI clients using the `@hey-api/openapi-ts` library.

Run in interactive mode `nx g @seriouslag/nx-openapi-ts-plugin:openapi-client`

##### Options

- `name`: The name of the project. [ string ] (required)
- `scope`: The scope of the project. [ string ] (required)
- `spec`: The path to the OpenAPI spec file. [ URI or string ] (required)
- `directory`: The directory to create the project in. [ string ] (optional) (default: `libs`)
- `client`: The type of client to generate. [ string ] (optional) (default: `@hey-api/client-fetch`)
  To specify a specific version of the client you can use `@hey-api/client-fetch@1.x.x`.
- `tags`: The tags to add to the project. [ string[] ] (optional) (default: `api,openapi`)
  The defaults tags will not be added to the project if you specify this option.
- `plugins`: Additional plugins to provide to the client api. [ string[] ] (optional)
- `test`: The type of tests to setup. [ 'none' | 'vitest' | 'jest' ] (optional) (default: `none`)

##### Example

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-client --name=my-api --client=@hey-api/client-fetch --scope=@my-app --directory=libs --spec=./spec.yaml --tags=api,openapi
```

#### openapi-config

[Docs](./src/generators/openapi-config/README.md)

Generates an `openapi-ts.config.*` file for an existing Nx project.

Run in interactive mode `nx g @seriouslag/nx-openapi-ts-plugin:openapi-config`

##### When to use

Use `openapi-config` when the project already exists and you want to add or refresh only the `openapi-ts.config.*` file.

- Add inferred OpenAPI targets to an existing Nx project.
- Migrate a manually configured project to plugin-managed config.
- Recreate config with different options (`spec`, `output`, `plugins`, `extension`).

Use `openapi-client` instead when you need to scaffold a new API client library.

##### Examples

```bash
# Interactive: prompts for spec when --spec is not passed
nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api

# Non-interactive: pass spec explicitly (CI-friendly)
nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api --spec=./api/spec.yaml
```

### Executors

#### update-api

This executor updates the OpenAPI spec file and generates a new client.
The options for the executor will be populated from the generator.

Run `nx run @my-org/my-generated-package:updateApi`

##### Options

- `spec`: The path to the OpenAPI spec file. [ URI or string ] (required)
- `name`: The name of the project. [ string ] (required)
- `scope`: The scope of the project. [ string ] (required)
- `client`: The type of client to generate. [ string ] (optional) (default: `@hey-api/client-fetch`)
- `directory`: The directory to create the project in. [ string ] (optional) (default: `libs`)
- `plugins`: Additional plugins to provide to the client api. [ string[] ] (optional) (default:[])

###### Spec File Notes

If the spec file is a relative path and is located in the workspace then the containing project will be listed as an implicit dependency.
The assumption is made that that project will generate the API spec file on build.

If the spec file is a URL then we fetch the spec during cache checks to determine if we should rebuild the client code.

## PR Preview Package

This repository supports preview npm publishes from pull requests via a slash command comment.

1. Add a comment to the PR: `/preview`
2. The workflow publishes a prerelease build tagged as `pr-<pr-number>`.
3. Install it with:
   - `pnpm add -D @seriouslag/nx-openapi-ts-plugin@pr-<pr-number>`
   - `npm install --save-dev @seriouslag/nx-openapi-ts-plugin@pr-<pr-number>`

Notes:

- Only users with write access can trigger `/preview`.
- Re-running `/preview` updates the same PR dist-tag to the latest preview build.

## Inferred Tasks (NX Plugin)

This plugin supports NX inferred tasks, which automatically detect `openapi-ts.config.*` files and create targets without explicit configuration in `project.json`.

### Enabling Inferred Tasks

Add the plugin to your `nx.json`:

```json
{
  "plugins": ["@seriouslag/nx-openapi-ts-plugin/plugin"]
}
```

Or with custom options:

```json
{
  "plugins": [
    {
      "plugin": "@seriouslag/nx-openapi-ts-plugin/plugin",
      "options": {
        "generateApiTargetName": "generateApi",
        "updateApiTargetName": "updateApi",
        "tags": ["api", "openapi"]
      }
    }
  ]
}
```

### Plugin Options

- `generateApiTargetName`: Name of the inferred generateApi target (default: `generateApi`)
- `updateApiTargetName`: Name of the inferred updateApi target (default: `updateApi`)
- `buildTargetName`: Name of the build target (default: `build`)
- `tags`: Tags to add to inferred projects

### Using with Generator

When using the generator, you can enable inferred tasks with the `useInferredTasks` option:

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-client --name=my-api --scope=@my-app --spec=./spec.yaml --useInferredTasks=true
```

This will create a minimal project configuration without explicit targets, relying on the plugin to infer them from the `openapi-ts.config.*` file.

### Inferred Targets

When the plugin detects an `openapi-ts.config.{ts,js,mjs,cjs}` file, it creates the following targets:

- **generateApi**: Runs `npx @hey-api/openapi-ts` using the config file
- **updateApi**: Uses the `update-api` executor to fetch and compare specs, regenerating if changed
