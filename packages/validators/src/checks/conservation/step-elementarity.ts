import {
  findAtomInState,
  neighborIds,
  type AtomId,
  type MechanismState,
  type MechanismStep,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import {
  arrowClusters,
  stepArrowFacts,
  type ArrowCluster,
  type StepArrowFacts,
} from "./arrow-facts.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 12. One step is one transition state, so its arrows have to be able to belong to
 * one.
 *
 * THE HOLE THIS CLOSES, IN THE SECOND PASS ADVERSARY'S WORDS.
 *
 *   "An SN2 at one carbon and an unrelated deprotonation four carbons away are drawn as one
 *   step and every check is silent. Nothing partitions a step's arrows by connected
 *   component to ask whether they plausibly belong to one transition state. This is
 *   precisely what step_not_elementary means, and that cause is currently emitted by
 *   nothing."
 *
 * chem-core has carried the cause since Phase 1: "Several separate steps are drawn as one.
 * One elementary step is one transition state. Bond formation and an unrelated proton
 * transfer are two barriers, so they are two steps, even when both are inevitable."
 * routes.ts states the same rule at the definition of `ElementaryStepKind`. Until this
 * file, no check could emit it, so the sentence was authored, reviewed, and unreachable.
 *
 * WHY EVERY OTHER CHECK IS SILENT ON THAT FIXTURE, WHICH IS WHY THIS ONE HAS TO EXIST.
 *
 * Both halves of it are individually correct chemistry. Each arrow is individually
 * drawable, so arrow legality passes them one at a time, which is what it is for. Mass,
 * charge, valence and electron flow are all sums over the whole multiset, and two correct
 * half reactions added together sum correctly. Step identity compares the declared kind
 * against the arrows and its own docstring already lists "concerted_substitution from a two
 * step sequence drawn as one" under what it cannot discriminate. Nothing anywhere asked
 * whether the arrows BELONG TOGETHER.
 *
 * THERE ARE THREE INDEPENDENT RULES IN THIS FILE. RULE A IS THE ORIGINAL ONE AND IS ABOUT
 * ARROWS THAT DO NOT REACH EACH OTHER. RULE B IS ABOUT ARROWS THAT ALL TOUCH ONE ATOM.
 * RULE C IS ABOUT ONE NAMED COLLAPSE THAT NEITHER OF THE OTHER TWO CAN SEE.
 *
 * They are independent: a step can fail any one without failing the others, and none is a
 * special case of another. Rule A asks whether the arrows are in the same place. Rule B
 * asks whether the arrows move in one direction while they are there. Rule C asks whether
 * an anion is made and then eaten before the step is over, and it asks that of one shape
 * only, spelled out at `collapsedProtonations` below. None of the three is a barrier model
 * and the general question is still open; each closes one decidable signature.
 *
 * RULE A, THE CRITERION, AND EVERY REASON IT IS THIS CAUTIOUS.
 *
 * Two conditions, both required before a word is said:
 *
 *   1. The step's arrows fall into more than one group, where two arrows are in the same
 *      group if they share an atom, transitively. `arrowClusters` in arrow-facts.ts.
 *   2. Two groups are more than three bonds apart in the `from` state, or are in different
 *      species with no arrow joining them at all.
 *
 * Condition 1 alone would be a rule about drawing style and it is nearly, but not quite,
 * enough on its own: every genuinely concerted multi centre step draws its arrows head to
 * tail, so they share an atom at every join and come back as ONE group. E2 shares the
 * beta hydrogen and then the alpha carbon. A pericyclic step shares an atom at each corner
 * of the ring. The four centre hydroboration shares boron. Radical propagation shares the
 * hydrogen being abstracted. Concerted substitution shares the carbon under attack. That is
 * not a coincidence about this corpus, it is what a curved arrow notation for a single
 * continuous flow of electrons means.
 *
 * Condition 2 is the safety margin on top, and it is there because "nearly" is not "quite"
 * and because CLAUDE.md is explicit that a check which guesses wrong on correct chemistry
 * is the worse failure. Two events three bonds apart or closer might be sharing one
 * developing orbital array, through space or through a partial bond that no arrow was drawn
 * for, and this check says nothing about them. Three bonds is chosen because the sigma
 * framework of a six membered cyclic transition state, the largest that is common, spans at
 * most three bonds between the two ends of its reacting array; anything within that could
 * close into one ring. Widening the number weakens the check and narrowing it starts
 * guessing, so it is fixed and it is not to be adjusted to make a fixture pass either way.
 *
 * RULE B, THE BOND THAT IS BROKEN AND MADE AGAIN INSIDE ONE STEP.
 *
 * Rule A's own exclusion list used to open with this sentence: "It does not assert that a
 * step with one arrow group is elementary. A two step sequence drawn as one at the SAME
 * centre, an addition and an elimination sharing the carbonyl carbon for instance, has one
 * connected arrow group and passes here." The third pass adversary took that sentence and
 * filed the fixture, and it is the one on this list that teaches wrong chemistry rather
 * than merely failing to teach right chemistry: nucleophilic acyl substitution with the
 * addition and the elimination collapsed into one step teaches a student that acyl
 * substitution has no tetrahedral intermediate, which is the single most common wrong
 * answer on that transformation.
 *
 * All four of its arrows touch the carbonyl carbon, so rule A's condition 1 is not met and
 * the check returned before the proximity test was reached. Widening rule A cannot close
 * it. Connectivity is what a genuinely concerted step LOOKS LIKE, so a rule that punished
 * connectivity would reject E2, hydroboration, and every pericyclic step in the corpus.
 *
 * THE CRITERION, WHICH IS A DIFFERENT QUESTION ABOUT THE SAME ARROWS.
 *
 *   In one elementary step, no pair of atoms both loses bonding and gains bonding.
 *
 * An arrow drawn out of a bond says that bond is coming apart on the way to the transition
 * state. An arrow drawn into the space between two atoms says a bond there is coming
 * together. One transition state is one continuous reorganisation, so each pair of atoms is
 * doing one of those two things, not both. A pair that does both has gone out and come
 * back, and the place it came back from is an intermediate, which is by definition a second
 * barrier. In the acyl fixture the pair is the carbonyl carbon and its oxygen: arrow a2
 * pushes the C=O pi bond onto the oxygen, and arrow a3 pushes it straight back. The
 * tetrahedral intermediate is the state between those two arrows, and it is exactly the
 * species the fixture declines to write down.
 *
 * WHY THIS DOES NOT FIRE ON CONCERTED CHEMISTRY, WHICH IS THE THING THAT MATTERS MOST.
 *
 * Every concerted mechanism in the corpus moves electrons through a pair once and in one
 * direction. SN2 forms one bond and breaks another and they are different pairs. E2 breaks
 * C-H, forms C=C, breaks C-LG: three pairs, three single directions. Hydroboration's four
 * centre array breaks B-H and C=C while forming H-C and C-B: four pairs, one direction
 * each. A pericyclic step alternates around a ring and no bond in the ring is touched
 * twice. Radical propagation abstracts and forms at different pairs. This is not a
 * coincidence about this corpus either: a curved arrow that leaves a bond and a curved
 * arrow that arrives at the same bond, in the same drawing, are two statements about that
 * bond's fate that cannot both describe one continuous motion.
 *
 * Two shapes that look adjacent to this and are deliberately NOT caught. Two arrows out of
 * ONE bond, which is how the corpus draws homolysis, is two breaks and no form: both
 * arrows point the same way, so nothing has come back. And one single arrow whose source
 * bond and whose sink pair are the same two atoms is an arrow that declares no change,
 * which `conservation-arrow-legality` already owns with a better message, so the break and
 * the form are required to come from DIFFERENT arrows before a word is said here.
 *
 * WHAT RULE B DOES NOT ASSERT. This is a narrow, decidable signature of a round trip, not
 * a barrier model. It says nothing about how many barriers an arbitrary array of arrows
 * crosses, because answering that in general needs a model of transition state energies
 * that chem-core does not have and that this package is not the place to invent. A
 * collapsed two step sequence whose two halves happen to touch no common pair twice is
 * still missed, and so is any collapse whose second half acts on bonds the first half never
 * touched. Rule B also says nothing about the ORDER of the arrows, since a drawing has no
 * order, and nothing about the net change on the pair: a bond that ends at the order it
 * started is caught for the same reason as one that does not, because the finding is the
 * round trip and not the arithmetic.
 *
 * WHAT THIS DELIBERATELY DOES NOT ASSERT. Stated plainly, because a green run here is worth
 * exactly what these exclusions leave.
 *
 *   It does not assert that a step with one arrow group, no round tripped bond, and no
 *   localise-then-protonate pair is elementary. Rules B and C each close one shape an
 *   adversary filed, by naming one decidable signature apiece rather than by deciding the
 *   general question. The general question is still open and still needs a model of how many
 *   barriers a given array of arrows crosses. Specifically still missed after rule C: a
 *   collapse whose second half is not a protonation, a protonation by an acid inside the
 *   same species, and any collapse that localises nothing.
 *
 *   It does not assert that a step with two distant groups is impossible. It asserts that
 *   nothing in the drawing connects them, so the file is claiming one barrier where it has
 *   drawn two. If a mechanism genuinely does couple two distant sites in one transition
 *   state, and some do, the remedy is to draw the arrow that couples them, and then this
 *   check goes quiet on its own without anybody editing an assertion.
 *
 *   It does not rank or read `identity.elementaryStep` at all. No kind is exempted and no
 *   kind is targeted. A `pericyclic_step` and a `proton_transfer` are held to exactly the
 *   same two conditions, because the conditions are about the arrows and the geometry
 *   rather than about the label, and a rule with a list of exempt kinds would be a rule an
 *   author could satisfy by changing a label.
 *
 *   It does not look at the `to` state. Distances are measured in `from`, where the bonds
 *   the step is about are still present, which is the same convention `periplanarity.ts`
 *   uses for the E2 torsion and for the same reason.
 *
 * WHEN IT STANDS DOWN ENTIRELY. Fewer than two arrows, nothing to partition. Any arrow
 * reference that does not resolve, because a group assembled from arrows pointing at
 * nothing is smaller than the truth and `conservation-arrow-legality` owns that finding
 * with a better message.
 */

/**
 * Bonds between two arrow groups that still leaves them able to share one transition state.
 *
 * Fixed at three. See the criterion note above for where the number comes from. This is a
 * tolerance in the same sense as the periplanarity window: loosening it to make a fixture
 * pass is a weakening, and the fixture that would need it is one whose two halves are
 * further apart than any single transition state reaches.
 */
const MAX_SEPARATION_BONDS = 3;

const CAUSE = "step_not_elementary";

/**
 * Shortest path in bonds between two atoms of one species in this state.
 *
 * Undefined when they are in different species, or in the same species but not connected.
 * Breadth first, so the first time an atom is reached is by a shortest path.
 */
function bondDistance(state: MechanismState, from: AtomId, to: AtomId): number | undefined {
  if (from === to) return 0;
  const located = findAtomInState(state, from);
  if (located === undefined) return undefined;
  const species = located.species;
  if (!species.atoms.some((atom) => atom.id === to)) return undefined;

  const seen = new Set<AtomId>([from]);
  let frontier: AtomId[] = [from];
  let distance = 0;

  while (frontier.length > 0) {
    distance += 1;
    const next: AtomId[] = [];
    for (const atomId of frontier) {
      for (const neighbourId of neighborIds(species, atomId)) {
        if (seen.has(neighbourId)) continue;
        if (neighbourId === to) return distance;
        seen.add(neighbourId);
        next.push(neighbourId);
      }
    }
    frontier = next;
  }

  return undefined;
}

/** The closest any atom of one group comes to any atom of the other. */
function separation(
  state: MechanismState,
  left: ArrowCluster,
  right: ArrowCluster,
): number | undefined {
  let best: number | undefined;
  for (const leftId of left.atomIds) {
    for (const rightId of right.atomIds) {
      const distance = bondDistance(state, leftId, rightId);
      if (distance === undefined) continue;
      if (best === undefined || distance < best) best = distance;
    }
  }
  return best;
}

/**
 * Groups merged again, this time by proximity rather than by shared atoms.
 *
 * Three groups where A is near B and B is near C but A is far from C are one array, not
 * two: the flow is continuous through B even though A and C never meet. Merging by
 * proximity first and counting afterwards is what stops that being reported as a defect.
 * Returned as indices into the original list so the failure line can still name arrows.
 */
function proximityComponents(
  state: MechanismState,
  clusters: readonly ArrowCluster[],
): readonly (readonly number[])[] {
  const componentOf = clusters.map((_, index) => index);
  const resolve = (index: number): number => {
    let root = index;
    while (componentOf[root] !== root) root = componentOf[root] as number;
    return root;
  };

  for (let left = 0; left < clusters.length; left += 1) {
    for (let right = left + 1; right < clusters.length; right += 1) {
      const distance = separation(
        state,
        clusters[left] as ArrowCluster,
        clusters[right] as ArrowCluster,
      );
      if (distance === undefined || distance > MAX_SEPARATION_BONDS) continue;
      componentOf[resolve(right)] = resolve(left);
    }
  }

  const grouped = new Map<number, number[]>();
  for (let index = 0; index < clusters.length; index += 1) {
    const root = resolve(index);
    const existing = grouped.get(root);
    if (existing === undefined) grouped.set(root, [index]);
    else existing.push(index);
  }
  return [...grouped.values()];
}

function describe(clusters: readonly ArrowCluster[], component: readonly number[]): string {
  const arrowIds: string[] = [];
  const atomIds: string[] = [];
  for (const index of component) {
    const cluster = clusters[index] as ArrowCluster;
    arrowIds.push(...cluster.arrowIds);
    atomIds.push(...cluster.atomIds);
  }
  return `arrow(s) ${arrowIds.sort().join(", ")} acting on {${atomIds.sort().join(", ")}}`;
}

/** An unordered pair of atom ids, as one stable key. */
function pairKey(left: AtomId, right: AtomId): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function pairLabel(key: string): string {
  return key.split("|").join("-");
}

/**
 * Rule B. Pairs of atoms this step's arrows both pull apart and push together.
 *
 * A bond source contributes the break, at the pair the bond joins. A `betweenAtoms` sink
 * contributes the form, at the pair it names. An `atom` sink contributes neither: those
 * electrons localise on one atom rather than bonding a pair. Lone pair and single electron
 * sources contribute no break for the same reason.
 *
 * The break and the form have to come from different arrows. One arrow whose bond source
 * and whose `betweenAtoms` sink are the same two atoms is an arrow that declares no change,
 * which `conservation-arrow-legality` reports with a message about that arrow rather than
 * about this step.
 */
interface RoundTrippedPair {
  /** The atom pair, as a stable key. Rendered through `pairLabel`. */
  readonly key: string;
  /** Arrows drawing electrons out of the bond at that pair. */
  readonly broken: readonly string[];
  /** Arrows drawing electrons into a bond at that pair. */
  readonly formed: readonly string[];
}

function roundTrippedPairs(facts: StepArrowFacts): readonly RoundTrippedPair[] {
  const broken = new Map<string, string[]>();
  const formed = new Map<string, string[]>();

  for (const resolved of facts.arrows) {
    if (!resolved.resolves) continue;
    const arrowId = resolved.arrow.id;
    const bond = resolved.sourceBond;
    if (bond !== undefined) {
      const key = pairKey(bond.a, bond.b);
      broken.set(key, [...(broken.get(key) ?? []), arrowId]);
    }
    if (resolved.arrow.sink.kind === "betweenAtoms") {
      const key = pairKey(resolved.arrow.sink.atomIds[0], resolved.arrow.sink.atomIds[1]);
      formed.set(key, [...(formed.get(key) ?? []), arrowId]);
    }
  }

  const found: RoundTrippedPair[] = [];
  for (const [key, breakers] of broken) {
    const makers = formed.get(key);
    if (makers === undefined) continue;
    // Different arrows, not one arrow declaring no change. See the note above.
    if (!breakers.some((arrowId) => makers.some((other) => other !== arrowId))) continue;
    found.push({ key, broken: [...breakers].sort(), formed: [...makers].sort() });
  }

  found.sort((left, right) => left.key.localeCompare(right.key));
  return found;
}

function roundTripViolations(
  step: MechanismStep,
  facts: StepArrowFacts,
): readonly Violation[] {
  return roundTrippedPairs(facts).map((pair) => ({
    where: `${step.id} / bond ${pairLabel(pair.key)} both broken and made again`,
    expected:
      "each pair of atoms in one step to be doing one thing: coming apart, or coming " +
      "together. One transition state is one continuous reorganisation",
    actual:
      `arrow(s) ${pair.broken.join(", ")} push electrons OUT of the bond between ` +
      `${pairLabel(pair.key)} and arrow(s) ${pair.formed.join(", ")} push electrons back ` +
      `INTO it, in the same step. That bond goes away and comes back, so the drawing passes ` +
      `through a structure it never writes down, and that structure is an intermediate ` +
      `between two barriers. This is the addition and elimination of an addition elimination ` +
      `collapsed into one step: at a carbonyl it is the tetrahedral intermediate, and a step ` +
      `drawn this way teaches that the intermediate does not exist. Draw the two barriers in ` +
      `sequence with the intermediate between them. Nothing here objects to the arrows ` +
      `sharing an atom, which is what a genuinely concerted step looks like, only to the same ` +
      `pair being taken apart and put back`,
    cause: CAUSE,
  }));
}

/**
 * RULE C. ONE SHAPE, NAMED EXACTLY: A PAIR IS LOCALISED ONTO AN ATOM AND THAT ATOM THEN
 * TAKES A PROTON FROM A DIFFERENT SPECIES, IN THE SAME STEP.
 *
 * WHAT THIS IS AND, MORE IMPORTANTLY, WHAT IT IS NOT.
 *
 * It is not a barrier model and it is not a general answer to "how many transition states
 * do these arrows cross". chem-core has no such model, this package is not the place to
 * invent one, and the fourth pass adversary's own filing said so. It is one decidable
 * signature of one collapse, the nucleophilic addition followed by a protonation, which is
 * the most common two step sequence in the corpus and the one the fourth pass adversary
 * filed as `broken-known-limit-cyanohydrin-addition-and-a-separate-acids-protonation-collapsed-into-one-connected-step`.
 *
 * WHY RULES A AND B ARE BOTH CORRECTLY SILENT ON IT, WHICH IS WHY A THIRD RULE IS NEEDED.
 *
 * Rule B looks for a pair of atoms both pulled apart and pushed together. There is no such
 * pair here: the four arrows touch four distinct pairs, once each. Rule A looks for arrow
 * groups that do not reach each other. There is no such gap either: an addition and the
 * protonation that follows it chain through the reacting atom exactly as a genuinely
 * concerted array does, so all four arrows merge into one cluster before the proximity test
 * is reached. Widening either rule to catch this would break the thing that rule is for, and
 * widening rule A specifically would start rejecting concerted chemistry, since connectivity
 * is what a concerted step LOOKS LIKE.
 *
 * THE SIGNATURE, WITH EVERY CONDITION LOAD BEARING.
 *
 *   1. An arrow draws a pair OUT OF A BOND and its sink is `atom` X. A sink of kind `atom`
 *      means the pair stops there, localised as a lone pair on X. That is an anion being
 *      made: the alkoxide of a tetrahedral intermediate, in the worked example.
 *   2. A DIFFERENT arrow draws a `lonePair` off that same X into a new bond. The anion is
 *      being consumed.
 *   3. The atom X bonds to is a HYDROGEN. That makes the consumption a protonation rather
 *      than any other thing an anion might do.
 *   4. That hydrogen is in a DIFFERENT species from X in the `from` state. A separate acid,
 *      arriving from outside, which is a second molecular encounter and therefore a second
 *      barrier.
 *
 * Condition 1's insistence on a bond source is what keeps this about an intermediate being
 * MADE. Conditions 3 and 4 together are the sentence "a proton transfer from a separate
 * species", and they are the whole reason this is narrow enough to ship.
 *
 * WHY IT DOES NOT FIRE ON CONCERTED CHEMISTRY, HAND TRACED RATHER THAN ASSUMED.
 *
 * The structural reason first, because it is the one that generalises. An `atom` sink says
 * the electrons STOP. A drawing in which the pair stops on an atom and a second arrow then
 * pushes a lone pair off that atom to capture a proton from another molecule has drawn the
 * anion into existence and then drawn it being consumed, and the structure between those two
 * arrows is an intermediate that the file declines to write down. In a genuinely concerted
 * general acid catalysed addition the pair never stops: it flows straight into the bond being
 * made, and the notation shows that as `bond(C=O) -> betweenAtoms(O, H)`, one arrow, no
 * localisation, no rule C.
 *
 * Then the traces, over every single transition state mechanism this corpus contains.
 * Anti periplanar E2: the leaving group receives a localised pair and donates nothing.
 * SN2: the same. Four centre hydroboration and every pericyclic step: no `atom` sink at all,
 * because nothing localises anywhere. Bromonium formation: the bromine that donates a lone
 * pair to the second carbon is not the bromine the pair localises on, and it donates to a
 * carbon rather than to a proton. Radical propagation: the sinks are atoms but the sources
 * are single electrons, not lone pairs, and nothing is protonated. A concerted proton relay
 * through water: the water oxygen donates a lone pair and breaks its own O-H bond, and is
 * never an `atom` sink. Anchimerically assisted ionisation: the leaving group receives and
 * donates nothing.
 *
 * Measured as well as traced: across the whole committed corpus this signature matches
 * exactly one step, the collapsed cyanohydrin fixture it was written for, and zero others.
 *
 * WHAT IS STILL OPEN AFTER THIS, SAID PLAINLY SO A GREEN RUN IS NOT READ AS MORE.
 *
 * The general case. A collapse whose second half is not a protonation, a protonation by an
 * acid that is part of the same species, an addition whose intermediate is consumed by
 * something other than a proton, and any collapse that touches no pair twice and localises
 * nothing, are all still missed. Answering those needs the barrier model this file does not
 * have. What is closed is the one shape that was filed, named to its four conditions, and no
 * more than that.
 */
interface CollapsedProtonation {
  readonly localisedOn: AtomId;
  readonly localisingArrowId: string;
  readonly brokenPair: string;
  readonly protonatingArrowId: string;
  readonly hydrogenId: AtomId;
  readonly hostSpeciesId: string;
  readonly acidSpeciesId: string;
}

function collapsedProtonations(
  step: MechanismStep,
  facts: StepArrowFacts,
): readonly CollapsedProtonation[] {
  const found: CollapsedProtonation[] = [];

  for (const localising of facts.arrows) {
    if (!localising.resolves) continue;
    if (localising.arrow.sink.kind !== "atom") continue;
    const bond = localising.sourceBond;
    if (bond === undefined) continue;

    const localisedOn = localising.arrow.sink.atomId;
    const host = findAtomInState(step.from, localisedOn);
    if (host === undefined) continue;

    for (const protonating of facts.arrows) {
      if (!protonating.resolves) continue;
      if (protonating.arrow.id === localising.arrow.id) continue;
      if (protonating.arrow.source.kind !== "lonePair") continue;
      if (protonating.arrow.source.atomId !== localisedOn) continue;
      if (protonating.arrow.sink.kind !== "betweenAtoms") continue;

      const ends = protonating.arrow.sink.atomIds;
      if (ends[0] !== localisedOn && ends[1] !== localisedOn) continue;
      const hydrogenId = ends[0] === localisedOn ? ends[1] : ends[0];

      const acid = findAtomInState(step.from, hydrogenId);
      if (acid === undefined || acid.atom.element !== "H") continue;
      // Same species, and this is an intramolecular shift that may genuinely share one
      // cyclic transition state. Not this rule's business, and saying so is cheaper than
      // being wrong about it.
      if (acid.species.id === host.species.id) continue;

      found.push({
        localisedOn,
        localisingArrowId: localising.arrow.id,
        brokenPair: pairLabel(pairKey(bond.a, bond.b)),
        protonatingArrowId: protonating.arrow.id,
        hydrogenId,
        hostSpeciesId: host.species.id,
        acidSpeciesId: acid.species.id,
      });
    }
  }

  found.sort((left, right) => left.localisedOn.localeCompare(right.localisedOn));
  return found;
}

function collapsedProtonationViolations(
  step: MechanismStep,
  facts: StepArrowFacts,
): readonly Violation[] {
  return collapsedProtonations(step, facts).map((collapse) => ({
    where: `${step.id} / ${collapse.localisedOn} is given a localised pair and then protonated`,
    expected:
      "one step to make an intermediate or consume one, not both. A pair that stops on an " +
      "atom has made an anion, and the structure holding that anion is a state between two " +
      "barriers",
    actual:
      `arrow ${collapse.localisingArrowId} pulls the pair out of the ${collapse.brokenPair} bond ` +
      `and localises it on ${collapse.localisedOn}, and arrow ${collapse.protonatingArrowId} then ` +
      `pushes a lone pair off ${collapse.localisedOn} onto ${collapse.hydrogenId}, a hydrogen ` +
      `belonging to ${collapse.acidSpeciesId} rather than to ${collapse.hostSpeciesId}. That is an ` +
      `addition and a protonation by a separate acid drawn as one step. The anion between them, ` +
      `the alkoxide of a tetrahedral intermediate in the ordinary case, is a real species with a ` +
      `real lifetime and this drawing never writes it down. Draw the two barriers in sequence ` +
      `with the intermediate between them. Nothing here objects to the arrows sharing atoms, ` +
      `which is what a concerted step looks like: a genuinely concerted general acid catalysed ` +
      `addition puts the proton on as the pi bond moves, which is drawn bond(C=O) -> ` +
      `betweenAtoms(O, H), one arrow, with nothing localising anywhere`,
    cause: CAUSE,
  }));
}

function stepViolations(step: MechanismStep): readonly Violation[] {
  if (step.arrows.length < 2) return [];
  const facts = stepArrowFacts(step);
  if (!facts.allReferencesResolve) return [];

  const violations: Violation[] = [
    ...roundTripViolations(step, facts),
    ...collapsedProtonationViolations(step, facts),
  ];

  const clusters = arrowClusters(facts);
  if (clusters.length < 2) return violations;

  const components = proximityComponents(step.from, clusters);
  if (components.length < 2) return violations;

  // One line, however many components there are. They are all the same finding: this
  // drawing contains more than one independent event.
  const descriptions = components.map((component) => describe(clusters, component));
  const gaps: string[] = [];
  for (let left = 0; left < components.length; left += 1) {
    for (let right = left + 1; right < components.length; right += 1) {
      const distance = separation(
        step.from,
        { arrowIds: [], atomIds: unionAtoms(clusters, components[left] as readonly number[]) },
        { arrowIds: [], atomIds: unionAtoms(clusters, components[right] as readonly number[]) },
      );
      gaps.push(
        distance === undefined
          ? `groups ${left + 1} and ${right + 1} are in different species and no arrow joins them`
          : `groups ${left + 1} and ${right + 1} are ${distance} bonds apart`,
      );
    }
  }

  violations.push({
    where: `${step.id} / ${components.length} independent groups of arrows`,
    expected:
      "the arrows of one step to describe one transition state: one continuous push of " +
      "electrons, or several that at least reach each other",
    actual:
      `they fall into ${components.length} groups that share no atom and are not near each ` +
      `other. ${descriptions.map((text, index) => `Group ${index + 1}: ${text}`).join(". ")}. ` +
      `${gaps.join("; ")}, further than the ${MAX_SEPARATION_BONDS} bonds a single cyclic ` +
      `transition state reaches. Each group is a separate barrier, so this is more than one ` +
      `elementary step drawn as one, however certain both are to happen. Draw them in ` +
      `sequence with the intermediate in between, or, if they really are coupled, draw the ` +
      `arrow that couples them`,
    cause: CAUSE,
  });

  return violations;
}

/** The atoms of every cluster in one component, as one set. */
function unionAtoms(
  clusters: readonly ArrowCluster[],
  component: readonly number[],
): ReadonlySet<AtomId> {
  const atomIds = new Set<AtomId>();
  for (const index of component) {
    for (const atomId of (clusters[index] as ArrowCluster).atomIds) atomIds.add(atomId);
  }
  return atomIds;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const step of fixture.pathway.steps) violations.push(...stepViolations(step));
  return violations;
};

export const conservationStepElementarity: Check = conservationCheck({
  name: "conservation-step-elementarity",
  description:
    "no step draws two independent events as one: its arrows form one connected push of electrons or groups that come within three bonds of each other, no pair of atoms is both pulled apart and pushed back together, and no atom is handed a localised pair and then protonated by a separate species in the same step",
  find,
});
