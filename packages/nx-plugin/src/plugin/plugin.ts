import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import type {
  CreateNodesContextV2,
  CreateNodesResult,
  CreateNodesV2,
  TargetConfiguration,
} from '@nx/devkit';
import { createNodesFromFiles, logger, workspaceRoot } from '@nx/devkit';

import { CONSTANTS } from '../vars';

/**
 * Package name constant for executor reference
 */
const PACKAGE_NAME = '@seriouslag/nx-openapi-ts-plugin';

/**
 * Configuration options for the OpenAPI plugin
 */
export interface OpenApiPluginOptions {
  /**
   * The name of the generateApi target
   * @default 'generateApi'
   */
  generateApiTargetName?: string;
  /**
   * The name of the updateApi target
   * @default 'updateApi'
   */
  updateApiTargetName?: string;
  /**
   * The name of the build target
   * @default 'build'
   */
  buildTargetName?: string;
  /**
   * Tags to add to the project
   */
  tags?: string[];
}

const defaultOptions: Required<
  Pick<
    OpenApiPluginOptions,
    'generateApiTargetName' | 'updateApiTargetName' | 'buildTargetName'
  >
> = {
  generateApiTargetName: 'generateApi',
  updateApiTargetName: 'updateApi',
  buildTargetName: 'build',
};

/**
 * Glob pattern to match openapi-ts config files
 */
const OPENAPI_CONFIG_GLOB = '**/openapi-ts.config.{ts,js,mjs,cjs}';

/**
 * Parses the openapi-ts config file to extract configuration
 */
