/**
 * Unit 2 "energy diagrams and equilibrium" lesson, a DRAFT for the owner's review (energy-keq piece,
 * 29 Oct 2026, round 2). Hand-authored in TypeScript, unlike u2tools/pools.ts which a script writes,
 * because every answer is DERIVED at load time from energy/energyModel.ts (Keq window, free energy,
 * rate ratio, the path walk) and from the course pKa table in packages/curriculum pka.ts. No number
 * in a stem or an answer is typed twice.
 *
 * ROUND 2: every question is tied to a drawn, real reaction. The skeletal structures come from
 * figures.generated.ts (scripts/u2_energy_figures.py: RDKit layout, OPSIN-checked names, atom and
 * charge balance, conjugate acids protonated by RDKit). The pKa to Keq questions name the acid, the
 * stated base and the acid formed, and draw all four species. Kinetic versus thermodynamic control
 * is taught on HBr plus 1,3-butadiene and on the two enolates of 2-methylcyclohexanone. Some
 * questions ask the student to READ the diagram (the numbers are on the drawing, not in the stem).
 *
 * pKa to Keq questions are TYPED (round 4) on the student's OWN calculator. The app has none, on
 * purpose: the exam has none built in either. No answer tiles, so a tile cannot be guessed.
 */
import { pkaEntry, type PkaSiteId } from "@blueberry/curriculum";
import type { BeatOption, McqBeat, MasteryLevel } from "../../beats/types";
import type { PoolEntry, UnitPools } from "../u1/types";
import {
  KCAL_PER_DECADE,
  SCENARIOS,
  classifyKeq,
  deltaGFromKeq,
  forwardBarrier,
  keqFromDeltaG,
  keqFromPkas,
  rateRatio,
  reverseBarrier,
  sciText,
  singleStep,
  stepDeltaG,
  type EnergyProfile,
} from "../../energy/energyModel";
import type { ReactionItem } from "../../energy/ReactionRow";
import type { KeqTypedSpec } from "../../energy/keqTypedSpec";
import { U2E_BUTADIENE, U2E_CASES, U2E_ENOLATE, type GenSpecies } from "./figures.generated";

export const U2E_NODE = "u2-energy";

export interface EnergyVisual {
  readonly profiles: readonly EnergyProfile[];
  readonly label: string;
  readonly numbers?: boolean;
  /** Show the energy of each hump, so a barrier is a difference of two printed numbers. */
  readonly tsNumbers?: boolean;
  readonly range?: readonly [number, number];
  /** The real reaction in skeletal structures, drawn above the diagram. */
  readonly reaction?: readonly ReactionItem[];
  /** Skip the diagram (a question about the structures themselves). */
  readonly hideDiagram?: boolean;
  /** The diagram shows the shape only; no value on it was measured. */
  readonly sketch?: boolean;
}

const VISUALS: Record<string, EnergyVisual> = {};
const entries: PoolEntry[] = [];
let counter = 0;

interface Spec {
  readonly id: string;
  readonly levels: readonly MasteryLevel[];
  readonly prompt: string;
  readonly brief: string;
  readonly correct: { readonly text: string; readonly why: string };
  readonly wrong: readonly [{ readonly text: string; readonly why: string }, { readonly text: string; readonly why: string }];
  readonly visual: EnergyVisual;
  readonly explanation: string;
  readonly provenance: string;
}

function add(spec: Spec): void {
  const slot = counter % 3;
  counter += 1;
  const ordered = [...spec.wrong];
  ordered.splice(slot, 0, spec.correct as (typeof ordered)[number]);
  const ids = ["a", "b", "c"];
  const options: BeatOption[] = ordered.map((o, i) => ({ id: ids[i]!, text: o.text, why: o.why }));
  const beat: McqBeat = {
    kind: "mcq",
    id: spec.id,
    node: U2E_NODE,
    conceptIds: [U2E_NODE],
    levels: spec.levels,
    prompt: spec.prompt,
    brief: spec.brief,
    correctOptionId: ids[slot]!,
    options,
  };
  VISUALS[spec.id] = spec.visual;
  entries.push({
    id: spec.id,
    item: { kind: "mcq", beat },
    explanation: spec.explanation,
    provenance: spec.provenance,
    placeholder: true,
  });
}

