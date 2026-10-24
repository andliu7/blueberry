import { lazy, Suspense } from "react";
import { adsEnabled } from "@/lib/ads/adsConfig";

// React.lazy + Suspense: load this code only when it renders. With ads off it never renders.
const AdSlotBody = lazy(() => import("./AdSlotBody"));

/**
 * A place an ad may go, on a calm surface only: between sections of the path, on the feed,
 * on the site's own pages. Never inside a lesson, quiz, test-out, sign-in or checkout
 * (adPlacement.test.ts pins that list).
 *
 * With no AdSense ids in the build this draws nothing and fetches nothing. Consent, the Pro
 * check and Google's script all live in the lazy body.
 */
export function AdSlot({ placement }: { readonly placement: "path" | "feed" | "site" }) {
  if (!adsEnabled) return null;
  return (
    <Suspense fallback={null}>
      <AdSlotBody placement={placement} />
    </Suspense>
  );
}
