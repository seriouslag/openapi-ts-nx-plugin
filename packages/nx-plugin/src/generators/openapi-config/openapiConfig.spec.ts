import { addProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { describe, expect, it } from 'vitest';

import generator from './openapiConfig';

describe('openapi-config generator', () => {
  it('should generate openapi-ts.config.ts by default', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, '@test/api', {
      projectType: 'library',
      root: 'libs/api',
    });

    await generator(tree, {
      project: '@test/api',
    });

    const configPath = 'libs/api/openapi-ts.config.ts';
    expect(tree.exists(configPath)).toBeTruthy();

    const configContent = tree.read(configPath, 'utf-8');
    expect(configContent).toContain("import { defineConfig }");
    expect(configContent).toContain("input: 'api/spec.yaml'");
    expect(configContent).toContain("output: 'src/generated'");
    expect(configContent).toContain("'@hey-api/client-fetch'");
    expect(configContent).toContain("'@hey-api/typescript'");
    expect(configContent).toContain("'@hey-api/sdk'");
  });

  it('should fall back to default spec when spec is empty', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, '@test/api', {
      projectType: 'library',
      root: 'libs/api',
    });

    await generator(tree, {
      project: '@test/api',
      spec: '   ',
    });

    const configPath = 'libs/api/openapi-ts.config.ts';
    const configContent = tree.read(configPath, 'utf-8');
    expect(configContent).toContain("input: 'api/spec.yaml'");
  });

  it('should generate cjs config when extension is cjs', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, '@test/api', {
      projectType: 'library',
      root: 'libs/api',
    });

    await generator(tree, {
      extension: 'cjs',
      project: '@test/api',
    });

    const configPath = 'libs/api/openapi-ts.config.cjs';
    const configContent = tree.read(configPath, 'utf-8');
    expect(configContent).toContain('module.exports = {');
    expect(configContent).not.toContain('export default');
  });

  it('should generate esm js config when package type is module', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, '@test/api', {
      projectType: 'library',
      root: 'libs/api',
    });
    tree.write('libs/api/package.json', JSON.stringify({ type: 'module' }));

    await generator(tree, {
      extension: 'js',
      project: '@test/api',
    });

    const configPath = 'libs/api/openapi-ts.config.js';
    const configContent = tree.read(configPath, 'utf-8');
    expect(configContent).toContain('export default {');
    expect(configContent).not.toContain('module.exports');
  });

  it('should throw when config exists and overwrite is false', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, '@test/api', {
      projectType: 'library',
      root: 'libs/api',
    });
    tree.write('libs/api/openapi-ts.config.ts', 'existing');

    await expect(
      generator(tree, {
        project: '@test/api',
      }),
    ).rejects.toThrow('Config file already exists');
  });

  it('should overwrite existing config when overwrite is true', async () => {
    const tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, '@test/api', {
      projectType: 'library',
      root: 'libs/api',
    });
    tree.write('libs/api/openapi-ts.config.ts', 'existing');

    await generator(tree, {
      overwrite: true,
      project: '@test/api',
      spec: 'https://example.com/spec.yaml',
    });

    const configContent = tree.read('libs/api/openapi-ts.config.ts', 'utf-8');
    expect(configContent).toContain("input: 'https://example.com/spec.yaml'");
    expect(configContent).not.toBe('existing');
  });
});
