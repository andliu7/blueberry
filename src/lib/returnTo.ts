/**
 * Back to the game after signing in.
 *
 * Google sends the student back to the page WITHOUT its hash (see
 * `authRedirectTo` in supabase.ts), so someone who left #/app/me to sign in
 * landed on the site home and lost their place. The game remembers where it
 * was before it sends them to #/signin, and AuthProvider puts them back the
 * moment a session appears.
 *
 * sessionStorage, not localStorage: it is one tab's errand, and it should not
 * pull a different tab into the game a week later.
 */

const KEY = "blueberry.returnTo";

/** Remember a game hash to come back to. Only #/app hashes are kept. */
export function rememberReturn(hash: string): void {
  if (!hash.startsWith("#/app")) return;
  try {
    sessionStorage.setItem(KEY, hash);
  } catch {
    /* storage blocked: the student signs in and finds the game themselves */
  }
}

/** Go back to the remembered game hash, once. Returns true when it navigated. */
export function consumeReturn(): boolean {
  try {
    const hash = sessionStorage.getItem(KEY);
    if (hash === null) return false;
    sessionStorage.removeItem(KEY);
    if (!hash.startsWith("#/app")) return false;
    window.location.hash = hash;
    return true;
  } catch {
    return false;
  }
}
