import type { ElementaryStepKind, MechanismStep } from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import {
  heavySigmaDepartures,
  hydrogenMigrations,
  stepArrowFacts,
  type StepArrowFacts,
} from "./arrow-facts.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 11. What the step SAYS it is, against what its arrows SHOW it is.
 *
 * THE HOLE THIS CLOSES, IN THE PHASE 1 ADVERSARY'S WORDS.
 *
 *   "Nothing anywhere cross validates identity.elementaryStep against what the arrows and
 *   states actually describe. It is enum checked, then used to gate the annotation checks
 *   by exact string match. A pi bond attack mislabelled bond_homolysis, or an E2
 *   mislabelled proton_transfer, passes identically."
 *
 * step.ts predicted the shape of this check before the gap was found. It says
 * `reactionCenters` is "named explicitly rather than derived from the arrows, so that a
 * step whose arrows are wrong can still be talked about", and then: "the disagreement
 * between these and the arrow endpoints is itself informative". Nothing was reading that
 * disagreement. This file reads it.
 *
 * THE DESIGN, AND THE ONE DECISION EVERYTHING ELSE FOLLOWS FROM.
 *
 * This check does NOT classify a step. It does not compute "this is really a hydride
 * shift" and compare that against the label, because for most of the eighteen
 * `ElementaryStepKind` members the arrows genuinely do not determine which one applies,
 * and a classifier forced to pick would be wrong on correct chemistry. Instead it holds a
 * short list of NECESSARY CONDITIONS, each one a property the arrows must have if the
 * declared kind is true, each one separately defensible, and each one with its own
 * negative control on disk. A kind no condition mentions is a kind this check says nothing
 * about, and that is a documented blind spot rather than a silent pass.
 *
 * WHAT IT CAN DISCRIMINATE.
 *
 *   1. A hydride from a proton. THE case the adversary named. The difference is whether
 *      the hydrogen's own bonding pair moved with it, and the arrows declare exactly that:
 *      the bond forming arrow pivots on the hydrogen (carried, a hydride) or on the
 *      acceptor (donated, a proton). See `hydrogenMigrations`.
 *   2. Radical from polar. A fishhook is one electron and a curved arrow is two, and the
 *      count is on the arrow. A step declared `proton_transfer` cannot be drawn with
 *      fishhooks and a step declared `bond_homolysis` cannot be drawn without them.
 *   3. A proton transfer from an elimination or a substitution. A plain proton transfer
 *      moves a proton. If a heavy atom sigma bond also breaks completely in the same step
 *      and its pair localises as a lone pair, something left, and the step is at least an
 *      elimination. This is what catches an E2 mislabelled `proton_transfer`.
 *   4. Whether the declared reaction centres are the atoms the arrows actually touch. Not
 *      a step kind, the other half of the same field, and the thing that lets a
 *      periplarity declaration be about an unrelated part of the molecule.
 *
 * WHAT IT CANNOT DISCRIMINATE, STATED SO A GREEN RUN IS NOT READ AS MORE.
 *
 *   `nucleophilic_attack` from `coordination` from `ring_closure`. All three are a lone
 *   pair forming a new sigma bond. Which one it is depends on whether the two atoms were
 *   already in one molecule and on what the resulting bond is called, and the third of
 *   those is nomenclature rather than electron flow.
 *
 *   `bond_heterolysis` from `leaving_group_departure`. Identical arrows,
 *   bond(A-B) -> atom(B). The corpus uses the first when the fragment is the point and the
 *   second when the substrate is, and no arrow says which.
 *
 *   `hydride_shift` from an intermolecular hydride delivery. Both are a hydrogen carrying
 *   its pair. `good-hydride-transfer-from-borohydride-to-acetone` declares
 *   `nucleophilic_attack` for exactly that reason and is correct to. Only the reverse
 *   direction is asserted here: a carried hydride is never a `proton_transfer`.
 *
 *   `concerted_substitution` from a two step sequence drawn as one, `pi_bond_attack` from
 *   any other use of a pi bond as a nucleophile, `tautomerisation` from the proton
 *   transfer it is made of, `alkyl_shift` from `ring_contraction` chemistry the corpus
 *   does not yet contain, and every pericyclic kind. None of these are attempted.
 *
 * WHEN THIS CHECK STANDS DOWN ENTIRELY.
 *
 * A step with no arrows says nothing about electron flow, so nothing here can contradict
 * its label. `conservation-electron-flow` is the check that fires on a structural change
 * with no arrows behind it, and it does. A step whose arrow references do not resolve is
 * `conservation-arrow-legality`'s finding; a set of touched atoms assembled from arrows
 * pointing at nothing is smaller than the truth, and asserting against it would report a
 * grounding failure that is really a dangling reference.
 *
 * THE CAUSE IDS, WHICH WERE A KNOWN IMPRECISION AND ARE NOT ONE ANY MORE.
 *
 * This file previously pointed every violation it raised at `step_not_elementary`, because
 * chem-core's registry had no cause for "the declared step kind contradicts the electron
 * flow" and that was the nearest member. It was the wrong sentence: its student copy says
 * several separate steps are drawn as one, which tells a student who drew one correct step
 * and named it wrong that their drawing has too many steps in it. chem-core now carries
 * two causes for what this file actually finds, and they are used below.
 *
 * Three of the four conditions here are the same complaint, "the kind you declared is not
 * the kind your arrows describe", so they share `step_kind_disagrees_with_arrows`. The
 * reaction centre rule is not about the step's kind at all, it is about the other field of
 * `identity`, so it carries `reaction_center_not_touched_by_any_arrow` instead. Filing it
 * under a kind mismatch would repeat, one size smaller, exactly the mistake being fixed.
 * The fishhook rule keeps its own exact cause: a radical arrow in a polar step is an
 * arrow level defect and `radical_arrow_used_in_polar_step` already names it.
 */

