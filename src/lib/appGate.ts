/**
 * Who may open the practice app (#/app), as a pure function so tests drive it
 * without Supabase.
 *
 * Owner, 23 Oct (G1): "Before anything". A signed-out visitor is sent to the
 * sign-in page first, and comes back to where they were headed once signed in
 * (returnTo.ts). A build without Supabase has no sign-in at all, so it lets
 * everyone through rather than locking the app behind a page that cannot work.
 */

export type AppGateState = "game" | "wait" | "signin";

/**
 * The page is being served from this machine (owner, 29 Oct: keep the sign-in for the real
 * site, drop it on localhost). Exact hostnames only; the deployed site never matches.
 */
export function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function appGateFor(a: { configured: boolean; loading: boolean; signedIn: boolean; localHost?: boolean }): AppGateState {
  if (!a.configured || a.localHost) return "game";
  if (a.loading) return "wait";
  return a.signedIn ? "game" : "signin";
}
