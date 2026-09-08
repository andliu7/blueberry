/**
 * The node sheet's model: everything the sheet SAYS, derived once, with no DOM.
 *
 * WHY A MODEL FILE. The house rule (vitest.config.ts) is that React components
 * are judged by the human gate and the blind critic, while the decisions that
 * can be wrong in a testable way live in pure functions. Which card is
 * pressable, what the disabled copy says, and how many pips are filled are all
 * decisions of that kind, so they are derived here and the component only
 * draws the result. The correspondence is chargeGateModel.ts one door earlier:
 * that sheet prices the entry, this one describes the room.
 *
 * WHAT THIS SHEET IS, per docs/DESIGN-GOALS.md "The node sheet and the
 * guidebook": tap a node, a bottom sheet rises with a Practice card
 * (difficulty pips, violet 3D START), a Challenge card (stopwatch, double
 * dagger), and a hamburger in the corner that opens the guidebook. There is
 * deliberately no separate Concept row; the guidebook is the concept surface.
 *
 * PROGRESS IS SERVER STATE. The caller hands in a state already derived by
 * pathwayState.ts from the journal; this file never decides whether a node is
 * unlocked, it only words what the given state means. Same discipline as the
 * rest of the client: render the unlock, never rule on it.
 */

/** The same vocabulary the pathway derives; see MapNodeState in pathwayState.ts. */
export type SheetNodeState = "done" | "current" | "open" | "review" | "locked";

/** The same kinds the map data carries; see NodeKind in demo/pathwayMap.ts. */
export type SheetNodeKind = "spine" | "branch" | "gate" | "boss";

/**
 * The node the sheet is standing on. The integrator builds one of these from
 * a PathwayNode plus its derived MapNodeStatus; the sheet depends on neither
 * type so it can also be opened from the generic course track.
 */
export interface SheetNode {
  /** The id the journal will carry when the student starts or clears it. */
  readonly id: string;
  readonly kind: SheetNodeKind;
  readonly state: SheetNodeState;
  readonly title: string;
  /** The authored one-liner from the map. Read aloud and shown small. */
  readonly blurb: string;
  /**
   * Authored difficulty, 1..PIP_COUNT. Optional because the map does not
   * carry one yet; absent, it defaults by kind (see difficultyFor).
   */
  readonly difficulty?: number;
  /**
   * Where Practice goes, or null for a node still in the authoring queue.
   * Null is an authoring statement, never a progress one, exactly as
   * pathwayState.ts's `queued` flag insists.
   */
  readonly practiceHref: string | null;
}

/** Four pips, per the committed reference blueberry_r5-node-sheet-v2. */
export const PIP_COUNT = 4;

/**
 * Draft-copy marker for the guidebook surface. docs/DESIGN-GOALS.md: copy is
 * PLACEHOLDER marked for the human gate; layout and components are the
 * deliverable. The mark is a constant so the page, the tests and the human
 * gate reviewer all point at one string. No em dash, per CLAUDE.md.
 */
export const HUMAN_GATE_MARK = "Draft copy, headed to the human gate";

export interface PipReadout {
  readonly filled: number;
  readonly total: number;
  /** The accessible sentence for the whole row: one label, not four dots. */
  readonly label: string;
}

export interface CardReadout {
  readonly enabled: boolean;
  /**
   * Why the card is not pressable, in the coach's voice, or an empty string
   * when it is. Never scolds and never asks a question; the tests hold that.
   *
   * Practice draws this note as a line, because the reference's Practice card
   * has a slot for it where START would be. Challenge does NOT: see the note
   * in nodeSheetModel below and the composition note in NodeSheet.tsx.
   */
  readonly note: string;
}

export interface NodeSheetModel {
  readonly node: SheetNode;
  /** "Reaction lesson", "Side quest", ... The small line under the title. */
  readonly kindLabel: string;
  /** True on done and review: the student has cleared this node before. */
  readonly cleared: boolean;
  readonly pips: PipReadout;
  readonly practice: CardReadout;
  readonly challenge: CardReadout;
  /** The dialog's accessible name. */
  readonly label: string;
  /** The hamburger's accessible name. */
  readonly guidebookLabel: string;
}

const KIND_LABEL: Record<SheetNodeKind, string> = {
  spine: "Reaction lesson",
  branch: "Side quest",
  gate: "Checkpoint",
  boss: "Boss challenge",
};

/**
 * Default difficulty by kind, used only when the map has not authored one.
 * Spine and branch sit at the middle, a checkpoint asks for more, the boss is
 * the ceiling. These are display defaults, not chemistry claims.
 */
const KIND_DIFFICULTY: Record<SheetNodeKind, number> = {
  spine: 2,
  branch: 2,
  gate: 3,
  boss: 4,
};

export function difficultyFor(node: SheetNode): number {
  const authored = node.difficulty;
  if (authored === undefined) return KIND_DIFFICULTY[node.kind];
  // Clamp rather than throw: a bad authored value is a content bug to report,
  // not a reason to blank a student's sheet.
  return Math.min(PIP_COUNT, Math.max(1, Math.round(authored)));
}

export function nodeSheetModel(node: SheetNode): NodeSheetModel {
  const queued = node.practiceHref === null;
  const locked = node.state === "locked";
  const cleared = node.state === "done" || node.state === "review";

  const practiceEnabled = !queued && !locked;
  // Order matters: a locked node that is ALSO unauthored is described as
  // queued, because "clear the unit before it" would promise content that
  // does not exist yet. pathwayState.ts records the same distinction.
  const practiceNote = practiceEnabled
    ? ""
    : queued
      ? "We are still writing this one. It opens with the next content drop."
      : "Opens when the unit before it is done.";

  // The challenge is a timed re-run, so it asks for one clean clear first.
  // Not a lock the server needs to know about: it re-reads the same derived
  // state, so a cleared node journalled by the server enables it everywhere.
  //
  // THIS NOTE IS NEVER DRAWN ON THE CARD. It rides the card's accessible
  // name and nothing else. The reference draws the resting Challenge card as
  // the SAME cream card as Practice, 100 css px tall, with three visible
  // things in it: the heading, the stopwatch and the double dagger. The
  // fourth line the sheet used to render pushed the card to 121 px and
  // dropped its heading to the muted ink, which made it a different surface
  // family from the card beside it. So the wording below is written to be
  // HEARD, in full sentences, rather than to fit a line of the card.
  const challengeEnabled = practiceEnabled && cleared;
  const challengeNote = challengeEnabled
    ? ""
    : practiceEnabled
      ? "Opens after one clear."
      : "Opens with Practice.";

  const filled = difficultyFor(node);

  return {
    node,
    kindLabel: KIND_LABEL[node.kind],
    cleared,
    pips: {
      filled,
      total: PIP_COUNT,
      label: `Difficulty ${filled} of ${PIP_COUNT}`,
    },
    practice: { enabled: practiceEnabled, note: practiceNote },
    challenge: { enabled: challengeEnabled, note: challengeNote },
    label: `${node.title}. ${KIND_LABEL[node.kind]}.`,
    guidebookLabel: `Open the guidebook for ${node.title}`,
  };
}
