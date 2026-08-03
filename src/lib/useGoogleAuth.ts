import { useCallback, useEffect, useState } from "react";

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

let scriptPromise: Promise<void> | null = null;

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

export function useGoogleAuth() {
  const configured = Boolean(CLIENT_ID);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled) return;
        const g = (window as unknown as { google?: GoogleIdApi }).google;
        if (!g) return setError("Google sign-in unavailable");
        g.accounts.id.initialize({
          client_id: CLIENT_ID!,
          callback: ({ credential }) => {
            const p = decodePayload(credential);
            setUser({ email: p.email ?? "", name: p.name, picture: p.picture, idToken: credential });
          },
        });
        setReady(true);
      })
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
    setUser(null);
  }, []);

  /** Renders Google's own button, which the prompt flow needs as a fallback. */
  const renderButton = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const g = (window as unknown as { google?: GoogleIdApi }).google;
    g?.accounts.id.renderButton(el, { theme: "outline", size: "medium", text: "signin_with" });
  }, []);

  return { configured, ready, user, error, signIn, signOut, renderButton };
}
