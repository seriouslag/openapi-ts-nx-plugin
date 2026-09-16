import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createClient } from '@hey-api/openapi-ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateClientCode, mergePluginConfigs } from './utils';

vi.mock('@hey-api/openapi-ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hey-api/openapi-ts')>();
  return {
    ...actual,
    createClient: vi.fn(),
  };
});

vi.mock('@nx/devkit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nx/devkit')>();
  return {
    ...actual,
    workspaceRoot: '/',
  };
});

/**
 * These tests use the real filesystem and the real `c12` loader rather than
 * mocking `node:fs` (as `utils.spec.ts` does) — the whole point is that plugin
 * options survive the round trip through an actual config file.
 */
describe('mergePluginConfigs', () => {
  it('prepends the client to the executor plugins when there is no config file', () => {
    expect(
      mergePluginConfigs({
        clientType: '@hey-api/client-fetch',
        executorPlugins: ['@hey-api/typescript', '@hey-api/sdk'],
      }),
    ).toEqual([
      '@hey-api/client-fetch',
      '@hey-api/typescript',
      '@hey-api/sdk',
    ]);
  });

  it('substitutes the config file entry for the executor name, keeping executor order', () => {
    expect(
      mergePluginConfigs({
        clientType: '@hey-api/client-fetch',
        executorPlugins: ['@tanstack/react-query', 'zod'],
        filePlugins: [{ mutationKeys: true, name: '@tanstack/react-query' }],
      }),
    ).toEqual([
      '@hey-api/client-fetch',
      { mutationKeys: true, name: '@tanstack/react-query' },
      'zod',
    ]);
  });

  it('appends plugins that only the config file declares', () => {
    expect(
      mergePluginConfigs({
        clientType: '@hey-api/client-fetch',
        executorPlugins: ['@hey-api/typescript'],
        filePlugins: [{ name: '@hey-api/schemas', type: 'json' }],
      }),
    ).toEqual([
      '@hey-api/client-fetch',
      '@hey-api/typescript',
      { name: '@hey-api/schemas', type: 'json' },
    ]);
  });

  it('keeps options the executor itself passed', () => {
    // updateApi.schema.json documents this `{ name, asClass }` form; flattening
    // to names used to drop it, which is the `asClass is not working` bug.
    expect(
      mergePluginConfigs({
        clientType: '@hey-api/client-fetch',
        executorPlugins: [{ asClass: true, name: '@hey-api/sdk' }],
      }),
    ).toEqual([
      '@hey-api/client-fetch',
      { asClass: true, name: '@hey-api/sdk' },
    ]);
  });

  it('lets the config file configure the client itself', () => {
    expect(
      mergePluginConfigs({
        clientType: '@hey-api/client-fetch',
        executorPlugins: [],
        filePlugins: [{ bundle: false, name: '@hey-api/client-fetch' }],
      }),
    ).toEqual([{ bundle: false, name: '@hey-api/client-fetch' }]);
  });

  it('does not pass the client twice when a project also lists it explicitly', () => {
    expect(
      mergePluginConfigs({
        clientType: '@hey-api/client-fetch',
        executorPlugins: ['@hey-api/client-fetch', '@hey-api/typescript'],
      }),
    ).toEqual(['@hey-api/client-fetch', '@hey-api/typescript']);
  });
});

describe('generateClientCode plugin merging', () => {
  let workDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    workDir = await mkdtemp(join(tmpdir(), `plugin-merge-${randomUUID()}-`));
  });

  afterEach(async () => {
    await rm(workDir, { force: true, recursive: true });
  });

  /**
   * Config files are written as plain default exports rather than via
   * `defineConfig` so the temp directory needs no `node_modules` to resolve
   * `@hey-api/openapi-ts` from.
   */
  const writeConfig = async (contents: string) => {
    const configFile = join(workDir, 'openapi-ts.config.mts');
    await writeFile(configFile, contents);
    return configFile;
  };

  /**
   * `createClient` accepts a lazy/array config, so its recorded argument is
   * narrowed to the plain object this code path always passes.
   */
  const generate = async (configFile?: string) => {
    await generateClientCode({
      clientType: '@hey-api/client-fetch',
      ...(configFile ? { configFile } : {}),
      outputPath: './src/generated',
      plugins: ['@hey-api/typescript', '@tanstack/react-query'],
      specFile: './api/spec.yaml',
    });
    return vi.mocked(createClient).mock.calls.at(-1)?.[0] as unknown as {
      configFile?: string;
      plugins: unknown[];
    };
  };

  it('carries plugin options from the config file through to createClient', async () => {
    const configFile = await writeConfig(
      `export default { plugins: ['@hey-api/typescript', { name: '@tanstack/react-query', mutationKeys: true }] };`,
    );

    expect(await generate(configFile)).toMatchObject({
      configFile,
      plugins: [
        '@hey-api/client-fetch',
        '@hey-api/typescript',
        { mutationKeys: true, name: '@tanstack/react-query' },
      ],
    });
  });

  it('resolves a config file exporting a function', async () => {
    const configFile = await writeConfig(
      `export default () => ({ plugins: [{ name: '@tanstack/react-query', mutationKeys: true }] });`,
    );

    expect((await generate(configFile)).plugins).toContainEqual({
      mutationKeys: true,
      name: '@tanstack/react-query',
    });
  });

  it('resolves a config file exporting a promise, as defineConfig does', async () => {
    const configFile = await writeConfig(
      `export default Promise.resolve({ plugins: [{ name: '@tanstack/react-query', mutationKeys: true }] });`,
    );

    expect((await generate(configFile)).plugins).toContainEqual({
      mutationKeys: true,
      name: '@tanstack/react-query',
    });
  });

  it('falls back to the executor plugins when the config file declares none', async () => {
    const configFile = await writeConfig(
      `export default { output: { format: 'prettier' } };`,
    );

    expect((await generate(configFile)).plugins).toEqual([
      '@hey-api/client-fetch',
      '@hey-api/typescript',
      '@tanstack/react-query',
    ]);
  });

  it('falls back to the executor plugins when the config file does not exist', async () => {
    // createClient loads the config file itself and reports a real problem with
    // it; failing to introspect it must not break codegen here.
    const plugins = (await generate(join(workDir, 'openapi-ts.config.mts'))).plugins;

    expect(plugins).toEqual([
      '@hey-api/client-fetch',
      '@hey-api/typescript',
      '@tanstack/react-query',
    ]);
  });

  it('falls back to the executor plugins when the config file throws', async () => {
    const configFile = await writeConfig(`throw new Error('boom');`);

    expect((await generate(configFile)).plugins).toEqual([
      '@hey-api/client-fetch',
      '@hey-api/typescript',
      '@tanstack/react-query',
    ]);
  });

  it('declines to guess which config an array export means', async () => {
    const configFile = await writeConfig(
      `export default [{ plugins: [{ name: '@tanstack/react-query', mutationKeys: true }] }];`,
    );

    expect((await generate(configFile)).plugins).toEqual([
      '@hey-api/client-fetch',
      '@hey-api/typescript',
      '@tanstack/react-query',
    ]);
  });
});
