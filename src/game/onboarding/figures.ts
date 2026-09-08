/**
 * THE DRAWN CHEMISTRY ON A PLACEMENT ANSWER TILE.
 *
 * Owner ruling 2026-09-04, in docs/DESIGN-GOALS.md: "EVERY QUESTION CARRIES A
 * VISUAL", and "OPTION CARDS ARE PICTURES WITH CAPTIONS, not captions with
 * pictures". blueberry_r9-onboard-placement draws it exactly: four periwinkle
 * tiles, each a drawn carbocation with Methyl / Primary / Secondary / Tertiary
 * set small and light UNDER it.
 *
 * WHY THIS TABLE IS HERE AND NOT IN packages/curriculum, stated plainly because
 * it is the compromise in this file and a reader deserves to see it first.
 * `ChoiceOption` there is `{ id, text }` and its own comment says "a structure
 * is referred to by label here; rendering is Phase 4". `Problem` carries no
 * figure field either, so there is nothing on that side of the boundary to
 * draw, and the previous pass shipped a prose-only placement screen and was
 * rightly rejected for it. Landing the field on `ChoiceOption` is the correct
 * fix and it is a package this builder does not own. So the figures are
 * AUTHORED HERE, keyed by the corpus's own problem and option ids, and this
 * file is explicitly a SHIM: the day `ChoiceOption` carries a figure, this
 * table moves into the corpus beside the words it belongs to and
 * `figureFor` reads the option instead of this map.
 *
 * WHAT MAKES THIS DIFFERENT FROM INVENTING CHEMISTRY IN A SHELL, which is the
 * thing the previous pass refused to do and was right to refuse. Nothing here
 * is DERIVED from an option's words at run time. Every figure is authored
 * against one exact `problemId::optionId` pair, so a corpus edit that changes
 * an option's meaning breaks the key rather than silently redrawing the old
 * molecule under the new words. `onboardingFigures.test.ts` walks the real quiz
 * machine over every claimed course and asserts that every option it can serve
 * has a figure, so a new corpus question fails a test rather than reaching a
 * student as a bare word.
 *
 * WHAT A FIGURE IS. A tiny declarative structure spec, not an SVG string:
 * bonds as line segments, labels as condensed formulae, rings as circles, all
 * in one fixed 120 by 84 viewBox. StructureFigure.tsx is the only renderer.
 * The point of the spec being data is that it can be read, counted and
 * asserted; an inline `<svg>` per option could not be.
 *
 * THE NOTATION IS THE GOAL IMAGE'S. blueberry_r9-onboard-placement draws one
 * tile as a skeletal structure (the methyl cation) and three as condensed
 * formulae (CH3-CH2+, (CH3)2CH+, (CH3)3C+). So both are first class here, and
 * a tile set picks whichever reads at 145 by 100 pixels for the distinction it
 * is asking the student to make.
 *
 * NO WALL CLOCK, no state, no React. Pure data and two pure functions.
 */

/* ------------------------------------------------------------------ */
/* Condensed formula typesetting                                       */
/* ------------------------------------------------------------------ */

/** One run of a condensed formula. 0 baseline, 1 subscript, 2 superscript. */
export interface FormulaRun {
  readonly text: string;
  readonly level: 0 | 1 | 2;
}

/**
 * Splits a label into baseline, subscript and superscript runs.
 *
 * The whole grammar is `_` and `^`, each taking the next character or the next
 * braced run, which is every condensed formula this product needs: a count
 * under the line and a charge above it. `(CH_3)_3C^+` is the goal image's
 * tertiary cation and `HSO_4^-` is bisulfate.
 *
 * IT LIVES IN THE DATA MODULE RATHER THAN THE RENDERER, and that is not
 * tidiness. It is the one piece of this feature with real edge cases in it (a
 * trailing marker with nothing after it, an unclosed brace), and the web
 * suite runs in a node environment with no DOM, so a pure function here can be
 * driven by a test where the same function beside the JSX could not be.
 */
