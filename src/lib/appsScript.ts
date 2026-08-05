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

/** The deck web app also serves folder management; see `endpointFor`. */
type DeckWriteFeature =
  | "deleteDeck"
  | "addShelf"
  | "deleteShelf"
  | "setDeckShelf"
  | "workspace"
  | "addTodo"
  | "updateTodo"
  | "deleteTodo"
  | "listAdmins"
  | "addAdmin"
  | "removeAdmin";

export type AppsScriptFeature = keyof typeof OVERRIDES | DeckWriteFeature;

const DECK_WRITES: DeckWriteFeature[] = [
  "deleteDeck",
  "addShelf",
  "deleteShelf",
  "setDeckShelf",
  "workspace",
  "addTodo",
  "updateTodo",
  "deleteTodo",
  "listAdmins",
  "addAdmin",
  "removeAdmin",
];

/**
 * The URL for a feature, or undefined when nothing is configured.
 *
 * The deck-write routes have no override of their own on purpose. They are the
 * same web app as `deck` and always will be, since they read and write the same
 * two tabs, so giving them separate variables would only create a way to point
 * them at two different scripts by accident.
 */
export function endpointFor(feature: AppsScriptFeature): string | undefined {
  if (DECK_WRITES.includes(feature as DeckWriteFeature)) return OVERRIDES.deck ?? SHARED;
  return OVERRIDES[feature as keyof typeof OVERRIDES] ?? SHARED;
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

/**
 * Published decks and the folders they can sit in, or empty when nothing is
 * configured.
 *
 * One request for both. A folder with nothing in it exists only in `shelves`, so
 * fetching the two separately would let the page render decks filed under a
 * folder it had not heard of yet.
 */
export async function fetchPublishedDecks(): Promise<{
  decks: unknown[];
  shelves: string[];
}> {
  const url = endpointFor("deck");
  if (!url) return { decks: [], shelves: [] };
  try {
    const res = await fetch(`${url}?type=decks`);
    const body = (await res.json()) as { decks?: unknown[]; shelves?: unknown };
    return {
      decks: body.decks ?? [],
      // Older deployments answer with no `shelves` key at all, which must read
      // as "no folders" rather than throwing on the way past.
      shelves: Array.isArray(body.shelves)
        ? body.shelves.filter((s): s is string => typeof s === "string" && s.trim() !== "")
        : [],
    };
  } catch {
    return { decks: [], shelves: [] };
  }
}
