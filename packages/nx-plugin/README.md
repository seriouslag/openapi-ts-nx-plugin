# openapi-generator

This library was generated with [Nx](https://nx.dev).

## Running the generator

Run `nx g @seriouslag/nx-openapi-ts-plugin:openapi-client`

## Options

- `name`: The name of the project. (required)
- `scope`: The scope of the project. (required)
- `spec`: The path to the OpenAPI spec file. (required)
- `directory`: The directory to create the project in. (optional) (default: `libs`)
- `client`: The type of client to generate. (optional) (default: `@hey-api/client-fetch`)
- `tags`: The tags to add to the project. (optional) (default: `api,openapi`)
- `test`: The test framework to use. (optional) (default: `none`)
- `private`: Whether to make the generated package private. (optional) (default: `true`)

## Example

### Generate a public package (NX Generator)

```bash
nx g @seriouslag/nx-openapi-ts-plugin:openapi-client --name=my-api --client=@hey-api/client-fetch --scope=@my-app --directory=libs --spec=./spec.yaml --tags=api,openapi --private=false
```

### Update a package (if the spec has changed) (NX Executor)

```bash
nx run @my-app/my-api:updateApi
```
