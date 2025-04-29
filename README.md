# @seriouslag/openapi-ts-nx-plugin

[![NPM Version](https://img.shields.io/npm/v/%40seriouslag%2Fnx-openapi-ts-plugin?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40seriouslag%2Fnx-openapi-ts-plugin)](https://www.npmjs.com/package/@seriouslag/nx-openapi-ts-plugin)

This repo to to develop and test the [@seriouslag/nx-openapi-ts-plugin](https://www.npmjs.com/package/@seriouslag/nx-openapi-ts-plugin)

The package is a NX plugin that assits with the automation of generating NX projects to a workspace based off an OpenAPI spec file.
Under the hood it uses [@hey-api/openapi-ts](https://github.com/hey-api/openapi-ts) to generate client code from the OpenAPI spec file.

This plugin helps generate packages to be linked correctly in the NX environment and to provide executors to update the client code when an change in the spec file is detected.

## install dependencies

```bash
pnpm install
```

## To run the plugin

```bash
# run the generator to generate a package
npx nx run @seriouslag/nx-openapi-ts-plugin:build && nx g @seriouslag/nx-openapi-ts-plugin:openapi-client pokemon-api --directory ./packages --scope @test-api --client @hey-api/client-fetch --spec https://raw.githubusercontent.com/seriouslag/pokemon-api-spec/refs/heads/main/spec.yaml --plugins @tanstack/react-query  --private false --verbose

# Install will happen automatically after new package is generated

# runs the executor to update the generated package
npx nx run @test-api/pokemon-api:updateApi
# There will be no update since the spec is the same
# This result will be cached by nx, for a new result the API spec file must change or the `--skip-nx-cache --force` flags must be used

# to test an update: Ether change the source spec file or make a change to one of the routes paths in the cached spec file located at ./packages/pokemon-api/src/spec.yaml
# then run the executor again and you will see it recreate the client code
npx nx run @test-api/pokemon-api:updateApi --skip-nx-cache --force
```

After running the generator you will see a new package in the packages folder named pokemon-api.

## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve test-plugin
```

To create a production bundle:

```sh
npx nx build test-plugin
```

To see all available targets to run for a project, run:

```sh
npx nx show project test-plugin
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/react:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/react:lib mylib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/tutorials/react-monorepo-tutorial?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
