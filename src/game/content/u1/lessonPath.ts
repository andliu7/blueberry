/**
 * Unit 1's lesson chain: what each lesson TEACHES, what it ASSUMES, the
 * step-by-step walk-through a stuck student can open, and the plan for each
 * video slot. Drafts until the owner signs them off.
 *
 * WHY THIS FILE EXISTS (30 Oct, unit style guide pass). The owner asked that
 * lessons inside a section build on each other, assume only what earlier
 * lessons taught, and give a "need help" path when a student cannot follow.
 * Chad's Prep orders resonance (Ch 2) before conjugation (Ch 16) and puts
 * the pi MOs before addition and Diels-Alder; the same dependency order is
 * written down here as data so a test can hold it, instead of living only in
 * the order of the pathway array.
 *
 * NO NEW CHEMISTRY LIVES HERE. Every walk-through step names `source`, a
 * Unit 1 pool entry (this lesson's own, or an earlier lesson's), and `quote`,
 * words copied exactly from that entry's explanation. test/u1LessonPath.test.ts
 * fails a quote the source does not contain, and a source that comes from a
 * LATER lesson. The `text` lines are plain restatements of the quotes as
 * steps to follow.
 *
 * CONCEPT IDS. A concept is "u1:<name>" when a Unit 1 lesson teaches it. A
 * concept prefixed "u0:" is assumed from Unit 0 and is not checked against
 * the chain; it becomes a "go back to Unit 0" row on the help path.
 */

import { U0_PRIMERS } from "./primers";
import { U1_EXPLAINERS, type Explainer } from "./lessonExplainers";
import { CHAIN_LABELS, CHAIN_LINKS, CHAIN_ORDER, chainTeacherOf } from "../lessonChain";
import { U23_EXPLAINERS, U23_VIDEO_SLOTS, U23_WALKTHROUGHS } from "../u23/lessonPath";

export { U1_EXPLAINERS, type Explainer, type ExplainerCard } from "./lessonExplainers";
export { CONCEPT_LABELS, U1_LINKS, teacherOf, type LessonLink } from "./lessonLinks";

export interface WalkStep {
  /** A few words: what the student does at this step. */
  readonly title: string;
  /** One or two sentences, the step as an instruction. */
  readonly text: string;
  /** A Unit 1 pool entry id, from this lesson or an earlier one. */
  readonly source: string;
  /** Copied exactly from that entry's explanation. */
  readonly quote: string;
}

export interface VideoSlot {
  /** Planned running time, in minutes. */
  readonly minutes: number;
  /** What the clip would show, in order. Filmed from the walk-through, so the page and the video agree. */
  readonly shows: readonly string[];
  /** Nothing is filmed yet. The lesson stands without it (the meet step fills the hook). */
  readonly status: "not-filmed";
}

/**
 * One walk-through per lesson that teaches a procedure. Four steps at most,
 * in the order a student does them on a problem.
 */
