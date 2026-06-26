import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import { compareSpecs, isOperationTagsPath } from './utils';

describe('compareSpecs', () => {
  describe('JSON Specs', () => {
    it('should detect no changes between identical specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/base.json'),
      );
      expect(areEqual).toBe(true);
    });

    it('should detect path changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/path-changed.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect parameter changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/parameter-changed.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect endpoint changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/endpoint-changed.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect summary changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/summary-changed.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should ignore example changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/example-changed.json'),
      );
      expect(areEqual).toBe(true);
    });

    it('should ignore operation tags changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/tags-changed.json'),
      );
      expect(areEqual).toBe(true);
    });
  });

  describe('YAML Specs', () => {
    it('should detect no changes between identical specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.yaml'),
        resolve(__dirname, './test-specs/base.yaml'),
      );
      expect(areEqual).toBe(true);
    });

    it('should detect path changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.yaml'),
        resolve(__dirname, './test-specs/path-changed.yaml'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect parameter changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.yaml'),
        resolve(__dirname, './test-specs/parameter-changed.yaml'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect endpoint changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.yaml'),
        resolve(__dirname, './test-specs/endpoint-changed.yaml'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect summary changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.yaml'),
        resolve(__dirname, './test-specs/summary-changed.yaml'),
      );
      expect(areEqual).toBe(false);
    });

    it('should ignore example changes', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.yaml'),
        resolve(__dirname, './test-specs/example-changed.yaml'),
      );
      expect(areEqual).toBe(true);
    });
  });

  describe('OpenAPI 3.1 Specific Changes', () => {
    it('should detect no changes between identical 3.1 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-3.1.json'),
        resolve(__dirname, './test-specs/base-3.1.json'),
      );
      expect(areEqual).toBe(true);
    });

    it('should detect webhook changes in 3.1 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-3.1.json'),
        resolve(__dirname, './test-specs/webhook-changed-3.1.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect schema changes using 3.1 features', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-3.1.json'),
        resolve(__dirname, './test-specs/schema-changed-3.1.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect version changes between 3.0 and 3.1', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base.json'),
        resolve(__dirname, './test-specs/base-3.1.json'),
      );
      expect(areEqual).toBe(false);
    });
  });

  describe('Swagger 2.0 Specific Changes', () => {
    it('should detect no changes between identical Swagger 2.0 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/base-swagger.json'),
      );
      expect(areEqual).toBe(true);
    });

    it('should detect path changes in Swagger 2.0 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/path-changed-swagger.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect parameter changes in Swagger 2.0 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/parameter-changed-swagger.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect endpoint changes in Swagger 2.0 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/endpoint-changed-swagger.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect summary changes in Swagger 2.0 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/summary-changed-swagger.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect definition changes in Swagger 2.0 specs', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/definition-changed-swagger.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect version changes between Swagger 2.0 and OpenAPI 3.0', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/base.json'),
      );
      expect(areEqual).toBe(false);
    });

    it('should detect version changes between Swagger 2.0 and OpenAPI 3.1', async () => {
      const areEqual = await compareSpecs(
        resolve(__dirname, './test-specs/base-swagger.json'),
        resolve(__dirname, './test-specs/base-3.1.json'),
      );
      expect(areEqual).toBe(false);
    });
  });
});

describe('isOperationTagsPath', () => {
  it('matches an operation tags array entry', () => {
    expect(isOperationTagsPath(['paths', '/users', 'get', 'tags', 0])).toBe(
      true,
    );
  });

  it('matches the operation tags array itself', () => {
    expect(isOperationTagsPath(['paths', '/users', 'post', 'tags'])).toBe(true);
  });

  it('is case-insensitive about the HTTP method', () => {
    expect(isOperationTagsPath(['paths', '/users', 'GET', 'tags', 1])).toBe(
      true,
    );
  });

  it('does NOT match a schema property named "tags"', () => {
    expect(
      isOperationTagsPath([
        'components',
        'schemas',
        'User',
        'properties',
        'tags',
      ]),
    ).toBe(false);
  });

  it('does NOT match tags not preceded by an HTTP method', () => {
    expect(isOperationTagsPath(['paths', '/users', 'tags'])).toBe(false);
    expect(isOperationTagsPath(['tags'])).toBe(false);
  });

  it('does NOT match the top-level tags definition', () => {
    expect(isOperationTagsPath(['tags', 0, 'name'])).toBe(false);
  });
});
