import fs from "node:fs";
import path from "node:path";

import type { AuthoredAnnotation, MechanismPathway } from "@blueberry/chem-core";
import { describe, expect, it } from "vitest";

import {
  requiredAnnotationViolations,
  type AnnotationOccurrence,
} from "../src/checks/conservation/authoring.ts";
import { isConservationFamilyCheck } from "../src/checks/conservation/family.ts";
import { parseFixture } from "../src/checks/conservation/fixture-schema.ts";
import { conservationPeriplanarityDeclaration } from "../src/checks/conservation/periplanarity.ts";
import { FIXTURES_DIR } from "../src/paths.ts";

/**
 * ADVERSARY PASS THREE, PHASE 1, ITEM 2 IN THE BRIEF: "Can you make one annotation satisfy
 * two occurrences?"
 *
 * The corpus fixture
 * `broken-known-limit-one-racemisation-ratio-annotation-naming-both-sn1-captures-satisfies-both-occurrences`
 * is the finding as filed, and it proves the rule fires through
 * `conservation-stereorandom-annotation`. This file proves two things that fixture cannot.
 *
 * FIRST, THAT THE RULE IS THE ONE IN authoring.ts AND NOT ONE COPIED INTO ONE CHECK. The
 * tests below call `requiredAnnotationViolations` directly with a synthetic two occurrence
 * requirement, which is the shared function both annotation checks state their requirement
 * through. Whatever it decides is what both of them decide.
 *
 * SECOND, THAT THE PERIPLANARITY TWIN IS CLOSED BY THE SAME EDIT. The adversary deliberately
 * did not file a second fixture for `conservation-periplanarity-declaration`, on the grounds
 * that it is the identical shared code path and a second fixture would raise the fixture
 * count without raising the coverage. That reasoning is accepted and no second fixture was
 * written. It is verified instead, end to end and against the real check: the last test
 * loads the committed two syn elimination fixture through the real fixture parser, merges
 * its two correctly bound annotations into one annotation that names both eliminations, and
 * runs `conservationPeriplanarityDeclaration.find` over the result. Nothing is added to
 * fixtures/ and the fixture count does not move.
 *
 * WHAT THE RULE IS, RESTATED SO A FAILURE HERE IS READABLE WITHOUT OPENING authoring.ts.
 * One annotation is one claim, and one claim is about exactly one occurrence. An annotation
 * naming two occurrences is not two claims; it is one claim that does not say which place it
 * is for, so it satisfies neither. It is deliberately not consumed by the first occurrence
 * it names, nor the last, nor the nearest: those are position heuristics that silently pick
 * a subject, and the pass before this one rejected them for that reason.
 */

function pathwayWith(annotations: readonly AuthoredAnnotation[]): MechanismPathway {
  return { id: "synthetic-pathway", annotations } as unknown as MechanismPathway;
}

function annotation(value: string, justification: string): AuthoredAnnotation {
  return { kind: "racemisation_ratio", value, justification } as AuthoredAnnotation;
}

const TWO_OCCURRENCES: readonly AnnotationOccurrence[] = [
  { stepId: "step-1-capture-a", where: "capture at step-1-capture-a" },
  { stepId: "step-2-capture-b", where: "capture at step-2-capture-b" },
];

const ONE_OCCURRENCE: readonly AnnotationOccurrence[] = [
  { stepId: "step-1-capture-a", where: "capture at step-1-capture-a" },
];

function violationsFor(
  annotations: readonly AuthoredAnnotation[],
  occurrences: readonly AnnotationOccurrence[],
): readonly { readonly where: string; readonly actual: string }[] {
  return requiredAnnotationViolations(pathwayWith(annotations), {
    kind: "racemisation_ratio",
    cause: "stereochemistry_asserted_as_single_product_at_sn1_center",
    occurrences,
    because: "the requirement, restated verbatim into the failure line.",
  });
}

