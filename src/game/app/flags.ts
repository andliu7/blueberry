/**
 * Feature flags for the three surfaces that are built and not open yet.
 *
 * Owner amendment of 2026-08-28: leaderboards, AI chat and tutor messaging come
 * out of the tab bar and go behind a flag "rather than being deleted", and
 * every route still resolves so a deep link does not 404.
 *
 * A flag here decides ONE thing: whether the app LINKS to a surface. It never
 * decides whether the surface renders, because a student who typed the hash or
 * followed an old link has to land somewhere honest. The route always resolves;
 * with the flag off it renders the surface's own "not open yet" state.
 *
 * This is a CLIENT flag and it is deliberately not an entitlement. CLAUDE.md:
 * anything that costs money or gates access is enforced server side, and a
 * client side check is a suggestion. Nothing behind these flags costs money
 * today; when chat does, Phase 7's Edge Function meters it and this file is
 * still only deciding whether a link is drawn.
 *
 * Two ways to turn one on, both non-secret:
 *   ?flags=chat,leaderboards   for a capture script, a critic, or a demo
 *   localStorage["blueberry.flags"] = "chat"   for a device that has to keep it
 *
 * The URL wins, so a capture never inherits whatever the last session stored.
 */

export type FlagId = "leaderboards" | "chat" | "messages";

/**
 * BETA EXPLORATION FLAGS, owner request 2026-09-03: "unlock all of the buttons
 * so that I can access all of them from the pathway (beta version I suppose)"
 * and "give infinite charge".
 *
 * A SEPARATE TYPE, not three more FlagIds, and the type system is the reason
 * the difference got written down. A FlagId names a SURFACE that exists and is
 * not linked yet, so every FlagId has a route, a tab id and a "not open yet"
 * notice, and the compiler enforces that each one does. A BetaId names a RULE
 * suspended for exploration. It has no route, no tab and no notice, and folding
 * it into FlagId made three unrelated files claim it needed all three.
 *
 * Neither grants anything. Unlock state and any balance that costs money are
 * server enforced per CLAUDE.md and nothing here is consulted on that path.
 * These let the CLIENT draw the product as though the server had said yes,
 * which is a demo, not an entitlement. When Phase 6 puts the server behind
 * progress, these keep drawing a local preview and grant exactly nothing.
 *
 * On by ?flags=unlockall,infinitecharge or the same list in localStorage.
 */
export type BetaId = "unlockall" | "infinitecharge";

const FLAG_IDS: readonly FlagId[] = ["leaderboards", "chat", "messages"];
const BETA_IDS: readonly BetaId[] = ["unlockall", "infinitecharge"];

const ALL_IDS: readonly string[] = [...FLAG_IDS, ...BETA_IDS];

const STORAGE_KEY = "blueberry.flags";

function parseList(raw: string | null): ReadonlySet<string> {
  const on = new Set<string>();
  if (raw === null) return on;
  for (const part of raw.split(",")) {
    const name = part.trim();
    if (ALL_IDS.includes(name)) on.add(name);
  }
  return on;
}

/**
 * THE BETA FLAGS ARE ON BY DEFAULT IN DEV, off in every build.
 *
 * Owner asked twice for infinite charge and no locked buttons "inside of the
 * localhost", and a flag that has to be typed into the URL is not that: the dev
 * server is exactly the place where walking the whole product without grinding
 * is the point. `import.meta.env.DEV` is true only for `npm run dev` and is
 * statically false in any build, so this cannot reach a student: the branch is
 * removed by the bundler along with the flags it names.
 *
 * Still overridable both ways, because a capture script and a critic run
 * against the dev server too and must see the real rules: ?flags= wins over
 * this, and ?flags= with any other value (or an empty one) turns them off.
 */
function devDefaults(): ReadonlySet<string> {
  return import.meta.env.DEV ? new Set<string>(BETA_IDS) : new Set<string>();
}

function read(): ReadonlySet<string> {
  if (typeof window === "undefined") return new Set();
  const fromUrl = new URLSearchParams(window.location.search).get("flags");
  if (fromUrl !== null) return parseList(fromUrl);
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseList(stored);
      // An EMPTY stored value must not beat the dev default. A device that once
      // stored "" would otherwise be pinned to no flags forever, which is
      // exactly the shape of the bug where the owner asked three times for
      // infinite charge on localhost and kept not getting it.
      if (parsed.size > 0) return parsed;
    }
    return devDefaults();
  } catch {
    /* storage blocked: fall back to the dev default, which is empty in a build */
    return devDefaults();
  }
}

/**
 * Read once at module load, not per call.
 *
 * A flag that could change between two renders in one session would need a
 * store and a subscription, and nothing here is worth that: turning one on is a
 * reload. Reading once also means the tab bar and the Me tab cannot disagree
 * with each other halfway down a screen.
 */
const ON: ReadonlySet<string> = read();

export function isFlagOn(flag: FlagId): boolean {
  return ON.has(flag);
}

/** A beta exploration flag. Never an entitlement; see the note above. */
export function isBetaOn(beta: BetaId): boolean {
  return ON.has(beta);
}

/** Every flag currently on. Used by the Me tab to decide what to list. */
export function flagsOn(): readonly FlagId[] {
  return FLAG_IDS.filter((flag) => ON.has(flag));
}