const DERIVED = "src/game/energy/energyModel.ts: every number is computed (Keq = 10^(-dG / 1.364) at 298 K; reversible window 1e-7 to 1e7, the owner's rule).";
const STRUCT = "Structures: scripts/u2_energy_figures.py (RDKit layout, OPSIN names, atom and charge balance).";
const SCEN = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const r1 = (n: number) => Math.round(n * 10) / 10;
const minus = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `${n}`);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const plain = (s: GenSpecies): GenSpecies => ({ name: s.name, figure: s.figure });

/* ----------------------------- a real acid-base step ----------------------------- */

export interface CaseInfo {
  readonly id: string;
  readonly acid: GenSpecies;
  readonly base: GenSpecies;
  readonly conjBase: GenSpecies;
  readonly conjAcid: GenSpecies;
  readonly usedPka: number;
  readonly formedPka: number;
  readonly gap: number;
  readonly keq: number;
  readonly dG: number;
  readonly row: readonly ReactionItem[];
}

export function caseInfo(id: string): CaseInfo {
  const c = U2E_CASES[id];
  if (c === undefined) throw new Error(`no generated case ${id}`);
  const used = pkaEntry(c.acidSite as PkaSiteId).pka;
  const formed = pkaEntry(c.formedSite as PkaSiteId).pka;
  const keq = keqFromPkas(formed, used);
  return {
    id,
    acid: c.acid,
    base: c.base,
    conjBase: c.conjBase,
    conjAcid: c.conjAcid,
    usedPka: used,
    formedPka: formed,
    gap: r1(formed - used),
    keq,
    dG: deltaGFromKeq(keq),
    row: [c.acid, "+", c.base, "⇌", c.conjBase, "+", c.conjAcid],
  };
}

/** The sentence every pKa question opens with: acid, stated base, acid formed, both pKa values. */
export function setup(c: CaseInfo): string {
  return `${cap(c.acid.name)} (pKa ${c.usedPka}) meets ${c.base.name}, which gives ${c.conjBase.name} and ${c.conjAcid.name} (pKa ${c.formedPka}).`;
}

/** A diagram for a case, drawn from the pKa gap. Drop the decimals when the numbers must be read. */
export function caseProfile(c: CaseInfo, whole: boolean): EnergyProfile {
  const dG = whole ? Math.round(c.dG) : r1(c.dG);
  return singleStep(dG, whole && dG > 0 ? dG + 4 : Math.max(dG, 0) + 6);
}

/* ----------------------------- meet it (level 0) ----------------------------- */

{
  const c = caseInfo("acetic-bicarbonate");
  add({
    id: "u2e-meet-window",
    levels: [0],
    prompt: `${cap(c.acid.name)} gives its proton to ${c.base.name}. Keq is near ${sciText(c.keq)}. Does it run both ways.`,
    brief: "Keq between 10⁻⁷ and 10⁷ means some product turns back into reactant.",
    correct: { text: "Yes, both ways", why: `Keq of about ${sciText(c.keq)} is inside the window, so the reverse step still happens. You get a mixture, mostly product.` },
    wrong: [
      { text: "No, forward only", why: `Forward only needs Keq above 10⁷, a fall of more than about 9.5 kcal/mol. This one falls ${r1(-c.dG)}.` },
      { text: "No, backward only", why: "The step falls, so the product is the lower side. Backward only would need a Keq far below one." },
    ],
    visual: { profiles: [caseProfile(c, false)], label: `${cap(c.acid.name)} plus ${c.base.name}`, reaction: c.row },
    explanation: `The acid formed, ${c.conjAcid.name}, has pKa ${c.formedPka}, so the gap is ${c.gap} and Keq is ${sciText(c.keq)}. That is inside the 10⁻⁷ to 10⁷ window, so the step runs both ways.`,
    provenance: `${DERIVED} ${STRUCT} pKa from packages/curriculum pka.ts.`,
  });
}

