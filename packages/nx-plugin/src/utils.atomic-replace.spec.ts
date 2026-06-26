import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { atomicReplaceDir } from './utils';

describe('atomicReplaceDir', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), `atomic-replace-${randomUUID()}-`));
  });

  afterEach(async () => {
    await rm(workDir, { force: true, recursive: true });
  });

  const writeDir = async (dir: string, files: Record<string, string>) => {
    await mkdir(dir, { recursive: true });
    for (const [name, contents] of Object.entries(files)) {
      await writeFile(join(dir, name), contents);
    }
  };

  it('replaces the contents of an existing target directory', async () => {
    const source = join(workDir, 'source');
    const target = join(workDir, 'target');
    await writeDir(source, { 'a.txt': 'new-a', 'b.txt': 'new-b' });
    await writeDir(target, { 'a.txt': 'old-a', 'old-only.txt': 'stale' });

    await atomicReplaceDir(source, target);

    expect(await readFile(join(target, 'a.txt'), 'utf-8')).toBe('new-a');
    expect(await readFile(join(target, 'b.txt'), 'utf-8')).toBe('new-b');
    // Stale files from the previous contents must be gone.
    expect(existsSync(join(target, 'old-only.txt'))).toBe(false);
  });

  it('creates the target directory when it does not exist', async () => {
    const source = join(workDir, 'source');
    const target = join(workDir, 'nested', 'target');
    await writeDir(source, { 'a.txt': 'a' });
    await mkdir(join(workDir, 'nested'), { recursive: true });

    await atomicReplaceDir(source, target);

    expect(await readFile(join(target, 'a.txt'), 'utf-8')).toBe('a');
  });

  it('leaves no staging or backup directories behind', async () => {
    const source = join(workDir, 'source');
    const target = join(workDir, 'target');
    await writeDir(source, { 'a.txt': 'a' });
    await writeDir(target, { 'a.txt': 'old' });

    await atomicReplaceDir(source, target);

    const leftovers = (await readdir(workDir)).filter(
      (name) => name.includes('.staging-') || name.includes('.old-'),
    );
    expect(leftovers).toEqual([]);
  });

  it('preserves the original target if staging the source fails', async () => {
    const source = join(workDir, 'does-not-exist');
    const target = join(workDir, 'target');
    await writeDir(target, { 'a.txt': 'original' });

    await expect(atomicReplaceDir(source, target)).rejects.toThrow();

    // The original target must be intact after a failed replace.
    expect(await readFile(join(target, 'a.txt'), 'utf-8')).toBe('original');
    const leftovers = (await readdir(workDir)).filter(
      (name) => name.includes('.staging-') || name.includes('.old-'),
    );
    expect(leftovers).toEqual([]);
  });
});
