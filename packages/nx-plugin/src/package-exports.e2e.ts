import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { workspaceRoot } from '@nx/devkit';
import { describe, expect, it } from 'vitest';

/**
 * Guards the published package manifest against pointing at files that the
 * build does not emit. This previously regressed: `types` referenced
 * `dist/index.cjs.d.ts` while the @nx/rollup build emits `dist/index.d.ts`,
 * so the published package shipped without resolvable type definitions.
 *
 * Lives in the e2e suite because it asserts against build output (the e2e
 * target depends on `build`, so `dist/` exists when this runs).
 */
const packageRoot = join(workspaceRoot, 'packages/nx-plugin');
const manifest = JSON.parse(
  readFileSync(join(packageRoot, 'package.json'), 'utf-8'),
) as {
  main?: string;
  module?: string;
  types?: string;
  plugin?: string;
  generators?: string;
  executors?: string;
  exports?: unknown;
};

/** Recursively collect every string leaf from the `exports` field. */
function collectExportPaths(node: unknown): string[] {
  if (typeof node === 'string') {
    return [node];
  }
  if (node && typeof node === 'object') {
    return Object.values(node).flatMap(collectExportPaths);
  }
  return [];
}

describe('package manifest entry points', () => {
  const declaredPaths = [
    ...new Set(
      [
        manifest.main,
        manifest.module,
        manifest.types,
        manifest.plugin,
        manifest.generators,
        manifest.executors,
        ...collectExportPaths(manifest.exports),
      ].filter((value): value is string => typeof value === 'string'),
    ),
  ];

  it('declares at least the core entry points', () => {
    // Sanity check so the it.each below can never silently run zero cases.
    expect(declaredPaths.length).toBeGreaterThanOrEqual(5);
  });

  it.each(declaredPaths)('resolves "%s" to a file that exists', (relPath) => {
    expect(existsSync(join(packageRoot, relPath))).toBe(true);
  });
});