{
  const c = caseInfo("acetone-hydroxide");
  const dG = Math.round(c.dG);
  add({
    id: "u2e-meet-deadend",
    levels: [0],
    prompt: `${cap(c.acid.name)} plus ${c.base.name} climbs to the enolate, with no step beyond it. What does the enolate do.`,
    brief: `The climb is only ${dG} kcal/mol, far inside the window, so the step runs both ways.`,
    correct: { text: "Goes back to acetone", why: "The step is reversible and the enolate has nowhere to go. It is a dead end, and the reaction returns to acetone to try again." },
    wrong: [
      { text: "Stays as the enolate for good", why: "A step this small is reversible, so the enolate cannot be trapped. It goes back over the same hump." },
      { text: "Goes on to a product", why: "The enolate has no step on in this diagram. The only way out is back." },
    ],
    visual: { profiles: [singleStep(dG, dG + 4)], label: "Acetone plus hydroxide climbing to the enolate", reaction: c.row },
    explanation: "A reversible step can lead to a dead end. The reaction visits the enolate and comes back, which costs time and nothing else.",
    provenance: `${DERIVED} ${STRUCT} pKa ${c.usedPka} for the ketone C-H and ${c.formedPka} for water, from packages/curriculum pka.ts.`,
  });
}

{
  const hydroxide = caseInfo("butyne-hydroxide");
  const amide = caseInfo("butyne-amide");
  const up = Math.round(hydroxide.dG);
  const down = Math.round(amide.dG);
  add({
    id: "u2e-meet-door",
    levels: [0],
    prompt: "Two bases try 1-butyne. Which one gives a one way door.",
    brief: "A step that falls more than about 9.5 kcal/mol has a Keq above 10⁷.",
    correct: { text: `Amide ion, a fall of ${Math.abs(down)}`, why: `A fall of ${Math.abs(down)} kcal/mol is a Keq near ${sciText(amide.keq)}. Outside the window, so butynide does not go back.` },
    wrong: [
      { text: `Hydroxide, a climb of ${up}`, why: `Hydroxide climbs, so butynide would turn straight back. Keq is ${sciText(hydroxide.keq)}, nowhere near a door.` },
      { text: "Neither, both reverse", why: `The amide step falls ${Math.abs(down)} kcal/mol. That is far past the window.` },
    ],
    visual: {
      profiles: [singleStep(up, up + 6), singleStep(down, 6)],
      label: "1-butyne with hydroxide (violet) and with amide ion (amber)",
      reaction: amide.row,
    },
    explanation: "Once an irreversible step is taken the reaction follows that path down the energy graph and does not come back up it.",
    provenance: `${DERIVED} ${STRUCT} pKa ${amide.usedPka} for a terminal alkyne, ${amide.formedPka} for ammonia and ${hydroxide.formedPka} for water, from packages/curriculum pka.ts.`,
  });
}

/* ----------------------------- graded (level 1) ----------------------------- */

for (const [n, id] of (["ammonium-hydroxide", "butyne-hydroxide", "acetic-hydroxide"] as const).entries()) {
  const c = caseInfo(id);
  const cls = classifyKeq(c.keq);
  const both = "Runs both ways";
  const fwd = "Goes one way, forward";
  const back = "Barely goes: one way, back";
  const text = cls === "reversible" ? both : cls === "one-way-forward" ? fwd : back;
  const others = [both, fwd, back].filter((t) => t !== text) as [string, string];
  add({
    id: `u2e-window-${n + 1}`,
    levels: [1],
    prompt: `${setup(c)} Keq is about ${sciText(c.keq)}. What does that say.`,
    brief: "Compare Keq with the window, 10⁻⁷ to 10⁷.",
    correct: {
      text,
      why:
        cls === "reversible"
          ? "Inside the window, so both directions happen and you get a mixture."
          : cls === "one-way-forward"
            ? "Above 10⁷ the product is so far downhill that it does not come back."
            : "Below 10⁻⁷ the product sits so far uphill that this step barely starts.",
    },
    wrong: [
      { text: others[0], why: "Check the exponent against 7 and −7. That tells you which of the three it is." },
      { text: others[1], why: "Check the exponent against 7 and −7. That tells you which of the three it is." },
    ],
    visual: { profiles: [caseProfile(c, false)], label: `${cap(c.acid.name)} plus ${c.base.name}`, reaction: c.row },
    explanation: `Keq ${sciText(c.keq)} corresponds to a free energy change of ${r1(c.dG)} kcal/mol. The window is 10⁻⁷ to 10⁷, about ±9.5 kcal/mol.`,
    provenance: `${DERIVED} ${STRUCT} pKa ${c.usedPka} and ${c.formedPka} from packages/curriculum pka.ts.`,
  });
}