export function formulaRuns(text: string): readonly FormulaRun[] {
  const runs: FormulaRun[] = [];
  let plain = "";
  const flush = () => {
    if (plain !== "") {
      runs.push({ text: plain, level: 0 });
      plain = "";
    }
  };
  for (let i = 0; i < text.length; i += 1) {
    // `text[i]` is `string | undefined` under noUncheckedIndexedAccess even
    // inside a length-bounded loop, so the fallback is for the compiler rather
    // than for a case that can happen.
    const char = text[i] ?? "";
    if (char !== "_" && char !== "^") {
      plain += char;
      continue;
    }
    const level: 1 | 2 = char === "_" ? 1 : 2;
    let body = "";
    if (text[i + 1] === "{") {
      const close = text.indexOf("}", i + 2);
      // An unclosed brace runs to the end rather than dropping the rest of the
      // formula on the floor: a half-drawn label is easier to spot than a
      // silently truncated one.
      body = close === -1 ? text.slice(i + 2) : text.slice(i + 2, close);
      i = close === -1 ? text.length : close;
    } else if (i + 1 < text.length) {
      body = text[i + 1] ?? "";
      i += 1;
    }
    if (body === "") continue;
    flush();
    runs.push({ text: body, level });
  }
  flush();
  return runs;
}

/** Where a label's x anchors. Default is the middle, which is most of them. */
export type FigureAnchor = "start" | "middle" | "end";

/**
 * One typeset chemical label.
 *
 * `t` carries a two character markup and nothing more: `_` starts a subscript
 * and `^` starts a superscript, each taking one following character or a
 * braced run. So `(CH_3)_3C^+` is the goal image's tertiary cation and
 * `HSO_4^-` is bisulfate. Deliberately not MathML and deliberately not a
 * parser with an expression grammar: the whole vocabulary a condensed formula
 * needs is a digit under the line and a charge above it.
 */
export interface FigureLabel {
  readonly x: number;
  readonly y: number;
  readonly t: string;
  /** In viewBox units. Default 15, which is a comfortable condensed formula. */
  readonly size?: number;
  readonly anchor?: FigureAnchor;
}

/** One bond, or one reaction arrow when `arrow` is set. */
export interface FigureBond {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** 1 single, 2 double, 3 triple. Default 1. */
  readonly order?: 1 | 2 | 3;
  /** Draws a head at (x2, y2). A reaction arrow, never a bond. */
  readonly arrow?: boolean;
}

