/**
 * THE DRAWN CHEMISTRY ON A LESSON QUESTION.
 *
 * Owner ruling 1 of 2026-09-04, in docs/DESIGN-GOALS.md: "EVERY QUESTION
 * CARRIES A VISUAL. A structure, a spectrum, a scheme, a mechanism frame ...
 * a question that is only prose has already lost the student." Ruling 2:
 * "THE IMAGE COMES FIRST AND THE NAME COMES SECOND", the name set small and
 * in the muted ink under the drawing. `blueberry_r9-lesson-reaction` draws
 * both: a white scheme card holding substrate, reagent and a question box,
 * then option tiles that are structures with their names captioned under.
 *
 * The previous pass on this surface NAMED this gap in a comment and shipped
 * prose. This file closes it for every question the lesson player can
 * actually serve.
 *
 * WHY THE TABLE IS HERE AND NOT IN packages/curriculum, which is the honest
 * compromise and belongs at the top. `Problem` carries no figure field and
 * `ChoiceOption` is `{ id, text }`, whose own comment in that package says "a
 * structure is referred to by label here; rendering is Phase 4". Landing a
 * figure field on those types is the correct fix and it is a package this
 * builder does not own. So this is explicitly a SHIM, the same shim
 * `onboarding/figures.ts` already is for the placement quiz, and it borrows
 * that file's `Figure` vocabulary and its one renderer rather than growing a
 * second drawing language in the same app. The day the corpus carries
 * figures, this table moves in beside the words it belongs to.
 *
 * WHAT KEEPS THIS FROM BEING INVENTED CHEMISTRY. Nothing here is derived from
 * a prompt's words at run time. Every entry is authored against one exact
 * problem id, and an option figure against one exact `problemId::optionId`
 * pair, so a corpus edit that changes what an option means breaks the key
 * rather than silently redrawing the old molecule under new words.
 * `test/lessonFigures.test.ts` walks the real served corpus and fails when a
 * question has no scheme, so a new authored problem fails a test rather than
 * reaching a student as a wall of text.
 *
 * SKELETAL OR CONDENSED. Both are first class, exactly as the onboarding shim
 * settled it: a set picks whichever reads at the size the tile draws it. What
 * is NOT negotiable is that one question's options all use the SAME
 * representation, because four drawings that differ in layout as well as in
 * chemistry put the difference in the wrong place.
 *
 * NO WALL CLOCK, no state, no React, no DOM. Pure data and pure functions, so
 * the node suite can walk all of it.
 */

import type { Figure, FigureBond, FigureLabel } from "../onboarding/figures";

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                     */
/*                                                                      */
/* Hand-placing every vertex of a zig-zag is where a drawing goes       */
/* subtly crooked, so the two shapes that repeat get a function. Both   */
/* are pure and both return plain points, so an authored figure can     */
/* still hang a substituent off any vertex by name.                     */
/* ------------------------------------------------------------------ */

/*
 * THE GEOMETRY HELPERS BELOW ARE EXPORTED, and the reason is worth one line:
 * the MCQ beats need drawn chemistry too (owner ruling 1, every question
 * carries a visual) and src/beats/mcq/mcqFigures.ts draws its stems with
 * these. Two copies of a bond-angle constant is how two surfaces start
 * drawing at different angles, so there is one copy and it lives here,
 * beside the table that first needed it. The import runs beats -> lesson
 * only; nothing in this file imports from beats, so there is no cycle.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** One bond step across, and this much up or down. The house bond angle. */
const DX = 16;
const DY = 9;

/**
 * A zig-zag carbon chain of `n` bonds starting at (x, y).
 *
 * `up` says whether the FIRST step rises. Returns n + 1 vertices, so
 * `chain(24, 54, 3, true)` is butane drawn left to right.
 */
