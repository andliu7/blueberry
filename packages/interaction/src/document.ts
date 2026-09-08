/**
 * The draft, plus the history that lets a student take something back.
 *
 * WHY EVERY CHANGE IS UNDOABLE, INCLUDING SELECTING SOMETHING.
 *
 * The tempting rule is "only commits go on the undo stack". It is wrong here.
 * The hit tester sometimes has to guess between a lone pair and the atom it sits
 * on, and when it guesses wrong the student's correction is "no, the other one",
 * which has to unwind an arming. Making arming undoable costs one array entry
 * and removes a whole class of "why is undo not undoing what I just did".
 *
 * A cancelled drag does NOT use this. It restores a snapshot of the whole
 * document, history included, because a cancelled drag is not an action the
 * student took, and leaving its arming on the undo stack would make the next
 * undo appear to do nothing.
 *
 * That restore is conditional, and the condition is the point: a session may
 * only reinstate its snapshot while its own press is still the last thing that
 * changed the document. Otherwise the snapshot is a photograph of a document
 * that no longer exists, and putting it back would delete whatever committed in
 * the meantime with nothing on this stack to recover it from. machine.ts owns
 * that guard; see "WHAT R3 MAY AND MAY NOT TAKE BACK" in its header.
 */

import type { ShapeDraft } from "./shapes/index.js";

/**
 * How many steps back a student can go.
 *
 * Bounded so a long session cannot grow the array without limit. Fifty is more
 * than any mechanism in the corpus needs and small enough to be free.
 */
export const UNDO_DEPTH = 50;

export interface DocumentState {
  readonly draft: ShapeDraft;
  /** Most recent last. Capped at UNDO_DEPTH. */
  readonly past: readonly ShapeDraft[];
}

export function createDocument(draft: ShapeDraft): DocumentState {
  return Object.freeze({ draft, past: Object.freeze([]) });
}

/**
 * Record a new draft, pushing the old one onto the history.
 *
 * Reference equality, not deep equality: a shape reducer that changed nothing
 * returns the same object it was given, which is the contract in
 * shapes/outcome.ts.
 */
export function commitDraft(doc: DocumentState, next: ShapeDraft): DocumentState {
  if (next === doc.draft) return doc;
  const past = [...doc.past, doc.draft];
  return Object.freeze({
    draft: next,
    past: Object.freeze(past.length > UNDO_DEPTH ? past.slice(past.length - UNDO_DEPTH) : past),
  });
}

/** Null when there is nothing to undo, so the caller can say so by name. */
export function undoDocument(doc: DocumentState): DocumentState | null {
  const previous = doc.past[doc.past.length - 1];
  if (previous === undefined) return null;
  return Object.freeze({ draft: previous, past: Object.freeze(doc.past.slice(0, -1)) });
}

/** Replace the draft outright, clearing history. Used when the shape changes. */
export function resetDocument(draft: ShapeDraft): DocumentState {
  return createDocument(draft);
}