/**
 * The cause for a declared kind the arrows contradict.
 *
 * Carried by the hydrogen rules, the departure rule, and the polar arrows in a radical
 * step rule. Not by the reaction centre rule, which is a different claim, and not by the
 * fishhook rule, which has an exact cause of its own.
 */
const MISLABELLED = "step_kind_disagrees_with_arrows";

/**
 * The cause for a declared reaction centre no arrow touches.
 *
 * `identity.reactionCenters` is authored rather than derived, which is what makes this
 * disagreement possible and what makes it worth naming separately from the kind.
 */
const UNGROUNDED_CENTRE = "reaction_center_not_touched_by_any_arrow";

/**
 * Kinds that are radical by definition. Every one of them moves single electrons.
 *
 * `ring_opening`, `ring_closure` and `pericyclic_step` are deliberately in neither list.
 * A ring can open heterolytically, as the bromonium fixtures do, or homolytically, and the
 * name does not say which.
 */
const RADICAL_ONLY: Readonly<Partial<Record<ElementaryStepKind, true>>> = Object.freeze({
  bond_homolysis: true,
  radical_addition_step: true,
  radical_abstraction: true,
  radical_recombination: true,
});

/** Kinds that move pairs by definition. A fishhook in one of these is a contradiction. */
const POLAR_ONLY: Readonly<Partial<Record<ElementaryStepKind, true>>> = Object.freeze({
  proton_transfer: true,
  nucleophilic_attack: true,
  leaving_group_departure: true,
  concerted_substitution: true,
  concerted_elimination: true,
  bond_heterolysis: true,
  pi_bond_attack: true,
  hydride_shift: true,
  alkyl_shift: true,
  coordination: true,
  tautomerisation: true,
});

/**
 * Kinds whose whole content is that a proton moved.
 *
 * `tautomerisation` is here with `proton_transfer` because the corpus draws it as a
 * deprotonation with the pi system moving alongside, and the hydrogen in it is a proton in
 * exactly the same sense.
 */
const PROTON_KINDS: Readonly<Partial<Record<ElementaryStepKind, true>>> = Object.freeze({
  proton_transfer: true,
  tautomerisation: true,
});

function reactionCentreViolations(step: MechanismStep, facts: StepArrowFacts): Violation[] {
  const ungrounded = step.identity.reactionCenters.filter(
    (atomId) => !facts.touchedAtomIds.has(atomId),
  );
  if (ungrounded.length === 0) return [];

  return [
    {
      where: `${step.id}.identity.reactionCenters`,
      expected:
        "every declared reaction centre to be an atom some arrow starts on, lands on, or " +
        "bonds. The arrows are where the step happens",
      actual:
        `${ungrounded.join(", ")} ${ungrounded.length === 1 ? "is" : "are"} named as a reaction ` +
        `centre and no arrow touches ${ungrounded.length === 1 ? "it" : "them"}. The arrows touch ` +
        `{${[...facts.touchedAtomIds].sort().join(", ")}}. reactionCenters is authored rather ` +
        `than derived, and anything that reads it, the E2 torsion declaration above all, is ` +
        `then reasoning about atoms this step never acted on`,
      cause: UNGROUNDED_CENTRE,
    },
  ];
}

