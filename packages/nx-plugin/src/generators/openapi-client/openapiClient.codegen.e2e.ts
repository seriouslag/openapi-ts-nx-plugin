import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { generateClientCode } from '../../utils';

// A real (minimal but non-trivial) OpenAPI 3.0 spec with an operation and a
// component schema so we can assert the generated client references both.
const SPEC = `
openapi: 3.0.0
info:
  title: Codegen E2E API
  version: 1.0.0
paths:
  /pets/{petId}:
    get:
      operationId: getPetById
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Pet'
components:
  schemas:
    Pet:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
`;

/**
 * End-to-end test that runs the REAL (unmocked) @hey-api/openapi-ts codegen
 * through our generateClientCode wrapper. The rest of the suite mocks
 * createClient, so this is the only coverage that the wrapped codegen actually
 * emits a usable client — it guards against breaking changes when the
 * @hey-api/openapi-ts dependency is bumped.
 */
describe('real client codegen e2e', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        rmSync(root, { force: true, recursive: true });
      }
    }
  });

  it('generates a real fetch client from a spec', async () => {
    const root = mkdtempSync(join(tmpdir(), 'nx-openapi-codegen-e2e-'));
    tempRoots.push(root);

    const specFile = join(root, 'spec.yaml');
    writeFileSync(specFile, SPEC);
    const outputPath = join(root, 'generated');

    await generateClientCode({
      clientType: '@hey-api/client-fetch',
      outputPath,
      plugins: ['@hey-api/typescript', '@hey-api/sdk'],
      specFile,
    });

    // The codegen actually emitted the expected entry points.
    expect(existsSync(join(outputPath, 'index.ts'))).toBe(true);
    expect(existsSync(join(outputPath, 'types.gen.ts'))).toBe(true);
    expect(existsSync(join(outputPath, 'sdk.gen.ts'))).toBe(true);
    expect(existsSync(join(outputPath, 'client.gen.ts'))).toBe(true);

    // The generated output reflects the spec: the schema type and the
    // operation are both present in the emitted code.
    const types = readFileSync(join(outputPath, 'types.gen.ts'), 'utf-8');
    expect(types).toContain('Pet');

    const sdk = readFileSync(join(outputPath, 'sdk.gen.ts'), 'utf-8');
    expect(sdk).toContain('getPetById');
  });

  /**
   * `mergePluginConfigs` concatenates the executor's plugins with the config
   * file's and lets `resolvePlugins` merge the duplicates by name. These two
   * tests are the only thing holding that assumption up — the unit suite mocks
   * `createClient`, so it can assert what we pass but never what the generator
   * does with it. If a future `@hey-api/openapi-ts` stops merging duplicates,
   * these fail rather than options going quietly missing again.
   */
  const generateWithConfigFile = async (configFileBody: string) => {
    const root = mkdtempSync(join(tmpdir(), 'nx-openapi-plugin-opts-e2e-'));
    tempRoots.push(root);

    const specFile = join(root, 'spec.yaml');
    writeFileSync(specFile, SPEC);
    // Written without importing `defineConfig` so the temp dir needs no
    // node_modules; jiti loads a plain default export happily.
    const configFile = join(root, 'openapi-ts.config.mts');
    writeFileSync(configFile, configFileBody);
    const outputPath = join(root, 'generated');

    return { configFile, outputPath, specFile };
  };

  it('applies a plugin option declared only in the config file', async () => {
    const { configFile, outputPath, specFile } = await generateWithConfigFile(
      `export default { plugins: [{ name: '@hey-api/sdk', asClass: true }] };`,
    );

    await generateClientCode({
      clientType: '@hey-api/client-fetch',
      configFile,
      outputPath,
      // The executor names the plugin; only the config file can configure it.
      plugins: ['@hey-api/typescript', '@hey-api/sdk'],
      specFile,
    });

    // asClass makes the SDK emit a class rather than bare exported functions.
    const sdk = readFileSync(join(outputPath, 'sdk.gen.ts'), 'utf-8');
    expect(sdk).toContain('export class');
  });

  it('keeps options from both sides for the same plugin', async () => {
    const { configFile, outputPath, specFile } = await generateWithConfigFile(
      `export default { plugins: [{ name: '@hey-api/sdk', validator: false }] };`,
    );

    await generateClientCode({
      clientType: '@hey-api/client-fetch',
      configFile,
      outputPath,
      plugins: ['@hey-api/typescript', { asClass: true, name: '@hey-api/sdk' }],
      specFile,
    });

    // The config file also configures @hey-api/sdk. Letting either side's entry
    // replace the other would drop `asClass` here.
    const sdk = readFileSync(join(outputPath, 'sdk.gen.ts'), 'utf-8');
    expect(sdk).toContain('export class');
  });
});
