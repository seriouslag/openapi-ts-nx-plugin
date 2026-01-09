# @seriouslag/nx-openapi-ts-plugin

This plugin provides a generator and executor for generating and updating OpenAPI clients using the `@hey-api/openapi-ts` library. This can be tied in to automation and CI workflows to ensure your API clients are always up to date.

## Installation

```bash
npm install -D @seriouslag/nx-openapi-ts-plugin
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
- `test`: The type of tests to setup. [ 'none' | 'vitest' ] (optional) (default: `none`)

##### Example

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-client --name=my-api --client=@hey-api/client-fetch --scope=@my-app --directory=libs --spec=./spec.yaml --tags=api,openapi
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

## Inferred Tasks (NX Plugin)

This plugin supports NX inferred tasks, which automatically detect `openapi-ts.config.*` files and create targets without explicit configuration in `project.json`.

### Enabling Inferred Tasks

Add the plugin to your `nx.json`:

```json
{
  "plugins": [
    "@seriouslag/nx-openapi-ts-plugin/plugin"
  ]
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

This will create a minimal project configuration without explicit targets, relying on the plugin to infer them from the `openapi-ts.config.ts` file.

### Inferred Targets

When the plugin detects an `openapi-ts.config.{ts,js,mjs,cjs}` file, it creates the following targets:

- **generateApi**: Runs `npx @hey-api/openapi-ts` using the config file
- **updateApi**: Uses the `update-api` executor to fetch and compare specs, regenerating if changed