describe("one annotation is one claim about one occurrence", () => {
  it("an annotation naming BOTH occurrences satisfies neither, and both report it", () => {
    const violations = violationsFor(
      [
        annotation(
          "At step-1-capture-a not applicable, and at step-2-capture-b net inversion excess.",
          "One note covering step-1-capture-a and step-2-capture-b together.",
        ),
      ],
      TWO_OCCURRENCES,
    );

    expect(violations).toHaveLength(2);
    expect(violations.map((violation) => violation.where).sort()).toEqual([
      "capture at step-1-capture-a",
      "capture at step-2-capture-b",
    ]);
    // Each failure line names the OTHER step the same sentence also covers, so the remedy
    // is legible from the line alone: split it into one annotation per place.
    expect(violations[0]?.actual).toContain("also names step-2-capture-b");
    expect(violations[1]?.actual).toContain("also names step-1-capture-a");
  });

  it("two annotations, one naming each occurrence, still pass", () => {
    expect(
      violationsFor(
        [
          annotation("Not applicable at step-1-capture-a.", "Because of step-1-capture-a."),
          annotation("Net inversion excess at step-2-capture-b.", "Because of step-2-capture-b."),
        ],
        TWO_OCCURRENCES,
      ),
    ).toEqual([]);
  });

  it("two annotations naming the SAME occurrence are still the duplicate failure, unchanged", () => {
    const violations = violationsFor(
      [
        annotation("First claim about step-1-capture-a.", "One."),
        annotation("Second claim about step-1-capture-a.", "Two."),
      ],
      TWO_OCCURRENCES,
    );

    // step-1 is annotated twice, step-2 is annotated not at all. Two separate findings, and
    // the first of them is the pre-existing duplicate rule saying what it always said.
    expect(violations).toHaveLength(2);
    expect(violations[0]?.actual).toContain("2 of them");
    expect(violations[1]?.actual).toContain("none of them names this step");
  });

  it("an annotation naming NEITHER occurrence is still unbound, and neither place is covered", () => {
    const violations = violationsFor(
      [annotation("A claim about nothing in particular.", "No step named.")],
      TWO_OCCURRENCES,
    );

    expect(violations).toHaveLength(3);
    expect(violations.some((violation) => violation.actual.includes("it names none of them"))).toBe(
      true,
    );
  });

  it("with ONE occurrence the binding stays implicit and naming nothing is still fine", () => {
    // The common case, and every single occurrence fixture in the corpus. There is only one
    // thing the claim could be about, so no step id has to be written and nothing here
    // added a burden to files that were already correct.
    expect(
      violationsFor(
        [annotation("Not 50:50, net inversion excess.", "Ion pairing.")],
        ONE_OCCURRENCE,
      ),
    ).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------
 * The periplanarity twin, verified end to end rather than assumed.
 * ---------------------------------------------------------------------------------- */

const TWIN_FIXTURE =
  "good-e2-two-independent-syn-periplanar-eliminations-each-with-its-own-conformational-justification";

function loadTwin(): ReturnType<typeof parseFixture> {
  const absolute = path.join(FIXTURES_DIR, `${TWIN_FIXTURE}.fixture.json`);
  return parseFixture(fs.readFileSync(absolute, "utf8"), absolute, `fixtures/${TWIN_FIXTURE}`);
}

function periplanarityViolations(fixture: ReturnType<typeof parseFixture>): readonly {
  readonly actual: string;
  readonly cause: string;
}[] {
  if (!isConservationFamilyCheck(conservationPeriplanarityDeclaration)) {
    throw new Error("conservation-periplanarity-declaration carries no violation finder");
  }
  return [...conservationPeriplanarityDeclaration.find(fixture)];
}

describe("conservation-periplanarity-declaration is closed by the same edit, no second fixture", () => {
  it("the committed fixture, two syn eliminations with one justification each, is still green", () => {
    expect(periplanarityViolations(loadTwin())).toEqual([]);
  });

  it("merging those two justifications into one annotation naming both eliminations now fails at both", () => {
    const fixture = loadTwin();
    const authored = fixture.pathway.annotations ?? [];
    expect(authored).toHaveLength(2);

    const first = authored[0] as AuthoredAnnotation;
    const second = authored[1] as AuthoredAnnotation;
    // Concatenation rather than invention. The merged annotation therefore names both step
    // ids and both cages' atoms, so it is fully grounded and the only thing wrong with it is
    // that it is one claim standing in for two.
    const merged: AuthoredAnnotation = {
      kind: "conformational_justification",
      value: `${first.value} ${second.value}`,
      justification: `${first.justification} ${second.justification}`,
    } as AuthoredAnnotation;

    const collapsed = {
      ...fixture,
      pathway: { ...fixture.pathway, annotations: [merged] },
    } as ReturnType<typeof parseFixture>;

    const violations = periplanarityViolations(collapsed);
    expect(violations).toHaveLength(2);
    for (const violation of violations) {
      expect(violation.cause).toBe("e2_syn_periplanar_unjustified");
      expect(violation.actual).toContain("also names");
    }
  });
});
