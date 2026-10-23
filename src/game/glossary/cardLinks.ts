/**
 * Which names on a card have a glossary entry, so the card can put an info
 * icon beside each one (owner item 14).
 *
 * Pure, and small on purpose: it imports only the names index and slug(), not
 * the glossary model or its generated data, so the Cards tab never loads the
 * glossary's drawings. Those load with GlossaryPeek.tsx, on the first tap.
 *
 * WHAT GETS A LINK.
 *   - Term side: each start material in `reaction.reactants` (the labels
 *     joined with " + "), and each reagent step whose label is a shorthand.
 *   - Definition side: the product in `reaction.products`.
 * A name with no glossary entry ("water", "cyclic acetal") gets no link, and
 * a card with no `reaction` (a plain card, or one a student wrote) gets none.
 */
import type { Card } from "../cards/types";
import { GLOSSARY_COMPOUND_NAMES, GLOSSARY_SHORTHAND_NAMES } from "./glossary.index.generated";
import { slug } from "./slug";

export interface GlossaryLink {
  /** The words on the card. */
  readonly label: string;
  /** A glossary entry id, e.g. "name-acetophenone" or "shorthand-jones". */
  readonly entryId: string;
}

export interface CardGlossaryLinks {
  readonly term: readonly GlossaryLink[];
  readonly definition: readonly GlossaryLink[];
}

const COMPOUNDS = new Set(GLOSSARY_COMPOUND_NAMES);

/** Lower case letters and digits only, so "DIBALH" meets "DIBAL-H" and "H3O+" meets "H3O+". */
function squash(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Every way a shorthand is written, squashed, to the short form that names its entry. */
const SHORTHAND_BY_SPELLING: ReadonlyMap<string, string> = new Map(
  Object.entries(GLOSSARY_SHORTHAND_NAMES).flatMap(([short, spellings]) =>
    spellings.map((spelling) => [squash(spelling), short] as const),
  ),
);

/** "ethanol (with 2-bromo-2-methylpropane)" names ethanol, the way scripts/glossary.py reads it. */
function bareName(label: string): string {
  return label.replace(/\s*\(.*\)$/, "").trim();
}

/**
 * The pieces of a " + " list of names, as the card writes them, each with its
 * link. A name written twice ("acetaldehyde + acetaldehyde") links once, on
 * its first copy.
 */
export function labelPieces(labels: string): { readonly text: string; readonly link: GlossaryLink | null }[] {
  const seen = new Set<string>();
  return labels.split(" + ").map((text) => {
    const name = bareName(text);
    if (!COMPOUNDS.has(name) || seen.has(name)) return { text, link: null };
    seen.add(name);
    return { text, link: { label: name, entryId: `name-${slug(name)}` } };
  });
}

function compoundLinks(labels: string): GlossaryLink[] {
  return labelPieces(labels).flatMap((piece) => (piece.link === null ? [] : [piece.link]));
}

/** The shorthand entry a reagent label names, or null. */
export function shorthandLinkFor(label: string): GlossaryLink | null {
  const short = SHORTHAND_BY_SPELLING.get(squash(label));
  return short === undefined ? null : { label, entryId: `shorthand-${slug(short)}` };
}

export function glossaryLinksFor(card: Card): CardGlossaryLinks {
  const reaction = card.reaction;
  if (reaction === undefined) return { term: [], definition: [] };
  const reagents: GlossaryLink[] = [];
  for (const step of reaction.reagentSteps ?? []) {
    const link = shorthandLinkFor(step.label);
    if (link !== null && !reagents.some((known) => known.entryId === link.entryId)) reagents.push(link);
  }
  return {
    term: [...compoundLinks(reaction.reactants), ...reagents],
    definition: compoundLinks(reaction.products),
  };
}
