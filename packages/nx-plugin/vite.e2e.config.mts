import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/packages/nx-plugin-e2e',
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.e2e.ts', 'src/**/*.e2e.spec.ts'],
    reporters: ['default'],
    watch: false,
  },
}));