export const U1_WALKTHROUGHS: Readonly<Record<string, readonly WalkStep[]>> = {
  "u1-allylic": [
    { title: "Find the charge", text: "Look for the charged carbon and ask whether it is bonded to a carbon of a C=C. If yes, it is allylic.", source: "u1-allylic-pick", quote: "Allylic means the charged carbon is bonded to a carbon of a C=C." },
    { title: "Slide the pi pair", text: "Push the C=C electrons toward the charge. Only electrons move, never atoms.", source: "u1-allylic-moves", quote: "Resonance contributors differ only in where electrons are drawn. Atoms never move" },
    { title: "Name the sharing carbons", text: "The charge now sits on the other end of the C=C. Those two end carbons share it.", source: "u1-allylic-where", quote: "the charge is shared by the two END carbons, C1 and C3" },
    { title: "Check the middle", text: "The middle carbon keeps four bonds in every contributor, so it never carries the charge.", source: "u1-allylic-where", quote: "The middle carbon keeps four bonds in every contributor." },
  ],
  "u1-rank-cation": [
    { title: "Count the alkyl groups", text: "More alkyl groups on the charged carbon means more donation into the empty p orbital.", source: "u1-cat-hyperconj", quote: "Alkyl groups stabilise a carbocation by hyperconjugation" },
    { title: "Look for a C=C next door", text: "A C=C helps only when it is next to the charged carbon. On the alkene carbon itself it does nothing.", source: "u1-cat-vinyl", quote: "A C=C helps only when it is NEXT to the charged carbon." },
    { title: "Break a tie with resonance", text: "If substitution ties, the allylic cation wins because the charge spreads over a second carbon.", source: "u1-cat-allyl-vs-2", quote: "because resonance spreads the charge over a second carbon" },
  ],
  "u1-rank-anion": [
    { title: "Flip the alkyl trend", text: "Alkyl groups push electrons toward the charge, which hurts an anion. Fewer alkyl groups is better.", source: "u1-ani-why-alkyl", quote: "That helps an electron-poor cation and hurts an electron-rich anion." },
    { title: "Check the orbital", text: "More s character in the lone pair's orbital steadies the anion: sp beats sp2 beats sp3.", source: "u1-ani-why-sp", quote: "sp > sp2 > sp3" },
    { title: "Add resonance last", text: "Resonance spreads the charge, which is why an allylic C-H is the most acidic sp3 C-H in an alkene.", source: "u1-ani-draw-pentene", quote: "Resonance makes the allylic C-H the most acidic sp3 C-H in an alkene." },
  ],
  "u1-12v14": [
    { title: "Protonate an end carbon", text: "H+ goes to an end carbon of the diene so the cation that is left is allylic.", source: "u1-12v14-protonate", quote: "Protonate an END carbon of the diene: that is the move that leaves an allylic cation." },
    { title: "Find both charged carbons", text: "The charge is shared by C2 and C4. Bromide can bond to either one.", source: "u1-12v14-which-carbon", quote: "Both contributors are needed: C2 gives the 1,2 product and C4 gives the 1,4 product." },
    { title: "Write the 1,4 product", text: "H on C1, the nucleophile on C4, and the double bond moves to the middle.", source: "u1-12v14-pick-14", quote: "H on C1, the nucleophile on C4, and the double bond moves to C2=C3." },
  ],
  "u1-kvt": [
    { title: "Read speed from the hump", text: "The lowest transition state is the fastest route. That product is the kinetic product.", source: "u1-kvt-define-kinetic", quote: "The kinetic product has the lowest barrier (lowest transition state), so it forms fastest." },
    { title: "Read stability from the well", text: "The deepest well is the most stable product. Speed and stability are read separately.", source: "u1-kvt-read-both", quote: "Speed is the height of the hump and stability is the depth of the well." },
    { title: "Ask if it can go back", text: "Warm, products can climb out and re-sort. Cold, they cannot.", source: "u1-kvt-define-conditions", quote: "It wins when the reaction is warm and reversible, so the products can re-sort by stability." },
  ],
  "u1-energy-diagram": [
    { title: "Find the higher hump", text: "The taller hump belongs to the slower product.", source: "u1-ed-faster", quote: "TS height is speed: the lower hump forms its product faster." },
    { title: "Find the deeper well", text: "The deeper well is the more stable product.", source: "u1-ed-stable", quote: "Product depth is stability: the deeper well is the more stable product." },
    { title: "Match to the conditions", text: "Cold and irreversible, the lower hump wins. Warm and reversible, the deeper well wins.", source: "u1-ed-cold", quote: "Cold and irreversible: the product over the lower hump (kinetic) wins." },
  ],
  "u1-hx-dienes": [
    { title: "Make the allylic cation", text: "Protonate an end carbon to leave the allylic cation, as in the 1,2 versus 1,4 lesson.", source: "u1-12v14-protonate", quote: "Protonate an END carbon of the diene: that is the move that leaves an allylic cation." },
    { title: "Read the temperature", text: "Cold gives the 1,2 (kinetic) product. Warm and reversible gives the more substituted alkene.", source: "u1-kvt-draw-warm", quote: "Warm and reversible gives the thermodynamic product, the one with the more substituted alkene." },
  ],
  "u1-x2": [
    { title: "Add X to C1", text: "The first X marks C1 and leaves the allylic cation, just like H in HX.", source: "u1-x2-why-14", quote: "The allylic cation after X+ adds to C1 has the charge on C2 and C4" },
    { title: "Use the same temperature rule", text: "Cold gives the 1,2 dihalide. Warm and reversible gives the dihalide with the more substituted alkene.", source: "u1-x2-warm-br", quote: "Same temperature rule as HX: warm and reversible gives the dihalide with the more substituted alkene." },
  ],
  "u1-nbs": [
    { title: "Find the allylic H", text: "The allylic C-H breaks first, because the radical it leaves is spread over two carbons.", source: "u1-cd-nbs-weakest", quote: "The allylic C-H breaks first because the allylic radical is delocalised over two carbons" },
    { title: "Keep the C=C", text: "NBS holds Br2 at a trace, so the C=C survives and an allylic H is swapped for Br.", source: "u1-cd-nbs-why", quote: "NBS holds Br2 at a trace." },
    { title: "Ignore the initiator choice", text: "Light and ROOR start the same chain, so the product does not change.", source: "u1-cd-nbs-initiator", quote: "Light and ROOR are interchangeable initiators." },
  ],
  "u1-mo": [
    { title: "Count the p orbitals", text: "n p orbitals make n pi MOs. Butadiene has four.", source: "u1-cd-mo-count", quote: "n p orbitals make n pi MOs." },
    { title: "Fill from the bottom", text: "Put two electrons in each MO, lowest first. The top filled MO is the HOMO.", source: "u1-cd-mo-bd-homo", quote: "four pi electrons fill ψ1 and ψ2" },
    { title: "Read the next one up", text: "The lowest empty MO is the LUMO, one step above the HOMO.", source: "u1-cd-mo-bd-lumo", quote: "LUMO is the lowest empty MO." },
  ],
  "u1-da": [
    { title: "Pair diene and dienophile", text: "The diene and an alkene dienophile join in one step to make a cyclohexene. An alkyne keeps one extra C=C.", source: "u1-cd-da-ring", quote: "Diels-Alder: diene plus an alkene dienophile give a cyclohexene in one step." },
    { title: "Find the new bonds", text: "Two new sigma bonds form, and one C=C remains, between the diene's old C2 and C3.", source: "u1-cd-da-ring", quote: "Two new sigma bonds form, and one C=C remains, between the diene's old C2 and C3." },
    { title: "Check the orbitals match", text: "The diene's HOMO meets the dienophile's LUMO, end lobes in phase.", source: "u1-cd-da-orbitals", quote: "the diene's HOMO and the dienophile's LUMO" },
  ],
  "u1-dienes": [
    { title: "Check the shape first", text: "Locked s-cis is fastest, free rotation is fine, locked s-trans does not react.", source: "u1-cd-dienes-shape-match", quote: "Locked s-cis is fastest, free rotation is fine, strained s-cis is slow, and locked s-trans does not react." },
    { title: "Then look at donors", text: "Donor groups help only if the diene can reach s-cis in the first place.", source: "u1-cd-dienes-edg-locked", quote: "A diene that cannot reach s-cis does not react, however good its donor groups are." },
  ],
  "u1-dienophiles": [
    { title: "Look for a withdrawing group", text: "C=O, CN or NO2 on the dienophile lowers its LUMO and speeds the reaction.", source: "u1-cd-phile-fastest", quote: "Withdrawing groups (C=O, CN, NO2) on the dienophile lower its LUMO and speed the reaction." },
    { title: "Place it in the product", text: "The dienophile's groups end up on the sp3 carbons across the ring from the new C=C.", source: "u1-cd-phile-match", quote: "the dienophile's groups sit on the sp3 carbons across the ring from it." },
  ],
  "u1-da-predict": [
    { title: "Mark the diene's ends", text: "The ends make the two new sigma bonds, and the middle single bond becomes the ring's C=C.", source: "u1-cd-dienes-draw-dmb", quote: "The diene's ends make the two new sigma bonds, and its middle single bond becomes the ring's C=C." },
    { title: "Add the dienophile", text: "The dienophile's withdrawing group ends up as a substituent on the new ring.", source: "u1-cd-phile-draw-acrylonitrile", quote: "The withdrawing group activates the dienophile and ends up as a substituent on the new ring." },
  ],
  "u1-da-stereo": [
    { title: "Keep cis as cis", text: "The reaction is suprafacial and concerted, so cis stays cis and trans stays trans.", source: "u1-cd-st-cis", quote: "Suprafacial and concerted: cis stays cis, trans stays trans." },
    { title: "Pick endo", text: "Under kinetic control the withdrawing groups tuck under the diene, which is endo.", source: "u1-cd-st-endo", quote: "Endo rule: under kinetic control the dienophile's withdrawing groups tuck under the diene." },
    { title: "Look at the ring type", text: "A cyclic diene gives a bridged bicycle. A cyclic dienophile gives a fused one.", source: "u1-cd-st-bridged", quote: "A cyclic diene gives a bridged bicycle. A cyclic dienophile gives a fused one." },
  ],
  "u1-da-3d": [
    { title: "Start from the stereo rules", text: "Use the same two rules as the stereochemistry lesson: cis stays cis, and endo is the kinetic product.", source: "u1-cd-st-cis", quote: "cis stays cis, trans stays trans." },
    { title: "Carry the groups across", text: "Groups cis on the dienophile end up cis in the product.", source: "u1-cd-st-draw-maleate", quote: "Groups cis on the dienophile end up cis in the product." },
  ],
};