function parseOpenApiConfig(configPath: string): {
  input: string;
  output: string;
  plugins: string[];
  client?: string;
} | null {
  try {
    const absolutePath = join(workspaceRoot, configPath);
    if (!existsSync(absolutePath)) {
      logger.warn(`Config file not found: ${absolutePath}`);
      return null;
    }

    const content = readFileSync(absolutePath, 'utf-8');

    // Extract input path from either:
    // input: '<path>'
    // input: { path: '<path>' } or input: { url: '<url>' }
    const inputMatch =
      content.match(/input:\s*['"`]([^'"`]+)['"`]/) ??
      content.match(
        /input:\s*\{[\s\S]*?(?:path|url):\s*['"`]([^'"`]+)['"`][\s\S]*?\}/,
      );
    const input =
      inputMatch?.[1] ??
      `${CONSTANTS.SPEC_DIR_NAME}/${CONSTANTS.SPEC_FILE_NAME}`;

    // Extract output path from either:
    // output: '<path>'
    // output: { path: '<path>' }
    const outputMatch =
      content.match(/output:\s*['"`]([^'"`]+)['"`]/) ??
      content.match(/output:\s*\{[\s\S]*?path:\s*['"`]([^'"`]+)['"`][\s\S]*?\}/);
    const output = outputMatch?.[1] ?? `src/${CONSTANTS.GENERATED_DIR_NAME}`;

    // Extract plugins array - look for the first plugin which is usually the client
    const pluginsMatch = content.match(/plugins:\s*\[([^\]]+)\]/s);
    const pluginsContent = pluginsMatch?.[1] ?? '';

    // Extract string plugins (simple case)
    const stringPlugins =
      pluginsContent.match(/['"`](@[^'"`]+|[^'"`@]+)['"`]/g)?.map((p) => p.replace(/['"`]/g, '')) ??
      [];

    // The first plugin is typically the client
    const client = stringPlugins.find((p) => p.includes('client-'));

    return {
      input,
      output,
      plugins: stringPlugins,
      client,
    };
  } catch (error) {
    logger.warn(`Failed to parse openapi-ts config at ${configPath}: ${error}`);
    return null;
  }
}

/**
 * Extracts project metadata from the project root
 */
function getProjectMetadata(projectRoot: string): {
  name: string;
  scope: string;
  directory: string;
} | null {
  try {
    // Try to read package.json
    const packageJsonPath = join(workspaceRoot, projectRoot, 'package.json');
    if (existsSync(packageJsonPath)) {
      const pkgJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const fullName = pkgJson.name as string;
      if (fullName) {
        // Parse scope and name from package name like @scope/name
        const scopeMatch = fullName.match(/^(@[^/]+)\/(.+)$/);
        if (scopeMatch) {
          return {
            name: scopeMatch[2],
            scope: scopeMatch[1],
            directory: dirname(projectRoot),
          };
        }
        return {
          name: fullName,
          scope: '',
          directory: dirname(projectRoot),
        };
      }
    }

    // Try to read project.json
    const projectJsonPath = join(workspaceRoot, projectRoot, 'project.json');
    if (existsSync(projectJsonPath)) {
      const projJson = JSON.parse(readFileSync(projectJsonPath, 'utf-8'));
      const fullName = projJson.name as string;
      if (fullName) {
        const scopeMatch = fullName.match(/^(@[^/]+)\/(.+)$/);
        if (scopeMatch) {
          return {
            name: scopeMatch[2],
            scope: scopeMatch[1],
            directory: dirname(projectRoot),
          };
        }
        return {
          name: fullName,
          scope: '',
          directory: dirname(projectRoot),
        };
      }
    }

    // Fallback to directory name
    const dirName = projectRoot.split('/').pop() ?? projectRoot;
    return {
      name: dirName,
      scope: '',
      directory: dirname(projectRoot),
    };
  } catch (error) {
    logger.warn(`Failed to get project metadata for ${projectRoot}: ${error}`);
    return null;
  }
}

/**
 * Checks if a spec file is a URL
 */
function isUrl(spec: string): boolean {
  try {
    const url = new URL(spec);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Builds the spec path for NX inputs
 */
function buildSpecPath(specPath: string): string {
  if (isUrl(specPath)) {
    return specPath;
  }
  // If the spec path starts with ./ or is relative, make it relative to project root
  if (specPath.startsWith('./') || !specPath.startsWith('/')) {
    return `{projectRoot}/${specPath.replace(/^\.\//, '')}`;
  }
  return specPath;
}

/**
 * Creates inferred targets for a project with an openapi-ts config
 */
function createOpenApiTargets(
  configPath: string,
  projectRoot: string,
  options: OpenApiPluginOptions,
): Record<string, TargetConfiguration> {
  const config = parseOpenApiConfig(configPath);
  if (!config) {
    return {};
  }

  const metadata = getProjectMetadata(projectRoot);
  if (!metadata) {
    return {};
  }

  const {
    buildTargetName = defaultOptions.buildTargetName,
    generateApiTargetName = defaultOptions.generateApiTargetName,
    updateApiTargetName = defaultOptions.updateApiTargetName,
  } = options;
  const configFileName = basename(configPath);

  const { input, output, plugins, client } = config;
  const { name, scope, directory } = metadata;

  // Build spec path for inputs
  const specInputPath = buildSpecPath(input);
  const isRemoteSpec = isUrl(input);

  // Base inputs for all targets
  const baseInputs: (string | { dependentTasksOutputFiles: string } | { runtime: string })[] = [
    `{projectRoot}/${CONSTANTS.SPEC_DIR_NAME}`,
    '{projectRoot}/package.json',
    `{projectRoot}/${CONSTANTS.TS_CONFIG_NAME}`,
    `{projectRoot}/${CONSTANTS.TS_LIB_CONFIG_NAME}`,
    `{projectRoot}/${configFileName}`,
  ];

  const dependentTasksOutputFiles = '**/*.{ts,json,yml,yaml}';

  const updateInputs: (string | { dependentTasksOutputFiles: string } | { runtime: string })[] = [
    { dependentTasksOutputFiles },
    ...baseInputs,
  ];

  // Add spec file to inputs based on type
  if (!isRemoteSpec) {
    updateInputs.push(specInputPath);
  } else {
    // For remote specs, add a runtime hash check
    const apiHash = {
      runtime: `npx node -e "console.log(require('crypto').createHash('sha256').update(process.argv[1]).digest('hex'))" "$(npx -y xcurl -s ${input})"`,
    };
    updateInputs.push(apiHash);
  }

  const targets: Record<string, TargetConfiguration> = {};

  // generateApi target - runs the CLI directly
  targets[generateApiTargetName] = {
    executor: 'nx:run-commands',
    inputs: baseInputs,
    options: {
      command: `npx @hey-api/openapi-ts`,
      cwd: '{projectRoot}',
    },
    outputs: [`{projectRoot}/${output}`],
    metadata: {
      description: 'Generate OpenAPI client code from the spec file',
      technologies: ['openapi', 'typescript'],
    },
  };

  // updateApi target - uses the plugin executor
  targets[updateApiTargetName] = {
    cache: true,
    dependsOn: [`^${buildTargetName}`],
    executor: `${PACKAGE_NAME}:update-api`,
    inputs: updateInputs,
    options: {
      client: client ?? '@hey-api/client-fetch',
      directory,
      name,
      plugins: plugins.filter((p) => !p.includes('client-')),
      scope,
      spec: input,
    },
    outputs: [`{projectRoot}/${output}`, `{projectRoot}/${CONSTANTS.SPEC_DIR_NAME}`],
    metadata: {
      description: 'Update the OpenAPI spec and regenerate client code if changed',
      technologies: ['openapi', 'typescript'],
    },
  };

  return targets;
}

/**
 * Creates nodes for a single openapi-ts config file
 */
function createNodesForConfig(
  configFile: string,
  options: OpenApiPluginOptions,
  _context: CreateNodesContextV2,
): CreateNodesResult {
  const projectRoot = dirname(configFile);

  // Skip if no project root (config at workspace root)
  if (!projectRoot || projectRoot === '.') {
    return {};
  }

  const targets = createOpenApiTargets(configFile, projectRoot, options);

  if (Object.keys(targets).length === 0) {
    return {};
  }

  return {
    projects: {
      [projectRoot]: {
        targets,
        tags: options.tags,
      },
    },
  };
}

/**
 * NX Plugin createNodesV2 export
 *
 * This plugin automatically detects openapi-ts.config.* files and creates
 * inferred targets for generating and updating OpenAPI clients.
 */
export const createNodesV2: CreateNodesV2<OpenApiPluginOptions> = [
  OPENAPI_CONFIG_GLOB,
  async (configFiles, options, context) => {
    const normalizedOptions: OpenApiPluginOptions = {
      ...defaultOptions,
      ...options,
    };

    return await createNodesFromFiles(
      (configFile, opts, ctx) => createNodesForConfig(configFile, opts ?? {}, ctx),
      configFiles,
      normalizedOptions,
      context,
    );
  },
];
