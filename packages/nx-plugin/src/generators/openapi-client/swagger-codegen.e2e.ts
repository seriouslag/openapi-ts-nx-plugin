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

import { convertSwaggerToOpenApi } from '../../utils';
import { generateClientCode } from '../../utils';

// Minimal Swagger 2.0 spec with one operation and one schema — enough to
// assert that both the type and the SDK operation appear in generated output.
const SWAGGER_2_SPEC = `
swagger: "2.0"
info:
  title: Swagger Codegen E2E API
  version: "1.0.0"
host: api.example.com
basePath: /v1
schemes:
  - https
paths:
  /users/{userId}:
    get:
      operationId: getUserById
      parameters:
        - name: userId
          in: path
          required: true
          type: string
      responses:
        "200":
          description: OK
          schema:
            $ref: "#/definitions/User"
definitions:
  User:
    type: object
    properties:
      id:
        type: string
      name:
        type: string
`;

/**
 * Guards against @hey-api/openapi-ts dropping Swagger 2.0 input support and
 * against swagger2openapi breaking its conversion API. Both are dependencies
 * with long release gaps that could silently break the Swagger 2.0 path.
 */
describe('Swagger 2.0 integration', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) rmSync(root, { force: true, recursive: true });
    }
  });

  it('convertSwaggerToOpenApi produces a valid OpenAPI 3.x object', async () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Test', version: '1.0.0' },
      host: 'api.example.com',
      basePath: '/v1',
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };

    const result = await convertSwaggerToOpenApi(spec as any);

    expect(result).toHaveProperty('openapi');
    expect((result as any).openapi).toMatch(/^3\./);
    expect(result).toHaveProperty('paths./users');
  });

  it('generates a real fetch client from a Swagger 2.0 spec file', async () => {
    const root = mkdtempSync(join(tmpdir(), 'nx-openapi-swagger-e2e-'));
    tempRoots.push(root);

    const specFile = join(root, 'swagger.yaml');
    writeFileSync(specFile, SWAGGER_2_SPEC);
    const outputPath = join(root, 'generated');

    await generateClientCode({
      clientType: '@hey-api/client-fetch',
      outputPath,
      plugins: ['@hey-api/typescript', '@hey-api/sdk'],
      specFile,
    });

    expect(existsSync(join(outputPath, 'index.ts'))).toBe(true);
    expect(existsSync(join(outputPath, 'types.gen.ts'))).toBe(true);
    expect(existsSync(join(outputPath, 'sdk.gen.ts'))).toBe(true);

    const types = readFileSync(join(outputPath, 'types.gen.ts'), 'utf-8');
    expect(types).toContain('User');

    const sdk = readFileSync(join(outputPath, 'sdk.gen.ts'), 'utf-8');
    expect(sdk).toContain('getUserById');
  });

  it('generates a client with @hey-api/schemas plugin', async () => {
    const root = mkdtempSync(join(tmpdir(), 'nx-openapi-schemas-e2e-'));
    tempRoots.push(root);

    const specFile = join(root, 'swagger.yaml');
    writeFileSync(specFile, SWAGGER_2_SPEC);
    const outputPath = join(root, 'generated');

    await generateClientCode({
      clientType: '@hey-api/client-fetch',
      outputPath,
      plugins: ['@hey-api/typescript', '@hey-api/sdk', '@hey-api/schemas'],
      specFile,
    });

    expect(existsSync(join(outputPath, 'index.ts'))).toBe(true);
    expect(existsSync(join(outputPath, 'schemas.gen.ts'))).toBe(true);
  });
});
