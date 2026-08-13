/**
 * Clerk, switched on by the presence of its key and off by its absence.
 *
 * The same shape as `useGoogleAuth`'s `configured` flag, and for the same
 * reason: `ClerkProvider` throws if it is handed no publishable key, so a build
 * without one would be a white page rather than a site with one feature
 * missing. `VITE_*` values are inlined at build time, so the machine running
 * `npm run build` is the one that decides whether this is on.
 *
 * The publishable key is public by design. It identifies the Clerk instance to
 * the browser and is safe in a client bundle. The secret key is not, and has no
 * business anywhere in this repo.
 *
 * Scope, deliberately: this is for *member* accounts. Staff sign-in stays on
 * Google, because Apps Script verifies Google ID tokens itself and is the
 * source of truth for every privileged action. It has never seen a Clerk token
 * and cannot verify one without new code there.
 */

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

export const clerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY);
