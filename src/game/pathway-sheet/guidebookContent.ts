/**
 * Guidebook content: the placeholder generator, marked for the human gate.
 *
 * docs/DESIGN-GOALS.md locks the FORMAT: a text-and-image explainer, a
 * key-idea callout card, and a numbered worked-example strip (the
 * worked-example emphasis from docs/LEARNING-SCIENCE.md given a surface).
 * The COPY is explicitly not this phase's deliverable: it is placeholder,
 * marked as such, and it goes through the human gate before a student reads
 * it as authored. So this file generates a complete, honest draft for any
 * node on the map, every draft carries `placeholder: true`, and the page
 * renders the HUMAN_GATE_MARK pill so nobody can mistake a draft for a
 * reviewed lesson. A generated explanation is never promoted to authored by
 * accident; that promotion is exactly what CLAUDE.md's feedback section
 * forbids.
 *
 * THE WORKED EXAMPLE IS ART-DOMINANT, re-shaped after the attempt 2 critic
 * measured the reference card: ONE short caption line, then a wide FIVE
 * structure scheme filling most of the card, with labels set over the arrows
 * and a byproduct term at the end. The build it replaces stacked six lines of
 * caption above a three-ring scheme, which inverted the size hierarchy inside
 * the card. So the shape here is a one-line `lead` plus five `scheme` steps.
 *
 * THE PAGE ENDS ON THE MASCOT, not on a fourth card. See `closing` below: the
 * checklist card the build closed with was a fourth part where DESIGN-GOALS
 * locks three, and the reference's own last block is a leafed berry beside a
 * heading with a line under it.
 *
 * THE SCHEME CLAIMS NO CHEMISTRY, and that is deliberate rather than lazy.
 * The reference draws real reagent labels (O3) and a real byproduct (H2O)
 * because it is a mock of ONE node; this generator renders for every node on
 * the map, and a fabricated reagent on a nomenclature node is wrong chemistry
 * in a draft, which is still wrong chemistry. So the arrow labels are STEP
 * NUMBERS, which is what the reference's own first arrow carries and is a
 * standard scheme convention that asserts nothing, and the byproduct slot is
 * drawn with a neutral placeholder term. Authored content that arrives after
 * the human gate fills both slots with real chemistry; the slots exist so it
 * has somewhere to land.
 */

import { HUMAN_GATE_MARK, type SheetNode, type SheetNodeKind } from "./nodeSheetModel";

/**
 * Which little structure the scheme draws at a step. Art direction, not
 * chemistry: deliberately abstract, because a specific mechanism drawing in a
 * generic component would be wrong on most of the nodes it renders for.
 */
export type StepGlyph = "substrate" | "arrows" | "adduct" | "product";

export interface SchemeStep {
  /** 1-based, consecutive. Drawn under the structure, as the reference numbers it. */
  readonly n: number;
  /**
   * Set over the arrow that LEADS INTO this structure, so step 1 carries
   * none. A step number in the placeholder, real conditions once authored.
   */
  readonly overArrow: string | null;
  readonly glyph: StepGlyph;
  /** The sentence a screen reader hears for this step. Never drawn. */
  readonly said: string;
}

