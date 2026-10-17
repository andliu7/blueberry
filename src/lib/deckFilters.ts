import type { Question } from "@/data/types";

/**
 * Two ways to narrow a reaction deck (owner, 2026-10-16): by category, and with
 * the reagents hidden. Pure functions over the questions, so DeckPage stays a
 * view and both rules are tested without a DOM (src/test/deckFilters.test.ts).
 */

/** A group of cards, by index into the deck's own `questions`, so ratings keep their keys. */
export interface DeckCategory {
  readonly label: string;
  readonly indexes: readonly number[];
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The deck's categories, from each card's `heading`, in the order they first appear.
 *
 * A deck whose headings all share one first part ("Reactions of the acids · worked
 * examples", "Reactions of the acids · more of the same") is labelled by what comes
 * after it, since the shared part says nothing. Fewer than two categories returns
 * none, so a deck with nothing to choose between shows no category row at all.
 */
export function deckCategories(questions: readonly Question[]): DeckCategory[] {
  const headings = questions.map((q) => q.heading?.trim() || "Other");
  const firsts = new Set(headings.map((h) => h.split(" · ")[0]));
  const labelOf = (h: string) =>
    firsts.size === 1 && h.includes(" · ") ? capitalised(h.split(" · ").slice(1).join(" · ")) : h;

  const groups = new Map<string, number[]>();
  headings.forEach((h, index) => {
    const label = labelOf(h);
    const list = groups.get(label);
    if (list) list.push(index);
    else groups.set(label, [index]);
  });
  if (groups.size < 2) return [];
  return [...groups].map(([label, indexes]) => ({ label, indexes }));
}

/**
 * Does this card name its reagents in the prompt? The carbonyl generator writes
 * forward reactions as "Title: Starting material + reagents" over a scheme image
 * whose name starts "carbonyl_". The backwards and name-the-reagent decks are
 * written as questions instead, so they are left alone.
 */
export function hasReagents(q: Question): boolean {
  return Boolean(q.image?.startsWith("carbonyl_")) && q.q.includes(" + ");
}

/** The prompt with its reagents replaced by a question mark. */
export function hideReagents(text: string): string {
  const at = text.indexOf(" + ");
  return at < 0 ? text : `${text.slice(0, at)} + ?`;
}

/** Does this image carry the generator's labelled arrow, so its reagent text can be masked? */
export function maskableScheme(src: string): boolean {
  return src.startsWith("carbonyl_");
}
