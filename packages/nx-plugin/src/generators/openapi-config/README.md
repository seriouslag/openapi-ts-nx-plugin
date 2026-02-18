# OpenAPI Config Generator

Creates an `openapi-ts.config.*` file inside an existing Nx project so Nx inferred tasks can detect and infer targets from it.

## When To Run This Generator

Run `openapi-config` when the Nx project already exists and you only need to add or refresh `openapi-ts.config.*`.

Common cases:

- You already have a library/application and want inferred `generateApi` / `updateApi` targets.
- You created a project manually and now want to onboard it to `@hey-api/openapi-ts`.
- You want to switch config extension (`ts`, `js`, `mjs`, `cjs`) or reset config values.
- You need to replace an existing config with `--overwrite=true`.

Use `openapi-client` instead when you want to scaffold a brand new API client project from scratch.

## Usage

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api
```

If `--spec` is omitted in interactive mode, the generator prompts for the OpenAPI input path/URL.

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api
```

For non-interactive/CI usage, pass `--spec` explicitly.

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api --spec=./api/spec.yaml
```

## Options

- `project`: Project name to generate the config for. (required)
- `spec`: OpenAPI input path or URL. If omitted in interactive mode, you'll be prompted for it. (default fallback: `api/spec.yaml`)
- `output`: Generated output path. (default: `src/generated`)
- `client`: Client plugin. (default: `@hey-api/client-fetch`)
- `plugins`: Additional plugins. (default: `@hey-api/typescript,@hey-api/sdk`)
- `extension`: Config extension. (default: `ts`) (`ts` | `js` | `mjs` | `cjs`)
- `overwrite`: Overwrite existing file. (default: `false`)
