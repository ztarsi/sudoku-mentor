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
    // How long one test case may run before vitest gives up. This bounds the
    // harness, not the product: every product budget is asserted inside the
    // tests themselves, with its reason beside it (countBudgets, #100). The
    // engine and library cases walk every puzzle in the library, so their
    // cost grows with it; at forty-eight puzzles (#88) a dozen of them took
    // 17-22 s locally and timed out on the slower CI runner at 30 s. 90 s
    // still catches a case that hangs.
    testTimeout: 90000,
  },
});