/** The video lessons' slots. Nothing is filmed; the walk-through is the script. */
export const U1_VIDEO_SLOTS: Readonly<Record<string, VideoSlot>> = {
  "u1-allylic": { minutes: 2, status: "not-filmed", shows: ["An allyl cation with the pi pair sliding across", "Both contributors side by side", "Where the charge is shared"] },
  "u1-12v14": { minutes: 3, status: "not-filmed", shows: ["H+ adding to an end carbon of butadiene", "The two bromide attacks from the one cation", "The 1,2 and 1,4 products named"] },
  "u1-kvt": { minutes: 3, status: "not-filmed", shows: ["One start, two humps, two wells", "Cold: the low hump wins", "Warm: products re-sort to the deep well"] },
  "u1-nbs": { minutes: 2, status: "not-filmed", shows: ["Trace Br2 held by NBS", "The allylic H leaving", "Why the C=C survives"] },
  "u1-da": { minutes: 3, status: "not-filmed", shows: ["Diene and dienophile approaching", "Two new sigma bonds at once", "The cyclohexene that results"] },
  "u1-dienes": { minutes: 2, status: "not-filmed", shows: ["s-cis against s-trans", "A locked s-cis diene reacting", "A locked s-trans diene that cannot"] },
  "u1-dienophiles": { minutes: 2, status: "not-filmed", shows: ["A withdrawing group lowering the LUMO", "A donor slowing the reaction", "Where the groups land in the product"] },
  "u1-da-stereo": { minutes: 3, status: "not-filmed", shows: ["Cis stays cis", "Endo against exo", "Bridged and fused products"] },
};

