import {
  allMechanismRoutes,
  findAtom,
  neighborIds,
  type MechanismPathway,
  type MechanismRoute,
  type MechanismStep,
  type Species,
} from "@blueberry/chem-core";

import { competingRoutesFor } from "@blueberry/feedback";

import type { Check } from "../../check.ts";
import { bondFormations, heavySigmaDepartures, stepArrowFacts } from "./arrow-facts.ts";
import {
  annotationsOfKind,
  requiredAnnotationViolations,
  speciesContaining,
  type AnnotationOccurrence,
} from "./authoring.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 10. A strongly disfavoured but permitted step is permitted, and names what beats it.
 *
 * WHAT CLAUDE.md ASKS FOR, IN ITS OWN WORDS.
 *
 *   "Neopentyl systems are strongly disfavored for SN2, roughly 10^-5 relative to ethyl.
 *   Not blocked. The engine says 'strongly disfavored, competing pathway likely' and names
 *   the competing pathway, because the methyl shift to a tertiary cation is the actual
 *   lesson. A boolean reject deletes it."
 *
 * `docs/VERIFICATION.md` S2 is the same finding with the reason attached: a boolean block
 * is chemically wrong and pedagogically wrong, because the interesting thing about
 * neopentyl is that it is slow enough for competing pathways to win.
 *
 * WHAT THIS CHECK ASSERTS.
 *
 *   1. A strongly hindered SN2 centre is DETECTED FROM THE STRUCTURE, not from a flag the
 *      author set. See below. An author cannot opt out by not mentioning it.
 *   2. Such a pathway carries exactly one `rate_comparison` annotation, with a value and a
 *      justification, saying how much slower this is.
 *   3. That annotation names a competing MechanismRoute, by its chem-core route id, and
 *      that route is not the disfavoured one itself. "Strongly disfavoured" with nothing
 *      said about what wins instead is the half answer CLAUDE.md warns about.
 *   4. Every route it names that way is one the engine itself names as a competing pathway
 *      for this cause, in `competingRoutesFor(sn2_center_strongly_hindered)`. See below.
 *
 * WHY RULE 4 EXISTS, WHICH IS THE PHASE 1 ADVERSARY'S THIRD FINDING.
 *
 * Rule 3 asks only that SOME route id other than sn2 appears. The adversary filed the
 * neopentyl fixture again with `radical_halogenation` named as the competing pathway: a
 * real id in the closed union, not sn2, and chemically unreachable from a hydroxide and an
 * alkyl bromide in solution with no initiator, no light, and no halogen molecule anywhere
 * in the state. The checkbox was ticked and the student would be taught the wrong lesson.
 *
 * The fix is to make the two halves of this repository agree with each other rather than
 * to build a second model of reactivity inside the validator.
 * `packages/feedback/src/copy/sterics.ts` already carries, in structured form, the route
 * that beats a strongly hindered SN2: `competingRoutes: ["carbocation_rearrangement"]`,
 * the anchimerically assisted methyl shift, which is the lesson CLAUDE.md says the
 * neopentyl paragraph exists to teach. A fixture naming a different route is disagreeing
 * with the engine's own answer to the same question, and one of the two is wrong.
 *
 * That is a real assertion with a real widening path, and the failure line says what it
 * is: if a named route genuinely is a competing pathway for this cause, it belongs in the
 * cause's `competingRoutes` in packages/feedback, and then both halves say so. Editing the
 * annotation to name a route nobody believes in, or deleting this rule, are the two things
 * that are not the widening path.
 *
 * WHAT RULE 4 IS NOT, AND WHAT IS THEREFORE STILL NOT CHECKED.
 *
 * It is not a test of whether the named route is AVAILABLE FROM THIS SUBSTRATE. That
 * question needs a model of what each route requires of a state, which is the reactivity
 * family's job and not this one's. Some of it is decidable from structure: a radical chain
 * needs an unpaired electron or a homolysable bond to start from, an aromatic substitution
 * needs a ring. Most of it is not, and none of the conditions half of it is in the fixture
 * schema at all: whether the solvent favours ionisation, whether the base is bulky enough,
 * what the temperature was. Rule 4 is agreement between two authored records, and it is
 * worth exactly that much and no more.
 *
 * WHAT IT DOES NOT ASSERT, AND THIS IS THE HALF THAT MATTERS MOST.
 *
 * That the step is wrong. A hindered SN2 with the annotation passes. Nothing in this
 * family rejects it, no other check fires on it, and there is a good fixture in the corpus
 * proving exactly that. The check also does not assert the rate factor: 10^-5 is CLAUDE.md
 * quoting a textbook, not a number this package compares against. The value string is read
 * for emptiness and for nothing else. It does not assert that the named competing route is
 * the right one either, only that a route is named. Which pathway actually wins is
 * chemistry a human wrote down.
 *
 * HOW A STRONGLY HINDERED CENTRE IS DETECTED, AND WHY IT IS COMPUTED RATHER THAN DECLARED.
 *
 * A `concerted_substitution` step on route sn2, at a carbon with a QUATERNARY CARBON
 * NEIGHBOUR: a neighbour carrying three further carbons, sitting across the trajectory the
 * nucleophile has to travel to reach the backside. Neopentyl is the worked example of that
 * geometry, a CH2 with a quaternary carbon behind it, and it is not the whole of it: see
 * `hinderedCentres` below for why the attacked carbon's own substituent count is reported
 * and no longer gates the test. It is a graph property of the `from` state and needs no
 * stereochemistry, no geometry, and no authored flag, which is the point. If the trigger
 * were an authored field, the fixture that forgot the annotation would also have forgotten
 * the flag, and the check would pass on precisely the file it exists for.
 *
 * WHICH CARBONS ARE TESTED FOR THAT PATTERN, WHICH IS THE SECOND PASS ADVERSARY'S FINDING.
 *
 * The pattern was always computed. WHERE it was looked for was not: the candidates came
 * from `step.identity.reactionCenters`, an authored field, so the whole requirement could
 * be evaded by writing the leaving group's id there instead of the carbon's.
 * `good-known-limit-neopentyl-sn2-rate-comparison-evaded-by-authoring-the-reaction-centre-away-from-the-hindered-carbon`
 * is bit for bit the proven good neopentyl fixture with `reactionCenters: ["Br1"]` and no
 * annotation, and every check was silent on it. `conservation-step-identity` cannot catch
 * that either: its reaction centre rule is one directional, every declared centre must be
 * touched by an arrow, and Br1 genuinely is touched.
 *
 * So the candidates are now DERIVED as well as read, from two arrow facts rather than one:
 * the acceptor end of every bond the arrows FORM (`bondFormations`), and the retained end of
 * every heavy sigma bond that BREAKS with its pair localising on the other end
 * (`heavySigmaDepartures`). The forming arrow is the primary one, because the atom under
 * attack is the atom a bond is being made to; the departure is kept because it is a second,
 * independent record of the same centre in an ordinary substitution. This is the same move
 * `periplanarity.ts` rule 1b made for the E2 torsion quartet, for the same reason: both
 * halves of a comparison must not come from the same authored field. See
 * `arrowDerivedCentres` for why the departure alone was wrong, which is the fourth pass
 * adversary's SN2 prime finding.
 *
 * The two sources are UNIONED rather than swapped. A declared centre that the arrows do not
 * name is still tested, so the check is strictly stronger than it was and a fixture whose
 * arrows this file cannot read does not silently stop being examined. When the arrows do
 * not resolve at all, the derived half stands down and `conservation-arrow-legality` owns
 * the finding, which is the convention every file in this family follows.
 *
 * WHAT THE DETECTOR DELIBERATELY DOES NOT CATCH. Alpha branching on its own: a plain
 * secondary or tertiary centre with no quaternary carbon anywhere beside it. Tertiary SN2
 * is a separate cause (`sn2_at_tertiary_center`) and a separate rule, and reporting it
 * under this one would name the wrong reason. Beta branching short of quaternary, isobutyl
 * for instance, is disfavoured by a factor of about 10^-2 rather than 10^-5 and is not what
 * CLAUDE.md's paragraph is about. Widening the threshold of three is a later phase's work
 * and needs its own fixtures; a detector that fires on cases nobody authored an annotation
 * for would fail correct chemistry.
 *
 * WHY "NAMES THE COMPETING PATHWAY" IS CHECKED BY LOOKING FOR A ROUTE ID.
 *
 * The requirement is literally about naming, and routes.ts exists so that names are a
 * closed union rather than free strings: "you cannot count, group, or compare names that
 * are arbitrary strings". So the convention is that the annotation writes the competing
 * route's chem-core id, `carbocation_rearrangement` for the neopentyl case, somewhere in
 * its value or justification. The check looks for one of those ids as a whole word. That
 * is not grading prose, it is requiring a name from a known list to be present, and rule 4
 * then requires that the name be the one the engine gives for the same cause.
 */

