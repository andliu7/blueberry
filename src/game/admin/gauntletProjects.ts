/**
 * Gauntlet loops as projects on the admin task board. A project is a loop; its nodes are the
 * waves (or phases) you walk through; each node holds the pieces being built and judged.
 *
 * The statuses here are the starting point. The owner can click a piece to change its status and
 * the change lives in this browser only (localStorage, try/catch), like the cards. The run itself
 * writes its results to documentation/OVERNIGHT-LOG.md, which is the record to trust.
 */
export type PieceStatus = "todo" | "doing" | "done" | "stuck";
export const PIECE_STATUSES: readonly PieceStatus[] = ["todo", "doing", "done", "stuck"];
export const STATUS_LABEL: Record<PieceStatus, string> = { todo: "To do", doing: "Doing", done: "Won", stuck: "Open gap" };

export interface Piece {
  id: string;
  title: string;
  goal: string;
  /** What the blind critics compare against. */
  bar: string;
  status: PieceStatus;
  /** Rounds used so far, when known. */
  rounds?: number;
  /** The biggest remaining gap a critic named. */
  gap?: string;
}
export interface ProjectNode {
  id: string;
  title: string;
  detail: string;
  pieces: Piece[];
}
export interface Project {
  id: string;
  title: string;
  summary: string;
  started: string;
  nodes: ProjectNode[];
}

const p = (id: string, title: string, goal: string, bar: string, status: PieceStatus = "todo", extra: Partial<Piece> = {}): Piece => ({ id, title, goal, bar, status, ...extra });