export function chain(x: number, y: number, n: number, up: boolean): readonly Pt[] {
  const pts: Pt[] = [{ x, y }];
  for (let i = 0; i < n; i += 1) {
    const last = pts[pts.length - 1] as Pt;
    const rising = up ? i % 2 === 0 : i % 2 === 1;
    pts.push({ x: last.x + DX, y: last.y + (rising ? -DY : DY) });
  }
  return pts;
}

/** Bonds along a run of vertices. `orders` keys a bond index to 2 or 3. */
export function link(pts: readonly Pt[], orders: Readonly<Record<number, 2 | 3>> = {}): readonly FigureBond[] {
  const bonds: FigureBond[] = [];
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    const order = orders[i];
    bonds.push(order === undefined ? { x1: a.x, y1: a.y, x2: b.x, y2: b.y } : { x1: a.x, y1: a.y, x2: b.x, y2: b.y, order });
  }
  return bonds;
}

/** One bond from a vertex to a point, for a substituent stub. */
export function stub(from: Pt, x: number, y: number): FigureBond {
  return { x1: from.x, y1: from.y, x2: x, y2: y };
}

/**
 * A pointy-top hexagon: vertex 0 at the top, then clockwise.
 *
 * Positions 1 and 3 are META to each other and 1 and 2 are ORTHO, which is
 * how the aromatic answers below place their substituents: the ring geometry
 * carries the regiochemistry rather than a caption asserting it.
 */
export function hexagon(cx: number, cy: number, r: number): readonly Pt[] {
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    return { x: Math.round(cx + r * Math.cos(angle)), y: Math.round(cy + r * Math.sin(angle)) };
  });
}

/**
 * The six ring bonds. `orders` keys a ring bond index to a double bond, so a
 * benzene passes the three alternating Kekule positions and a cyclohexene
 * passes exactly one. Going through one function rather than adding a second
 * bond on top of a single one matters: an order-2 bond drawn OVER an order-1
 * bond is three lines, which is a triple bond wearing a double bond's name.
 */
export function ring(pts: readonly Pt[], orders: Readonly<Record<number, 2 | 3>> = {}): readonly FigureBond[] {
  return link([...pts, pts[0] as Pt], orders);
}

/** The three alternating double bonds of a Kekule benzene. */
export const KEKULE: Readonly<Record<number, 2>> = Object.freeze({ 0: 2, 2: 2, 4: 2 });

/* ------------------------------------------------------------------ */
/* The scheme                                                           */
/* ------------------------------------------------------------------ */

/**
 * A reaction scheme: what you start with, what happens over the arrow, what
 * you end with. The shape of `blueberry_r9-lesson-reaction`'s white card.
 *
 * EXACTLY ONE SIDE IS UNKNOWN and the question kind decides which. A
 * predict-the-product question knows its reagents and asks for the right hand
 * side, so `right` is absent and the box draws a question mark. A supply-the
 * reagents question knows both sides and asks for the arrow, so `over` is
 * absent and the ARROW carries the question mark. That is the same scheme
 * read in two directions, which is what CLAUDE.md means when it says a
 * synthesis question is the reagent shape read backwards rather than a fifth
 * answer shape.
 *
 * `leftName` and `rightName` are the CAPTIONS: drawn under the structure,
 * small and in the muted ink, per ruling 2. A caption is allowed to carry
 * something the drawing cannot, and trans-1,2-dibromocyclohexane is the
 * worked example: this figure vocabulary has no wedge or dash, so the
 * stereochemistry lives in the name under the picture and is not silently
 * dropped or silently faked.
 */
export interface Scheme {
  readonly left: Figure;
  readonly leftName?: string;
  /** Reagents over the arrow. Absent when the reagents are the answer. */
  readonly over?: string;
  /** Conditions under the arrow: solvent, temperature, a second stage. */
  readonly under?: string;
  /** The product, when the question gives it. Absent means the box asks. */
  readonly right?: Figure;
  readonly rightName?: string;
}

/* ------------------------------------------------------------------ */
/* Shared fragments                                                     */
/* ------------------------------------------------------------------ */

