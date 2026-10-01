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
 * (difficulty pips when the node has measured content, violet 3D START), a
 * Challenge card (double dagger), and a hamburger in the corner that opens the guidebook. There is
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
   * Measured difficulty, 1..PIP_COUNT, counted off the content this node
   * actually launches by pathway-sheet/nodeDifficulty.ts. Absent means
   * nothing is authored behind the node, and the sheet then draws NO pips.
   */
  readonly difficulty?: number;
  /**
   * Where Practice goes, or null for a node still in the authoring queue.
   * Null is an authoring statement, never a progress one, exactly as
   * pathwayState.ts's `queued` flag insists.
   */
  readonly practiceHref: string | null;
  /**
   * Why a LOCKED node is shut, when the reason is not the unit gate. Absent
   * means the default, "Opens when the unit before it is done", which is the
   * reason for every lesson. A unit's checkpoint is the one node locked inside
   * an open unit (it waits for that unit's own lessons, pathwayState.ts), and
   * telling a student to finish the unit before it would send them backwards.
   */
  readonly lockedNote?: string;
  /**
   * True when this node has NO Challenge run: its lesson has a step that
   * cannot report a miss (a mechanism on the trainer engine), or it is not a
   * map lesson at all. Absent means it has one; see challengeable() in
   * beats/template.ts for the rule and PathwayTab's sheetNodeFor for where
   * the map's nodes get it.
   */
  readonly noChallenge?: boolean;
  /**
   * Present on a unit CHECKPOINT only: what passing it does, derived by the
   * caller from the map (unitOpenedAfter in tabs/pathway/pathwayState.ts)
   * and the measured count (CHECKPOINT_QUESTIONS). `opens` is the unit it
   * opens, null past the last unit with content; `skipped` names the empty
   * units the track walks through on the way; `questions` is null when
   * nothing is authored.
   */
  readonly checkpoint?: {
    readonly opens: string | null;
    readonly skipped: readonly string[];
    readonly questions: number | null;
  };
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
  /**
   * The SAME measurement in a student's words, drawn beside the dots.
   *
   * Owner, 2026-09-23: "the dots are meaningless." They were not measuring
   * nothing (nodeDifficulty.ts counts the graded moves behind the node and
   * test/nodeDifficulty.test.ts regenerates the table from the real content),
   * but a sighted student got four dots and no legend, so nothing on the card
   * said what was being counted or which way was harder. A scale with no
   * legend is a decoration, and the whole reason the pips exist is that the
   * previous ones ranked nothing.
   *
   * The screen reader has had `label` the whole time, which is why the word
   * is drawn aria-hidden: this is the same fact in the other vocabulary, not
   * a second one, and saying it twice to a screen reader is noise.
   */
  readonly band: string;
}

export interface CardReadout {
  readonly enabled: boolean;
  /**
   * Why the card is not pressable, in the coach's voice, or an empty string
   * when it is. Never scolds and never asks a question; the tests hold that.
   *
   * Practice draws this note as a line where START would be, and the resting
   * Challenge card draws it under its heading (owner, 2026-09-30).
   */
  readonly note: string;
}

export interface NodeSheetModel {
  readonly node: SheetNode;
  /**
   * The first card's heading. "Practice" for a lesson; a checkpoint states
   * its stakes instead, "Pass to open Unit 3", because passing it is what
   * opens the next unit (owner, 2026-10-01) and "Practice" said none of that
   * (g11 critic).
   */
  readonly practiceTitle: string;
  /** One line under that heading, or null: a checkpoint's count and route, or a side quest's "Optional". */
  readonly practiceDetail: string | null;
  /** "Reaction lesson", "Side quest", ... The small line under the title. */
  readonly kindLabel: string;
  /** True on done and review: the student has cleared this node before. */
  readonly cleared: boolean;
  /** Null when the node has no measured difficulty: the row is not drawn. */
  readonly pips: PipReadout | null;
  readonly practice: CardReadout;
  /**
   * False when the node has no Challenge run at all (SheetNode.noChallenge).
   * The sheet then draws NO Challenge card: a card that can only ever say
   * "no Challenge here" was the second thing a new student read on the first
   * lesson (g9 critic), and nothing is the honest answer.
   */
  readonly offersChallenge: boolean;
  readonly challenge: CardReadout;
  /** The dialog's accessible name. */
  readonly label: string;
  /** The hamburger's accessible name. */
  readonly guidebookLabel: string;
}

const KIND_LABEL: Record<SheetNodeKind, string> = {
  spine: "Reaction lesson",
  // "Optional" in the words, not only in the lane: the sheet is where a side
  // quest is opened, and it never said so (g11 critic).
  branch: "Optional side quest",
  gate: "Checkpoint",
  boss: "Boss challenge",
};

/**
 * THERE IS NO DEFAULT, and that is the fix. This used to fall back to a table
 * keyed by node kind (spine 2, branch 2, gate 3, boss 4), so every spine and
 * branch node in the product drew the same two pips: the chip's own kind
 * restated as dots, ranking nothing. CLAUDE.md's rule is that what a student
 * is shown is derived and never asserted, so the number now arrives measured
 * off the node's content (pathway-sheet/nodeDifficulty.ts) or not at all.
 */