/* Reading the diagram: the numbers are on the drawing, not in the stem. */
{
  const c = caseInfo("phenol-hydroxide");
  const p = caseProfile(c, true);
  const dG = stepDeltaG(p, 0);
  add({
    id: "u2e-read-dg",
    levels: [1],
    prompt: "Read the diagram. What is the free energy change, ΔG, of this step.",
    brief: "ΔG is the product level minus the reactant level, not the hump.",
    correct: { text: `${minus(dG)} kcal/mol`, why: `The product sits at ${minus(p.states[1]!.energy)} and the reactant at 0, so ΔG is ${minus(dG)}. A negative ΔG means the step is downhill.` },
    wrong: [
      { text: `${minus(-dG)} kcal/mol`, why: "This is the right size with the sign turned round. The product is lower than the reactant, so ΔG is negative." },
      { text: `${minus(p.ts[0]!)} kcal/mol`, why: "This reads the top of the hump. That is the barrier, which sets the speed, not ΔG." },
    ],
    visual: { profiles: [p], label: "Phenol plus hydroxide, drawn from the pKa gap and rounded", reaction: c.row, tsNumbers: true },
    explanation: `ΔG = product − reactant = ${minus(dG)} kcal/mol. The hump (${p.ts[0]}) is the barrier.`,
    provenance: `${DERIVED} ${STRUCT} Diagram drawn from the pKa gap (${c.usedPka} to ${c.formedPka}), rounded to whole kcal/mol.`,
  });
}

{
  const c = caseInfo("acetone-hydroxide");
  const p = caseProfile(c, true);
  const fwd = forwardBarrier(p, 0);
  const rev = reverseBarrier(p, 0);
  const dG = stepDeltaG(p, 0);
  add({
    id: "u2e-read-barrier",
    levels: [1],
    prompt: "Read the diagram. What is the forward barrier for acetone losing its proton.",
    brief: "A barrier is the hump minus the level you start from.",
    correct: { text: `${fwd} kcal/mol`, why: `The hump is at ${p.ts[0]} and the reactants start at 0, so the forward barrier is ${fwd}.` },
    wrong: [
      { text: `${dG} kcal/mol`, why: "This is the gap between the two wells, ΔG. A barrier is measured up to the hump." },
      { text: `${rev} kcal/mol`, why: "This is the reverse barrier, the hump minus the product level. The question asks about the forward step." },
    ],
    visual: { profiles: [p], label: "Acetone plus hydroxide, drawn from the pKa gap and rounded", reaction: c.row, tsNumbers: true },
    explanation: `Forward barrier = hump − reactant = ${p.ts[0]} − 0 = ${fwd}. Reverse barrier = ${p.ts[0]} − ${p.states[1]!.energy} = ${rev}, so the enolate falls back faster than it forms.`,
    provenance: `${DERIVED} ${STRUCT} Diagram drawn from the pKa gap (${c.usedPka} to ${c.formedPka}), rounded to whole kcal/mol.`,
  });
  add({
    id: "u2e-read-reverse",
    levels: [1],
    prompt: "Same diagram. Which way is crossed more often, and why.",
    brief: "The lower hump is crossed more often.",
    correct: { text: `Back to acetone: its barrier is ${rev}, against ${fwd}`, why: `Going back climbs ${rev}, going forward climbs ${fwd}. The lower hump is crossed more often.` },
    wrong: [
      { text: `Forward: its barrier is ${fwd}`, why: `${fwd} is the taller hump. The taller hump is crossed less often.` },
      { text: "Both equally, the diagram is symmetric", why: "The two humps differ because the product sits higher than the reactant." },
    ],
    visual: { profiles: [p], label: "Acetone plus hydroxide, drawn from the pKa gap and rounded", reaction: c.row, tsNumbers: true },
    explanation: "A product that sits higher than the reactant has the smaller reverse barrier, so the reaction slides back faster than it goes on. That is the same fact as Keq below one.",
    provenance: `${DERIVED} ${STRUCT}`,
  });
}

