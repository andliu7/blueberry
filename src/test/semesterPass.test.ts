import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { passEndsAfter } from "../../supabase/functions/_shared/passLength.ts";

/**
 * The semester pass lasts 6 months from purchase (owner, 1 Nov 2026).
 *
 * The rule lives in a pure file. The functions run on Deno, which this repo does
 * not have, so the wiring is pinned by source scan, as in proCheckoutGate.test.ts.
 */

const source = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");

describe("passEndsAfter", () => {
  it("is the same day and time 6 months on", () => {
    expect(passEndsAfter(new Date("2026-11-01T15:30:00Z")).toISOString()).toBe("2027-05-01T15:30:00.000Z");
  });

  it("crosses the year", () => {
    expect(passEndsAfter(new Date("2026-08-15T00:00:00Z")).toISOString()).toBe("2027-02-15T00:00:00.000Z");
  });

  it("lands on the last day of a shorter month", () => {
    expect(passEndsAfter(new Date("2026-08-31T12:00:00Z")).toISOString()).toBe("2027-02-28T12:00:00.000Z");
    expect(passEndsAfter(new Date("2027-08-31T12:00:00Z")).toISOString()).toBe("2028-02-29T12:00:00.000Z");
  });

  it("does not change the date it was given", () => {
    const bought = new Date("2026-11-01T00:00:00Z");
    passEndsAfter(bought);
    expect(bought.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });
});

describe("the functions use it", () => {
  it("dates the pass from Stripe's own record of the purchase", () => {
    expect(source("supabase/functions/stripe-webhook/index.ts")).toContain(
      "passEndsAfter(new Date(event.created * 1000))",
    );
  });

  it("no longer needs a date set by hand", () => {
    for (const file of [
      "supabase/functions/_shared/billing.ts",
      "supabase/functions/stripe-checkout/index.ts",
      "supabase/functions/stripe-prices/index.ts",
      "supabase/functions/stripe-webhook/index.ts",
    ]) {
      expect(source(file)).not.toMatch(/SEMESTER_PASS_ENDS_ON|semesterPassEnd|pass_until/);
    }
  });
});
