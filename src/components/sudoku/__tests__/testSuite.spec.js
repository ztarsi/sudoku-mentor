// Runs every suite from the in-app test harness (testSuite.jsx) under vitest,
// so the same checks gate CI instead of only living on a browser page.
import { describe, it, expect } from 'vitest';
import { testSuites } from '../testSuite';

for (const [suiteName, suite] of Object.entries(testSuites)) {
  describe(suiteName, () => {
    for (const test of suite.tests) {
      it(test.name, () => {
        const result = test.run();
        expect(result.pass, result.message).toBe(true);
      });
    }
  });
}
