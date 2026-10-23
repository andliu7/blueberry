import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase browser client.
 *
 * One client, created once. Supabase keeps the session in memory alongside the
 * storage copy, so a second client on the same page holds its own idea of who
 * is signed in and the two drift the moment one of them refreshes a token.
 *
 * **Not the `@supabase/ssr` helpers.** Those exist for Next, SvelteKit and
 * Remix, where auth has to survive a server render and therefore lives in
 * cookies. Blueberry is a static Vite bundle on GitHub Pages: there is no
 * server, no request to attach a cookie to, and no middleware. The plain client
 * with its default `localStorage` persistence is the correct shape here, and
 * the quickstart's `server.ts` and `middleware.ts` have nothing to attach to.
 *
 * The publishable key is meant to be in the bundle — it identifies the project,
 * it does not authorise anything. Row Level Security is what decides who may
 * read and write, and it runs on Supabase's side where a browser cannot argue
 * with it. A `sb_secret_...` key must never appear in a `VITE_` variable:
 * those are inlined at build time, which would publish it.
 */

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Configured at build time, like every other optional service here.
 *
 * `createClient` throws when handed an empty URL, so a build without these
 * would be a white page rather than a site with a feature switched off.
 */
export const supabaseConfigured = Boolean(URL && PUBLISHABLE_KEY);

/**
 * The client, created on first ask.
 *
 * supabase-js is about 50 KB gzipped, and the first screen of the site and the
 * game never needs it before the page is up. So it is a dynamic import behind
 * this getter instead of a top-level `createClient`, which keeps it out of the
 * first load. The promise is memoised, so every caller still shares the one
 * client the note above insists on.
 *
 * `AuthProvider` asks for it on mount only when there is auth state to pick up:
 * a stored session or a Google redirect coming back (`supabaseAuthToRestore`).
 * That restores the session and finishes the redirect (`detectSessionInUrl`)
 * on page load, exactly as the eager client did, a chunk download later. A
 * first-time visitor has neither, so the library waits until something asks
 * for it: a sign-in, a checkout, an editor or calendar action.
 *
 * Resolves to null when the build has no Supabase settings, same as before.
 *
 * A failed chunk download (a flaky network, a deploy that replaced the hashed
 * file) is not memoised: the promise is dropped on rejection, so the next call
 * tries again instead of handing back the same failure for the whole session.
 */
let client: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  if (client) return client;
  client = import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL!, PUBLISHABLE_KEY!, {
      auth: {
        // A static site has no server to complete a code exchange, so the
        // redirect comes back to the page itself and the client finishes the
        // handshake in the browser.
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth redirect lands on `#/...` because this site uses hash
        // routing, and Supabase's own tokens also arrive in the hash. Letting
        // it read the URL is what completes a Google sign-in on return.
        detectSessionInUrl: true,
      },
    }),
  );
  const pending = client;
  pending.catch(() => {
    if (client === pending) client = null;
  });
  // Tell whoever is waiting (AuthProvider) that the client now exists, so a
  // sign-in that loaded it is still heard by the one auth subscription. This
  // runs once per creation: later calls return early above.
  void pending.then((created) => {
    if (created && client === pending) for (const listener of clientListeners) listener(created);
  }).catch(() => {});
  return pending;
}

const clientListeners = new Set<(client: SupabaseClient) => void>();

/**
 * Call `listener` once the client exists, whoever asked for it first.
 *
 * If it already exists the listener is called too, so in a race it can be
 * called twice: the caller makes itself idempotent. Returns the unsubscribe.
 */
export function onSupabaseClient(listener: (client: SupabaseClient) => void): () => void {
  clientListeners.add(listener);
  client?.then((created) => {
    if (created && clientListeners.has(listener)) listener(created);
  }).catch(() => {});
  return () => {
    clientListeners.delete(listener);
  };
}

/**
 * The prefix of every key supabase-js keeps in localStorage: the session, and
 * the PKCE code verifier a Google sign-in leaves behind while it is away.
 * This is the library's own default (`sb-<project ref>-auth-token`), which is
 * why `createClient` above sets no custom `storageKey`: changing it would
 * sign everyone out.
 */
export function supabaseStorageKeyPrefix(): string | null {
  if (!supabaseConfigured) return null;
  return `sb-${new globalThis.URL(URL!).hostname.split(".")[0]}-auth-token`;
}

/** The URL parameters supabase-js reads when a sign-in comes back (`detectSessionInUrl`). */
const AUTH_RETURN_PARAMS = ["code", "access_token", "refresh_token", "error", "error_description", "error_code"];

/**
 * Whether this page load has auth state the client must pick up on mount.
 *
 * True when a stored session (or a pending PKCE verifier) is in localStorage,
 * or when the URL carries a redirect return. The URL is read the way
 * supabase-js reads it: the hash as query parameters, then the search string.
 * If storage cannot be read (private mode, blocked site data), it says true so
 * the client loads on mount exactly as it always did.
 */
export function supabaseAuthToRestore(): boolean {
  const prefix = supabaseStorageKeyPrefix();
  if (!prefix) return false;
  try {
    const { hash, search } = window.location;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    new URLSearchParams(search).forEach((value, key) => params.set(key, value));
    if (AUTH_RETURN_PARAMS.some((key) => params.has(key))) return true;

    for (let i = 0; i < window.localStorage.length; i++) {
      if (window.localStorage.key(i)?.startsWith(prefix)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Where Google should send someone back to after signing in. */
export const authRedirectTo = () =>
  `${window.location.origin}${window.location.pathname}`;
