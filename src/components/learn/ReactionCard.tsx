import { MoleculeArt } from "@/components/ui/lesson-nav";
import { ReagentFormula, ReagentImage } from "@/components/ui/reagent-line";
import { labelShown } from "@/lib/reagentLabel";
import type { StagedReaction } from "@/data/reactions";
import type { WorkedScheme, WorkedStep } from "@/data/workedExamples";
import { stagedReagentSteps } from "@/game/cards/reactionCard";

/**
 * One reaction as a card (SITE-REPLAN.md section 3): the scheme drawn by RDKit,
 * starting material, the reagents on the arrow, product. Pressing it opens the
 * reaction sheet; the card itself has no state.
 *
 * Every molecule is a drawing from the generated data (`reaction.art` and the
 * reagent art in REAGENT_ART). No SMILES and no formula is printed where the
 * data has a drawing (owner, 27 Sep: "always draw it out in the skeletal
 * structure"; "also draw out the reagents in the reactions"). A reagent the
 * data carries no structure for is its bottle label, typeset. src/test/learn.test.ts
 * holds both lines.
 *
 * THE SCHEME IS SET LIKE A TEXTBOOK'S (Learn round 2): step 1 sits over the
 * arrow and any later steps under it, numbered when there is more than one.
 * Every drawing in the row shares one box height, so the reagent is drawn as
 * large as the starting material beside it rather than at a quarter of its size.
 *
 * LEARN ROUND 3: READABLE ON A PHONE. In the row, a phone drew each structure
 * 105px wide and its atom labels 6px tall. Below 768px the scheme is now one
 * column, starting material over a downward arrow over product, and each
 * structure takes up to its own 340px, the size RDKit drew it at: the smallest
 * atom label in any drawing is 11.9 units, so at 314px or wider every label is
 * 11px or taller. Reagents are 80px tall (their labels are 15.5 of 104 units).
 *
 * `context` is an optional line above the name (the search results use it for
 * "Unit 7 · Addition", so a hit says where it lives).
 *
 * LEARN ROUND 4: THE SCHEME SIZES ITSELF BY ITS OWN ROOM, NOT THE SCREEN. A
 * desktop drew the row into an 80px-tall box and atom labels came out 6px. The
 * row now appears only when the scheme itself is at least 820px wide (a CSS
 * container query, `.lrn-scheme` in learn.css), which is the width at which both
 * structures still get 314px, so every label stays 11px or taller. Narrower, it
 * is the phone's column, whatever the screen. The scheme is its own component,
 * `ReactionScheme`, because the lesson's worked examples draw the same thing.
 *
 * LEARN ROUND 6: EVERY WORKED EXAMPLE IS A SCHEME. An example the reaction data
 * does not hold is drawn from its own generated data (`WorkedScheme`, written by
 * scripts/match_worked_examples.py), which already lists its reagents as groups:
 * one group per step, and reagents that go in together (Ac2O and NaOH) side by
 * side in one group. A reaction from the data becomes one group per step.
 */
export function ReactionCard({
  reaction,
  onOpen,
  context,
}: {
  reaction: StagedReaction;
  onOpen: (id: string) => void;
  context?: string;
}) {
  return (
    <button
      type="button"
      id={`rx-${reaction.id}`}
      onClick={() => onOpen(reaction.id)}
      className="lrn-tap gap-3 p-4"
    >
      {context && <span className="lrn-eyebrow">{context}</span>}
      <span className="title-face text-base leading-tight font-extrabold text-[var(--bb-deep)]">
        {reaction.name}
      </span>
      <ReactionScheme reaction={reaction} />
      <span className="text-sm text-[var(--site-quiet)]">
        {reaction.reactant_labels.join(" + ")} to {reaction.product_label}
      </span>
    </button>
  );
}

/**
 * One reaction's scheme: starting material, the reagents on the arrow, product.
 * Column (start over a down arrow over product) until the scheme is 820px wide,
 * then the textbook row. Either way each structure is at most its own 340px and
 * at least 314px, so atom labels stay 11px or taller (learn.css, `.lrn-scheme`).
 */
