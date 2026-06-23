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
});