export interface FilmShot {
  /** What is on screen (from the slot's `shows`). */
  readonly onScreen: string;
  /** What the presenter says, lifted unchanged from the lesson's read-along cards. */
  readonly say: readonly string[];
}

export interface FilmingScript {
  readonly node: string;
  readonly minutes: number;
  /** Spoken to camera before the first shot: the first card (why this matters). */
  readonly opening: string;
  readonly shots: readonly FilmShot[];
  /** Spoken to camera last: the "take this with you" card. */
  readonly closing: string;
  /** The whole narration in order, which is also the transcript stored with the clip. */
  readonly transcript: string;
}

/**
 * The shoot script for a video slot, derived (never retyped) from the slot's
 * `shows` and the lesson's read-along cards, so the page, the transcript and
 * the clip cannot drift. First card opens to camera, last card closes, the
 * middle cards are spread over the shots in order. Structures on screen come
 * from the lesson's own RDKit-derived drawings, never drawn by hand.
 */
export function filmingScriptFor(node: string): FilmingScript | null {
  const slot = U1_VIDEO_SLOTS[node] ?? U23_VIDEO_SLOTS[node];
  const explainer = U1_EXPLAINERS[node] ?? U23_EXPLAINERS[node];
  if (slot === undefined || explainer === undefined) return null;
  const say = (card: { heading: string; body: string }): string => card.body;
  const first = explainer.cards[0]!;
  const last = explainer.cards[explainer.cards.length - 1]!;
  const middle = explainer.cards.slice(1, -1);
  const shots: FilmShot[] = slot.shows.map((onScreen, i) => {
    const from = Math.floor((i * middle.length) / slot.shows.length);
    const to = Math.floor(((i + 1) * middle.length) / slot.shows.length);
    return { onScreen, say: middle.slice(from, to).map(say) };
  });
  const transcript = explainer.cards.map(say).join(" ");
  return { node, minutes: slot.minutes, opening: say(first), shots, closing: say(last), transcript };
}

