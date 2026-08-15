import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(URL!, PUBLISHABLE_KEY!, {
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
    })
  : null;

/** Where Google should send someone back to after signing in. */
export const authRedirectTo = () =>
  `${window.location.origin}${window.location.pathname}`;