add({
  id: "u2e-first-door",
  levels: [1],
  prompt: "A to B climbs 4. B to C falls 20. Where does the reaction end up.",
  brief: "Reversible steps shuffle. The first irreversible step is a one way door.",
  correct: { text: "At C, after some trips back to A", why: "A to B can reverse, but B to C falls 20 kcal/mol, past the window. Once through, the reaction does not return." },
  wrong: [
    { text: "At A, where it started", why: "A is the start, not the lowest point. The reaction keeps trying until the step to C is taken." },
    { text: "At B, stuck", why: "B is higher than A and has a much lower exit. It does not stay." },
  ],
  visual: { profiles: SCEN("dead-end").profiles, label: "A, B and C" },
  explanation: "Reversible steps run back and forth. When an irreversible step is reached the reaction follows that path down the energy graph.",
  provenance: DERIVED,
});

add({
  id: "u2e-side-deadend",
  levels: [1],
  prompt: "From A, one route climbs 5 to B. Another falls 25 to C. Which is the dead end.",
  brief: "A dead end can be entered and has no way on.",
  correct: { text: "B", why: "B is reached by a reversible step and nothing leaves it except back to A. C is the product." },
  wrong: [
    { text: "C", why: "C falls 25 kcal/mol, so it does not reverse. It is where the reaction ends, not a dead end." },
    { text: "A", why: "A is the start and has two exits. It is not a dead end." },
  ],
  visual: {
    profiles: [
      { states: [{ id: "A", label: "A", energy: 0 }, { id: "B", label: "B", energy: 5 }], ts: [12] },
      { states: [{ id: "A", label: "A", energy: 0 }, { id: "C", label: "C", energy: -25 }], ts: [15] },
    ],
    label: "A with a dead end B and a product C",
  },
  explanation: "B costs the reaction a little time and is left the way it came. C is irreversible, so the reaction ends there.",
  provenance: DERIVED,
});

/* ----------------------------- kinetic versus thermodynamic, on real reactions ----------------------------- */

const BD = U2E_BUTADIENE;
const BD_ROW: readonly ReactionItem[] = [BD.diene!, "+", BD.hbr!, "→", BD.kinetic, "or", BD.thermo];
const SKETCH = "Shape from the textbook experiment (OpenStax Organic Chemistry 14.2, NEEDS OWNER CHECK: the temperatures and the proportions); no energy on the diagram was measured.";

add({
  id: "u2e-kinetic-cold",
  levels: [1],
  prompt: "HBr adds to 1,3-butadiene at 0 °C and mostly the 1,2 product forms. Why is that the one collected.",
  brief: "Cold, and neither product can be undone, so the speed of getting there decides.",
  correct: { text: "It forms over the lower hump and the cold mixture cannot undo it", why: "Nothing reverses, so the product made first is the product kept. That is kinetic control." },
  wrong: [
    { text: "It sits in the deeper well", why: "The deeper well wins only when steps can run backwards and let the material settle. The 1,4 product is the more stable one." },
    { text: "Both products form in equal amounts", why: "The two humps differ, so the split is not equal. The lower hump is crossed far more often." },
  ],
  visual: { profiles: SCEN("control").profiles, label: "Two products from one reactant, a low hump to the 1,2 product and a high hump to the 1,4 product", reaction: BD_ROW, numbers: false, sketch: true },
  explanation: "Cold and irreversible: the product over the lower hump (kinetic) wins. For HBr and butadiene that is the 1,2 product.",
  provenance: `${STRUCT} ${SKETCH}`,
});

