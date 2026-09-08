import { describe, expect, it } from "vitest";

import { causeCount } from "../src/causes.ts";

/**
 * The one test that existed when the first mutation score was measured.
 *
 * Kept, unchanged, so the "before" number in the phase report is reproducible. It
 * asserts that the package loads and that the cause registry is not empty, which is
 * roughly the weakest true statement available.
 */
describe("chem-core loads", () => {
  it("has a non empty cause registry", () => {
    expect(causeCount()).toBeGreaterThan(0);
  });
});