/** Cause id for the detected geometry. Advisory in chem-core, and advisory here. */
const CAUSE = "sn2_center_strongly_hindered";

interface HinderedCentre {
  readonly step: MechanismStep;
  readonly species: Species;
  readonly atomId: string;
  /** Carbon neighbours of the attacked carbon that each carry three further carbons. */
  readonly quaternaryNeighbourIds: readonly string[];
  /** How many carbon neighbours the attacked carbon has: 1 primary, 2 secondary, 3 tertiary. */
  readonly alphaCarbonCount: number;
  /** How this carbon came to be tested: from the arrows, from the declaration, or both. */
  readonly source: string;
}

function isSn2Substitution(step: MechanismStep, pathway: MechanismPathway): boolean {
  if (step.identity.elementaryStep !== "concerted_substitution") return false;
  return (step.identity.route ?? pathway.route) === "sn2";
}

function carbonNeighbours(species: Species, atomId: string): readonly string[] {
  return neighborIds(species, atomId).filter(
    (neighbourId) => findAtom(species, neighbourId)?.element === "C",
  );
}

/**
 * The atoms this step's arrows say are under attack.
 *
 * TWO DERIVATIONS, AND THE SECOND ONE IS THE FOURTH PASS ADVERSARY'S FINDING.
 *
 *   The ACCEPTOR end of every bond the arrows form. `bondFormations` in arrow-facts.ts:
 *   the end of a `betweenAtoms` sink that the arrow is not pivoting on, which is the atom
 *   the electrons are being pushed at. This is the primary derivation, because "the atom
 *   under attack" is a statement about the bond being MADE and this is the arrow that
 *   makes it.
 *
 *   The RETAINED end of every full heavy atom sigma bond that breaks with its pair
 *   localising on the other end. `heavySigmaDepartures`: the atom the leaving group left.
 *
 * THIS USED TO BE THE DEPARTURE ALONE, AND THAT WAS AN ASSUMPTION STATED AS A FACT.
 *
 * The sentence that used to be here read "In a substitution that is the carbon the leaving
 * group left, which is the carbon a nucleophile has to reach". True for every ordinary SN2
 * and false for SN2 prime, the allylic shift, where the nucleophile bonds to the far end of
 * the alkene and the leaving group departs from the near end three atoms away.
 * `broken-known-limit-sn2-prime-allylic-attack-at-a-quaternary-flanked-carbon-not-recognised-as-hindered`
 * is that file: hydroxide attacks a carbon with a tert-butyl group directly behind it,
 * exactly the neopentyl wall, and this check tested the unhindered carbon at the other end
 * of the molecule and said nothing. chem-core gives SN2 prime no route of its own, so a
 * real one is correctly authored as `concerted_substitution` on route `sn2` and arrives
 * here like any other.
 *
 * IT ALSO IMPROVES ORDINARY SN2, WHICH IS THE HALF WORTH CHECKING RATHER THAN ASSUMING.
 *
 * Measured over the corpus, the two derivations name the same atom in every ordinary SN2
 * fixture, so no fixture changes verdict on that account. What changes is what happens when
 * the departure cannot be read. `broken-electron-flow-sn2-drawn-without-the-leaving-group-arrow`
 * draws no arrow for the leaving group at all, so `heavySigmaDepartures` returns nothing and
 * the derived candidate set used to be EMPTY: on that drawing the steric test fell back
 * entirely to `identity.reactionCenters`, the authored field whose evasion this derivation
 * was added to close. The forming arrow still names the attacked carbon there, and it names
 * it in every drawing where a bond is formed to it, which is every substitution. So the
 * derivation no longer depends on the leaving group's arrow being present and readable.
 *
 * WHY WIDENING TO EVERY FORMED BOND IS SAFE HERE, WHICH IT WOULD NOT BE EVERYWHERE.
 *
 * The known limit note on the SN2 prime fixture predicted the cost as "also testing atoms
 * new bonds form to in ordinary addition chemistry where that carbon is never a
 * backside-attack trajectory question at all". That cost is not paid, because the caller
 * has already filtered: `find` only reaches steps that `isSn2Substitution` accepts, which is
 * `concerted_substitution` on route `sn2` and nothing else. No addition, no carbonyl attack,
 * and no proton transfer is ever handed to this function. Widening it inside that gate adds
 * candidate atoms only in substitutions.
 *
 * Measured over the corpus a second time: the only non carbon atoms this widening adds are
 * a bromide in an arrow legality negative control and a hydrogen in an elementarity negative
 * control, and `hinderedCentres` drops both at its element test before any steric question
 * is asked.
 *
 * Empty when any arrow reference does not resolve. A set of atoms assembled from arrows
 * pointing at nothing is smaller than the truth, and `conservation-arrow-legality` reports
 * the dangling reference with a better message.
 */
