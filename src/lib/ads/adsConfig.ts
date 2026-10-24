/**
 * Whether ads exist at all (owner, 23 Oct, G4). The one ad file every page imports, so it
 * stays tiny: everything heavier is in the lazy AdSlotBody chunk.
 *
 * Both ids are public (they are printed in every page that shows an ad). Vite inlines them
 * at build time, so with either one empty the site has no ads, no consent prompt, and never
 * fetches the ad chunk or Google's script.
 */

/** True only for a well-formed publisher id and a non-empty ad unit id. */
export const adsEnabledFor = (client: string, slot: string): boolean => /^ca-pub-\d+$/.test(client) && slot !== "";

export const ADSENSE_CLIENT = (import.meta.env.VITE_ADSENSE_CLIENT ?? "").trim();
export const ADSENSE_SLOT = (import.meta.env.VITE_ADSENSE_SLOT ?? "").trim();
export const adsEnabled = adsEnabledFor(ADSENSE_CLIENT, ADSENSE_SLOT);

/** Where "Remove ads with Pro" goes: the plans page, the same link the sign-in page uses. */
export const PRO_HREF = "#/d/subscriptions";