add({
  id: "u2e-thermo-warm",
  levels: [1],
  prompt: "Warm the same reaction to 40 °C and mostly the 1,4 product forms. Which collects the material, and why.",
  brief: "Warm enough for the 1,2 product to climb back out over its hump.",
  correct: { text: "The deeper well: every step can reverse, so material settles into the 1,4 product", why: "Every step can reverse, so material keeps trading places until the lowest well holds most of it. That is thermodynamic control." },
  wrong: [
    { text: "The product that formed first", why: "It formed first but is not locked in. Warm, it can climb back out." },
    { text: "The reactant", why: "Both products are downhill from the reactant, so most of the material ends up as product." },
  ],
  visual: { profiles: SCEN("control-warm").profiles, label: "A reversible 1,2 product and a slightly deeper 1,4 product", reaction: BD_ROW, numbers: false, sketch: true },
  explanation: "Warm and reversible: the deeper well (thermodynamic) wins.",
  provenance: `${STRUCT} ${SKETCH}`,
});

add({
  id: "u2e-bd-which",
  levels: [1],
  prompt: "Which butadiene product has the more substituted double bond, and so sits in the deeper well.",
  brief: "Count the carbons on the C=C. More substituted is more stable.",
  correct: { text: "1-bromobut-2-ene", why: `Its C=C carries ${BD.alkeneSubstituents.thermo} carbon groups, against ${BD.alkeneSubstituents.kinetic} for 3-bromobut-1-ene, so it is the more stable and the thermodynamic product.` },
  wrong: [
    { text: "3-bromobut-1-ene", why: `Its C=C is at the end of the chain with only ${BD.alkeneSubstituents.kinetic} carbon group on it, so it is the less stable of the two.` },
    { text: "They are equally stable", why: "One double bond is internal and the other is terminal. Internal is the more substituted and more stable." },
  ],
  visual: { profiles: SCEN("control").profiles, label: "The two HBr products of butadiene", reaction: [plain(BD.kinetic), "or", plain(BD.thermo)], hideDiagram: true },
  explanation: "The more substituted alkene is the more stable one, so the 1,4 product sits in the deeper well and is the thermodynamic product.",
  provenance: `${STRUCT} Substitution counted by RDKit on each C=C. Which alkene is more stable is textbook (OpenStax Organic Chemistry 7.6).`,
});

{
  const lda = pkaEntry("amine_nh").pka;
  const ketone = pkaEntry("ketone_alpha_ch").pka;
  const keq = keqFromPkas(lda, ketone);
  const eRow: readonly ReactionItem[] = [plain(U2E_ENOLATE.ketone!), "→", plain(U2E_ENOLATE.kinetic), "or", plain(U2E_ENOLATE.thermo)];
  add({
    id: "u2e-enolate-lda",
    levels: [1],
    prompt: `LDA (its conjugate acid, an amine N-H, has pKa ${lda}) deprotonates a ketone (pKa ${ketone}). Which enolate, and why.`,
    brief: `Keq is about ${sciText(keq)}, outside the window.`,
    correct: { text: "The less substituted one: the step is a one way door, so speed decides", why: `Keq of ${sciText(keq)} is far past the window, so the first enolate formed stays. The more accessible, less substituted C-H is removed fastest. That is the kinetic enolate.` },
    wrong: [
      { text: "The more substituted one, as it is more stable", why: "Stability decides only when the step can reverse. With LDA it cannot." },
      { text: "Equal amounts of each", why: "The two C-H bonds are removed at different speeds, and nothing reverses to even them out." },
    ],
    visual: { profiles: [singleStep(Math.round(deltaGFromKeq(keq)), 6)], label: "A ketone deprotonated by LDA, a large fall", reaction: eRow },
    explanation: "An irreversible deprotonation gives the kinetic enolate: the product made fastest, kept.",
    provenance: `${STRUCT} Keq from the course pKa table (amine_nh ${lda}, ketone_alpha_ch ${ketone}). The less substituted enolate forming faster with a bulky base is textbook (OpenStax Organic Chemistry 22.5, NEEDS OWNER CHECK).`,
  });
}

/* ----------------------------- harder (level 2): own calculator ----------------------------- */

const CALC = ["acetic-hydroxide", "phenol-hydroxide", "acetic-bicarbonate", "ethanol-hydroxide", "acetone-hydroxide", "butyne-amide"] as const;