function arrowDerivedCentres(step: MechanismStep): readonly string[] {
  const facts = stepArrowFacts(step);
  if (!facts.allReferencesResolve) return [];
  return [
    ...bondFormations(facts).map((formation) => formation.acceptorId),
    ...heavySigmaDepartures(step, facts).map((departure) => departure.retainedId),
  ];
}

/**
 * A quaternary wall behind the carbon under attack, read off the graph of the `from` state.
 *
 * THE MODEL, WHICH IS THE GEOMETRY AND NOT THE CANONICAL EXAMPLE.
 *
 *   The carbon under attack has at least one carbon neighbour that carries three further
 *   carbons.
 *
 * That neighbour is a quaternary carbon, and it sits across the trajectory a nucleophile
 * has to travel to reach the backside of the attacked carbon. Three carbon substituents on
 * it, whichever way it turns, and one of them is always in the way. Nothing else is
 * required and nothing else is asserted. Implicit hydrogens are not consulted: what blocks
 * the trajectory is carbon substituents, and a count of them is the same number whether the
 * remaining hydrogens are drawn or implied.
 *
 * WHAT THIS REPLACED, AND WHY THE OLD SHAPE WAS THE WRONG ONE.
 *
 * The rule used to open with `if (alphaCarbons.length !== 1) continue`, which required the
 * attacked carbon to be PRIMARY before the beta test ran at all. That is not a steric model,
 * it is a transcription of the one worked example: neopentyl bromide, whose CH2 happens to
 * have exactly one carbon neighbour. The third pass adversary filed
 * `broken-known-limit-sn2-at-a-secondary-carbon-directly-adjacent-to-a-quaternary-carbon-not-recognised-as-hindered`,
 * which is 3-bromo-2,2-dimethylbutane: the attacked carbon carries the same quaternary
 * carbon behind it AND a methyl of its own, so it is at least as blocked as neopentyl and it
 * was skipped before the beta test could run, because two carbon neighbours is not one.
 *
 * Counting the attacked carbon's own neighbours as a REASON TO STOP LOOKING had the sign
 * backwards. Alpha branching adds to hindrance, it does not remove it. So the gate is gone
 * and the neighbour count is kept only as something to report, since it is what tells a
 * reader whether they are looking at neopentyl or at something worse.
 *
 * WHAT IS DELIBERATELY NOT WIDENED WITH IT. The threshold of three further carbons on the
 * neighbour stays exactly where it was. Beta branching short of quaternary, isobutyl for
 * instance, is disfavoured by roughly 10^-2 rather than 10^-5 and is not what CLAUDE.md's
 * paragraph is about; lowering the three would start demanding an annotation on ordinary
 * chemistry, which is the failure mode that matters most here. Alpha branching ALONE, a
 * plain secondary or tertiary centre with no quaternary neighbour, is still not detected by
 * this rule: a tertiary SN2 centre has its own cause, `sn2_at_tertiary_center`, and its own
 * rule to be written, and borrowing this one for it would report the wrong reason.
 *
 * Tested at every carbon the arrows name AND every carbon the author declared, so neither
 * record alone can hide the pattern. See the docstring at the top of this file.
 */
