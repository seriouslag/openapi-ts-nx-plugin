import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

import { workspaceRoot } from '@nx/devkit';
import { afterEach, describe, expect, it } from 'vitest';

// Resolve the nx CLI entry from its package manifest so this keeps working
// across nx versions (nx 23 moved the bin from `bin/nx.js` to `dist/bin/nx.js`).
const require = createRequire(import.meta.url);
const nxManifestPath = require.resolve('nx/package.json');
const nxBin = join(
  dirname(nxManifestPath),
  (require(nxManifestPath) as { bin: { nx: string } }).bin.nx,
);

type ConfigExtension = 'cjs' | 'js' | 'mjs' | 'ts';

function writeWorkspace({
  extension,
  options,
}: {
  extension: ConfigExtension;
  options?: Record<string, unknown>;
}) {
  const root = mkdtempSync(join(tmpdir(), 'nx-openapi-plugin-e2e-'));
  const pluginPath = join(
    workspaceRoot,
    'packages/nx-plugin/dist/plugin.cjs.js',
  );

  const nxJson = {
    plugins: [
      {
        ...(options ? { options } : {}),
        plugin: pluginPath,
      },
    ],
  };

  writeFileSync(join(root, 'nx.json'), JSON.stringify(nxJson, null, 2));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'tmp-e2e-workspace',
      private: true,
    }),
  );

  const projectRoot = join(root, 'packages/sample');
  mkdirSync(projectRoot, { recursive: true });
  writeFileSync(
    join(projectRoot, 'package.json'),
    JSON.stringify({
      name: '@tmp/inferred-e2e',
      version: '0.0.0',
    }),
  );

  const configPath = join(projectRoot, `openapi-ts.config.${extension}`);
  const configBody = `{
  input: './api/spec.yaml',
  output: 'src/generated',
  plugins: ['@hey-api/client-fetch', '@hey-api/typescript', '@hey-api/sdk'],
}
`;
  const content =
    extension === 'cjs'
      ? `module.exports = ${configBody}`
      : `export default ${configBody}`;
  writeFileSync(configPath, content);

  return root;
}

function readProjectJson(cwd: string, projectName: string) {
  const output = execFileSync(
    'node',
    [nxBin, 'show', 'project', projectName, '--json'],
    {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  return JSON.parse(output) as {
    targets: Record<string, { dependsOn?: string[]; inputs?: unknown[] }>;
  };
}

describe('plugin inferred e2e', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (!root) {
        continue;
      }
      rmSync(root, { force: true, recursive: true });
    }
  });

  it.each(['ts', 'js', 'mjs', 'cjs'] as const)(
    'infers targets from openapi-ts.config.%s using nx show project',
    (extension) => {
      const root = writeWorkspace({ extension });
      tempRoots.push(root);

      const project = readProjectJson(root, '@tmp/inferred-e2e');
      expect(project.targets.generateApi).toBeDefined();
      expect(project.targets.updateApi).toBeDefined();
      expect(project.targets.generateApi.inputs).toContain(
        `{projectRoot}/openapi-ts.config.${extension}`,
      );
    },
  );

  it('applies custom inferred target names from plugin options', () => {
    const root = writeWorkspace({
      extension: 'ts',
      options: {
        buildTargetName: 'compile',
        generateApiTargetName: 'generateClient',
        updateApiTargetName: 'syncClient',
      },
    });
    tempRoots.push(root);

    const project = readProjectJson(root, '@tmp/inferred-e2e');

    expect(project.targets.generateClient).toBeDefined();
    expect(project.targets.syncClient).toBeDefined();
    expect(project.targets.syncClient.dependsOn).toEqual(['^compile']);
  });
});
