import { test } from '@playwright/test';

/**
 * Marks the running test as a known defect.
 * The test still asserts the correct behaviour. While the bug is open it fails as expected;
 * once the bug is fixed it "unexpectedly passes", CI goes red, and the marker can be removed.
 */
export function knownBug(id: string, title: string) {
  test.info().annotations.push({ type: 'bug', description: `${id}: ${title}` });
  test.fail();
}