function hinderedCentres(step: MechanismStep): readonly HinderedCentre[] {
  const found: HinderedCentre[] = [];
  const derived = new Set<string>(arrowDerivedCentres(step));
  const declared = new Set<string>(step.identity.reactionCenters);
  const candidates = new Set<string>([...derived, ...declared]);

  for (const atomId of candidates) {
    const source =
      derived.has(atomId) && declared.has(atomId)
        ? "named by the arrows and declared a reaction centre"
        : derived.has(atomId)
          ? "named by the arrows as the atom a bond is being formed to, or the atom the leaving group left, whatever identity.reactionCenters says"
          : "declared a reaction centre";
    const species = speciesContaining(step.from, atomId);
    if (species === undefined) continue;
    if (findAtom(species, atomId)?.element !== "C") continue;

    const alphaCarbons = carbonNeighbours(species, atomId);
    const quaternaryNeighbourIds = alphaCarbons.filter(
      (neighbourId) =>
        carbonNeighbours(species, neighbourId).filter((further) => further !== atomId).length >= 3,
    );
    if (quaternaryNeighbourIds.length === 0) continue;

    found.push({
      step,
      species,
      atomId,
      quaternaryNeighbourIds,
      alphaCarbonCount: alphaCarbons.length,
      source,
    });
  }

  found.sort((left, right) => left.atomId.localeCompare(right.atomId));
  return found;
}