/*
 * ROUND 4: these are TYPED, not multiple choice. A student who picks a tile has not worked the
 * calculation, and the professor-emphasised skill is computing Keq = 10^(pKa formed - pKa used) on
 * their own calculator. Part 1 types the exponent, part 2 types Keq as a number times a power of ten
 * (energy/KeqTypedQuestion.tsx). Marked by energyModel.ts, within a factor of about 1.4.
 */
for (const id of CALC) {
  const c = caseInfo(id);
  const spec: KeqTypedSpec = {
    id: `u2e-calc-${id}`,
    acidName: c.acid.name,
    baseName: c.base.name,
    conjAcidName: c.conjAcid.name,
    usedPka: c.usedPka,
    formedPka: c.formedPka,
    gap: c.gap,
    row: c.row,
    profile: caseProfile(c, false),
  };
  VISUALS[spec.id] = { profiles: [spec.profile], label: "The energy diagram this Keq implies", reaction: c.row, numbers: false };
  entries.push({
    id: spec.id,
    item: { kind: "keqTyped", question: spec },
    explanation: `Keq = 10^(${c.formedPka} − ${c.usedPka}) = 10^${c.gap} = ${sciText(c.keq)}. ${classifyKeq(c.keq) === "reversible" ? "Inside the window, so the step runs both ways." : classifyKeq(c.keq) === "one-way-forward" ? "Past 10⁷, so the step is effectively one way." : "Below 10⁻⁷, so the step is effectively one way back."}`,
    provenance: `pKa values read from packages/curriculum pka.ts (${c.usedPka}, ${c.formedPka}); Keq computed by keqFromPkas and marked by checkExponent / checkSciKeq. ${STRUCT} Class values, taught to one or two figures.`,
    placeholder: true,
  });
}

{
  const c = caseInfo("phenol-hydroxide");
  const p = caseProfile(c, true);
  const dG = stepDeltaG(p, 0);
  const keq = keqFromDeltaG(dG);
  add({
    id: "u2e-read-keq",
    levels: [2],
    prompt: "Read ΔG off the diagram. Keq for this step is about.",
    brief: "Use your own calculator: Keq = 10^(−ΔG / 1.364), with ΔG in kcal/mol.",
    correct: { text: sciText(keq), why: `ΔG is ${minus(dG)}. Divide by 1.364 and flip the sign to get ${r1(-dG / KCAL_PER_DECADE)}, so Keq is 10 to that power, ${sciText(keq)}.` },
    wrong: [
      { text: sciText(1 / keq), why: "This is the right size with the sign turned round. A negative ΔG is a Keq above one." },
      { text: sciText(10 ** -dG), why: "This forgets to divide by 1.364. Every 1.364 kcal/mol is a factor of ten, not every 1." },
    ],
    visual: { profiles: [p], label: "Phenol plus hydroxide, drawn from the pKa gap and rounded", reaction: c.row, tsNumbers: true },
    explanation: `Keq = 10^(8 / 1.364) = ${sciText(keq)}. The pKa gap gave the same answer to within rounding: ${sciText(c.keq)}.`,
    provenance: `${DERIVED} ${STRUCT}`,
  });
}

{
  const gapKcal = 6;
  const ratio = rateRatio(gapKcal);
  add({
    id: "u2e-rate-gap",
    levels: [2],
    prompt: "Suppose the humps to the butadiene 1,2 and 1,4 products were 8 and 14 kcal/mol. About how much faster is the lower one.",
    brief: "Every 1.36 kcal/mol of barrier is a factor of ten in rate. Use your own calculator.",
    correct: { text: sciText(ratio), why: `The gap is ${gapKcal}. Divide by 1.364 to get ${(gapKcal / KCAL_PER_DECADE).toFixed(2)} factors of ten, so the lower hump is crossed ${sciText(ratio)} times as often.` },
    wrong: [
      { text: sciText(10 ** gapKcal), why: "This treats each kcal/mol as a factor of ten. A factor of ten is 1.364 kcal/mol." },
      { text: sciText(14 / 8), why: "This divides the barriers. The rate depends on their difference, in steps of 1.364 kcal/mol." },
    ],
    visual: { profiles: SCEN("control").profiles, label: "A low hump and a high hump from one reactant", reaction: BD_ROW, tsNumbers: false },
    explanation: "Rate ratio is 10 to the power (barrier gap / 1.364). It is why a small gap in barrier height is a large gap in speed.",
    provenance: `${DERIVED} ${STRUCT} The 8 and 14 are a model, stated as "suppose" in the stem.`,
  });
}