export interface GuidebookContent {
  /**
   * Literally true for every draft this file can produce. When authored copy
   * lands (post human gate), it arrives as data with this flag false, and the
   * draft pill disappears with it.
   */
  readonly placeholder: boolean;
  /** The visible mark on a placeholder page. One string, shared with the tests. */
  readonly gateMark: string;
  readonly title: string;
  /** The pill beside the title: the node's kind in the sheet's own words. */
  readonly badge: string;
  /** Two or three sentences above the figure. Content face, per the goals. */
  readonly intro: string;
  /** The key-idea callout card's body. The node's own authored blurb leads. */
  readonly keyIdea: string;
  readonly workedExample: {
    readonly heading: string;
    /**
     * THE ONE CAPTION LINE, numbered, that sits above the scheme. The
     * reference's card carries exactly one and then gives the rest of its
     * height to the art.
     */
    readonly lead: string;
    /** Five structures, four arrows, per the reference's scheme. */
    readonly scheme: readonly SchemeStep[];
    /**
     * The term after the final structure. Drawn as "+ <byproduct>", which is
     * the reference's "+ H2O" slot. Null draws no byproduct at all.
     */
    readonly byproduct: string | null;
  };
  /**
   * HOW THE PAGE ENDS, and it is a MASCOT BLOCK rather than a fourth card.
   *
   * blueberry_r5-guidebook closes on one more section header in the same
   * berry-and-heading treatment as "Worked example" (the berry's body scans
   * at image x 134..178, y 1038..1086, with its leaf at x 162..178), and
   * nothing boxed under it.
   *
   * The build ended on a fourth CARD, a "Before you start" checklist, which
   * is one more part than DESIGN-GOALS locks: the guidebook format is a
   * text-and-image explainer, a key-idea callout, and a numbered
   * worked-example strip. So the method copy that was a graded-looking list
   * is one send-off line here, in the coach's voice, and the page ends on the
   * character rather than on a fourth panel.
   *
   * Like the scheme, it is METHOD, never a chemistry claim about this node.
   */
  readonly closing: {
    readonly heading: string;
    readonly line: string;
  };
}

const BADGE: Record<SheetNodeKind, string> = {
  spine: "Reaction",
  branch: "Side quest",
  gate: "Checkpoint",
  boss: "Boss",
};

/**
 * The five drawn steps. Universally true for any graded problem in this
 * product: read what you are given, find the site, push the electrons, land
 * the product, check the books balance. The `said` lines are the accessible
 * description of the drawing, never drawn text.
 */
const SCHEME: readonly { glyph: StepGlyph; said: string }[] = [
  { glyph: "substrate", said: "the structure you are given" },
  { glyph: "arrows", said: "the site the prompt points at" },
  { glyph: "arrows", said: "electrons moving, one small step" },
  { glyph: "adduct", said: "the new bond landed" },
  { glyph: "product", said: "the product, with the books balanced" },
];

/**
 * The send-off line. One sentence, in the coach's voice: it names the action
 * that is already within reach and treats a first attempt as the normal step
 * it is. No scolding, no rhetorical question, no em dash.
 */
const CLOSING_LINE =
  "Read the prompt, name the site it points at, and move one small step at a time. " +
  "A first attempt that does not land is how this gets learned, and every step tells you what it saw.";

export function guidebookFor(node: SheetNode): GuidebookContent {
  return {
    placeholder: true,
    gateMark: HUMAN_GATE_MARK,
    title: node.title,
    badge: BADGE[node.kind],
    // TWO sentences, not three. The reference sets its explainer at three
    // lines above the figure row, and a longer draft pushed the figure card
    // and the worked example off the first screen, which changed the
    // composition the page is judged on. Copy still goes to the human gate.
    intro:
      `${node.title}, on one page: what it is, where it shows up, and the ` +
      `pattern to look for. A short read before you press START.`,
    keyIdea: node.blurb,
    workedExample: {
      heading: "Worked example",
      lead: "Follow one problem of this shape, end to end.",
      scheme: SCHEME.map((step, i) => ({
        n: i + 1,
        // Structure 1 has no arrow leading into it, so it carries no label.
        //
        // The arrows are numbered on their OWN sequence, 1 to 4, while the
        // structures are numbered 1 to 5: the arrow into structure 2 is
        // transformation 1. Two numberings that never collide, which is why
        // the label over an arrow and the number under the structure beside
        // it never read as the same token repeated. The reference does the
        // same thing, carrying "1" over its first arrow and "2" under the
        // structure that arrow reaches.
        overArrow: i === 0 ? null : String(i),
        glyph: step.glyph,
        said: step.said,
      })),
      byproduct: "by-product",
    },
    closing: {
      heading: "Before you start",
      line: CLOSING_LINE,
    },
  };
}
