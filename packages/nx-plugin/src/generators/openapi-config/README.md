# OpenAPI Config Generator

Creates an `openapi-ts.config.*` file inside an existing Nx project so Nx inferred tasks can detect and infer targets from it.

## Usage

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-config --project=@my-org/my-api
```

## Options

- `project`: Project name to generate the config for. (required)
- `spec`: OpenAPI input path or URL. (default: `api/spec.yaml`)
- `output`: Generated output path. (default: `src/generated`)
- `client`: Client plugin. (default: `@hey-api/client-fetch`)
- `plugins`: Additional plugins. (default: `@hey-api/typescript,@hey-api/sdk`)
- `extension`: Config extension. (default: `ts`) (`ts` | `js` | `mjs` | `cjs`)
- `overwrite`: Overwrite existing file. (default: `false`)
