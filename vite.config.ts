import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the built dist/ works from any folder or static host.
  base: './',
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
  },
});
