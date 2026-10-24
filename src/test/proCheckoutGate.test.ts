import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkoutRefusal, proCheckoutOpen } from "../../supabase/functions/_shared/checkoutGate.ts";
import { viewFromRoute } from "@/components/ui/dashboard-nav";

/**
 * Pro checkout is wired but gated to staff (owner, 23 Oct, G2).
 *
 * The rules live in a pure file the Edge Functions import, so they are pinned
 * here directly. The functions themselves run on Deno, which this repo does not
 * have, so their wiring is pinned by source scan: the gate is called before any
 * Stripe customer or session is created, and the return URL lands on a page
 * that exists.
 */

/** Code with comments blanked, the same way landingCopy.test.ts does it. */
function code(file: string): string {
  return readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

describe("proCheckoutOpen", () => {
  it("is open only for the exact string true", () => {
    for (const flag of [undefined, "", "false", "1", "TRUE", " true"]) {
      expect(proCheckoutOpen(flag)).toBe(false);
    }
    expect(proCheckoutOpen("true")).toBe(true);
  });
});

describe("checkoutRefusal", () => {
  it("lets anyone through once checkout is open", () => {
    for (const staff of [false, true]) {
      for (const liveKey of [false, true]) {
        expect(checkoutRefusal({ open: true, staff, liveKey })).toBeNull();
      }
    }
  });

  it("refuses a non-staff caller while closed, whatever the key", () => {
    expect(checkoutRefusal({ open: false, staff: false, liveKey: false })).toBe("checkout-closed");
    expect(checkoutRefusal({ open: false, staff: false, liveKey: true })).toBe("checkout-closed");
  });

  it("lets staff test on test keys and refuses them on live keys while closed", () => {
    expect(checkoutRefusal({ open: false, staff: true, liveKey: false })).toBeNull();
    expect(checkoutRefusal({ open: false, staff: true, liveKey: true })).toBe(
      "live-key-while-closed",
    );
  });
});

describe("stripe-checkout wiring", () => {
  const src = code("supabase/functions/stripe-checkout/index.ts");

  it("asks is_staff and applies the gate before any Stripe call", () => {
    expect(src).toContain('rpc("is_staff")');
    expect(src).toContain("PRO_CHECKOUT_OPEN");
    const gate = src.indexOf("checkoutRefusal(");
    expect(gate).toBeGreaterThan(-1);
    expect(src.indexOf("stripe.customers.create")).toBeGreaterThan(gate);
    expect(src.indexOf("checkout.sessions.create")).toBeGreaterThan(gate);
  });

  it("sends the buyer back to the plans panel, not a route that does not exist", () => {
    expect(src).not.toContain("#/d/billing");
    expect(src).toContain("#/d/subscriptions?checkout=done");
    expect(src).toContain("#/d/subscriptions?checkout=cancelled");
    // The return address has to resolve to the panel, not fall through to home.
    expect(viewFromRoute("d/subscriptions")).toBe("subscriptions");
  });
});

describe("stripe-prices wiring", () => {
  it("tells the panel whether checkout is open", () => {
    const src = code("supabase/functions/stripe-prices/index.ts");
    expect(src).toContain("checkoutOpen");
    expect(src).toContain("PRO_CHECKOUT_OPEN");
  });
});

describe("plans panel", () => {
  const src = code("src/components/ui/subscription-plans.tsx");

  it("offers staff a test checkout and tells everyone else Pro is coming", () => {
    expect(src).toContain("Test checkout (staff only)");
    expect(src).toContain("Pro is coming soon");
    expect(src).toContain("4242 4242 4242 4242");
  });

  it("draws priced cards only when checkout is open or the viewer is staff", () => {
    expect(src).toContain("checkoutOpen || staff");
    expect(src).toMatch(/PLANS\.filter\([\s\S]*?canBuy &&/);
  });
});
