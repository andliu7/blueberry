/**
 * What Bloom is WEARING. The fourth axis, per docs/MASCOT.md.
 *
 * Fully orthogonal to the other three and purely cosmetic: a costume never
 * changes a mood, a behaviour or a state, and nothing reads it back. What it
 * does carry is information design rather than decoration. The costume answers
 * "what kind of surface am I on" in the corner of the eye, the way a shopfront
 * answers what a shop sells before you read the sign, so a student who tabs
 * away and comes back knows where they are before the header loads.
 *
 * Same contract as the three siblings: pure data, no react, no DOM. The surface
 * union below is deliberately its OWN vocabulary rather than an import of
 * `TabId` from `app/routes.ts` or `NodeKind` from `demo/pathwayMap.ts`. Those
 * two are shell and content concerns and both will move; a mascot that imports
 * either one becomes un-renderable in a storybook, a notification renderer or
 * the React Native shell, which is the whole reason these four files hold no
 * dependencies at all.
 */

export type BerryCostume =
  /** Goggles pushed up on the forehead and a lab coat. The default. */
  | "labcoat"
  /** Tweed bow and a pointer. Concept nodes. */
  | "tweed"
  /** Trench coat and a loupe. Spectroscopy and structure elucidation. */
  | "trench"
  /** A strap and a pack. Branch nodes, off the spine. */
  | "backpack"
  /** Stripes and a whistle. Unit quizzes, and it does not cheer mid quiz. */
  | "referee"
  /** Notification art ONLY. See NOTIFICATION_COSTUME. */
  | "nightcap"
  /** A cape. Leaderboard placement. */
  | "cape";

export const BERRY_COSTUMES: readonly BerryCostume[] = Object.freeze([
  "labcoat",
  "tweed",
  "trench",
  "backpack",
  "referee",
  "nightcap",
  "cape",
]);

/** The costume the default lands on when a surface names nothing else. */
export const DEFAULT_COSTUME: BerryCostume = "labcoat";

/**
 * The evening nudge, and nothing else.
 *
 * docs/MASCOT.md: "Nightcap | Notification art only, never an in-app state",
 * and docs/ECONOMY.md's streak table spends it on exactly one thing, the
 * evening nudge with Bloom shielding a guttering flame. It is a constant here
 * rather than a row in the surface map because a map that can return it is a
 * map somebody will call from a screen. The notification renderer names it
 * directly, which is also the honest signal that it is not a surface.
 */
export const NOTIFICATION_COSTUME: BerryCostume = "nightcap";

/** Everything `costumeForSurface` is allowed to return. `nightcap` is not here. */
export const IN_APP_COSTUMES: readonly BerryCostume[] = Object.freeze(
  BERRY_COSTUMES.filter((costume) => costume !== NOTIFICATION_COSTUME),
);

/**
 * Where the berry is standing.
 *
 * Two families in one union on purpose. The first five are pathway NODE KINDS,
 * because inside a node the costume is about the work the node asks for. The
 * rest are app SURFACES, because outside a node the costume is about the tab.
 * MASCOT.md's table mixes the two the same way ("reaction nodes", "unit
 * quizzes", "leaderboard placement"), so splitting them into two functions
 * would be a tidier API describing a design that does not exist.
 */
export type BerrySurface =
  | "reactionNode"
  | "conceptNode"
  | "spectroscopyNode"
  | "branchNode"
  | "bossNode"
  | "unitQuiz"
  | "leaderboards"
  | "trainer"
  | "pathway"
  | "courses"
  | "search"
  | "periodic"
  | "chat"
  | "messages"
  | "onboarding";

export const BERRY_SURFACES: readonly BerrySurface[] = Object.freeze([
  "reactionNode",
  "conceptNode",
  "spectroscopyNode",
  "branchNode",
  "bossNode",
  "unitQuiz",
  "leaderboards",
  "trainer",
  "pathway",
  "courses",
  "search",
  "periodic",
  "chat",
  "messages",
  "onboarding",
]);

/**
 * Surface to costume. Every row that is not the default is a row MASCOT.md's
 * table names; every row that IS the default is a surface the table does not
 * name, and the table's own first line says the lab coat is what unnamed
 * surfaces get. Inventing a costume for a surface the owner did not assign one
 * to would be authoring content, not rendering it.
 *
 * Two calls worth stating rather than leaving implicit:
 *
 * `search` is the lab coat and not the trench. The loupe is the obvious read
 * for a lookup tab, and it is exactly why it is wrong here: the trench is the
 * signal for spectroscopy and structure elucidation, and a costume that means
 * two things means neither. Flagged for the owner rather than decided.
 *
 * `onboarding` is the lab coat and not the referee. The referee exists to be
 * neutral and to not cheer, which is the correct face inside a graded quiz and
 * the wrong one on the surface CLAUDE.md calls the highest leverage copy in the
 * product. A whistle on the welcome screen sells nothing.
 */
const SURFACE_COSTUME: Record<BerrySurface, BerryCostume> = {
  reactionNode: "labcoat",
  conceptNode: "tweed",
  spectroscopyNode: "trench",
  branchNode: "backpack",
  // An integration node is a long reaction node, so it keeps the reaction
  // node's clothes. The occasion is carried by the behaviour, not the outfit.
  bossNode: "labcoat",
  unitQuiz: "referee",
  leaderboards: "cape",
  trainer: "labcoat",
  pathway: "labcoat",
  // The lecture surface, so the same clothes a concept node wears.
  courses: "tweed",
  search: "labcoat",
  periodic: "labcoat",
  chat: "labcoat",
  messages: "labcoat",
  onboarding: "labcoat",
};

/** The costume for a surface. Never returns `nightcap`. */
export function costumeForSurface(surface: BerrySurface): BerryCostume {
  return SURFACE_COSTUME[surface] ?? DEFAULT_COSTUME;
}
