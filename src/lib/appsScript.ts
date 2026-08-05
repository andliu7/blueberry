/**
 * The single Apps Script backend, shared by feedback, contact and deck upload.
 *
 * A web app exports one doPost, so all three POST to the same URL and the
 * script routes on `type`. See `apps-script/grignard.gs`.
 *
 * The per-feature variables are kept as overrides so an existing deployment
 * keeps working: the feedback widget already points at a URL, and consolidating
 * should not require redeploying before the next build goes out.
 */

const SHARED = import.meta.env.VITE_APPS_SCRIPT_ENDPOINT as string | undefined;

const OVERRIDES = {
  feedback: import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined,
  contact: import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined,
  deck: import.meta.env.VITE_DECKS_ENDPOINT as string | undefined,
} as const;

export type AppsScriptFeature = keyof typeof OVERRIDES | "deleteDeck";

/**
 * The URL for a feature, or undefined when nothing is configured.
 *
 * `deleteDeck` has no override of its own on purpose. It is the same web app as
 * `deck` and always will be, so giving it a separate variable would only create
 * a way to point them at two different scripts by accident.
 */
export function endpointFor(feature: AppsScriptFeature): string | undefined {
  if (feature === "deleteDeck") return OVERRIDES.deck ?? SHARED;
  return OVERRIDES[feature] ?? SHARED;
}

export interface AppsScriptResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * POSTs to the backend, tagging the payload so the router knows what it is.
 *
 * `text/plain` keeps this a simple request. Apps Script web apps do not answer
 * the CORS preflight that `application/json` would trigger, so the browser
 * would block the call before it left.
 */
export async function postToAppsScript(
  feature: AppsScriptFeature,
  payload: Record<string, unknown>,
): Promise<AppsScriptResult> {
  const url = endpointFor(feature);
  if (!url) return { ok: false, error: "not-configured" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ type: feature, at: new Date().toISOString(), ...payload }),
    });
    return (await res.json()) as AppsScriptResult;
  } catch {
    return { ok: false, error: "unreachable" };
  }
}

/** Published decks, or an empty list when nothing is configured. */
export async function fetchPublishedDecks(): Promise<unknown[]> {
  const url = endpointFor("deck");
  if (!url) return [];
  try {
    const res = await fetch(`${url}?type=decks`);
    const body = (await res.json()) as { decks?: unknown[] };
    return body.decks ?? [];
  } catch {
    return [];
  }
}
