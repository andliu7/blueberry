import type { MechanismPathway, MechanismStep } from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import {
  annotationVocabulary,
  requiredAnnotationViolations,
  type AnnotationOccurrence,
} from "./authoring.ts";
import { conservationCheck, type ViolationFinder } from "./family.ts";

/**
 * CHECK 8. An SN1 capture carries an authored racemisation annotation, and no check
 * anywhere asserts what it says.
 *
 * WHAT CLAUDE.md ASKS FOR, IN ITS OWN WORDS.
 *
 *   "SN1 is stereorandom at the reaction center, meaning both configurations appear in the
 *   product set. It is not asserted as 50:50. Ion pairing gives net inversion excess,
 *   commonly 50 to 80 percent racemization depending on substrate, solvent, and leaving
 *   group. Ratio is an authoring annotation, never a computed assertion."
 *
 * `docs/VERIFICATION.md` S1 is the same instruction with the consequence attached: a
 * validator asserting a 50:50 ratio fails on correct chemistry, and an app built on it
 * tells students something an instructor will mark wrong.
 *
 * So there are two halves and they pull in opposite directions. The ratio must be on
 * record, because a corpus that says nothing about the stereochemical outcome of an SN1 is
 * a corpus that will be read as claiming a single product. And the ratio must not be
 * checked, because there is no correct number to check it against.
 *
 * THIS CHECK ASSERTS, EXACTLY:
 *
 *   1. A pathway containing an SN1 capture step carries a `racemisation_ratio` annotation.
 *   2. There is exactly one of them PER CAPTURE STEP, not per pathway. See below.
 *   3. Its `value` is not empty.
 *   4. Its `justification` is not empty.
 *   5. Value and justification together name at least one atom id or species id from the
 *      capture step, so the claim is anchored to the centre it is about.
 *
 * WHY RULE 2 IS PER CAPTURE AND NOT PER PATHWAY, WHICH IS THE ADVERSARY'S SECOND PASS.
 *
 * It used to be per pathway, and that rejected correct chemistry.
 * `good-sn1-two-independent-captures-in-one-pathway-each-correctly-annotated` authors two
 * unrelated cations, the tert-butyl one and the butan-2-yl one, as the two steps of one
 * pathway, each carrying its own correctly grounded ratio. Both claims are true, neither is
 * about the other's centre, and the check rejected the file because it counted two
 * annotations of one kind and could not see that they were about two different things.
 * A check that rejects correct work is as serious a defect as one that accepts wrong work.
 *
 * The scope is now the capture step. Each capture needs exactly one ratio ABOUT IT, and an
 * annotation says which capture it is about by naming that step's id when the pathway has
 * more than one. `authoring.ts` owns that binding and documents what it costs. The
 * converse hole closes with it: two captures sharing one annotation used to pass, and now
 * the second capture reports that nothing on file is a claim about it.
 *
 * THIS CHECK DOES NOT ASSERT, AND MUST NEVER BE MADE TO:
 *
 *   any particular ratio, any range of ratios, that the ratio is 50:50, that it is not
 *   50:50, that the two configurations are present in equal amounts, or anything at all
 *   about what the words in `value` MEAN. A future edit that parses a number out of
 *   `value` and compares it against anything is the failure mode S1 was written to prevent,
 *   and it would be a weakening dressed as a strengthening.
 *
 * WHY RULE 5 IS NOT THAT EDIT.
 *
 * The Phase 1 adversary filed a capture whose ratio is the single character "x", justified
 * "y", and observed correctly that rules 1 to 4 are content blind and always were. Rule 5
 * does not read the ratio. It asks that the annotation NAME the site it is a claim about,
 * an atom id or a species id that is really in the step, which is a requirement about
 * reference and not about the number. Every honestly authored ratio in the corpus already
 * satisfies it, including the two that say "not applicable" and then name the carbon they
 * are not applicable at. Whether the stated range is right for this substrate, this
 * solvent, and this leaving group is exactly the judgement S1 says no check may make, and
 * it stays a human review gate.
 *
 * WHAT COUNTS AS AN SN1 CAPTURE, AND WHY THE TRIGGER IS THE CAPTURE RATHER THAN THE ROUTE.
 *
 * A `nucleophilic_attack` step on route sn1: the nucleophile arriving at the planar cation.
 * That step is where the product configuration is created, and it is therefore the only
 * place a stereochemical claim about the product can exist. An SN1 fragment that stops at
 * the carbocation, `good-heterolysis-of-protonated-tert-butanol` for instance, makes no
 * claim about a product configuration because it authors no product, and demanding a
 * racemisation ratio from it would be demanding an annotation about something the fixture
 * does not contain. The step's own `identity.route` is preferred over the pathway's, so a
 * capture drawn inside a longer mechanism is caught by the route it declares for itself.
 *
 * WHY A CENTRE THAT IS NOT STEREOGENIC STILL NEEDS THE ANNOTATION.
 *
 * Because this package cannot tell whether it is. The conservation fixture schema carries
 * no stereo configuration by design, so nothing here can compute that tert-butyl's cationic
 * carbon is not a stereocentre, and a check that tried would be reimplementing CIP in the
 * one package CLAUDE.md forbids it in. The requirement is therefore uniform: every SN1
 * capture states its stereochemical outcome, and "not applicable, this centre is not
 * stereogenic" is a perfectly good authored value. That is a statement a human made and
 * can be held to, which is exactly what the annotation is for. The alternative, exempting
 * fixtures that look achiral to a check that cannot see chirality, is an exemption granted
 * by a guess.
 */

const CAUSE = "stereochemistry_asserted_as_single_product_at_sn1_center";

function isSn1Capture(step: MechanismStep, pathway: MechanismPathway): boolean {
  if (step.identity.elementaryStep !== "nucleophilic_attack") return false;
  return (step.identity.route ?? pathway.route) === "sn1";
}

const find: ViolationFinder = (fixture) => {
  const pathway = fixture.pathway;
  const captures = pathway.steps.filter((step) => isSn1Capture(step, pathway));
  if (captures.length === 0) return [];

  const occurrences: AnnotationOccurrence[] = captures.map((step) => ({
    stepId: step.id,
    where: `pathway ${pathway.id} / SN1 capture at ${step.id}`,
    // The claim is about the configuration this capture creates, so the names it may be
    // anchored to are the ones in the two states of this capture and no others.
    vocabulary: annotationVocabulary([step.from, step.to]),
  }));

  return requiredAnnotationViolations(pathway, {
    kind: "racemisation_ratio",
    cause: CAUSE,
    occurrences,
    because:
      "the nucleophile arrives at a planar cation, so both configurations appear in the " +
      "product set and the fixture is silent about which. CLAUDE.md makes the ratio an " +
      "authoring annotation and never a computed assertion, so it has to be written down " +
      "here or it exists nowhere. No check reads what it says",
  });
};

export const conservationStereorandomAnnotation: Check = conservationCheck({
  name: "conservation-stereorandom-annotation",
  description:
    "every SN1 capture step carries exactly one authored racemisation_ratio annotation with a value, a justification, and a named atom or species from the step it is about, and no check asserts any particular ratio",
  find,
});
