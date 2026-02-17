import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { workspaceRoot, type CreateNodesContextV2 } from '@nx/devkit';
import { afterEach, describe, expect, it } from 'vitest';

import { createNodesV2 } from './plugin';

function getCreateNodesContext(): CreateNodesContextV2 {
  return {
    nxJsonConfiguration: {},
    workspaceRoot,
  };
}

function writeConfigFixture(extension: 'cjs' | 'js' | 'mjs' | 'ts') {
  const tempProjectRoot = `tmp/plugin-inferred-${randomUUID()}/libs/test-api`;
  const absoluteProjectRoot = join(workspaceRoot, tempProjectRoot);
  const configFileName = `openapi-ts.config.${extension}`;
  const configPath = join(absoluteProjectRoot, configFileName);

  mkdirSync(absoluteProjectRoot, { recursive: true });
  writeFileSync(
    join(absoluteProjectRoot, 'package.json'),
    JSON.stringify({ name: '@test/api' }),
  );

  const configBody = `{
  input: { path: './api/spec.yaml' },
  output: { path: 'src/generated-custom' },
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
}
`;

  writeFileSync(
    configPath,
    extension === 'cjs'
      ? `module.exports = ${configBody}`
      : `export default ${configBody}`,
  );

  return {
    configFile: `${tempProjectRoot}/${configFileName}`,
    tempProjectRoot,
  };
}

describe('plugin createNodesV2', () => {
  const createdRoots: string[] = [];

  afterEach(() => {
    while (createdRoots.length > 0) {
      const root = createdRoots.pop();
      if (!root) {
        continue;
      }
      rmSync(join(workspaceRoot, root), { force: true, recursive: true });
    }
  });

  it.each(['ts', 'js', 'mjs', 'cjs'] as const)(
    'should infer targets for openapi-ts.config.%s',
    async (extension) => {
      const { configFile, tempProjectRoot } = writeConfigFixture(extension);
      createdRoots.push(tempProjectRoot.split('/libs/')[0] || tempProjectRoot);

      const [, createNodes] = createNodesV2;
      const result = await createNodes([configFile], {}, getCreateNodesContext());

      expect(result).toHaveLength(1);
      const [, createNodesResult] = result[0];
      const project = createNodesResult.projects?.[tempProjectRoot];
      expect(project).toBeDefined();

      const generateApiTarget = project?.targets?.generateApi;
      const updateApiTarget = project?.targets?.updateApi;

      expect(generateApiTarget).toBeDefined();
      expect(updateApiTarget).toBeDefined();
      expect(generateApiTarget?.inputs).toContain(
        `{projectRoot}/openapi-ts.config.${extension}`,
      );
      expect(updateApiTarget?.options?.spec).toBe('./api/spec.yaml');
      expect(updateApiTarget?.outputs).toContain(
        '{projectRoot}/src/generated-custom',
      );
    },
  );

  it('should honor custom buildTargetName for inferred updateApi dependsOn', async () => {
    const { configFile, tempProjectRoot } = writeConfigFixture('ts');
    createdRoots.push(tempProjectRoot.split('/libs/')[0] || tempProjectRoot);

    const [, createNodes] = createNodesV2;
    const result = await createNodes(
      [configFile],
      { buildTargetName: 'compile' },
      getCreateNodesContext(),
    );
    const [, createNodesResult] = result[0];
    const updateApiTarget =
      createNodesResult.projects?.[tempProjectRoot]?.targets?.updateApi;

    expect(updateApiTarget?.dependsOn).toEqual(['^compile']);
  });
});
