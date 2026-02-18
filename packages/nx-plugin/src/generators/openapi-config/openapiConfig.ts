import type { Tree } from '@nx/devkit';
import {
  formatFiles,
  logger,
  readJson,
  readProjectConfiguration,
} from '@nx/devkit';

import { CONSTANTS } from '../../vars';

const defaultClient = '@hey-api/client-fetch';
const defaultPlugins = ['@hey-api/typescript', '@hey-api/sdk'];

type JsConfigModuleFormat = 'cjs' | 'esm';

export type OpenApiConfigExtension = 'cjs' | 'js' | 'mjs' | 'ts';

export interface OpenApiConfigGeneratorSchema {
  /**
   * Client plugin to use
   */
  client?: string;
  /**
   * Config extension
   */
  extension?: OpenApiConfigExtension;
  /**
   * Whether to overwrite existing config file
   */
  overwrite?: boolean;
  /**
   * Additional plugins to include in the generated config
   */
  plugins?: string[];
  /**
   * Output directory for generated files
   */
  output?: string;
  /**
   * Nx project to generate the config for
   */
  project: string;
  /**
   * OpenAPI input path or URL
   */
  spec?: string;
}

function getPlugins({
  client,
  plugins,
}: Pick<OpenApiConfigGeneratorSchema, 'client' | 'plugins'>): string[] {
  const normalizedClient = client?.trim() || defaultClient;
  const normalizedPlugins = (plugins?.length ? plugins : defaultPlugins)
    .map((plugin) => plugin.trim())
    .filter(Boolean)
    .filter((plugin) => plugin !== normalizedClient);

  return [normalizedClient, ...new Set(normalizedPlugins)];
}

function detectJsConfigModuleFormat(
  tree: Tree,
  projectRoot: string,
): JsConfigModuleFormat {
  const packageJsonPaths = [`${projectRoot}/package.json`, 'package.json'];

  for (const packageJsonPath of packageJsonPaths) {
    if (!tree.exists(packageJsonPath)) {
      continue;
    }

    const packageJson = readJson<{ type?: string }>(tree, packageJsonPath);
    if (packageJson.type === 'module') {
      return 'esm';
    }
    if (packageJson.type === 'commonjs') {
      return 'cjs';
    }
  }

  return 'cjs';
}

function renderPlugins(plugins: string[]): string {
  return plugins.map((plugin) => `    '${plugin}',`).join('\n');
}

function renderConfigFile({
  extension,
  input,
  jsModuleFormat,
  output,
  plugins,
}: {
  extension: OpenApiConfigExtension;
  input: string;
  jsModuleFormat?: JsConfigModuleFormat;
  output: string;
  plugins: string[];
}): string {
  const pluginsBlock = renderPlugins(plugins);
  const body = `  input: '${input}',
  output: '${output}',
  plugins: [
${pluginsBlock}
  ],
`;

  if (extension === 'ts') {
    return `import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
${body}});
`;
  }

  const isCjs = extension === 'cjs' || jsModuleFormat === 'cjs';
  if (isCjs) {
    return `/** @type {import('@hey-api/openapi-ts').UserConfig} */
module.exports = {
${body}};
`;
  }

  return `/** @type {import('@hey-api/openapi-ts').UserConfig} */
export default {
${body}};
`;
}

export default async function openApiConfigGenerator(
  tree: Tree,
  options: OpenApiConfigGeneratorSchema,
) {
  const {
    client,
    extension = 'ts',
    overwrite = false,
    output = `src/${CONSTANTS.GENERATED_DIR_NAME}`,
    project,
    spec = `${CONSTANTS.SPEC_DIR_NAME}/${CONSTANTS.SPEC_FILE_NAME}`,
  } = options;

  const projectConfig = readProjectConfiguration(tree, project);
  const configPath = `${projectConfig.root}/openapi-ts.config.${extension}`;

  if (tree.exists(configPath) && !overwrite) {
    throw new Error(
      `Config file already exists at ${configPath}. Re-run with --overwrite=true to replace it.`,
    );
  }

  const plugins = getPlugins({ client, plugins: options.plugins });
  const jsModuleFormat =
    extension === 'js'
      ? detectJsConfigModuleFormat(tree, projectConfig.root)
      : undefined;
  const configContent = renderConfigFile({
    extension,
    input: spec,
    jsModuleFormat,
    output,
    plugins,
  });

  tree.write(configPath, configContent);
  await formatFiles(tree);
  logger.info(`Generated OpenAPI config: ${configPath}`);
}