/** A benzene ring drawn once, so every aromatic question starts the same. */
export function benzene(cx: number, cy: number): Figure {
  return { bonds: [...ring(hexagon(cx, cy, 18), KEKULE)] };
}

/**
 * A generic secondary alcohol: R and R' either side, OH above.
 *
 * Drawn generically ON PURPOSE. The sulfonate question says "a secondary
 * alcohol", not a named one, and drawing butan-2-ol there would teach the
 * student that the answer depends on the chain when the whole point is that
 * it does not.
 */
function secondaryAlcohol(group: string): Figure {
  const c = { x: 44, y: 44 };
  return {
    bonds: [stub({ x: 26, y: 54 }, c.x, c.y), stub(c, 62, 54), stub(c, 44, 30)],
    labels: [
      { x: 18, y: 59, t: "R", size: 15 },
      { x: 72, y: 59, t: "R'", size: 15 },
      { x: 44, y: 24, t: group, size: 15 },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* The schemes, one per served problem                                  */
/* ------------------------------------------------------------------ */

const SCHEMES: Readonly<Record<string, Scheme>> = Object.freeze({
  /* --- alcohols: leaving groups ---------------------------------- */

  "org2-alcohol-sulfonate-activation": {
    left: secondaryAlcohol("OH"),
    leftName: "a secondary alcohol",
    right: secondaryAlcohol("OTs"),
    rightName: "the sulfonate, configuration untouched",
  },

  // 3,3-Dimethylbutan-2-ol: the carbinol carbon on the left carries the
  // methyl and the OH, the quaternary carbon on the right carries three.
  "org2-alcohol-dehydration-with-shift": {
    left: (() => {
      const c2 = { x: 40, y: 40 };
      const c3 = { x: 56, y: 49 };
      return {
        bonds: [
          stub(c2, 24, 49),
          stub(c2, 40, 26),
          stub(c2, c3.x, c3.y),
          stub(c3, 72, 40),
          stub(c3, 72, 58),
          stub(c3, 40, 58),
        ],
        labels: [{ x: 40, y: 20, t: "OH", size: 15 }],
      } satisfies Figure;
    })(),
    leftName: "3,3-dimethylbutan-2-ol",
    over: "H_2SO_4",
    under: "heat",
  },

  /* --- the oxidation ladder --------------------------------------- */

  "org2-oxidation-stop-at-aldehyde": {
    left: {
      bonds: [...link(chain(40, 44, 3, false))],
      labels: [{ x: 14, y: 49, t: "HO", size: 15, anchor: "start" }],
    },
    leftName: "butan-1-ol",
    right: (() => {
      const c1 = { x: 32, y: 50 };
      return {
        bonds: [...link(chain(c1.x, c1.y, 3, false)), { x1: c1.x, y1: c1.y, x2: c1.x, y2: 32, order: 2 }],
        labels: [{ x: 32, y: 26, t: "O", size: 15 }],
      } satisfies Figure;
    })(),
    rightName: "butanal, and no further",
  },

  /* --- ethers ------------------------------------------------------ */

  // tert-Butyl methyl ether: the quaternary carbon left, the oxygen bridging,
  // the methyl running away to the right.
  "org2-ether-cleavage-tert-butyl-methyl": {
    left: (() => {
      const cq = { x: 30, y: 52 };
      return {
        bonds: [stub(cq, 44, 44), { x1: 62, y1: 44, x2: 76, y2: 52 }, stub(cq, 14, 43), stub(cq, 14, 61), stub(cq, 30, 70)],
        labels: [{ x: 53, y: 49, t: "O", size: 15 }],
      } satisfies Figure;
    })(),
    leftName: "tert-butyl methyl ether",
    over: "HI, 1 equiv",
    under: "cold",
  },

  /* --- epoxides ---------------------------------------------------- */

  // 2,2-Dimethyloxirane: the substituted ring carbon on the left carries both
  // methyls, the CH2 is on the right, the oxygen bridges the top.
  "org2-epoxide-base-opening-regiochemistry": {
    left: (() => {
      const left = { x: 40, y: 58 };
      return {
        bonds: [stub(left, 76, 58), { x1: 42, y1: 54, x2: 55, y2: 36 }, { x1: 74, y1: 54, x2: 61, y2: 36 }, stub(left, 24, 49), stub(left, 24, 67)],
        labels: [{ x: 58, y: 32, t: "O", size: 15 }],
      } satisfies Figure;
    })(),
    leftName: "2,2-dimethyloxirane",
    over: "NaOMe, MeOH",
    under: "then H_3O^+",
  },

  /* --- dienes ------------------------------------------------------ */

  "org2-diene-hbr-cold": {
    left: { bonds: [...link(chain(24, 54, 3, true), { 0: 2, 2: 2 })] },
    leftName: "buta-1,3-diene",
    over: "HBr, 1 equiv",
    under: "-80 °C",
  },

  /* --- aromatics --------------------------------------------------- */

  "org2-eas-acylate-then-reduce": {
    left: benzene(44, 46),
    leftName: "benzene",
    right: (() => {
      const r = hexagon(38, 48, 18);
      const attach = r[1] as Pt;
      return {
        bonds: [...ring(r, KEKULE), ...link(chain(attach.x, attach.y, 3, true))],
      } satisfies Figure;
    })(),
    rightName: "propylbenzene, chain unbranched",
  },

  "org2-meta-bromonitrobenzene-synthesis": {
    left: benzene(44, 46),
    leftName: "benzene",
    right: (() => {
      const r = hexagon(44, 52, 17);
      const top = r[0] as Pt;
      const meta = r[2] as Pt;
      return {
        bonds: [...ring(r, KEKULE), stub(top, top.x, 23), stub(meta, 70, 67)],
        labels: [
          { x: 44, y: 17, t: "Br", size: 14 },
          { x: 86, y: 72, t: "NO_2", size: 14 },
        ],
      } satisfies Figure;
    })(),
    rightName: "1-bromo-3-nitrobenzene",
  },

  /* --- alkenes ----------------------------------------------------- */

  // 2-Methylbut-2-ene: the trisubstituted end on the left, one hydrogen on
  // the right, which is the whole reason the addition is selective.
  "org1-hbr-markovnikov-major": {
    left: (() => {
      const c2 = { x: 44, y: 46 };
      const c3 = { x: 68, y: 46 };
      return {
        bonds: [{ x1: c2.x, y1: c2.y, x2: c3.x, y2: c3.y, order: 2 }, stub(c2, 28, 37), stub(c2, 28, 55), stub(c3, 84, 37)],
      } satisfies Figure;
    })(),
    leftName: "2-methylbut-2-ene",
    over: "HBr",
    under: "no peroxides",
  },

  "org1-alkene-bromination-reagent": {
    left: (() => {
      return { bonds: [...ring(hexagon(44, 46, 19), { 5: 2 })] } satisfies Figure;
    })(),
    leftName: "cyclohexene",
    right: (() => {
      const r = hexagon(40, 50, 18);
      const a = r[1] as Pt;
      const b = r[2] as Pt;
      return {
        bonds: [...ring(r), stub(a, 68, 33), stub(b, 68, 67)],
        labels: [
          { x: 82, y: 38, t: "Br", size: 14 },
          { x: 82, y: 72, t: "Br", size: 14 },
        ],
      } satisfies Figure;
    })(),
    // The name carries what this vocabulary cannot draw: there is no wedge or
    // dash here, so trans is stated rather than faked.
    rightName: "trans-1,2-dibromocyclohexane",
  },

  /* --- substitution ------------------------------------------------ */

  "org1-sn2-predict-product": {
    left: (() => {
      const c2 = { x: 56, y: 45 };
      return {
        bonds: [stub({ x: 40, y: 54 }, c2.x, c2.y), stub(c2, c2.x, 29)],
        labels: [{ x: 56, y: 23, t: "Br", size: 15 }],
      } satisfies Figure;
    })(),
    leftName: "bromoethane",
    over: "NaOH",
    under: "H_2O, warm",
  },

  /* --- alkynes ----------------------------------------------------- */

  "org2-alkyne-alkylation-retro": {
    left: {
      bonds: [{ x1: 30, y1: 46, x2: 62, y2: 46, order: 3 }, { x1: 62, y1: 46, x2: 78, y2: 55 }],
      labels: [{ x: 20, y: 51, t: "H", size: 15 }],
    },
    leftName: "prop-1-yne",
    right: {
      bonds: [
        { x1: 20, y1: 55, x2: 36, y2: 46 },
        { x1: 36, y1: 46, x2: 68, y2: 46, order: 3 },
        { x1: 68, y1: 46, x2: 84, y2: 55 },
        { x1: 84, y1: 55, x2: 100, y2: 46 },
      ],
    },
    rightName: "pent-2-yne",
  },
});

/* ------------------------------------------------------------------ */
/* The option tiles                                                     */
/*                                                                      */
/* One picture per candidate on every predict-the-product question, so   */
/* the option cards are pictures with captions rather than captions      */
/* with pictures. Within a question every tile uses the same             */
/* representation: the difference between the answers has to be the      */
/* chemistry and nothing else.                                           */
/* ------------------------------------------------------------------ */

/**
 * Two condensed species stacked, for a question whose answer is a PAIR.
 *
 * The ether cleavage question's three answers are each two molecules, and two
 * skeletal drawings in one 120 by 84 tile are two cramped drawings. A
 * condensed formula is a chemical drawing too, and the onboarding shim
 * already settled that both notations are first class; what matters is that
 * all three tiles in the set use the same one.
 */
function condensedPair(top: string, bottom: string): Figure {
  const labels: readonly FigureLabel[] = [
    { x: 60, y: 38, t: top, size: 15 },
    { x: 60, y: 64, t: bottom, size: 14 },
  ];
  return { labels };
}

/**
 * The three Markovnikov answers, drawn on ONE butane chain.
 *
 * All three are a bromo-methyl-butane and differ only in which carbon carries
 * the bromine and which carries the methyl, so they share a chain and the
 * substituents move. Drawn skeletally rather than as condensed formulae
 * because a formula scales with the viewBox: at the size an option tile draws
 * one, `BrCH_2CH(CH_3)CH_2CH_3` came out smaller than its own caption, which
 * is ruling 2 upside down. A skeletal drawing spends the same box on lines
 * that stay legible.
 *
 * C2 is a valley vertex, so it has BOTH lower diagonals free: that is what
 * lets one carbon carry two substituents without either of them crossing the
 * chain.
 */
const BUTANE: readonly Pt[] = chain(20, 42, 3, false);

function bromoMethylButane(spec: {
  /** Which chain vertex the bromine hangs off, and where it points. */
  readonly br: { readonly at: 0 | 1; readonly dir: "up" | "downLeft" };
  /** Which chain vertex the methyl hangs off. */
  readonly methyl: { readonly at: 1 | 2; readonly dir: "up" | "downRight" };
}): Figure {
  const brFrom = BUTANE[spec.br.at] as Pt;
  const meFrom = BUTANE[spec.methyl.at] as Pt;
  const brEnd = spec.br.dir === "up" ? { x: brFrom.x, y: 26 } : { x: brFrom.x - 12, y: brFrom.y + 15 };
  const brLabel = spec.br.dir === "up" ? { x: brFrom.x, y: 20 } : { x: brFrom.x - 20, y: brFrom.y + 25 };
  const meEnd =
    spec.methyl.dir === "up" ? { x: meFrom.x, y: meFrom.y - 16 } : { x: meFrom.x + 12, y: meFrom.y + 15 };
  return {
    bonds: [...link(BUTANE), stub(brFrom, brEnd.x, brEnd.y), stub(meFrom, meEnd.x, meEnd.y)],
    labels: [{ x: brLabel.x, y: brLabel.y, t: "Br", size: 14 }],
  };
}

/**
 * The three C4 answers to the epoxide question, drawn on ONE skeleton.
 *
 * All three are (CH_3)_2C(X)-CH_2-Y and differ only in what X and Y are, so
 * they share a hand-placed layout: the crowded carbon on the left with its
 * two methyls, the CH_2 on the right, one group above each. The student is
 * being asked which carbon the methoxide reached, and that question is only
 * legible if the two carbons sit in the same place on all three tiles.
 *
 * The right hand label anchors at its START rather than its middle, because a
 * five character group centred at the same x as a two character one would
 * grow leftwards into the bond it hangs off.
 */
function branchedC4(onQuaternary: string, onTerminal: string): Figure {
  const cq = { x: 44, y: 48 };
  const ch2 = { x: 60, y: 57 };
  return {
    bonds: [stub(cq, 28, 39), stub(cq, 44, 66), stub(cq, cq.x, 32), stub(cq, ch2.x, ch2.y), stub(ch2, 72, 50)],
    labels: [
      { x: 44, y: 26, t: onQuaternary, size: 14 },
      { x: 76, y: 54, t: onTerminal, size: 14, anchor: "start" },
    ],
  };
}

const OPTION_FIGURES: Readonly<Record<string, Figure>> = Object.freeze({
  /* --- dehydration with a methyl shift: three alkenes -------------- */

  // 2,3-Dimethylbut-2-ene, the tetrasubstituted one.
  "org2-alcohol-dehydration-with-shift::tetrasubstituted": {
    bonds: [
      { x1: 44, y1: 44, x2: 76, y2: 44, order: 2 },
      { x1: 44, y1: 44, x2: 28, y2: 35 },
      { x1: 44, y1: 44, x2: 28, y2: 53 },
      { x1: 76, y1: 44, x2: 92, y2: 35 },
      { x1: 76, y1: 44, x2: 92, y2: 53 },
    ],
  },
  // 3,3-Dimethylbut-1-ene: the alkene the alcohol would give with no shift.
  "org2-alcohol-dehydration-with-shift::unrearranged": {
    bonds: [
      { x1: 24, y1: 52, x2: 40, y2: 43, order: 2 },
      { x1: 40, y1: 43, x2: 56, y2: 52 },
      { x1: 56, y1: 52, x2: 72, y2: 43 },
      { x1: 56, y1: 52, x2: 72, y2: 61 },
      { x1: 56, y1: 52, x2: 56, y2: 70 },
    ],
  },
  // 2,3-Dimethylbut-1-ene: rearranged, but the proton left the wrong carbon.
  "org2-alcohol-dehydration-with-shift::rearranged-terminal": {
    bonds: [
      { x1: 24, y1: 54, x2: 40, y2: 45, order: 2 },
      { x1: 40, y1: 45, x2: 40, y2: 29 },
      { x1: 40, y1: 45, x2: 56, y2: 54 },
      { x1: 56, y1: 54, x2: 72, y2: 45 },
      { x1: 56, y1: 54, x2: 56, y2: 72 },
    ],
  },

  /* --- ether cleavage: three pairs of products --------------------- */

  "org2-ether-cleavage-tert-butyl-methyl::tertiary-iodide": condensedPair("(CH_3)_3C-I", "+ CH_3OH"),
  "org2-ether-cleavage-tert-butyl-methyl::methyl-iodide": condensedPair("CH_3-I", "+ (CH_3)_3C-OH"),
  "org2-ether-cleavage-tert-butyl-methyl::alkene": condensedPair("(CH_3)_2C=CH_2", "+ CH_3OH"),

  /* --- epoxide opening: three C4 oxygen products ------------------- */

  // 1-Methoxy-2-methylpropan-2-ol: OH stays on the crowded carbon, the
  // methoxy landed on the CH2.
  "org2-epoxide-base-opening-regiochemistry::attack-at-ch2": branchedC4("OH", "OCH_3"),
  // 2-Methoxy-2-methylpropan-1-ol: the other way round.
  "org2-epoxide-base-opening-regiochemistry::attack-at-quaternary": branchedC4("OCH_3", "OH"),
  // 2-Methylpropane-1,2-diol: no methoxy at all.
  "org2-epoxide-base-opening-regiochemistry::diol": branchedC4("OH", "OH"),

  /* --- the diene: three bromobutenes ------------------------------- */

  // 3-Bromobut-1-ene, the 1,2 adduct.
  "org2-diene-hbr-cold::one-two": (() => {
    const pts = chain(24, 56, 3, true);
    const c3 = pts[2] as Pt;
    return {
      bonds: [...link(pts, { 0: 2 }), stub(c3, c3.x, 40)],
      labels: [{ x: c3.x, y: 34, t: "Br", size: 14 }],
    } satisfies Figure;
  })(),
  // 1-Bromobut-2-ene, the 1,4 adduct.
  "org2-diene-hbr-cold::one-four": (() => {
    const pts = chain(32, 54, 3, true);
    const c1 = pts[0] as Pt;
    return {
      bonds: [...link(pts, { 1: 2 }), stub(c1, c1.x, 38)],
      labels: [{ x: c1.x, y: 32, t: "Br", size: 14 }],
    } satisfies Figure;
  })(),
  // 4-Bromobut-1-ene: bromine on the far end, which no allylic cation offers.
  "org2-diene-hbr-cold::wrong-end": (() => {
    const pts = chain(24, 56, 3, true);
    const c4 = pts[3] as Pt;
    return {
      bonds: [...link(pts, { 0: 2 }), stub(c4, c4.x, 31)],
      labels: [{ x: c4.x, y: 25, t: "Br", size: 14 }],
    } satisfies Figure;
  })(),

  /* --- Markovnikov: three bromides, condensed ---------------------- */

  // 2-Bromo-2-methylbutane: bromine and methyl both on C2, the Markovnikov
  // carbon.
  "org1-hbr-markovnikov-major::tertiary-bromide": bromoMethylButane({
    br: { at: 1, dir: "downLeft" },
    methyl: { at: 1, dir: "downRight" },
  }),
  // 2-Bromo-3-methylbutane: bromine on C2, methyl one carbon further along.
  "org1-hbr-markovnikov-major::secondary-bromide": bromoMethylButane({
    br: { at: 1, dir: "downLeft" },
    methyl: { at: 2, dir: "up" },
  }),
  // 1-Bromo-2-methylbutane: bromine on the end carbon.
  "org1-hbr-markovnikov-major::primary-bromide": bromoMethylButane({
    br: { at: 0, dir: "up" },
    methyl: { at: 1, dir: "downRight" },
  }),
});

/* ------------------------------------------------------------------ */
/* Lookups                                                              */
/* ------------------------------------------------------------------ */

/**
 * The scheme for a question, or null when the corpus has grown one this table
 * has not been authored against.
 *
 * NULL IS A REAL RETURN AND THE SCREEN HANDLES IT, because a student meeting
 * a question authored after this table must still be able to answer it. The
 * card is simply absent and the question falls back to its prompt. The test
 * is what stops that fallback ever being what a student actually sees.
 */
export function schemeFor(problemId: string): Scheme | null {
  return SCHEMES[problemId] ?? null;
}

/** The picture for one answer tile, or null when it has no authored figure. */
export function optionFigureFor(problemId: string, optionId: string): Figure | null {
  return OPTION_FIGURES[`${problemId}::${optionId}`] ?? null;
}

/** Every authored key, for the coverage test. Never read by the surface. */
export function schemeKeys(): readonly string[] {
  return Object.keys(SCHEMES);
}

/** Every authored option key, for the coverage test. */
export function optionFigureKeys(): readonly string[] {
  return Object.keys(OPTION_FIGURES);
}