/** A ring drawn around a group, which is how "this one" is marked. */
export interface FigureRing {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface Figure {
  readonly bonds?: readonly FigureBond[];
  readonly labels?: readonly FigureLabel[];
  readonly rings?: readonly FigureRing[];
}

/** The one viewBox every figure is drawn in. */
export const FIGURE_WIDTH = 120;
export const FIGURE_HEIGHT = 84;

function key(problemId: string, optionId: string): string {
  return `${problemId}::${optionId}`;
}

/* ------------------------------------------------------------------ */
/* Shared cores                                                        */
/* ------------------------------------------------------------------ */

/**
 * The amide core, drawn once and charged four ways.
 *
 * The resonance question asks a student to compare four contributors of ONE
 * molecule, so the four tiles must be the same drawing with the charges and
 * the bond orders moved. Four independently hand placed drawings would put the
 * difference in the layout as well as in the chemistry, which is the opposite
 * of what the question tests.
 *
 * The carbonyl carbon sits at (52, 46) with a methyl running down-left, the
 * oxygen above it and the NH2 to its right.
 */
function amide(spec: {
  readonly co: 1 | 2;
  readonly cn: 1 | 2;
  readonly oLabel: string;
  readonly nLabel: string;
  /** Set on the contributor whose carbon carries the charge itself. */
  readonly cLabel?: string;
}): Figure {
  return {
    bonds: [
      // The methyl, so the carbon reads as a carbonyl carbon and not a formyl.
      { x1: 30, y1: 60, x2: 48, y2: 50 },
      { x1: 52, y1: 40, x2: 52, y2: 24, order: spec.co },
      { x1: 60, y1: 46, x2: 76, y2: 46, order: spec.cn },
    ],
    labels: [
      { x: 52, y: 18, t: spec.oLabel },
      { x: 82, y: 51, t: spec.nLabel, anchor: "start", size: 14 },
      ...(spec.cLabel === undefined ? [] : [{ x: 52, y: 51, t: spec.cLabel, size: 14 }]),
    ],
  };
}

/**
 * The pH axis of the titration question: one line, one tick at 7, and a marker
 * wherever the option claims the equivalence point sits.
 *
 * A titration CURVE would be the richer picture and it is the wrong one at 145
 * by 100 pixels: four curves differing only in where they cross would read as
 * four identical squiggles, which is the failure the previous pass was
 * rejected for. The axis puts the whole difference between the four answers in
 * the one thing that differs.
 */
function phAxis(marker: number | null, extra: readonly FigureLabel[] = []): Figure {
  return {
    bonds: [
      { x1: 12, y1: 52, x2: 108, y2: 52 },
      { x1: 60, y1: 46, x2: 60, y2: 58 },
    ],
    labels: [
      { x: 12, y: 30, t: "pH", size: 13, anchor: "start" },
      { x: 60, y: 74, t: "7", size: 13 },
      ...(marker === null ? [] : [{ x: marker, y: 40, t: "▼", size: 15 }]),
      ...extra,
    ],
  };
}

/**
 * The epoxide of the ring opening question, with an arrow at whichever carbon
 * the option says the nucleophile lands on.
 *
 * 2,2-dimethyloxirane: the left ring carbon carries the two methyls, the right
 * one is the CH2, and the oxygen bridges them.
 */
function epoxideAttack(spec: {
  readonly nucleophile: string;
  /** Which ring carbon the arrow points at, or null for no attack at all. */
  readonly at: "substituted" | "unsubstituted" | null;
  readonly barred?: boolean;
}): Figure {
  const arrow: readonly FigureBond[] =
    spec.at === "substituted"
      ? [{ x1: 20, y1: 22, x2: 38, y2: 46, arrow: true }]
      : spec.at === "unsubstituted"
        ? [{ x1: 100, y1: 22, x2: 82, y2: 46, arrow: true }]
        : [{ x1: 20, y1: 22, x2: 38, y2: 46, arrow: true }];
  const bar: readonly FigureBond[] = spec.barred
    ? [
        { x1: 22, y1: 40, x2: 38, y2: 28 },
        { x1: 24, y1: 28, x2: 40, y2: 40 },
      ]
    : [];
  const tail =
    spec.at === "unsubstituted" ? { x: 108, y: 16, anchor: "end" as const } : { x: 12, y: 16, anchor: "start" as const };
  return {
    bonds: [
      { x1: 44, y1: 54, x2: 78, y2: 54 },
      { x1: 46, y1: 50, x2: 58, y2: 34 },
      { x1: 76, y1: 50, x2: 64, y2: 34 },
      // The two methyls on the substituted carbon.
      { x1: 44, y1: 54, x2: 26, y2: 64 },
      { x1: 44, y1: 54, x2: 40, y2: 76 },
      ...arrow,
      ...bar,
    ],
    labels: [
      { x: 61, y: 30, t: "O", size: 14 },
      { x: tail.x, y: tail.y, t: spec.nucleophile, size: 12, anchor: tail.anchor },
    ],
  };
}

/** Methyl acetate, with a ring round whichever methyl the option claims. */
function methylAcetate(rings: readonly FigureRing[]): Figure {
  return {
    bonds: [
      { x1: 22, y1: 62, x2: 44, y2: 48 },
      { x1: 44, y1: 44, x2: 44, y2: 26, order: 2 },
      { x1: 48, y1: 50, x2: 62, y2: 58 },
      { x1: 76, y1: 58, x2: 92, y2: 48 },
    ],
    labels: [
      { x: 44, y: 20, t: "O", size: 14 },
      { x: 69, y: 64, t: "O", size: 14 },
    ],
    rings,
  };
}

/* ------------------------------------------------------------------ */
/* The registry                                                        */
/* ------------------------------------------------------------------ */

/**
 * Every option of every choice question the placement walk can serve, drawn.
 *
 * The list is not editorial. `onboardingFigures.test.ts` drives the real quiz
 * machine over every claimed course and every answer pattern and collects the
 * problems it reaches; a key here with no corpus option, or a corpus option
 * with no key, fails that test.
 */
const FIGURES: Readonly<Record<string, Figure>> = Object.freeze({
  /* --- Stoichiometry: 2 Al + 3 Cl2 -> 2 AlCl3, one mole of each ---- */
  [key("gc1-stoich-limiting-choice", "chlorine")]: {
    labels: [
      { x: 60, y: 40, t: "3 Cl_2", size: 22 },
      { x: 60, y: 66, t: "1.00 mol", size: 12 },
    ],
  },
  [key("gc1-stoich-limiting-choice", "aluminium")]: {
    labels: [
      { x: 60, y: 40, t: "2 Al", size: 22 },
      { x: 60, y: 66, t: "1.00 mol", size: 12 },
    ],
  },
  [key("gc1-stoich-limiting-choice", "neither")]: {
    labels: [
      { x: 60, y: 36, t: "2 Al : 3 Cl_2", size: 17 },
      { x: 60, y: 64, t: "1.00 : 1.00", size: 14 },
    ],
  },
  [key("gc1-stoich-limiting-choice", "need-masses")]: {
    labels: [
      { x: 60, y: 42, t: "m = ?", size: 24 },
      { x: 60, y: 68, t: "grams", size: 12 },
    ],
  },

  /* --- Acetic acid titrated with hydroxide, pH at equivalence ------ */
  [key("gc2-titration-equivalence-ph", "above-7")]: phAxis(84),
  [key("gc2-titration-equivalence-ph", "exactly-7")]: phAxis(60),
  [key("gc2-titration-equivalence-ph", "below-7")]: phAxis(36),
  [key("gc2-titration-equivalence-ph", "depends-volume")]: phAxis(null, [
    { x: 60, y: 40, t: "V(NaOH)", size: 14 },
  ]),

  /* --- Which cation is present when methanol captures it ----------- */
  // 2-methylbutan-2-yl: the tertiary cation reached by a hydride shift.
  [key("org1-carbocation-hydride-shift", "tertiary-after-shift")]: {
    bonds: [
      { x1: 22, y1: 60, x2: 44, y2: 46 },
      { x1: 44, y1: 46, x2: 66, y2: 60 },
      { x1: 66, y1: 60, x2: 88, y2: 46 },
      { x1: 44, y1: 46, x2: 44, y2: 24 },
    ],
    labels: [{ x: 54, y: 40, t: "+", size: 17, anchor: "start" }],
  },
  // 3-methylbutan-2-yl: the secondary cation ionisation gives, unchanged.
  [key("org1-carbocation-hydride-shift", "secondary-unchanged")]: {
    bonds: [
      { x1: 16, y1: 60, x2: 38, y2: 46 },
      { x1: 38, y1: 46, x2: 60, y2: 60 },
      { x1: 60, y1: 60, x2: 82, y2: 46 },
      { x1: 60, y1: 60, x2: 60, y2: 80 },
    ],
    labels: [{ x: 46, y: 40, t: "+", size: 17, anchor: "start" }],
  },
  // A primary cation at the end of the chain.
  [key("org1-carbocation-hydride-shift", "primary")]: {
    bonds: [
      { x1: 24, y1: 62, x2: 46, y2: 48 },
      { x1: 46, y1: 48, x2: 68, y2: 62 },
      { x1: 68, y1: 62, x2: 90, y2: 48 },
      { x1: 46, y1: 48, x2: 46, y2: 26 },
    ],
    labels: [{ x: 96, y: 42, t: "+", size: 17, anchor: "start" }],
  },
  // No cation at all: methanol displaces the chloride in one step.
  [key("org1-carbocation-hydride-shift", "no-cation")]: {
    bonds: [{ x1: 34, y1: 48, x2: 86, y2: 48, arrow: true }],
    labels: [
      { x: 60, y: 30, t: "CH_3OH + R-Cl", size: 13 },
      { x: 60, y: 74, t: "R-OCH_3", size: 14 },
    ],
  },

  /* --- HBr on 2-methylbut-2-ene, no peroxides ---------------------- */
  // 2-bromo-2-methylbutane.
  [key("org1-hbr-markovnikov-major", "tertiary-bromide")]: {
    bonds: [
      { x1: 20, y1: 46, x2: 44, y2: 32 },
      { x1: 44, y1: 32, x2: 68, y2: 46 },
      { x1: 68, y1: 46, x2: 92, y2: 32 },
      { x1: 44, y1: 32, x2: 44, y2: 12 },
      { x1: 44, y1: 32, x2: 44, y2: 54 },
    ],
    labels: [{ x: 44, y: 72, t: "Br", size: 15 }],
  },
  // 2-bromo-3-methylbutane.
  [key("org1-hbr-markovnikov-major", "secondary-bromide")]: {
    bonds: [
      { x1: 16, y1: 46, x2: 38, y2: 32 },
      { x1: 38, y1: 32, x2: 60, y2: 46 },
      { x1: 60, y1: 46, x2: 82, y2: 32 },
      { x1: 60, y1: 46, x2: 60, y2: 68 },
      { x1: 38, y1: 32, x2: 38, y2: 16 },
    ],
    labels: [{ x: 38, y: 12, t: "Br", size: 15 }],
  },
  // 1-bromo-2-methylbutane.
  [key("org1-hbr-markovnikov-major", "primary-bromide")]: {
    bonds: [
      { x1: 30, y1: 56, x2: 52, y2: 42 },
      { x1: 52, y1: 42, x2: 74, y2: 56 },
      { x1: 74, y1: 56, x2: 96, y2: 42 },
      { x1: 30, y1: 56, x2: 22, y2: 38 },
      { x1: 52, y1: 42, x2: 52, y2: 20 },
    ],
    labels: [{ x: 20, y: 28, t: "Br", size: 15, anchor: "end" }],
  },

  /* --- C4H8O, 1715 sharp, nothing at 3200 to 3600 ------------------ */
  [key("org1-ir-carbonyl-identification", "butanone")]: {
    bonds: [
      { x1: 18, y1: 60, x2: 42, y2: 46 },
      { x1: 42, y1: 46, x2: 66, y2: 60 },
      { x1: 66, y1: 60, x2: 90, y2: 46 },
      { x1: 42, y1: 42, x2: 42, y2: 24 },
    ],
    labels: [{ x: 42, y: 18, t: "O", size: 15 }],
  },
  [key("org1-ir-carbonyl-identification", "butanol")]: {
    bonds: [
      { x1: 14, y1: 56, x2: 36, y2: 42 },
      { x1: 36, y1: 42, x2: 58, y2: 56 },
      { x1: 58, y1: 56, x2: 80, y2: 42 },
    ],
    labels: [{ x: 86, y: 48, t: "OH", size: 15, anchor: "start" }],
  },
  // But-3-en-1-ol: the double bond at the far end from the alcohol.
  [key("org1-ir-carbonyl-identification", "butenol")]: {
    bonds: [
      { x1: 14, y1: 56, x2: 36, y2: 42, order: 2 },
      { x1: 36, y1: 42, x2: 58, y2: 56 },
      { x1: 58, y1: 56, x2: 80, y2: 42 },
    ],
    labels: [{ x: 86, y: 48, t: "OH", size: 15, anchor: "start" }],
  },
  // Tetrahydrofuran: the five ring with the oxygen at the apex.
  [key("org1-ir-carbonyl-identification", "thf")]: {
    bonds: [
      { x1: 42, y1: 34, x2: 36, y2: 62 },
      { x1: 36, y1: 62, x2: 84, y2: 62 },
      { x1: 84, y1: 62, x2: 78, y2: 34 },
      { x1: 42, y1: 34, x2: 52, y2: 22 },
      { x1: 78, y1: 34, x2: 68, y2: 22 },
    ],
    labels: [{ x: 60, y: 22, t: "O", size: 15 }],
  },

  /* --- The amide's resonance contributors -------------------------- */
  [key("org1-resonance-major-contributor", "neutral")]: amide({
    co: 2,
    cn: 1,
    oLabel: "O",
    nLabel: "NH_2",
  }),
  [key("org1-resonance-major-contributor", "charge-separated")]: amide({
    co: 1,
    cn: 2,
    oLabel: "O^-",
    nLabel: "N^+H_2",
  }),
  [key("org1-resonance-major-contributor", "reversed-charges")]: amide({
    co: 2,
    cn: 1,
    oLabel: "O^+",
    nLabel: "N^-H_2",
  }),
  [key("org1-resonance-major-contributor", "open-sextet")]: amide({
    co: 1,
    cn: 1,
    oLabel: "O",
    nLabel: "NH_2",
    cLabel: "C^-",
  }),

  /* --- 3,3-dimethylbutan-2-ol with hot sulfuric acid ---------------- */
  // 2,3-dimethylbut-2-ene, the tetrasubstituted alkene.
  [key("org2-alcohol-dehydration-with-shift", "tetrasubstituted")]: {
    bonds: [
      { x1: 44, y1: 44, x2: 76, y2: 44, order: 2 },
      { x1: 44, y1: 44, x2: 44, y2: 22 },
      { x1: 44, y1: 44, x2: 22, y2: 58 },
      { x1: 76, y1: 44, x2: 76, y2: 22 },
      { x1: 76, y1: 44, x2: 98, y2: 58 },
    ],
  },
  // 3,3-dimethylbut-1-ene, the unrearranged terminal alkene.
  [key("org2-alcohol-dehydration-with-shift", "unrearranged")]: {
    bonds: [
      { x1: 14, y1: 56, x2: 36, y2: 42, order: 2 },
      { x1: 36, y1: 42, x2: 58, y2: 56 },
      { x1: 58, y1: 56, x2: 58, y2: 78 },
      { x1: 58, y1: 56, x2: 80, y2: 42 },
      { x1: 58, y1: 56, x2: 80, y2: 68 },
    ],
  },
  // 2,3-dimethylbut-1-ene, rearranged but terminal.
  [key("org2-alcohol-dehydration-with-shift", "rearranged-terminal")]: {
    bonds: [
      { x1: 16, y1: 56, x2: 38, y2: 42, order: 2 },
      { x1: 38, y1: 42, x2: 38, y2: 20 },
      { x1: 38, y1: 42, x2: 60, y2: 56 },
      { x1: 60, y1: 56, x2: 60, y2: 78 },
      { x1: 60, y1: 56, x2: 82, y2: 42 },
    ],
  },

  /* --- Buta-1,3-diene and one equivalent of HBr at -80 -------------- */
  // 3-bromobut-1-ene, the 1,2 adduct.
  [key("org2-diene-hbr-cold", "one-two")]: {
    bonds: [
      { x1: 16, y1: 50, x2: 38, y2: 36, order: 2 },
      { x1: 38, y1: 36, x2: 60, y2: 50 },
      { x1: 60, y1: 50, x2: 82, y2: 36 },
      { x1: 60, y1: 50, x2: 60, y2: 66 },
    ],
    labels: [{ x: 60, y: 80, t: "Br", size: 15 }],
  },
  // 1-bromobut-2-ene, the 1,4 adduct.
  [key("org2-diene-hbr-cold", "one-four")]: {
    bonds: [
      { x1: 30, y1: 44, x2: 48, y2: 56 },
      { x1: 48, y1: 56, x2: 70, y2: 42, order: 2 },
      { x1: 70, y1: 42, x2: 92, y2: 56 },
    ],
    labels: [{ x: 26, y: 40, t: "Br", size: 15, anchor: "end" }],
  },
  // 4-bromobut-1-ene: the proton went to the wrong terminus.
  [key("org2-diene-hbr-cold", "wrong-end")]: {
    bonds: [
      { x1: 12, y1: 50, x2: 34, y2: 36, order: 2 },
      { x1: 34, y1: 36, x2: 56, y2: 50 },
      { x1: 56, y1: 50, x2: 78, y2: 36 },
      { x1: 78, y1: 36, x2: 92, y2: 44 },
    ],
    labels: [{ x: 98, y: 50, t: "Br", size: 15, anchor: "start" }],
  },

  /* --- 2,2-dimethyloxirane in acidic methanol ---------------------- */
  [key("org2-epoxide-acid-opening-regiochemistry", "more-substituted")]: epoxideAttack({
    nucleophile: "CH_3OH",
    at: "substituted",
  }),
  [key("org2-epoxide-acid-opening-regiochemistry", "less-substituted")]: epoxideAttack({
    nucleophile: "CH_3OH",
    at: "unsubstituted",
  }),
  [key("org2-epoxide-acid-opening-regiochemistry", "no-reaction")]: epoxideAttack({
    nucleophile: "CH_3OH",
    at: null,
    barred: true,
  }),
  [key("org2-epoxide-acid-opening-regiochemistry", "counterion")]: epoxideAttack({
    nucleophile: "HSO_4^-",
    at: "substituted",
  }),

  /* --- tert-butyl methyl ether with one equivalent of cold HI ------- */
  [key("org2-ether-cleavage-tert-butyl-methyl", "tertiary-iodide")]: {
    labels: [
      { x: 60, y: 36, t: "(CH_3)_3C-I", size: 16 },
      { x: 60, y: 66, t: "+ CH_3OH", size: 14 },
    ],
  },
  [key("org2-ether-cleavage-tert-butyl-methyl", "methyl-iodide")]: {
    labels: [
      { x: 60, y: 36, t: "CH_3-I", size: 16 },
      { x: 60, y: 66, t: "+ (CH_3)_3COH", size: 14 },
    ],
  },
  [key("org2-ether-cleavage-tert-butyl-methyl", "alkene")]: {
    labels: [
      { x: 60, y: 36, t: "(CH_3)_2C=CH_2", size: 16 },
      { x: 60, y: 66, t: "+ CH_3OH", size: 14 },
    ],
  },

  /* --- A broad 2500 to 3300 band with a strong 1710 ---------------- */
  [key("org2-ir-region-identification", "carboxylic-acid")]: {
    bonds: [
      { x1: 26, y1: 60, x2: 48, y2: 46 },
      { x1: 48, y1: 42, x2: 48, y2: 24, order: 2 },
      { x1: 52, y1: 48, x2: 68, y2: 56 },
    ],
    labels: [
      { x: 48, y: 18, t: "O", size: 15 },
      { x: 74, y: 62, t: "OH", size: 15, anchor: "start" },
    ],
  },
  [key("org2-ir-region-identification", "alcohol")]: {
    bonds: [
      { x1: 22, y1: 58, x2: 44, y2: 44 },
      { x1: 44, y1: 44, x2: 66, y2: 58 },
    ],
    labels: [{ x: 72, y: 64, t: "OH", size: 15, anchor: "start" }],
  },
  [key("org2-ir-region-identification", "ketone")]: {
    bonds: [
      { x1: 18, y1: 62, x2: 42, y2: 48 },
      { x1: 42, y1: 48, x2: 66, y2: 62 },
      { x1: 66, y1: 62, x2: 90, y2: 48 },
      { x1: 42, y1: 44, x2: 42, y2: 26 },
    ],
    labels: [{ x: 42, y: 20, t: "O", size: 15 }],
  },
  [key("org2-ir-region-identification", "primary-amine")]: {
    bonds: [
      { x1: 20, y1: 58, x2: 42, y2: 44 },
      { x1: 42, y1: 44, x2: 64, y2: 58 },
    ],
    labels: [{ x: 70, y: 64, t: "NH_2", size: 15, anchor: "start" }],
  },

  /* --- But-1-ene with NBS under light ------------------------------ */
  [key("org2-nbs-allylic-two-products", "both-allylic")]: {
    labels: [
      { x: 60, y: 34, t: "CH_2=CH-CHBr-CH_3", size: 12 },
      { x: 60, y: 62, t: "BrCH_2-CH=CH-CH_3", size: 12 },
    ],
  },
  [key("org2-nbs-allylic-two-products", "one-allylic")]: {
    labels: [{ x: 60, y: 48, t: "CH_2=CH-CHBr-CH_3", size: 13 }],
  },
  [key("org2-nbs-allylic-two-products", "dibromide")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2-CHBr-CH_2Br", size: 12 }],
  },
  [key("org2-nbs-allylic-two-products", "markovnikov")]: {
    labels: [{ x: 60, y: 48, t: "CH_3-CHBr-CH_2CH_3", size: 13 }],
  },

  /* --- Methyl acetate: which methyl gives the 3.7 singlet ---------- */
  [key("org2-nmr-shift-methyl-ester", "o-methyl")]: methylAcetate([{ x: 92, y: 48, r: 15 }]),
  [key("org2-nmr-shift-methyl-ester", "acyl-methyl")]: methylAcetate([{ x: 22, y: 62, r: 15 }]),
  [key("org2-nmr-shift-methyl-ester", "indistinguishable")]: methylAcetate([
    { x: 92, y: 48, r: 15 },
    { x: 22, y: 62, r: 15 },
  ]),

  /* --- Chromium trioxide in aqueous acid: which survives ----------- */
  [key("org2-oxidation-substrate-rule", "tertiary-alcohol")]: {
    labels: [{ x: 60, y: 48, t: "(CH_3)_3C-OH", size: 17 }],
  },
  [key("org2-oxidation-substrate-rule", "secondary-alcohol")]: {
    labels: [{ x: 60, y: 48, t: "(CH_3)_2CH-OH", size: 17 }],
  },
  [key("org2-oxidation-substrate-rule", "primary-alcohol")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2CH_2-OH", size: 15 }],
  },
  [key("org2-oxidation-substrate-rule", "aldehyde")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2CH_2-CHO", size: 15 }],
  },

  /* --- Which departing group makes the collapse reversible --------- */
  [key("org2-pka-leaving-group-reversibility", "alkoxide")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2O^-", size: 19 }],
  },
  [key("org2-pka-leaving-group-reversibility", "amide-anion")]: {
    labels: [{ x: 60, y: 48, t: "(CH_3)_2N^-", size: 19 }],
  },
  [key("org2-pka-leaving-group-reversibility", "vinyl-anion")]: {
    labels: [{ x: 60, y: 48, t: "CH_2=CH^-", size: 19 }],
  },
  [key("org2-pka-leaving-group-reversibility", "carbanion")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2^-", size: 19 }],
  },

  /* --- Four hydrogens, one equivalent of strong base --------------- */
  [key("org2-pka-most-acidic-site", "alcohol-oh")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2O-H", size: 18 }],
  },
  [key("org2-pka-most-acidic-site", "alpha-ch")]: {
    labels: [{ x: 60, y: 48, t: "CH_3COCH_2-H", size: 17 }],
  },
  [key("org2-pka-most-acidic-site", "alkyne-ch")]: {
    labels: [{ x: 60, y: 48, t: "CH_3C≡C-H", size: 18 }],
  },
  [key("org2-pka-most-acidic-site", "amine-nh")]: {
    labels: [{ x: 60, y: 48, t: "(CH_3)_2N-H", size: 18 }],
  },

  /* --- C4H8O2, 1740 sharp, 2.0 singlet, 4.1 quartet, 1.2 triplet --- */
  [key("org2-structure-determination-c4h8o2", "ethyl-acetate")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CO-OCH_2CH_3", size: 14 }],
  },
  [key("org2-structure-determination-c4h8o2", "methyl-propanoate")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2CO-OCH_3", size: 14 }],
  },
  [key("org2-structure-determination-c4h8o2", "butanoic-acid")]: {
    labels: [{ x: 60, y: 48, t: "CH_3CH_2CH_2COOH", size: 14 }],
  },
  // 1,4-dioxane: the six ring with the two oxygens para to each other.
  [key("org2-structure-determination-c4h8o2", "dioxane")]: {
    bonds: [
      { x1: 36, y1: 30, x2: 52, y2: 20 },
      { x1: 68, y1: 20, x2: 84, y2: 30 },
      { x1: 84, y1: 30, x2: 84, y2: 56 },
      { x1: 84, y1: 56, x2: 68, y2: 66 },
      { x1: 52, y1: 66, x2: 36, y2: 56 },
      { x1: 36, y1: 56, x2: 36, y2: 30 },
    ],
    labels: [
      { x: 60, y: 22, t: "O", size: 14 },
      { x: 60, y: 70, t: "O", size: 14 },
    ],
  },
});

/**
 * The figure for one option, or null when the corpus has grown a question this
 * table has not been authored against.
 *
 * NULL IS A REAL RETURN AND THE TILE HANDLES IT, because a student meeting a
 * new corpus question must still be able to answer it. The tile falls back to
 * the option's own words and marks itself `data-visual="name"`, which is the
 * countable signal that the gap is there; the test is what stops that fallback
 * ever being what a student actually sees.
 */
export function figureFor(problemId: string, optionId: string): Figure | null {
  return FIGURES[key(problemId, optionId)] ?? null;
}

/** Every authored key, for the coverage test. Never read by the surface. */
export function figureKeys(): readonly string[] {
  return Object.keys(FIGURES);
}
