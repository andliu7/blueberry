/**
 * Who may open Stripe Checkout right now.
 *
 * Pro is wired end to end but not on sale. While `PRO_CHECKOUT_OPEN` is not
 * the exact string "true", only staff (owners and admins on staff_roster, as
 * `is_staff()` reports them) can start a checkout, so the owner can test the
 * whole path and the public cannot buy, not even by calling the function
 * directly. A staff test with a live secret key is refused too: a test while
 * the gate is shut must never charge a real card. This file has no imports and
 * no Deno globals, so the site's vitest suite can import it and pin the rules.
 */

/** Exact "true" only. Unset, "1", "TRUE" and typos all mean closed: fail closed. */
export const proCheckoutOpen = (flag: string | undefined): boolean => flag === "true";

export type CheckoutRefusal = "checkout-closed" | "live-key-while-closed";

/** Null means allowed. Anything else is the error code the function returns with a 403. */
export function checkoutRefusal(args: {
  open: boolean;
  staff: boolean;
  liveKey: boolean;
}): null | CheckoutRefusal {
  if (args.open) return null;
  if (!args.staff) return "checkout-closed";
  if (args.liveKey) return "live-key-while-closed";
  return null;
}
