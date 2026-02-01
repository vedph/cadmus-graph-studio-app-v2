/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup-test.ts'],
    include: [
      'src/**/*.spec.ts',
      'projects/**/*.spec.ts',
    ],
    exclude: ['node_modules/**'],
  },
  resolve: {
    alias: {
      '@myrmidon/cadmus-mapping-builder': resolve(
        __dirname,
        'projects/myrmidon/cadmus-mapping-builder/src/public-api.ts'
      ),
    },
  },
});
