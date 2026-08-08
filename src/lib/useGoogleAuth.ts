import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Google sign-in, used to prove who is uploading a deck.
 *
 * The important thing about this file is what it is *not* responsible for.
 * The site is static, so nothing here can be trusted: anyone can edit the
 * bundle or their own localStorage. The client's only job is to obtain a
 * Google-signed ID token and decide whether to show the upload form.
 *
 * Authorisation happens on the server. Apps Script verifies the token against
 * Google's tokeninfo endpoint, checks the audience matches our client ID, and
 * checks the email against an allowlist held in Script Properties. That
 * allowlist is never shipped to the browser and is not in this repo.
 *
 * With VITE_GOOGLE_CLIENT_ID unset the whole feature stays dark, exactly like
 * the feedback endpoint: no script is loaded and no request is made.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SRC = "https://accounts.google.com/gsi/client";

export interface GoogleUser {
  email: string;
  name?: string;
  picture?: string;
  idToken: string;
}

/** Reads the payload for display only. Never used to decide permissions. */
function decodePayload(jwt: string): { email?: string; name?: string; picture?: string } {
  try {
    const part = jwt.split(".")[1];
    if (!part) return {};
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return {};
  }
}

/**
 * Who is signed in, held once for the page rather than once per component.
 *
 * Being signed in is a fact about the visitor, not about a component. While this
 * lived in component state, the upload ticket and the delete controls each had
 * their own copy, so signing in to publish a deck left the thing next to it
 * still asking you to sign in.
 */
let currentUser: GoogleUser | null = null;
const userListeners = new Set<() => void>();

function setCurrentUser(next: GoogleUser | null) {
  currentUser = next;
  userListeners.forEach((fn) => fn());
}

function subscribeUser(fn: () => void) {
  userListeners.add(fn);
  return () => {
    userListeners.delete(fn);
  };
}

let scriptPromise: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Google sign-in"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void }) => void;
      prompt: () => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
      disableAutoSelect: () => void;
    };
  };
}

/**
 * Loads the Google script and initialises it, once for the page.
 *
 * Once, because Google says so: calling `initialize` again logs
 * "called multiple times. This could cause unexpected behavior and only the
 * last initialized instance will be used." Two components on the same page use
 * this hook, so it was firing on every mount of either one. The credential now
 * lands in a store rather than in whichever component initialised last, so
 * there is nothing left that a second call would be doing.
 */
function initGis(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = loadGis().then(() => {
    const g = (window as unknown as { google?: GoogleIdApi }).google;
    if (!g) throw new Error("Google sign-in unavailable");
    g.accounts.id.initialize({
      client_id: CLIENT_ID!,
      callback: ({ credential }) => {
        const p = decodePayload(credential);
        setCurrentUser({
          email: p.email ?? "",
          name: p.name,
          picture: p.picture,
          idToken: credential,
        });
      },
    });
  });
  return initPromise;
}

/**
 * The local development door, and why it is safe.
 *
 * Google sign-in cannot complete against localhost here, which meant the whole
 * staff side — the workspace, the upload ticket, anything behind the door — could
 * not be looked at while it was being built.
 *
 * `import.meta.env.DEV` is a literal Vite substitutes at build time, so in a
 * production build this whole branch reads `if (false)` and is eliminated. The
 * button below cannot ship, which is why this is preferable to a password we
 * would have to remember to remove.
 *
 * **It grants a screen, never a permission.** The token below is a marker string
 * rather than a Google-signed JWT, so every write still fails on the server, and
 * that is correct: authorisation lives in the Apps Script allowlist and must not
 * be reachable from a browser. Anything you need to *test* rather than look at
 * has to work without the server, which is why the deck builder exports a file.
 */
export const DEV_LOGIN = import.meta.env.DEV;

export const DEV_USER: GoogleUser = {
  email: "dev@localhost",
  name: "Local dev",
  idToken: "dev-local-not-a-real-token",
};

export function useGoogleAuth() {
  const configured = Boolean(CLIENT_ID);
  const [ready, setReady] = useState(false);
  const user = useSyncExternalStore(subscribeUser, () => currentUser);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    // Every mount awaits the same promise, so a component mounting second is
    // ready as soon as it renders rather than starting the load again.
    initGis()
      .then(() => !cancelled && setReady(true))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [configured]);

  const signIn = useCallback(() => {
    const g = (window as unknown as { google?: GoogleIdApi }).google;
    g?.accounts.id.prompt();
  }, []);

  const signOut = useCallback(() => {
    const g = (window as unknown as { google?: GoogleIdApi }).google;
    g?.accounts.id.disableAutoSelect();
    setCurrentUser(null);
  }, []);

  /** See `DEV_LOGIN`. A no-op in any build that is not `npm run dev`. */
  const devSignIn = useCallback(() => {
    if (!DEV_LOGIN) return;
    setCurrentUser(DEV_USER);
  }, []);

  /**
   * Renders Google's own button, which the prompt flow needs as a fallback.
   *
   * `ready` is in the dependency list and that is the whole point of it. This is
   * used as a ref callback, so React only calls it when the element mounts or
   * when the callback's identity changes. With an empty list the identity never
   * changed, so it ran exactly once, at mount, which is before the Google script
   * has finished loading: `window.google` was undefined, the optional chain
   * swallowed it, and the button silently never appeared. Depending on `ready`
   * makes React re-run it the moment the script is up.
   */
  const renderButton = useCallback(
    (el: HTMLElement | null) => {
      if (!el || !ready) return;
      const g = (window as unknown as { google?: GoogleIdApi }).google;
      g?.accounts.id.renderButton(el, { theme: "outline", size: "medium", text: "signin_with" });
    },
    [ready],
  );

  return { configured, ready, user, error, signIn, signOut, renderButton, devSignIn };
}
