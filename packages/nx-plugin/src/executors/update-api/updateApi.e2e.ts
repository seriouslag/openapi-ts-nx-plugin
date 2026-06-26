import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import runExecutor from './updateApi';

// Two semantically distinct OpenAPI 3.0 specs used to exercise change detection.
const SPEC_V1 = `openapi: "3.0.0"
info:
  title: E2E Test API
  version: "1.0.0"
paths:
  /items:
    get:
      operationId: listItems
      responses:
        "200":
          description: OK
`;

const SPEC_V2 = `openapi: "3.0.0"
info:
  title: E2E Test API
  version: "1.0.0"
paths:
  /items:
    get:
      operationId: listItems
      responses:
        "200":
          description: OK
  /users:
    get:
      operationId: listUsers
      responses:
        "200":
          description: OK
`;

describe('updateApi executor e2e', () => {
  let tempRoot: string;
  let originalCwd: string;

  const directory = 'libs';
  const name = 'test-api';

  function getProjectRoot() {
    return join(tempRoot, directory, name);
  }

  function getGeneratedDir() {
    return join(getProjectRoot(), 'src', 'generated');
  }

  function setupProject(spec = SPEC_V1) {
    mkdirSync(join(getProjectRoot(), 'api'), { recursive: true });
    writeFileSync(join(getProjectRoot(), 'api', 'spec.yaml'), spec);
  }

  function baseOptions(specPath: string) {
    return {
      client: '@hey-api/client-fetch',
      directory,
      name,
      plugins: ['@hey-api/typescript', '@hey-api/sdk'],
      scope: '@e2e',
      spec: specPath,
    };
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    tempRoot = mkdtempSync(join(tmpdir(), 'update-api-e2e-'));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempRoot, { force: true, recursive: true });
  });

  it(
    'generates client files when the spec has changed',
    { timeout: 60_000 },
    async () => {
      setupProject(SPEC_V1);
      const newSpecPath = join(tempRoot, 'new-spec.yaml');
      writeFileSync(newSpecPath, SPEC_V2);

      process.chdir(tempRoot);

      const result = await runExecutor(baseOptions(newSpecPath) as any, {} as any);

      expect(result.success).toBe(true);
      expect(existsSync(getGeneratedDir())).toBe(true);
      expect(existsSync(join(getGeneratedDir(), 'types.gen.ts'))).toBe(true);
      expect(existsSync(join(getGeneratedDir(), 'sdk.gen.ts'))).toBe(true);
    },
  );

  it(
    'skips generation when the spec is unchanged',
    { timeout: 60_000 },
    async () => {
      setupProject(SPEC_V1);
      const sameSpecPath = join(tempRoot, 'same-spec.yaml');
      writeFileSync(sameSpecPath, SPEC_V1);

      process.chdir(tempRoot);

      const result = await runExecutor(baseOptions(sameSpecPath) as any, {} as any);

      expect(result.success).toBe(true);
      // Nothing generated — specs were semantically identical.
      expect(existsSync(getGeneratedDir())).toBe(false);
    },
  );

  it(
    'regenerates when force=true even if spec is unchanged',
    { timeout: 60_000 },
    async () => {
      setupProject(SPEC_V1);
      const sameSpecPath = join(tempRoot, 'same-spec.yaml');
      writeFileSync(sameSpecPath, SPEC_V1);

      process.chdir(tempRoot);

      const result = await runExecutor(
        { ...baseOptions(sameSpecPath), force: true } as any,
        {} as any,
      );

      expect(result.success).toBe(true);
      expect(existsSync(getGeneratedDir())).toBe(true);
      expect(existsSync(join(getGeneratedDir(), 'types.gen.ts'))).toBe(true);
    },
  );

  it(
    'skips on a second run after the spec was already updated',
    { timeout: 60_000 },
    async () => {
      setupProject(SPEC_V1);
      const v2SpecPath = join(tempRoot, 'v2-spec.yaml');
      writeFileSync(v2SpecPath, SPEC_V2);

      process.chdir(tempRoot);

      // First run: V1 existing → V2 incoming, generates files and writes V2 to project.
      const firstResult = await runExecutor(baseOptions(v2SpecPath) as any, {} as any);
      expect(firstResult.success).toBe(true);
      expect(existsSync(getGeneratedDir())).toBe(true);

      // Second run: project spec is now V2, incoming is still V2 → equal → skip.
      const secondResult = await runExecutor(baseOptions(v2SpecPath) as any, {} as any);
      expect(secondResult.success).toBe(true);
    },
  );
});