/**
 * Route ids named anywhere in the annotation, as whole words.
 *
 * Word boundaries matter: without them "sn1" would match inside a longer identifier and
 * "oxidation" inside "deoxidation". Route ids are the vocabulary because they are the
 * closed union; a label such as "carbocation rearrangement" is prose for a reader, and the
 * id is what another tool can look up.
 */
function routesNamedIn(text: string): readonly MechanismRoute[] {
  const haystack = text.toLowerCase();
  return allMechanismRoutes().filter((route) =>
    new RegExp(`(^|[^a-z0-9_])${route}([^a-z0-9_]|$)`).test(haystack),
  );
}

function competingRouteViolations(
  pathway: MechanismPathway,
  where: string,
  disfavouredRoute: string,
): Violation[] {
  const violations: Violation[] = [];

  for (const [index, annotation] of annotationsOfKind(pathway, "rate_comparison").entries()) {
    const named = routesNamedIn(`${annotation.value} ${annotation.justification}`).filter(
      (route) => route !== disfavouredRoute,
    );

    if (named.length === 0) {
      violations.push({
        where: `${where} / annotation[${index}] kind rate_comparison`,
        expected:
          "the competing pathway named by its chem-core MechanismRoute id, so it can be looked " +
          "up rather than only read",
        actual:
          `neither the value nor the justification names a route other than ${disfavouredRoute}. ` +
          `CLAUDE.md: the engine "says strongly disfavored, competing pathway likely AND NAMES ` +
          `THE COMPETING PATHWAY, because the methyl shift to a tertiary cation is the actual ` +
          `lesson". Saying only that this is slow leaves out the half that teaches`,
        cause: CAUSE,
      });
      continue;
    }

    // Rule 4. Every route named has to be one the engine names for this same cause.
    const believed = competingRoutesFor(CAUSE);
    const unbelieved = named.filter((route) => !believed.includes(route));
    if (unbelieved.length === 0) continue;

    violations.push({
      where: `${where} / annotation[${index}] kind rate_comparison`,
      expected:
        `the competing pathway to be one of [${believed.join(", ")}], which is what the engine's ` +
        `own copy for ${CAUSE} names as the route that outruns this one`,
      actual:
        `it names ${unbelieved.join(", ")}. That is a real MechanismRoute id, which is all rule 3 ` +
        `asked for, and it is not the route this repository says wins here. The two records ` +
        `disagree and one of them teaches the wrong lesson. If ${unbelieved.join(", ")} really ` +
        `is a competing pathway for a strongly hindered SN2 centre, add it to competingRoutes ` +
        `on ${CAUSE} in packages/feedback so both halves say so`,
      cause: "route_requires_conditions_not_present",
    });
  }

  return violations;
}

