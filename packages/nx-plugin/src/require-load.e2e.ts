import { createRequire } from 'node:module';
import { join } from 'node:path';

import { workspaceRoot } from '@nx/devkit';
import { describe, expect, it } from 'vitest';

/**
 * Guards that every built CJS entry point can actually be loaded with
 * require(). nx loads the plugin, generators and executors from these CJS
 * files via require, so if any of them statically require() an ESM-only
 * dependency (e.g. @hey-api/openapi-ts, @hey-api/json-schema-ref-parser),
 * Node throws ERR_REQUIRE_ESM / ERR_PACKAGE_PATH_NOT_EXPORTED and the plugin
 * is unusable once published.
 *
 * The rest of the suite imports from source under an ESM-capable runner, so it
 * never exercises this require() path — this test loads the real built dist.
 * Lives in the e2e suite because it depends on build output.
 */
const require = createRequire(import.meta.url);
const distRoot = join(workspaceRoot, 'packages/nx-plugin/dist');

// Entry points referenced by package.json / generators.json / executors.json.
const entryPoints = [
  'index.cjs.js',
  'plugin.cjs.js',
  'openapiClient.cjs.js',
  'openapiConfig.cjs.js',
  'updateApi.cjs.js',
];

describe('built CJS entry points load under require()', () => {
  it.each(entryPoints)('require("dist/%s") does not throw', (file) => {
    expect(() => require(join(distRoot, file))).not.toThrow();
  });
});

// We mirror @hey-api/openapi-ts's `defaultPlugins` locally because the package
// is ESM-only and can't be require()d in the synchronous code path that needs
// it. Guard against the upstream value drifting from our copy.
describe('local defaultPlugins mirror stays in sync with @hey-api/openapi-ts', () => {
  it('matches the upstream defaultPlugins value', async () => {
    const [{ defaultPlugins: localDefaults }, openapiTs] = await Promise.all([
      import('./generators/openapi-client/openapiClient'),
      import('@hey-api/openapi-ts'),
    ]);
    expect([...localDefaults]).toEqual([...openapiTs.defaultPlugins]);
  });
});
