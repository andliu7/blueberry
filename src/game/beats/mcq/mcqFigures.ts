/**
 * THE DRAWN CHEMISTRY ON AN MCQ BEAT.
 *
 * Owner ruling 1 of 2026-09-04, in docs/DESIGN-GOALS.md: "EVERY QUESTION
 * CARRIES A VISUAL. A structure, a spectrum, a scheme, a mechanism frame ...
 * a question that is only prose has already lost the student. A beat that
 * cannot show something is a beat that needs authoring, not a beat that ships
 * as text."
 *
 * `content.ts` carried the opposite rule in its own header, written before
 * that ruling existed: "NO moleculeId ON ANY BEAT IN THIS FILE, on purpose ...
 * the renderer is another agent's surface". The renderer is no longer another
 * surface. `onboarding/StructureFigure.tsx` draws a `Figure`, `lesson/
 * lessonFigures.ts` already authors reaction schemes with it for the
 * curriculum player, and this file does the same job for the beat runner. The
 * content file's rule is superseded by the ruling, and its comment is updated
 * rather than left to contradict this.
 *
 * WHY THE TABLE IS HERE AND NOT ON THE BEAT. `McqBeat` has a `moleculeId`
 * field and no figure field, and widening the beat union is a change that
 * ripples through grading, the card generator and the authoring validator for
 * a rendering concern. Keying a side table on the beat's own id costs one
 * lookup and keeps every one of those files unchanged. It is the same shim
 * shape `lessonFigures.ts` and `onboarding/figures.ts` already are, for the
 * same reason.
 *
 * WHAT KEEPS THIS FROM BEING INVENTED CHEMISTRY. Every entry is authored
 * against one exact beat id, never derived from a prompt's words at run time,
 * so a reworded question keeps its drawing and a REPLACED question breaks the
 * key rather than silently redrawing the old molecule under new words.
 * `test/mcqFigures.test.ts` walks the real beat list and fails when a beat has
 * no visual, so a newly authored question fails a test rather than reaching a
 * student as a wall of text.
 *
 * THREE VISUAL SHAPES, because an MCQ is not always a reaction:
 *
 *   scheme     a transformation. The question is downstream of it
 *   structure  one molecule the question is ABOUT
 *   pair       two molecules the question COMPARES
 *
 * The pair shape is the one worth defending. "Compare phenol with
 * cyclohexanol" is a question whose whole content is a comparison, and a
 * comparison drawn as one molecule teaches half of it. Two captioned species
 * side by side is the same composition the scheme card uses with the arrow
 * taken out.
 *
 * A SCHEME HERE MAY STATE BOTH SIDES, which is the one place this file's
 * invariants differ from `lessonFigures.ts`. There a fully stated scheme
 * would be a diagram with no question in it, because there the scheme IS the
 * question. Here the question is downstream: "reduce the nitro group, then
 * pick what the RING becomes" needs both sides drawn, because the thing being
 * asked about is neither of them. What this file forbids instead is a scheme
 * that states nothing, and the test holds that.
 *
 * NO WALL CLOCK, no state, no React, no DOM. Pure data and pure functions, so
 * the node suite can walk all of it.
 */

import type { Figure, FigureBond, FigureLabel } from "../../onboarding/figures";
import {
  KEKULE,
  benzene,
  hexagon,
  link,
  ring,
  stub,
  type Pt,
  type Scheme,
} from "../../lesson/lessonFigures";

/* ------------------------------------------------------------------ */
/* The three shapes                                                     */
/* ------------------------------------------------------------------ */

export interface NamedFigure {
  readonly figure: Figure;
  /** The caption. Drawn UNDER the structure, small and muted, per ruling 2. */
  readonly name?: string;
}

export type McqVisual =
  | { readonly kind: "scheme"; readonly scheme: Scheme }
  | ({ readonly kind: "structure" } & NamedFigure)
  | { readonly kind: "pair"; readonly a: NamedFigure; readonly b: NamedFigure };

/* ------------------------------------------------------------------ */
/* Shared fragments                                                     */
/*                                                                      */
/* Every aromatic question in this file starts from the SAME ring, at   */
/* the same centre and the same radius, so a student comparing toluene  */
/* with anisole is comparing the substituent and not the drawing. The   */
/* ring geometry itself comes from lessonFigures.ts, which is where the */
/* house bond angle lives.                                              */
/* ------------------------------------------------------------------ */