function polarityViolations(step: MechanismStep, facts: StepArrowFacts): Violation[] {
  const kind = step.identity.elementaryStep;
  const fishhooks = facts.arrows
    .filter((resolved) => resolved.arrow.electrons === 1)
    .map((resolved) => resolved.arrow.id);

  if (POLAR_ONLY[kind] === true && facts.radicalEvidence) {
    return [
      {
        where: `${step.id} declared ${kind}`,
        expected: "every arrow in a polar step to move a pair of electrons",
        actual:
          (fishhooks.length > 0
            ? `arrow(s) ${fishhooks.join(", ")} move one electron each`
            : "an arrow starts on a single unpaired electron") +
          `. A ${kind} is a two electron step by definition, so single electron flow here is ` +
          `either the wrong arrows or the wrong label`,
        cause: "radical_arrow_used_in_polar_step",
      },
    ];
  }

  if (RADICAL_ONLY[kind] === true && !facts.radicalEvidence) {
    return [
      {
        where: `${step.id} declared ${kind}`,
        expected:
          "at least one single electron arrow, a fishhook, since this kind of step moves " +
          "electrons one at a time",
        actual:
          `all ${facts.arrows.length} arrow(s) here move pairs. Two electrons leaving together ` +
          `is heterolysis, whatever the step is called: the pair ends up on one atom and the ` +
          `other is left an ion, not a radical`,
        cause: MISLABELLED,
      },
    ];
  }

  return [];
}

function hydrogenViolations(step: MechanismStep, facts: StepArrowFacts): Violation[] {
  const kind = step.identity.elementaryStep;
  const violations: Violation[] = [];

  for (const migration of hydrogenMigrations(step, facts)) {
    const where =
      `${step.id} declared ${kind} / hydrogen ${migration.hydrogenId} moved from ` +
      `${migration.leftId} to ${migration.arrivedId}`;

    if (PROTON_KINDS[kind] === true && migration.mode === "carried") {
      violations.push({
        where,
        expected:
          `the acceptor ${migration.arrivedId} to supply the electrons for the new bond, which ` +
          `is what makes the moving hydrogen a proton`,
        actual:
          `the bond forming arrow starts on the ${migration.leftId} to ${migration.hydrogenId} ` +
          `bond and pivots on ${migration.hydrogenId}, so the hydrogen took its own bonding pair ` +
          `with it. That is a hydride, not a proton: ${migration.leftId} is left two electrons ` +
          `short and ${migration.arrivedId} gains a bond it paid nothing for`,
        cause: MISLABELLED,
      });
    }

    if (kind === "hydride_shift" && migration.mode === "donated") {
      violations.push({
        where,
        expected:
          `the ${migration.leftId} to ${migration.hydrogenId} bonding pair to travel with the ` +
          `hydrogen, which is what a hydride is`,
        actual:
          `the bond forming arrow starts on ${migration.arrivedId} and pivots there, so the ` +
          `acceptor supplied both electrons and the hydrogen moved as a bare proton. The ` +
          `bonding pair stayed behind on ${migration.leftId}`,
        cause: MISLABELLED,
      });
    }
  }

  return violations;
}

function departureViolations(step: MechanismStep, facts: StepArrowFacts): Violation[] {
  const kind = step.identity.elementaryStep;
  if (PROTON_KINDS[kind] !== true) return [];

  const departures = heavySigmaDepartures(step, facts);
  if (departures.length === 0) return [];

  return departures.map((departure) => ({
    where: `${step.id} declared ${kind} / arrow ${departure.arrowId}`,
    expected:
      "a proton transfer to move a proton and nothing else. The only bond that fully breaks " +
      "is the one to the hydrogen",
    actual:
      `the single bond ${departure.retainedId} to ${departure.departingId} also breaks ` +
      `completely, with both electrons localising on ${departure.departingId}. That is a ` +
      `leaving group departing in the same transition state, which makes this an elimination ` +
      `or a substitution rather than a proton transfer. Neither end of that bond is hydrogen, ` +
      `so it is not the other half of the transfer`,
    cause: MISLABELLED,
  }));
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];

  for (const step of fixture.pathway.steps) {
    if (step.arrows.length === 0) continue;
    const facts = stepArrowFacts(step);
    if (!facts.allReferencesResolve) continue;

    violations.push(...reactionCentreViolations(step, facts));
    violations.push(...polarityViolations(step, facts));
    violations.push(...hydrogenViolations(step, facts));
    violations.push(...departureViolations(step, facts));
  }

  return violations;
};

export const conservationStepIdentity: Check = conservationCheck({
  name: "conservation-step-identity",
  description:
    "the declared elementaryStep and reactionCenters of every arrow bearing step are consistent with what its arrows describe: a proton is not a hydride, a radical step is not drawn with pairs, a proton transfer does not also expel a leaving group, and every reaction centre is an atom an arrow touches",
  find,
});