/**
 * One annotation per hindered STEP, not one per pathway.
 *
 * Same scoping defect, and same fix, as `conservation-stereorandom-annotation` carried:
 * two hindered substitutions in one pathway are two separate claims to make, and counting
 * `rate_comparison` annotations pathway wide would both reject two correct ones and accept
 * one covering two steps. `authoring.ts` owns the binding. No fixture in the corpus has two
 * hindered steps today, so nothing on disk changes shape; the rule is here so that the
 * first one to arrive is scoped correctly rather than being the fixture that finds this.
 *
 * A step with two hindered centres is still one occurrence. The annotation is about the
 * step's rate, and a step has one.
 */
const find: ViolationFinder = (fixture) => {
  const pathway = fixture.pathway;
  const perStep = pathway.steps
    .filter((step) => isSn2Substitution(step, pathway))
    .map((step) => ({ step, centres: hinderedCentres(step) }))
    .filter((entry) => entry.centres.length > 0);

  if (perStep.length === 0) return [];

  const degreeOf = (count: number): string =>
    count <= 1 ? "primary" : count === 2 ? "secondary" : count === 3 ? "tertiary" : "quaternary";

  const describe = (centres: readonly HinderedCentre[]): string =>
    centres
      .map(
        (centre) =>
          `atom ${centre.atomId} (${centre.source}; ${degreeOf(centre.alphaCarbonCount)}, and ` +
          `neighbour(s) ${centre.quaternaryNeighbourIds.join(", ")} each carry three further ` +
          `carbons)`,
      )
      .join(" and ");

  const occurrences: AnnotationOccurrence[] = perStep.map((entry) => ({
    stepId: entry.step.id,
    where: `pathway ${pathway.id} / strongly hindered SN2 at ${entry.step.id} ${describe(entry.centres)}`,
  }));

  const where = occurrences.map((occurrence) => occurrence.where).join("; ");

  const violations: Violation[] = [];
  violations.push(
    ...requiredAnnotationViolations(pathway, {
      kind: "rate_comparison",
      cause: CAUSE,
      occurrences,
      because:
        "the attacked carbon has a quaternary carbon behind it, the neopentyl geometry, " +
        "which reacts by SN2 roughly 10^-5 as fast as ethyl, and slower still when the " +
        "attacked carbon carries substituents of its own. CLAUDE.md says this is " +
        "NOT blocked and that the engine states how disfavoured it is and names the competing " +
        "pathway. Nothing here rejects the step; what is missing is the statement",
    }),
  );
  violations.push(...competingRouteViolations(pathway, where, "sn2"));

  return violations;
};

export const conservationDisfavouredRateComparison: Check = conservationCheck({
  name: "conservation-disfavoured-rate-comparison",
  description:
    "a strongly hindered SN2 centre detected from the structure is permitted, never blocked, and carries exactly one authored rate_comparison annotation naming a competing MechanismRoute by id that the engine own copy for this cause also names",
  find,
});