/**
 * A figure that is KNOWN to carry both bonds and labels.
 *
 * `Figure` makes both optional, which is right for the type and awkward for
 * the two builders below: an entry that starts from `arene(...)` and adds a
 * mark to it spreads `base.bonds`, and under exactOptionalPropertyTypes a
 * spread of a possibly-undefined array is not assignable back to a required
 * field. Narrowing the two builders' return type says the true thing (they
 * always draw a ring and always label the group) instead of adding a
 * non-null assertion at every call site.
 */
interface DrawnFigure extends Figure {
  readonly bonds: readonly FigureBond[];
  readonly labels: readonly FigureLabel[];
}

/** The ring every monosubstituted arene below is drawn on. */
const ARENE_CENTRE = { x: 60, y: 48 } as const;
const ARENE_R = 18;

/**
 * A benzene ring carrying one group, with the group's label placed outside
 * the ring on the bond that holds it.
 *
 * `at` is a hexagon vertex index: 0 is the top, and the helper's own comment
 * records the rest, 1 ortho to it, 2 meta, 3 para. The substituent is drawn
 * on vertex 0 by default because a group at the top is where every textbook
 * puts it, and the numbering questions below are the only ones that move it.
 */
function arene(group: string, opts: { readonly at?: number; readonly cx?: number; readonly cy?: number } = {}): DrawnFigure {
  const cx = opts.cx ?? ARENE_CENTRE.x;
  const cy = opts.cy ?? ARENE_CENTRE.y;
  const pts = hexagon(cx, cy, ARENE_R);
  const from = pts[opts.at ?? 0] as Pt;
  // The bond out of the ring runs along the centre-to-vertex direction, so it
  // never crosses a ring bond whichever vertex carries it.
  const ux = (from.x - cx) / ARENE_R;
  const uy = (from.y - cy) / ARENE_R;
  const end = { x: Math.round(from.x + ux * 14), y: Math.round(from.y + uy * 14) };
  return {
    bonds: [...ring(pts, KEKULE), stub(from, end.x, end.y)],
    labels: [{ x: Math.round(from.x + ux * 24), y: Math.round(from.y + uy * 24) + 5, t: group, size: 14 }],
  };
}

/** Cyclohexane with one group: the same ring with no double bonds in it. */
function cyclohexane(group: string, cx = ARENE_CENTRE.x, cy = ARENE_CENTRE.y): DrawnFigure {
  const pts = hexagon(cx, cy, ARENE_R);
  const top = pts[0] as Pt;
  return {
    bonds: [...ring(pts), stub(top, top.x, top.y - 14)],
    labels: [{ x: top.x, y: top.y - 19, t: group, size: 14 }],
  };
}

/**
 * Buta-1,3-diene, drawn as the s-trans zig-zag every textbook draws.
 *
 * Bonds 0 and 2 are the double bonds, which is what makes it 1,3 rather than
 * an allene: going through `link`'s order map rather than laying a second
 * bond over a first one is the rule lessonFigures.ts records, because a
 * doubled single bond is three lines and reads as a triple.
 */