export type HelpRow =
  | { readonly kind: "explainer"; readonly explainer: Explainer }
  | { readonly kind: "walkthrough"; readonly steps: readonly WalkStep[] }
  | { readonly kind: "replay"; readonly node: string; readonly label: string }
  | { readonly kind: "unit0"; readonly label: string; readonly primer?: string }
  | { readonly kind: "guide" };

/**
 * THE NEED-HELP PATH for a lesson, in the order to try it:
 *   0. the read-along explainer, when the lesson has one (the teaching itself, the
 *      stand-in for a video that is not filmed yet)
 *   1. the walk-through (cheapest: a minute of reading, no leaving the lesson)
 *   2. the earlier lessons that teach what this one assumes, nearest first
 *   3. Unit 0 refreshers, for the assumptions that live there
 *   4. the unit guide, last, because it is the longest read
 * Derived from U1_LINKS, so it can never point at a lesson that does not teach
 * the idea. Empty for a node with no entry here (quizzes, checkpoints).
 */
export function helpPathFor(node: string): readonly HelpRow[] {
  const link = CHAIN_LINKS[node];
  if (link === undefined) return [];
  const rows: HelpRow[] = [];
  const explainer = (U1_EXPLAINERS[node] ?? U23_EXPLAINERS[node]);
  if (explainer !== undefined) rows.push({ kind: "explainer", explainer });
  const steps = (U1_WALKTHROUGHS[node] ?? U23_WALKTHROUGHS[node]);
  if (steps !== undefined) rows.push({ kind: "walkthrough", steps });
  const order = CHAIN_ORDER;
  const replays = link.assumes
    .map((concept) => ({ concept, teacher: chainTeacherOf(concept) }))
    .filter((one): one is { concept: string; teacher: string } => one.teacher !== null);
  replays.sort((a, b) => order.indexOf(b.teacher) - order.indexOf(a.teacher));
  for (const { concept, teacher } of replays) rows.push({ kind: "replay", node: teacher, label: CHAIN_LABELS[concept] ?? concept });
  for (const concept of link.assumes) if (concept.startsWith("u0:")) rows.push({ kind: "unit0", label: CHAIN_LABELS[concept] ?? concept, ...(U0_PRIMERS[concept] !== undefined ? { primer: U0_PRIMERS[concept].text } : {}) });
  rows.push({ kind: "guide" });
  return rows;
}
