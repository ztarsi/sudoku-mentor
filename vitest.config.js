import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Standalone vitest config: the app's vite.config.js loads the Base44 plugin,
// which isn't needed (or wanted) for pure logic tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.{js,jsx}'],
    testTimeout: 30000,
  },
});