export function difficultyFor(node: SheetNode): number | null {
  const authored = node.difficulty;
  if (authored === undefined) return null;
  // Clamp rather than throw: a bad authored value is a content bug to report,
  // not a reason to blank a student's sheet.
  return Math.min(PIP_COUNT, Math.max(1, Math.round(authored)));
}

/**
 * What each pip count MEANS, in the words nodeDifficulty.ts already uses.
 *
 * Not a new judgement. That file's band comment is where the cuts were chosen
 * and argued, and it describes them exactly this way: "one or two moves is a
 * single idea, three or four is a short mechanism, five to seven is a
 * mechanism with a decision in it, and eight or more is a sequence". A MOVE is
 * one thing the node's content grades, so "step" is that unit said to a
 * student. The dot count and the word are read off the same number, so the
 * row can never draw three dots and call itself one step.
 */
const BAND_LABEL: Readonly<Record<number, string>> = Object.freeze({
  1: "One step",
  2: "A few steps",
  3: "Multi-step",
  4: "Full sequence",
});

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
      : (node.lockedNote ?? "Opens when the unit before it is done.");

  // The challenge is a harder run of a node already cleared, so it asks for
  // one clear first. Not a lock the server needs to know about: it re-reads
  // the same derived state, so a cleared node journalled by the server
  // enables it everywhere, and the economy refuses to pay a pass on a node
  // with no clear whatever the button did (packages/economy derive.ts).
  //
  // THE NOTE IS DRAWN ON THE RESTING CARD. Owner, 2026-09-30: a card that
  // does nothing when pressed has to say why where it can be seen, which is
  // what "the challenge doesnt work" was about.
  const hasChallenge = node.noChallenge !== true;
  const challengeEnabled = practiceEnabled && cleared && hasChallenge;
  // No branch for a node without a Challenge run: it gets no card at all
  // (offersChallenge), so it has no reason to word.
  const challengeNote = challengeEnabled
    ? ""
    : !practiceEnabled
      ? "Opens with Practice."
      : // A side quest is not a lesson, and saying so here was the one place
        // the sheet called it one (g11 critic).
        node.kind === "branch"
        ? "Clear this side quest first to unlock Challenge."
        : "Clear this lesson first to unlock Challenge.";

  const filled = difficultyFor(node);
  const stakes = node.checkpoint === undefined ? null : checkpointStakes(node.checkpoint);

  return {
    node,
    practiceTitle: stakes === null ? "Practice" : stakes.title,
    // A side quest says it is optional ON the sheet, not only in its
    // accessible name (g11 critic). "Not on the checkpoint" is checkpointPlan's
    // own rule (beats/template.ts skips branches), so it is a true statement.
    practiceDetail: stakes !== null ? stakes.detail : node.kind === "branch" ? "Optional side quest. It is not on the unit checkpoint." : null,
    kindLabel: KIND_LABEL[node.kind],
    cleared,
    pips:
      filled === null
        ? null
        : {
            filled,
            total: PIP_COUNT,
            label: `Difficulty ${filled} of ${PIP_COUNT}`,
            band: BAND_LABEL[filled] ?? "",
          },
    practice: { enabled: practiceEnabled, note: practiceNote },
    offersChallenge: hasChallenge,
    challenge: { enabled: challengeEnabled, note: challengeNote },
    label: `${node.title}. ${KIND_LABEL[node.kind]}.`,
    guidebookLabel: `Open the guidebook for ${node.title}`,
  };
}

/**
 * A checkpoint's stakes in words. Every number and name arrives from the
 * caller's data; this only says it. The route sentence is there because the
 * unit a pass opens is not always the next one by number: Unit 2 has nothing
 * written, so Unit 1's checkpoint opens Unit 3.
 */
function checkpointStakes(checkpoint: NonNullable<SheetNode["checkpoint"]>): { readonly title: string; readonly detail: string | null } {
  const title = checkpoint.opens === null ? "Pass to finish the course" : `Pass to open ${checkpoint.opens}`;
  const parts: string[] = [];
  if (checkpoint.questions !== null) {
    parts.push(`${checkpoint.questions} ${checkpoint.questions === 1 ? "question" : "questions"} from this unit's lessons.`);
  }
  if (checkpoint.opens !== null && checkpoint.skipped.length > 0) {
    const names = checkpoint.skipped.length === 1 ? checkpoint.skipped[0]! : `${checkpoint.skipped.slice(0, -1).join(", ")} and ${checkpoint.skipped[checkpoint.skipped.length - 1]!}`;
    parts.push(`${names} ${checkpoint.skipped.length === 1 ? "has" : "have"} nothing written yet, so this opens ${checkpoint.opens}.`);
  }
  return { title, detail: parts.length === 0 ? null : parts.join(" ") };
}