function butadiene(): Figure {
  return {
    bonds: [
      ...link(
        [
          { x: 14, y: 58 },
          { x: 42, y: 42 },
          { x: 70, y: 58 },
          { x: 98, y: 42 },
        ],
        { 0: 2, 2: 2 },
      ),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* The table                                                            */
/* ------------------------------------------------------------------ */

const VISUALS: Readonly<Record<string, McqVisual>> = Object.freeze({
  /* --- directing effects ------------------------------------------ */

  // Nitrate toluene: the reagents are given and the position is the question,
  // so the product box asks.
  "mcq-directing-meet": {
    kind: "scheme",
    scheme: { left: arene("CH_3"), leftName: "toluene", over: "HNO_3", under: "H_2SO_4" },
  },

  "mcq-directing-anisole": {
    kind: "scheme",
    scheme: { left: arene("OCH_3"), leftName: "anisole", over: "Br_2", under: "FeBr_3" },
  },

  // "Bromobenzene reacts slower than benzene": the question IS the comparison,
  // so both rings are drawn. Nothing is transformed here, so nothing is a
  // scheme.
  "mcq-directing-halogen": {
    kind: "pair",
    a: { figure: benzene(ARENE_CENTRE.x, ARENE_CENTRE.y), name: "benzene" },
    b: { figure: arene("Br"), name: "bromobenzene" },
  },

  /* --- kinetic against thermodynamic control ---------------------- */

  "mcq-kvt-cold": {
    kind: "scheme",
    scheme: { left: butadiene(), leftName: "buta-1,3-diene", over: "HBr", under: "-80 degrees" },
  },

  "mcq-kvt-warm": {
    kind: "scheme",
    scheme: { left: butadiene(), leftName: "buta-1,3-diene", over: "HBr", under: "40 degrees" },
  },

  // The 1,4 product itself: 1-bromobut-2-ene. The question is a statement
  // about this molecule, so the molecule is what is drawn.
  "mcq-kvt-statement": {
    kind: "structure",
    figure: {
      bonds: [
        ...link(
          [
            { x: 28, y: 62 },
            { x: 52, y: 48 },
            { x: 76, y: 62 },
            { x: 100, y: 48 },
          ],
          { 1: 2 },
        ),
        { x1: 28, y1: 62, x2: 28, y2: 42 },
      ],
      labels: [{ x: 28, y: 36, t: "Br", size: 14 }],
    },
    name: "the 1,4 product, 1-bromobut-2-ene",
  },

  // 2-methylcyclohexanone. Drawn hand-placed rather than through `cyclohexane`
  // because it carries two groups on adjacent vertices and the point of the
  // question is which side of the carbonyl the base reaches.
  "mcq-kvt-enolate-lda": {
    kind: "scheme",
    scheme: {
      left: ((): Figure => {
        const pts = hexagon(ARENE_CENTRE.x, ARENE_CENTRE.y, ARENE_R);
        const c1 = pts[0] as Pt;
        const c2 = pts[1] as Pt;
        return {
          bonds: [
            ...ring(pts),
            { x1: c1.x, y1: c1.y, x2: c1.x, y2: c1.y - 15, order: 2 as const },
            stub(c2, c2.x + 14, c2.y - 8),
          ],
          labels: [
            { x: c1.x, y: c1.y - 20, t: "O", size: 14 },
            { x: c2.x + 18, y: c2.y - 6, t: "CH_3", size: 13, anchor: "start" },
          ],
        };
      })(),
      leftName: "2-methylcyclohexanone",
      over: "LDA",
      under: "-78 degrees",
    },
  },

  /* --- nitro reduction -------------------------------------------- */

  "mcq-nitro-meet": {
    kind: "scheme",
    scheme: { left: arene("NO_2"), leftName: "nitrobenzene", over: "H_2", under: "Pd" },
  },

  // Both sides drawn, the ARROW open: this is the supply-the-reagents shape,
  // and the scheme card puts the question mark on the arrow when `over` is
  // absent.
  "mcq-nitro-reagent": {
    kind: "scheme",
    scheme: {
      left: arene("NO_2"),
      leftName: "an aryl nitro",
      right: arene("NH_2"),
      rightName: "an aryl amine",
    },
  },

  // Both sides AND the reagent stated, because the question is downstream of
  // the transformation: it asks what the RING becomes, not what the product
  // is. See the header for why that is allowed here and not in lessonFigures.
  "mcq-nitro-ring-effect": {
    kind: "scheme",
    scheme: {
      left: arene("NO_2"),
      leftName: "nitrobenzene",
      over: "Fe",
      under: "HCl",
      right: arene("NH_2"),
      rightName: "aniline",
    },
  },

  "mcq-nitro-for-diazonium": {
    kind: "scheme",
    scheme: {
      left: benzene(ARENE_CENTRE.x, ARENE_CENTRE.y),
      leftName: "benzene",
      right: arene("NH_2"),
      rightName: "aniline",
    },
  },

  "mcq-nitro-close": {
    kind: "scheme",
    scheme: {
      left: arene("NO_2"),
      leftName: "an aryl nitro",
      right: arene("NH_2"),
      rightName: "an aryl amine",
    },
  },

  /* --- phenol acidity --------------------------------------------- */

  "mcq-phenol-meet": {
    kind: "pair",
    a: { figure: arene("OH"), name: "phenol" },
    b: { figure: cyclohexane("OH"), name: "cyclohexanol" },
  },

  // The conjugate base is the whole argument, so the drawing goes as far as
  // the anion. The charge is typeset by the label's own `^` markup, the same
  // two character grammar the scheme card uses over an arrow.
  "mcq-phenol-reason": {
    kind: "scheme",
    scheme: {
      left: arene("OH"),
      leftName: "phenol",
      over: "-H^+",
      right: arene("O^-"),
      rightName: "phenoxide",
    },
  },

  // Phenol with the two positions the question turns on numbered. The four
  // options differ by substituent AND by position, and the brief tells the
  // student to settle position second, so the numbering is the part of the
  // picture that is actually load bearing.
  "mcq-phenol-substituted": {
    kind: "structure",
    figure: ((): Figure => {
      const base = arene("OH");
      const pts = hexagon(ARENE_CENTRE.x, ARENE_CENTRE.y, ARENE_R);
      const meta = pts[2] as Pt;
      const para = pts[3] as Pt;
      return {
        bonds: base.bonds,
        labels: [
          ...base.labels,
          { x: meta.x + 12, y: meta.y + 5, t: "3", size: 12 },
          { x: para.x, y: para.y + 16, t: "4", size: 12 },
        ],
      };
    })(),
    name: "phenol, with the two positions the answers use",
  },

  /* --- blocking group strategy ------------------------------------ */

  // Toluene with the para seat circled: "the spot you want left empty". The
  // dashed ring is the figure vocabulary's own way of saying THIS ONE, which
  // is cheaper and clearer than a sentence pointing at a drawing.
  "mcq-blocking-why-sulfonate": {
    kind: "structure",
    figure: ((): Figure => {
      const base = arene("CH_3");
      const para = hexagon(ARENE_CENTRE.x, ARENE_CENTRE.y, ARENE_R)[3] as Pt;
      return { bonds: base.bonds, labels: base.labels, rings: [{ x: para.x, y: para.y, r: 8 }] };
    })(),
    name: "toluene, and the para seat to keep empty",
  },

  // Both sides given, the route open: three steps in which order.
  "mcq-blocking-order": {
    kind: "scheme",
    scheme: {
      left: arene("CH_3"),
      leftName: "toluene",
      right: ((): Figure => {
        const base = arene("CH_3");
        const pts = hexagon(ARENE_CENTRE.x, ARENE_CENTRE.y, ARENE_R);
        const ortho = pts[1] as Pt;
        const ux = (ortho.x - ARENE_CENTRE.x) / ARENE_R;
        const uy = (ortho.y - ARENE_CENTRE.y) / ARENE_R;
        return {
          bonds: [
            ...base.bonds,
            stub(ortho, Math.round(ortho.x + ux * 14), Math.round(ortho.y + uy * 14)),
          ],
          labels: [
            ...base.labels,
            {
              x: Math.round(ortho.x + ux * 24),
              y: Math.round(ortho.y + uy * 24) + 5,
              t: "Br",
              size: 14,
              anchor: "start" as const,
            },
          ],
        };
      })(),
      rightName: "2-bromotoluene",
    },
  },

  /* --- the acetal as a protecting group ---------------------------- */

  // A generic acetal, drawn generically on purpose: the question is about what
  // an acetal carbon is, and naming a substrate would suggest the answer
  // depends on which ketone was hidden.
  "mcq-acetal-what-survives": {
    kind: "structure",
    figure: {
      bonds: [
        stub({ x: 60, y: 46 }, 38, 58),
        stub({ x: 60, y: 46 }, 82, 58),
        stub({ x: 60, y: 46 }, 40, 32),
        stub({ x: 60, y: 46 }, 80, 32),
      ],
      labels: [
        { x: 32, y: 66, t: "R", size: 14, anchor: "end" },
        { x: 88, y: 66, t: "R'", size: 14, anchor: "start" },
        { x: 34, y: 26, t: "OCH_3", size: 13, anchor: "end" },
        { x: 86, y: 26, t: "OCH_3", size: 13, anchor: "start" },
      ],
    },
    name: "an acetal: two single bonded oxygens, no carbonyl left",
  },

  // A keto ester: one ketone and one ester on the same chain, which is the
  // whole setup of the question. Methyl 4-oxopentanoate rather than a 1,3
  // keto ester, because a 1,3 one brings acidic alpha protons into a question
  // that is about relative carbonyl reactivity and nothing else.
  "mcq-acetal-which-carbonyl": {
    kind: "structure",
    figure: {
      bonds: [
        ...link([
          { x: 10, y: 60 },
          { x: 31, y: 47 },
          { x: 52, y: 60 },
          { x: 73, y: 47 },
          { x: 94, y: 60 },
        ]),
        { x1: 31, y1: 47, x2: 31, y2: 29, order: 2 },
        { x1: 94, y1: 60, x2: 94, y2: 42, order: 2 },
        { x1: 94, y1: 60, x2: 108, y2: 69 },
      ],
      labels: [
        { x: 31, y: 24, t: "O", size: 14 },
        { x: 94, y: 37, t: "O", size: 14 },
        { x: 106, y: 80, t: "OMe", size: 13 },
      ],
    },
    name: "a keto ester: the ketone left, the ester right",
  },

  /* --- alpha-proton acidity --------------------------------------- */

  // Butan-2-one. The question is which C-H, so the molecule the C-H sits on
  // is what gets drawn, and the caption names it rather than the drawing
  // spelling the name out.
  "mcq-pka-alpha-meet": {
    kind: "structure",
    figure: {
      bonds: [
        ...link([
          { x: 20, y: 58 },
          { x: 44, y: 44 },
          { x: 68, y: 58 },
          { x: 92, y: 44 },
        ]),
        { x1: 44, y1: 44, x2: 44, y2: 26, order: 2 },
      ],
      labels: [{ x: 44, y: 21, t: "O", size: 14 }],
    },
    name: "butan-2-one",
  },

  // The comparison IS the question, so both are drawn, on the same baseline
  // and at the same bond length: the student is comparing one extra carbonyl,
  // not two different drawings.
  "mcq-pka-between": {
    kind: "pair",
    a: {
      figure: {
        bonds: [
          ...link([
            { x: 14, y: 58 },
            { x: 36, y: 45 },
            { x: 58, y: 58 },
            { x: 80, y: 45 },
            { x: 102, y: 58 },
          ]),
          { x1: 36, y1: 45, x2: 36, y2: 27, order: 2 },
          { x1: 80, y1: 45, x2: 80, y2: 27, order: 2 },
        ],
        labels: [
          { x: 36, y: 22, t: "O", size: 14 },
          { x: 80, y: 22, t: "O", size: 14 },
        ],
      },
      name: "pentane-2,4-dione",
    },
    b: {
      figure: {
        bonds: [
          ...link([
            { x: 20, y: 58 },
            { x: 44, y: 45 },
            { x: 68, y: 58 },
            { x: 92, y: 45 },
          ]),
          { x1: 44, y1: 45, x2: 44, y2: 27, order: 2 },
        ],
        labels: [{ x: 44, y: 22, t: "O", size: 14 }],
      },
      name: "butan-2-one",
    },
  },

  // THE REAGENT SHAPE READ AS A SCHEME: both sides are stated and the ARROW
  // is what the question asks for, which is the supply-the-reagents reading
  // lessonFigures.ts records. So `over` is absent on purpose and `right`
  // carries the enolate the chosen base has to reach.
  "mcq-pka-base-choice": {
    kind: "scheme",
    scheme: {
      left: {
        bonds: [
          ...link([
            { x: 20, y: 58 },
            { x: 44, y: 44 },
            { x: 68, y: 58 },
            { x: 92, y: 44 },
          ]),
          { x1: 44, y1: 44, x2: 44, y2: 26, order: 2 },
        ],
        labels: [{ x: 44, y: 21, t: "O", size: 14 }],
      },
      leftName: "butan-2-one",
      right: {
        bonds: [
          ...link(
            [
              { x: 20, y: 58 },
              { x: 44, y: 44 },
              { x: 68, y: 58 },
              { x: 92, y: 44 },
            ],
            { 0: 2 },
          ),
          { x1: 44, y1: 44, x2: 44, y2: 26 },
        ],
        labels: [{ x: 44, y: 21, t: "O^-", size: 14 }],
      },
      rightName: "the enolate, in full",
    },
  },

  /* --- multistep sequencing ---------------------------------------- */

  // The target is what the question is about, so the target is what is drawn:
  // benzene in, and a ring carrying a methyl and a nitro META to each other
  // out. The reagents are the answer, so the arrow carries no conditions,
  // which is the supply-the-reagents reading of a scheme.
  "mcq-sequencing-order": {
    kind: "scheme",
    scheme: {
      left: benzene(ARENE_CENTRE.x, ARENE_CENTRE.y),
      leftName: "benzene",
      right: ((): Figure => {
        const pts = hexagon(ARENE_CENTRE.x, ARENE_CENTRE.y, ARENE_R);
        const top = pts[0] as Pt;
        // Vertex 2 is META to vertex 0, which is the whole content of the
        // question: the geometry carries it rather than a caption claiming it.
        const meta = pts[2] as Pt;
        return {
          bonds: [
            ...ring(pts, KEKULE),
            stub(top, top.x, top.y - 14),
            stub(meta, meta.x + 13, meta.y + 8),
          ],
          labels: [
            { x: top.x, y: top.y - 19, t: "CH_3", size: 13 },
            { x: meta.x + 17, y: meta.y + 13, t: "NO_2", size: 13, anchor: "start" },
          ],
        };
      })(),
      rightName: "the target, meta",
    },
  },

  // Sulfonation run backwards. Both sides drawn and the conditions stated,
  // because the question is about the PROPERTY of this transformation rather
  // than about either end of it.
  "mcq-sequencing-blocker": {
    kind: "scheme",
    scheme: {
      left: arene("SO_3H"),
      leftName: "the blocked ring",
      over: "dilute H_2SO_4",
      under: "heat",
      right: benzene(ARENE_CENTRE.x, ARENE_CENTRE.y),
      rightName: "the blocker off again",
    },
  },
});

/** The visual for a beat, or null when the table has not met it. */
export function mcqVisualFor(beatId: string): McqVisual | null {
  return VISUALS[beatId] ?? null;
}

/** Every beat id the table draws, for the suite. */
export function mcqVisualKeys(): readonly string[] {
  return Object.keys(VISUALS);
}

/**
 * Every figure a visual carries, whichever shape it is. Flattened here rather
 * than in the test so the walk lives beside the shapes it walks: a fourth
 * shape added above and forgotten here would make the drawing invariants pass
 * by checking nothing, which is the failure mode a coverage test exists to
 * prevent.
 */
export function figuresOf(visual: McqVisual): readonly { readonly where: string; readonly figure: Figure }[] {
  switch (visual.kind) {
    case "scheme":
      return [
        { where: "left", figure: visual.scheme.left },
        ...(visual.scheme.right === undefined ? [] : [{ where: "right", figure: visual.scheme.right }]),
      ];
    case "structure":
      return [{ where: "structure", figure: visual.figure }];
    case "pair":
      return [
        { where: "a", figure: visual.a.figure },
        { where: "b", figure: visual.b.figure },
      ];
    default: {
      const unreachable: never = visual;
      return unreachable;
    }
  }
}

/* ------------------------------------------------------------------ */
/* The OPTION figures                                                   */
/*                                                                      */
/* "OPTION CARDS ARE PICTURES WITH CAPTIONS, not captions with          */
/* pictures", owner ruling 2 of 2026-09-04, and                         */
/* blueberry_r9-lesson-reaction draws it: four candidates as a 2 by 2   */
/* of cream tiles, each a drawn structure with a short name UNDER it in */
/* the muted ink. The build stacked three full-width prose rows.        */
/*                                                                      */
/* WHERE THIS TABLE STOPS, and the line is deliberate rather than       */
/* unfinished. A question whose options are POSITIONS or STRUCTURES is  */
/* a question whose options can be drawn, and every one of those is     */
/* drawn here. A question whose options are RULES is not: "activating   */
/* and meta directing" is a claim about two effects, and scheme.css     */
/* already records the same finding for the reason chips on the         */
/* curriculum player, in the same words the reference frame shows with  */
/* its own outlined rule pills: "a rule is not a molecule, which is the */
/* one place on this screen where words are the honest answer shape".   */
/* So `mcqOptionTiles` returns null for those beats and the view falls  */
/* back to rows, rather than this file inventing a picture of a         */
/* sentence.                                                            */
/*                                                                      */
/* ALL OR NOTHING PER BEAT. A tile set is a comparison, and a set where */
/* one tile is a drawing and the next is a paragraph is not one. A beat */
/* whose table entry misses even one option id is treated as having no  */
/* tiles at all, and `test/mcqFigures.test.ts` fails on a table entry   */
/* naming an option the beat does not carry, so a reworded option       */
/* breaks the key rather than quietly dropping a tile.                  */
/* ------------------------------------------------------------------ */

/**
 * A benzene ring carrying one group, with some of its positions circled.
 *
 * `marks` are hexagon vertex indices, and hexagon() puts vertex 0 at the top,
 * so with the group on 0 the ortho positions are 1 and 5, the meta are 2 and
 * 4 and the para is 3. THE RING GEOMETRY CARRIES THE REGIOCHEMISTRY: the tile
 * says "here" by circling the carbons rather than by writing the word, which
 * is what makes it an answer a student reads off a structure.
 */
function arenePositions(group: string, marks: readonly number[]): DrawnFigure {
  const base = arene(group);
  const pts = hexagon(ARENE_CENTRE.x, ARENE_CENTRE.y, ARENE_R);
  return {
    ...base,
    // THE MARKER SITS JUST OUTSIDE THE VERTEX IT MARKS, pushed 5 units along
    // the centre-to-vertex direction. Centred exactly on the vertex, the
    // dashed ring lands on top of two ring bonds and the drawing turns muddy
    // at tile size; pushed out, it reads as a circle AROUND that position,
    // which is what it means. Furthest extent is 18 + 5 + 6 = 29 units from
    // the centre, so every marker stays inside the 120 by 84 box and the
    // suite's viewBox assertion holds by construction rather than by luck.
    rings: marks.map((i) => {
      const p = pts[i] as Pt;
      const ux = (p.x - ARENE_CENTRE.x) / ARENE_R;
      const uy = (p.y - ARENE_CENTRE.y) / ARENE_R;
      return { x: Math.round(p.x + ux * 5), y: Math.round(p.y + uy * 5), r: 6 };
    }),
  };
}

/**
 * The same ring with the SUBSTITUENT circled rather than a ring position.
 *
 * The marker goes on the far end of the bond out of the ring rather than on
 * the label itself: the label's baseline sits near the top of the 120 by 84
 * box, so a circle big enough to hold the text would run off the top edge,
 * and a figure that leaves its own viewBox is what the suite's bounds
 * assertion exists to catch. The bond end is 14 units out from vertex 0, so
 * the marker reads as circling the group and stays inside by 8 units.
 */
function areneGroupMarked(group: string): DrawnFigure {
  const base = arene(group);
  const top = hexagon(ARENE_CENTRE.x, ARENE_CENTRE.y, ARENE_R)[0] as Pt;
  return { ...base, rings: [{ x: top.x, y: top.y - 14, r: 8 }] };
}

const OPTION_FIGURES: Readonly<Record<string, Readonly<Record<string, NamedFigure>>>> = Object.freeze({
  // Nitrate toluene. The three answers are three sets of ring positions, so
  // the three tiles are the same toluene with different carbons circled and
  // the student compares drawings rather than the words ortho and meta.
  "mcq-directing-meet": {
    op: { figure: arenePositions("CH_3", [1, 3, 5]), name: "ortho and para" },
    meta: { figure: arenePositions("CH_3", [2, 4]), name: "meta" },
    methyl: { figure: areneGroupMarked("CH_3"), name: "on the methyl" },
  },

  // Brominate anisole. Same shape of answer, so the same shape of tile: the
  // ring is redrawn identically and only the circles move, which is the whole
  // point of a comparison set.
  "mcq-directing-anisole": {
    meta: { figure: arenePositions("OCH_3", [2, 4]), name: "meta only" },
    op: { figure: arenePositions("OCH_3", [1, 3, 5]), name: "ortho and para" },
    even: { figure: arenePositions("OCH_3", [1, 2, 3, 4, 5]), name: "about evenly" },
  },
});

/**
 * The drawn option tiles for a beat, or null when its answers are rules
 * rather than pictures.
 *
 * `optionIds` is passed in rather than looked up so this stays a pure
 * function of its arguments and the view keeps one source of truth for which
 * options a beat has. A partial entry returns null: see the header on why a
 * half-drawn comparison is worse than an undrawn one.
 */
export function mcqOptionTiles(
  beatId: string,
  optionIds: readonly string[],
): Readonly<Record<string, NamedFigure>> | null {
  const table = OPTION_FIGURES[beatId];
  if (table === undefined) return null;
  return optionIds.every((id) => table[id] !== undefined) ? table : null;
}

/** Every beat id with a drawn option set, and the option ids it draws. */
export function mcqOptionTileKeys(): readonly (readonly [string, readonly string[]])[] {
  return Object.entries(OPTION_FIGURES).map(([beatId, table]) => [beatId, Object.keys(table)] as const);
}
