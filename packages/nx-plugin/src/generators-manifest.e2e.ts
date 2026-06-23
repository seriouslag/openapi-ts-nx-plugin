import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { workspaceRoot } from '@nx/devkit';
import { describe, expect, it } from 'vitest';

/**
 * Guards that the generator/executor manifests and the generator's runtime
 * template assets actually resolve against the BUILT output.
 *
 * This regressed once already: the build emitted `*.schema.json` under nested
 * dist subdirectories (and dropped the `files`/`options`/`plugins`/`tests`
 * template dirs entirely) while `generators.json`/`executors.json` and the
 * generator code expect them flat at the dist root — so the published plugin's
 * generators failed to load. The unit/e2e suites run from source, where the
 * layout differs, so they never caught it. Lives in the e2e suite because it
 * asserts against build output (the e2e target depends on `build`).
 */
const packageRoot = join(workspaceRoot, 'packages/nx-plugin');

function readManifest(relPath: string) {
  return JSON.parse(readFileSync(join(packageRoot, relPath), 'utf-8'));
}

const generators = readManifest('generators.json').generators as Record<
  string,
  { factory: string; schema: string }
>;
const executors = readManifest('executors.json').executors as Record<
  string,
  { implementation: string; schema: string }
>;

const entries = [
  ...Object.entries(generators).map(([name, g]) => ({
    kind: 'generator',
    name,
    impl: g.factory,
    schema: g.schema,
  })),
  ...Object.entries(executors).map(([name, e]) => ({
    kind: 'executor',
    name,
    impl: e.implementation,
    schema: e.schema,
  })),
];

describe('generator/executor manifests resolve against the build output', () => {
  it('discovers at least the known generators and executors', () => {
    expect(entries.length).toBeGreaterThanOrEqual(3);
  });

  it.each(entries)(
    '$kind "$name" factory/implementation resolves to a built file',
    ({ impl }) => {
      expect(impl).toBeTruthy();
      expect(existsSync(join(packageRoot, impl))).toBe(true);
    },
  );

  it.each(entries)('$kind "$name" schema resolves to a built file', ({ schema }) => {
    expect(schema).toBeTruthy();
    expect(existsSync(join(packageRoot, schema))).toBe(true);
  });

  // The openapi-client generator loads templates at runtime via
  // join(__dirname, '<dir>') — and __dirname is the dist root because the
  // factory is bundled flat. So these asset dirs must exist and be non-empty.
  it.each(['files', 'options', 'plugins', 'tests'])(
    'generator template directory dist/%s exists and is non-empty',
    (dir) => {
      const templateDir = join(packageRoot, 'dist', dir);
      expect(existsSync(templateDir)).toBe(true);
      expect(readdirSync(templateDir).length).toBeGreaterThan(0);
    },
  );
});
