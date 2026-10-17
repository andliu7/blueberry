/**
 * ONE STAGE'S REAGENTS, DRAWN. The line three pages used to print as raw SMILES.
 *
 * THE OWNER'S RULE, 27 and 28 Sep, stated twice: "don't make a habit of making
 * the formula for the reagents. Always draw it out in the skeletal structure",
 * then "also draw out the reagents in the reactions - in the flashcards and in
 * the questions."
 *
 * WHAT THESE THREE PAGES WERE DOING, and it was worse than a formula. The
 * lessons row, the reactions index and the draw page each printed
 * `stage.reagents.join("  |  ")`, which is the raw authored array: a student
 * reading the Wittig saw `[CH2-][P+](c1ccccc1)(c1ccccc1)c1ccccc1`, and a
 * student reading imine formation saw `CN`, which reads as cyanide and is
 * methylamine. Three copies of one line, so one component replaces all three.
 *
 * THE CHEMISTRY IS DERIVED, NEVER ASSERTED. The drawing is an SVG RDKit
 * rendered from the reagent's own SMILES in scripts/build_curriculum.py, and
 * `REAGENT_ART` there is the registry of which tokens are structures at all.
 * A reagent the data does not draw shows its bottle label, typeset (subscripts,
 * charges, the system font), and nothing more: `PCC`, `H2CrO4`, `DIBALH`,
 * `Zn(Hg)`, `HCl` and the Grignard and Gilman organometallics.
 *
 * LEARN ROUND 2 (7 Oct): THE DRAWING IS THE LABEL. The bottle text used to sit
 * under every drawing in a monospace face, larger than the drawing itself, so
 * the formula was what a student read. It is now the drawing's alt text only,
 * and a stage prints text beside its drawing only when that text names a
 * different species (`LABEL_BESIDE_DRAWING`).
 *
 * No state, no clock, no chemistry of its own: it places what the data gives it.
 */

import type { ReactNode } from "react";
import { REAGENT_ART, type Stage } from "@/data/reactions";
import { REAGENT_NAMES } from "@/data/learnIndex";
import type { ReagentStep } from "@/game/cards/types";
import { stageReagentArt, stageReagentLabel } from "@/game/cards/reactionCard";
import { labelShown } from "@/lib/reagentLabel";

/**
 * A bottle label set the way a textbook sets it: digits after an element or a
 * closing bracket drop to subscripts, a trailing charge rises. "CH3MgBr" reads
 * CH₃MgBr, "(CH3)2CuLi" reads (CH₃)₂CuLi. Formatting only: the
 * characters are the data's, nothing is added or renamed.
 */
export function ReagentFormula({ label, className = "" }: { label: string; className?: string }) {
  const parts: ReactNode[] = [];
  const re = /(?<=[A-Za-z)])(\d+)|([+-])$/g;
  let last = 0;
  for (const m of label.matchAll(re)) {
    if (m.index > last) parts.push(label.slice(last, m.index));
    parts.push(m[1] !== undefined ? <sub key={m.index}>{m[1]}</sub> : <sup key={m.index}>{m[2]}</sup>);
    last = m.index + m[0].length;
  }
  if (last < label.length) parts.push(label.slice(last));
  // Learn round 5: a browser sets <sub> and <sup> at 0.75em, so the "3" in
  // CH3MgBr at 14px came out 10.5px, the smallest text on Learn. 12px is the floor.
  return (
    <span
      className={`font-sans font-semibold text-[var(--bb-deep)] [&_sub]:[font-size:max(12px,0.75em)] [&_sup]:[font-size:max(12px,0.75em)] ${className}`}
    >
      {parts}
    </span>
  );
}

/**
 * What a drawing is called, by the file it was drawn into: PubChem's title for
 * the drawn structure (src/data/learnIndex.ts, scripts/build_learn_index.py).
 * Learn round 3: the alt text used to be the bottle label, so a screen reader
 * read "CH3C#C-" as "C H 3 C number C minus".
 */
const NAME_BY_FILE: ReadonlyMap<string, string> = new Map(
  Object.entries(REAGENT_ART).flatMap(([token, d]) => {
    const name = REAGENT_NAMES[token];
    return name ? [d.light, d.dark].filter((f): f is string => f !== undefined).map((f) => [f, name] as const) : [];
  }),
);

/** The spoken name of a drawn reagent, or its bottle label if the index has none. */
export function reagentName(art: NonNullable<ReagentStep["art"]>, label: string): string {
  return NAME_BY_FILE.get(art.light ?? art.dark ?? "") ?? label;
}

/**
 * One reagent's RDKit drawing, both themes. Two images with one hidden per
 * theme rather than one swapped in JavaScript: RDKit writes literal colours
 * into the SVG and an <img> does not inherit CSS, so a CSS-only switch means
 * the right drawing is already decoded when the theme flips. The hidden one is
 * display:none, so a screen reader hears one alt: the reagent's name, in
 * either theme (both images carry it).
 *
 * `className` sets the height; the drawings are all 168 by 104 at one fixed
 * bond length, so one height draws every reagent at one scale. `name` is the
 * spoken name for a drawing the reagent index does not hold (a worked example's
 * own reagent, named by its generator; Learn round 6).
 */
export function ReagentImage({
  art,
  label,
  name,
  className,
}: {
  art: NonNullable<ReagentStep["art"]>;
  label: string;
  name?: string;
  className: string;
}) {
  const base = import.meta.env.BASE_URL;
  const alt = name ?? reagentName(art, label);
  return (
    <>
      {art.light !== undefined && (
        <img
          src={base + art.light}
          alt={alt}
          width={168}
          height={104}
          className={`w-auto max-w-full object-contain ${className} ${art.dark === undefined ? "" : "dark:hidden"}`}
        />
      )}
      {art.dark !== undefined && (
        <img
          src={base + art.dark}
          alt={alt}
          width={168}
          height={104}
          className={`w-auto max-w-full object-contain ${className} ${art.light === undefined ? "" : "hidden dark:block"}`}
        />
      )}
    </>
  );
}

/**
 * One stage's reagent: its drawing 80px tall (the reaction cards' size), or
 * its typeset bottle label, in one centred column.
 */
export function StageReagents({ stage }: { readonly stage: Stage }) {
  const step: ReagentStep = (() => {
    const art = stageReagentArt(stage);
    return { label: stageReagentLabel(stage), ...(art === undefined ? {} : { art }) };
  })();

  // Nothing to say. A stage whose every token is a structure the registry does
  // not draw says less rather than printing a SMILES at a student.
  if (step.label.length === 0 && step.art === undefined) return null;

  // Learn round 5: one column for every row. RDKit centres a drawing in its own
  // 168 by 104 canvas, so a drawing could never start at a typed label's left
  // edge; instead both sit centred in one 129px column (the drawing's width at
  // 80px tall), and a list of them reads as one column, not a stagger. 80px
  // tall keeps the reagent's letters at the cards' size and closes the gap a
  // 104px drawing left between rows.
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {step.art !== undefined && <ReagentImage art={step.art} label={step.label} className="h-20" />}
      {labelShown(step) && step.label.length > 0 && (
        <ReagentFormula label={step.label} className="inline-block min-w-[129px] text-center text-base" />
      )}
    </div>
  );
}