export const PROJECTS: Project[] = [
  {
    id: "overnight-units",
    title: "Overnight run: Units 1 to 3, admin and spectra",
    summary: "Audit the whole site, then eight pieces, each judged blind by two critics with the order swapped. Ours has to win both.",
    started: "2026-10-29",
    nodes: [
      {
        id: "audit",
        title: "Audit",
        detail: "Five read-only auditors map pages, text, spacing, hierarchy and motion, website and app apart. One synthesis writes the site audit and the unit style guide.",
        pieces: [
          p("a-site", "Website pages", "Every public page: text, heading sizes, spacing, grid, hierarchy, animation.", "The audit itself; no bar", "doing"),
          p("a-app", "App pages (the practice)", "Every tab and screen under src/game, measured the same way.", "The audit itself; no bar", "doing"),
          p("a-grid", "Spacing grid and outliers", "Header-to-text distance, gaps, padding, radii, shadows, type scale, with outliers flagged.", "The dominant value on the site", "doing"),
          p("a-motion", "Motion, including the radical", "Every animation with file, trigger, duration and easing. Why the radical looks like it splits in half.", "Bloom states in bloomBible.ts", "doing"),
          p("a-admin", "Admin numbers and viewer", "Which admin numbers are real, which are sample, and what the staff viewer shows.", "The audit itself; no bar", "doing"),
          p("a-guide", "Site audit and unit style guide", "SITE-AUDIT.md and UNIT-STYLE-GUIDE.md, written from Unit 1 as built.", "Chad's Prep and The Organic Chemistry Tutor sequence"),
        ],
      },
      {
        id: "wave-1",
        title: "Wave 1: look and admin",
        detail: "The radical animation, honest admin numbers, and the pathway slideshow.",
        pieces: [
          p("radical", "Radical animation", "One unstable, jittery species that never cleaves in half or reads as an electron pair.", "Brilliant and Duolingo lesson animations"),
          p("admin-honesty", "Admin numbers, honest", "Real figures with their source, otherwise a labelled \"No data, example\" tile with an example graph. Admin can still open the app.", "Stripe Dashboard home"),
          p("slideshow", "Pathway slideshow per lesson", "Questions, flashcards, explanations, videos, guidelines, challenge and overarching questions, how they are chosen, the algorithms.", "Linear docs and Figma Slides present mode"),
        ],
      },
      {
        id: "wave-2",
        title: "Wave 2: units and reactions",
        detail: "Finish Unit 1 against the style guide, apply it to Units 2 and 3, and build one lesson per reaction.",
        pieces: [
          p("unit-1", "Finish Unit 1", "More questions, video slots, step-by-step walk-throughs, context for newcomers, a help path when a student cannot follow.", "Chad's Prep and The Organic Chemistry Tutor"),
          p("units-2-3", "Units 2 and 3 on the same shape", "Skeletons and real content where lessons are defined; induction, Keq vs pKa, resonance, EWG/EDG, nomenclature priority.", "Khan Academy unit structure and Chad's Prep Orgo II"),
          p("reactions", "One lesson per reaction", "Step by step; why negatives meet positives, bond distance, resonance checks, stereochemistry added step by step.", "The Organic Chemistry Tutor mechanisms; Arrow Pusher"),
        ],
      },
      {
        id: "wave-3",
        title: "Wave 3: energy, spectra, difficulty",
        detail: "Energy diagrams and Keq, the NMR and IR toolbar, and the rules that make questions easier or harder.",
        pieces: [
          p("energy", "Energy diagrams and Keq", "Reversible steps, dead ends, the irreversible step that sets the path, pKa to Keq with your own calculator.", "Khan Academy and Chad's Prep"),
          p("spectra", "NMR and IR toolbar", "Range select, DOU steps, your own image with zoom, hidden in challenges and tests, no calculator, NMR-from-reaction questions.", "nmrdb.org and the periodic table tool here"),
          p("difficulty", "Difficulty rules, tested", "How a student is made easier or harder next, pinned by tests and shown in the slideshow.", "Duolingo skill strength and Brilliant adaptive practice"),
        ],
      },
    ],
  },
  {
    id: "owner-rules-oct-29",
    title: "Owner rules, 29 Oct",
    summary: "The long list of preferences. The shipped part is on the branch; six pieces are still open.",
    started: "2026-10-29",
    nodes: [
      {
        id: "shipped",
        title: "Shipped (854fa89)",
        detail: "On ui/cta-and-background. Not merged to main, so not deployed.",
        pieces: [
          p("s-admin", "Admin home, task board, calendar", "Behind the staff gate, labelled sample data.", "Stripe Dashboard", "done"),
          p("s-local", "Sign-in skipped on localhost", "The deployed site is unchanged.", "n/a", "done"),
          p("s-elixir", "Elixir energy and Bloom states", "Energy as elixir; Bloom drinks, tires, sleeps.", "Clash of Clans elixir", "done"),
          p("s-mistakes", "Mistakes saved with a why", "Replayed as practice.", "Duolingo mistakes practice", "done"),
          p("s-naming", "Naming and acid-base reference", "Test-useful nomenclature only.", "Chad's Prep nomenclature", "done"),
        ],
      },
      {
        id: "open",
        title: "Still open",
        detail: "Each needs another round with real references fetched.",
        pieces: [
          p("o-popup", "Lesson-start popup", "One screen, no scroll.", "Duolingo lesson intro", "stuck"),
          p("o-chest", "Chest loot realism", "Coins like Clash of Clans.", "Clash of Clans chest opening", "stuck"),
          p("o-bag", "Bloom bag", "Strap, eye and side fixed.", "Bloom bible", "stuck"),
          p("o-tabs", "Pathway Challenges tab and left icons", "Never loaded for a critic; icon tabs unconfirmed.", "Duolingo path tabs", "stuck"),
          p("o-streak", "Streak, start popup and feed", "Calm and decision-light.", "Duolingo streak screens", "stuck"),
          p("o-league", "League celebration", "Pathway completion unlocks, not greens.", "Duolingo league", "stuck"),
        ],
      },
    ],
  },
];

/** A node is done when all its pieces are won, doing once any has started. */
export function nodeStatus(n: ProjectNode, st: (p: Piece) => PieceStatus): PieceStatus {
  const all = n.pieces.map(st);
  if (all.length > 0 && all.every((s) => s === "done")) return "done";
  if (all.some((s) => s === "stuck")) return "stuck";
  if (all.some((s) => s === "doing" || s === "done")) return "doing";
  return "todo";
}
export function projectProgress(proj: Project, st: (p: Piece) => PieceStatus): { done: number; total: number } {
  const all = proj.nodes.flatMap((n) => n.pieces);
  return { done: all.filter((x) => st(x) === "done").length, total: all.length };
}
export const nextStatus = (s: PieceStatus): PieceStatus => PIECE_STATUSES[(PIECE_STATUSES.indexOf(s) + 1) % PIECE_STATUSES.length]!;

const KEY = "blueberry.admin.projects.v1";
export type StatusMap = Record<string, PieceStatus>;
export function loadStatuses(): StatusMap {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as unknown;
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, PieceStatus] => PIECE_STATUSES.includes(e[1] as PieceStatus)));
  } catch {
    return {};
  }
}
export function saveStatuses(m: StatusMap): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* private window: the page still works for this visit */
  }
}