export function ReactionScheme({ reaction }: { reaction: StagedReaction | WorkedScheme }) {
  // `"groups" in reaction` tells the two shapes apart (TypeScript narrows on it).
  const groups: readonly (readonly WorkedStep[])[] =
    "groups" in reaction ? reaction.groups : stagedReagentSteps(reaction).map((step) => [step]);
  const conditions = "conditions" in reaction ? reaction.conditions : "";
  const numbered = groups.length > 1;
  // S3 round 5: the product's count from the balanced equation (`balance_rhs`, checked by
  // RDKit), drawn as a coefficient: periodic acid cleavage gives 2 formaldehyde.
  const count = "balance_rhs" in reaction ? reaction.balance_rhs.filter((smi) => smi === reaction.product).length : 1;
  // A product of one or two heavy atoms (formaldehyde) fills the 340 canvas with one bond
  // and read as an equals sign at full size; drawn at 180px its O is still 11px tall.
  const tiny = "balance_rhs" in reaction && heavyAtoms(reaction.product) <= 2;
  const above = groups.slice(0, 1);
  const below = groups.slice(1);
  return (
    <span className="lrn-scheme">
      <span className="lrn-scheme-row">
        <MoleculeArt
          light={reaction.art.start_light}
          dark={reaction.art.start_dark}
          alt={`Structure of ${reaction.reactant_labels.join(" and ")}`}
          className={ART}
        />
        <span className="lrn-rg" data-reagents>
          <span data-slot="above" className="flex flex-col gap-1">
            {above.map((group) => (
              <Group key={group[0]!.label} group={group} n={numbered ? 1 : null} />
            ))}
          </span>
          {/* The arrow itself, drawn rather than an icon so it can run the full
              length of the reagents beside it: down in the column, across in the row. */}
          <span aria-label="gives" role="img" className="lrn-arrow-down">
            <span className="w-0.5 flex-1 bg-[var(--site-quiet)]" />
            <span className="size-0 border-x-[6px] border-t-[9px] border-x-transparent border-t-[var(--site-quiet)]" />
          </span>
          <span aria-label="gives" role="img" className="lrn-arrow-across">
            <span className="h-0.5 flex-1 bg-[var(--site-quiet)]" />
            <span className="size-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-[var(--site-quiet)]" />
          </span>
          <span data-slot="below" className="flex flex-col gap-1">
            {below.map((group, i) => (
              <Group key={group[0]!.label} group={group} n={i + 2} />
            ))}
            {/* The source's own words under its arrow that are not a reagent
                ("THF", "heat"), quiet, as a textbook sets conditions. */}
            {conditions && (
              <ReagentFormula label={conditions} className="min-w-[129px] text-center text-sm font-normal text-[var(--site-quiet)]" />
            )}
          </span>
        </span>
        <span className="flex w-full items-center justify-center">
          {count > 1 && (
            <span className="mr-1 font-[family-name:var(--site-display)] text-2xl font-black text-[var(--bb-deep)]">{count}</span>
          )}
          <MoleculeArt
            light={reaction.art.product_light}
            dark={reaction.art.product_dark}
            alt={`Structure of ${reaction.product_label}`}
            className={tiny ? ART_TINY : ART}
          />
        </span>
      </span>
    </span>
  );
}

/** Heavy atoms in a SMILES string: every element symbol, hydrogens excluded. */
function heavyAtoms(smiles: string): number {
  return (smiles.replace(/\[[^\]]*\]/g, "X").match(/Cl|Br|[BCNOSPFIX]|[bcnops]/g) ?? []).length;
}

/**
 * One structure of a reaction, drawn small (Learn round 5): the starting material
 * is a unit's picture (its tile on the index, its hub banner); the product is the
 * next step's (the Continue card, the card on the hub's path).
 *
 * LEARN ROUND 6: A THUMBNAIL IS ITS OWN DRAWING. Round 5 shrank the 340px drawing
 * into a 64px tile and atom labels came out 4.2 to 5.8px. The generator now also
 * draws each structure at 120 by 88 with its letters pinned (`*_thumb_*` art,
 * scripts/build_curriculum.py), so it is shown at that size or larger, never
 * smaller: 120 by 88, or `large`, 164 by 120. learn.test.ts measures the letters
 * in every thumbnail file and checks these two sizes.
 */
export function StructureThumb({
  reaction,
  side,
  large = false,
}: {
  reaction: StagedReaction;
  side: "start" | "product";
  large?: boolean;
}) {
  const start = side === "start";
  const art = reaction.art;
  return (
    <MoleculeArt
      light={start ? (art.start_thumb_light ?? art.start_light) : (art.product_thumb_light ?? art.product_light)}
      dark={start ? (art.start_thumb_dark ?? art.start_dark) : (art.product_thumb_dark ?? art.product_dark)}
      alt={`Structure of ${start ? reaction.reactant_labels.join(" and ") : reaction.product_label}`}
      className={`max-w-none shrink-0 object-contain ${large ? THUMB_LARGE : THUMB}`}
    />
  );
}

/** The thumbnail's drawn size (120 by 88), and the larger one (scaled up, never down). */
const THUMB = "h-[88px] w-[120px]";
const THUMB_LARGE = "h-[120px] w-[164px]";

/** A structure's box: its own drawn size (340px), or the scheme's width if that is less. */
const ART = "mx-auto h-auto w-full max-w-[340px] object-contain";
/** A one-bond molecule's box (see `tiny` in ReactionScheme). */
const ART_TINY = "h-auto w-full max-w-[180px] object-contain";

/**
 * One step on the arrow: its reagents, each its drawing, or its typeset label, or
 * both for a catalyst. Reagents that go in together stack in one column under
 * the one step number.
 */
function Group({ group, n }: { group: readonly WorkedStep[]; n: number | null }) {
  return (
    <span className="flex items-center gap-1">
      {n !== null && <span className="text-sm font-bold text-[var(--site-quiet)]">{n}.</span>}
      {/* 129px: a reagent drawing's width at 80px tall, so a typed step and a drawn
          one share one centred column (Learn round 5). */}
      <span className="flex min-w-[129px] flex-col items-center">
        {group.map((step) => (
          <span key={step.label} className="flex flex-col items-center">
            {step.art !== undefined && <ReagentImage art={step.art} label={step.label} name={step.name} className="h-20" />}
            {labelShown(step) && <ReagentFormula label={step.label} className="text-center text-sm leading-tight" />}
          </span>
        ))}
      </span>
    </span>
  );
}