{
  const c = caseInfo("butyne-amide");
  const dG = Math.round(c.dG);
  add({
    id: "u2e-no-return",
    levels: [2],
    prompt: `${cap(c.base.name)} removes the proton from 1-butyne and the step falls ${Math.abs(dG)} kcal/mol. What next.`,
    brief: "Compare the fall with the window, about 9.5 kcal/mol.",
    correct: { text: `It stays: Keq is near ${sciText(keqFromDeltaG(dG))}, outside the window`, why: `A fall of ${Math.abs(dG)} is a Keq of ${sciText(keqFromDeltaG(dG))}. Past 10⁷, so the reverse step does not happen in practice.` },
    wrong: [
      { text: "It returns, as every step is reversible", why: "Only steps inside the window reverse. This one falls well past it." },
      { text: "It returns once the mixture warms up", why: "Warming helps cross humps, but a Keq this large is a statement about the wells, not the humps." },
    ],
    visual: { profiles: [singleStep(dG, 6)], label: "1-butyne with amide ion, a step that falls", reaction: c.row },
    explanation: "Once an irreversible step is taken, the reaction follows that path down the energy graph.",
    provenance: `${DERIVED} ${STRUCT} pKa ${c.usedPka} and ${c.formedPka} from packages/curriculum pka.ts.`,
  });
}

{
  const ethoxide = pkaEntry("alcohol").pka;
  const ketone = pkaEntry("ketone_alpha_ch").pka;
  const keq = keqFromPkas(ethoxide, ketone);
  const eRow: readonly ReactionItem[] = [plain(U2E_ENOLATE.ketone!), "→", plain(U2E_ENOLATE.kinetic), "or", plain(U2E_ENOLATE.thermo)];
  add({
    id: "u2e-enolate-ethoxide",
    levels: [2],
    prompt: `Ethoxide (its conjugate acid, an alcohol, has pKa ${ethoxide}) deprotonates the same ketone (pKa ${ketone}). Which enolate ends up as the main one.`,
    brief: `Keq is about ${sciText(keq)}. Is that inside the window.`,
    correct: { text: "The more substituted one: the step reverses, so the deeper well wins", why: `Keq of ${sciText(keq)} is inside the window, so both enolates form and turn back until the more stable, more substituted one holds most of the material. That is the thermodynamic enolate.` },
    wrong: [
      { text: "The less substituted one, as it forms fastest", why: "It does form fastest, but with ethoxide it is not locked in. It reverses and the material settles into the deeper well." },
      { text: "Neither, no enolate forms", why: `Keq ${sciText(keq)} is small but inside the window, so a steady amount of enolate does form.` },
    ],
    visual: { profiles: [singleStep(Math.round(deltaGFromKeq(keq)), Math.round(deltaGFromKeq(keq)) + 4)], label: "A ketone deprotonated by ethoxide, a small climb", reaction: eRow },
    explanation: "A reversible deprotonation gives the thermodynamic enolate: the most stable one, once everything has settled.",
    provenance: `${STRUCT} Keq from the course pKa table (alcohol ${ethoxide}, ketone_alpha_ch ${ketone}). More substituted enolate is the more stable one: alkene substitution counted by RDKit (${U2E_ENOLATE.alkeneSubstituents.thermo} against ${U2E_ENOLATE.alkeneSubstituents.kinetic}).`,
  });
}

/** Every real acid-base step the lab can use, in teaching order. */
export const U2E_CASE_IDS: readonly string[] = Object.freeze(Object.keys(U2E_CASES));

export const U2E_POOLS: UnitPools = Object.freeze({ [U2E_NODE]: Object.freeze([...entries]) });
export const U2E_VISUALS: Readonly<Record<string, EnergyVisual>> = Object.freeze({ ...VISUALS });

export function energyVisualFor(beatId: string): EnergyVisual | null {
  return U2E_VISUALS[beatId] ?? null;
}
