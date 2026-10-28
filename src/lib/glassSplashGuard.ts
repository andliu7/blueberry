/**
 * Whether the liquid-glass splash may play. Pure, so it is tested without a DOM.
 *
 * Rules: once per browser session, only on the landing page, never under
 * reduced motion. Storage that throws (private mode, blocked site data) means
 * no splash: one that cannot be remembered would replay on every load.
 */
export const GLASS_SPLASH_KEY = "bb-glass-splash";
/** Longest the splash may stay up, ms. A tap skips earlier. */
export const GLASS_SPLASH_MAX_MS = 2500;

type Store = Pick<Storage, "getItem" | "setItem">;

export interface SplashEnv {
  hash: string;
  reducedMotion: boolean;
  storage: Store | null | (() => Store);
}

export function isLanding(hash: string): boolean {
  return hash === "" || hash === "#" || hash === "#/";
}

export function shouldPlaySplash(env: SplashEnv): boolean {
  if (env.reducedMotion || !isLanding(env.hash)) return false;
  try {
    const s = typeof env.storage === "function" ? env.storage() : env.storage;
    if (!s || s.getItem(GLASS_SPLASH_KEY)) return false;
    s.setItem(GLASS_SPLASH_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
