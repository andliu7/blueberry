import type { AuthoredAnnotation, MechanismPathway, MechanismState, Species } from "@blueberry/chem-core";

import type { Violation } from "./family.ts";

/**
 * Shared machinery for the three schema v2 annotation checks. No chemistry decisions here.
 *
 * WHAT AN ANNOTATION CHECK IS ALLOWED TO ASSERT, WHICH IS THE WHOLE DESIGN.
 *
 * It asserts that a human wrote something down. It never asserts what they wrote. CLAUDE.md
 * draws that line twice and `docs/VERIFICATION.md` S1 draws it a third time: the SN1
 * racemisation ratio "is an authoring annotation, never a computed assertion", and a
 * validator asserting 50:50 "fails on correct chemistry, and an app built on it tells
 * students something an instructor will mark wrong". So these checks read `kind`, they read
 * whether `value` and `justification` are empty, and they count how many annotations of a
 * kind there are. They do not parse a ratio, compare a number, or grade prose.
 *
 * The exceptions are narrow, and each is stated where it happens. `rate-comparison.ts`
 * scans a justification for the name of a `MechanismRoute`, because "names the competing
 * pathway" is a requirement about naming and the set of route names is closed and finite.
 * `annotationGroundingViolations` below asks that a claim about a site names the site, by
 * atom id or species id. Neither grades the claim. Both check that a name from a known,
 * finite list is present, which is a requirement about reference rather than about
 * content, and the difference is the whole reason they are allowed here.
 *
 * The Phase 1 adversary showed why presence alone was not enough: an annotation of "z"
 * and "z" satisfied every rule in this file while saying nothing. The answer is not a
 * character count, which two words defeat. See the long note on
 * `annotationGroundingViolations`.
 *
 * WHY MORE THAN ONE ANNOTATION OF A REQUIRED KIND IS A FAILURE, AND WHY THAT SENTENCE
 * USED TO BE WRONG.
 *
 * Two racemisation ratios ABOUT THE SAME CENTRE are two authored claims about one thing,
 * and nothing downstream can pick between them. A reader takes the first, a renderer takes
 * the last, and neither is wrong about what the file says. One authored claim per place
 * that requires one keeps the annotation a statement rather than a menu.
 *
 * That was previously enforced by counting annotations PER PATHWAY, which is a different
 * and false rule: a pathway with two independent SN1 captures, each carrying its own
 * correctly grounded ratio, was rejected as though the two claims were about one cation.
 * `good-sn1-two-independent-captures-in-one-pathway-each-correctly-annotated` is that
 * fixture and it is correct chemistry, correctly annotated. CLAUDE.md treats a check that
 * rejects correct work exactly as seriously as one that accepts wrong work, so the scope
 * is now the OCCURRENCE rather than the pathway. See `AnnotationOccurrence`.
 *
 * The same defect existed one check over in `periplanarity.ts`, which asked for a
 * `conformational_justification` once per syn periplanar E2 STEP while counting
 * annotations across the whole pathway. Both directions were wrong there: two justified
 * syn eliminations were rejected, and two syn eliminations sharing ONE justification were
 * accepted. Both call sites now pass their occurrence list here and both directions are
 * decided in this file, once.
 *
 * Kinds that no check requires, `condition_note` most of all, are not held to any of this
 * and may repeat freely.
 *
 * HOW AN ANNOTATION BINDS TO THE OCCURRENCE IT IS ABOUT.
 *
 * `AuthoredAnnotation` in chem-core is `{ kind, value, justification }`. It carries no
 * pointer to a step, so there is no structural field to read. The binding used here is the
 * one already available in the data: the annotation NAMES the step it is about, by step
 * id, in its value or its justification, exactly as the grounding rule below already
 * requires it to name an atom or a species. A name from a known finite list, present or
 * absent. Nothing about what the sentence says.
 *
 * When a pathway has exactly ONE occurrence of the requirement, the binding is implicit
 * and no step id is needed: there is only one thing the claim could be about. That keeps
 * every honestly authored single occurrence fixture in the corpus unchanged, and it is why
 * this rule adds no new burden to the common case. Two or more occurrences, and each
 * annotation has to say which one it is for.
 *
 * WHAT AN ANNOTATION NAMING TWO OCCURRENCES MEANS. IT MEANS THE FILE DOES NOT SAY.
 *
 * This is the third pass adversary's finding, and it is the third appearance of one defect.
 * The scope was wrong at pathway level, then wrong at occurrence level, and this is the
 * structural answer rather than a third patch at a third scope.
 *
 * The rule that used to be here filtered the occurrences an annotation names and then
 * pushed THE SAME annotation object onto each of their claim lists. One annotation naming
 * two step ids therefore satisfied "exactly one claim here" at both of them, and
 * `good-known-limit-one-racemisation-ratio-annotation-naming-both-sn1-captures-satisfies-both-occurrences`
 * is that file: one authored sentence covering an SN1 capture at a carbon that is not
 * stereogenic and an SN1 capture at a carbon with net inversion excess. Two chemically
 * distinct centres with two different correct answers, and one claim on file said to be
 * both of them.
 *
 * So the meaning enforced from here on is stated positively, and it is the only meaning
 * that survives the two answers being different:
 *
 *   ONE ANNOTATION IS ONE CLAIM, AND ONE CLAIM IS ABOUT EXACTLY ONE OCCURRENCE.
 *
 * An annotation that names two occurrences is not two claims. It is one claim that does not
 * say which place it is the claim for, which is the same failure as an annotation that
 * names none of them, arrived at from the other side. So it satisfies NEITHER occurrence,
 * and each occurrence it names reports that the only thing naming it is shared. The remedy
 * is in the failure line and it is the boring one: write one annotation per occurrence.
 *
 * Note what is deliberately NOT done. The annotation is not consumed by the first
 * occurrence it names, nor by the last, nor by the nearest. Those are the position
 * heuristics the pass before this one rejected, and they are rejected here for the same
 * reason: they silently pick a subject rather than reporting that the file does not name
 * one. Nothing about that reasoning is undone. What changes is only that "names two" now
 * resolves to zero satisfied occurrences instead of two.
 *
 * WHAT THIS BINDING COSTS, STATED RATHER THAN HIDDEN.
 *
 * An annotation whose prose names a SIBLING occurrence's step id, for contrast rather than
 * as its subject, binds to both and satisfies neither. When the sibling carries its own
 * annotation as well, the sibling reports two claims about it; when the sibling carries
 * nothing else, the sibling reports that the only thing naming it is shared. Either way the
 * remedy is the same and is in the failure line: name only the step this claim is about and
 * refer to the others by description. That is a real cost, and it is paid deliberately,
 * because the alternative readings, first id wins or last id wins, are position heuristics
 * that would silently pick a subject rather than reporting that the file does not say which.
 *
 * THE PRECONDITION THIS BINDING RESTS ON, AND WHERE IT IS ENFORCED.
 *
 * STEP IDS ARE UNIQUE WITHIN A PATHWAY. Every map and every filter below is keyed by
 * `occurrence.stepId`, a plain string copied from `step.id`, so two steps sharing an id
 * collapse into one key and the binding has no correct reading at all: an annotation naming
 * the shared id names both occurrences, is exclusive to neither, and two honestly written
 * annotations, one per cation, both fail. The fourth pass adversary filed exactly that
 * pathway and the suite went red on correct chemistry.
 *
 * It was an unstated assumption of this file and nothing anywhere enforced it. It is now
 * enforced in `parsePathway` in fixture-schema.ts, which refuses such a pathway before any
 * check reads it, and the long note there argues why the parser rather than a violation
 * finder: a duplicated step id corrupts no arithmetic, has no chem-core `CauseId`, and is a
 * defect in the FILE rather than in the chemistry the file describes. Nothing in THIS file
 * defends against it, deliberately: a second, silent stand down here would hide the case
 * from the place that reports it well. If a caller ever arrives from outside the fixture
 * corpus, Phase 2's student attempts for instance, that caller owes the same guarantee, and
 * this paragraph is where it is written down.
 *
 * THE STRUCTURAL ALTERNATIVE, WHICH IS NOT TAKEN HERE AND SHOULD BE LATER.
 *
 * The boring fix is a field: `AuthoredAnnotation.appliesTo?: StepId` in chem-core, a
 * fixture schema version bump to v3 to carry it, and a rule here that prefers the field
 * and falls back to the naming convention for annotations that omit it. That is a
 * chem-core change and this task does not own chem-core, so it is reported rather than
 * made. Until it exists, the binding is the naming convention above, and the convention
 * is enforced rather than assumed: an annotation that names no occurrence fails.
 */

export type AnnotationKind = AuthoredAnnotation["kind"];

export function annotationsOfKind(
  pathway: MechanismPathway,
  kind: AnnotationKind,
): readonly AuthoredAnnotation[] {
  return (pathway.annotations ?? []).filter((annotation) => annotation.kind === kind);
}

/**
 * One place in a pathway that requires one annotation of a kind.
 *
 * A capture step for a racemisation ratio, a syn periplanar elimination for a
 * conformational justification, a hindered substitution for a rate comparison. The step is
 * the unit because the step is what a caller can identify from the arrows, and because
 * every requirement in this family is triggered by a step.
 */
export interface AnnotationOccurrence {
  /** The step this occurrence is at. Its id is the name an annotation binds by. */
  readonly stepId: string;
  /** Human description of this occurrence, rendered into the failure line. */
  readonly where: string;
  /**
   * Names a claim about this occurrence may be grounded against, when the caller wants
   * the grounding rule applied. Undefined means this caller does not ask for grounding,
   * and no grounding failure is ever reported for it.
   */
  readonly vocabulary?: ReadonlySet<string>;
}

export interface RequiredAnnotation {
  readonly kind: AnnotationKind;
  /** The chem-core CauseId a missing, duplicated, or empty annotation maps to. */
  readonly cause: string;
  /** One sentence: why these places have to carry it. Rendered verbatim into the failure. */
  readonly because: string;
  /**
   * Every place in this pathway that requires one annotation of this kind.
   *
   * Never empty: a caller with nothing to require does not call this function at all.
   */
  readonly occurrences: readonly AnnotationOccurrence[];
}

/**
 * Does this text name this step id as a whole word?
 *
 * Separate from `namesIn` because the boundary class has to be different. Step ids are
 * hyphenated, and under `namesIn`'s boundaries "step-1" would match inside
 * "step-1-capture-tert-butyl", so naming one occurrence would silently bind to another
 * whose id happens to be a prefix. A hyphen is part of an id here, not a boundary.
 */
export function namesStep(text: string, stepId: string): boolean {
  if (stepId.trim() === "") return false;
  return new RegExp(`(^|[^A-Za-z0-9_-])${escapeForRegExp(stepId)}([^A-Za-z0-9_-]|$)`, "i").test(
    text,
  );
}

/**
 * The occurrences one annotation NAMES.
 *
 * One occurrence in the pathway: that one, implicitly. More than one: those whose step id
 * the annotation names.
 *
 * Naming is not the same as being the claim for. An annotation that names two occurrences
 * is the claim for neither, and that decision is made by the caller, not here, because it
 * is a rule about cardinality rather than about reading. See the binding note in the file
 * docstring.
 */
export function boundOccurrences(
  annotation: AuthoredAnnotation,
  occurrences: readonly AnnotationOccurrence[],
): readonly AnnotationOccurrence[] {
  if (occurrences.length <= 1) return occurrences;
  const text = `${annotation.value} ${annotation.justification}`;
  return occurrences.filter((occurrence) => namesStep(text, occurrence.stepId));
}

/**
 * The presence, scope, and shape rules every required annotation is held to.
 *
 * Missing, unbound, duplicated at one occurrence, missing at one occurrence, shared across
 * two occurrences and therefore the claim for neither, empty value, empty justification,
 * and, when the caller supplies a vocabulary, ungrounded. Nothing
 * about content. The parser accepts an empty string on purpose, following the spectator
 * declaration precedent, so that the negative control for the empty case can exist on
 * disk; this is the half that refuses it.
 */
export function requiredAnnotationViolations(
  pathway: MechanismPathway,
  required: RequiredAnnotation,
): readonly Violation[] {
  const found = annotationsOfKind(pathway, required.kind);
  const occurrences = required.occurrences;
  const violations: Violation[] = [];
  const everywhere = occurrences.map((occurrence) => occurrence.where).join("; ");

  if (found.length === 0) {
    violations.push({
      where: everywhere,
      expected:
        `an authored annotation of kind "${required.kind}" on pathway ${pathway.id}` +
        (occurrences.length === 1 ? "" : `, one for each of the ${occurrences.length} places above`),
      actual:
        `the pathway carries ${(pathway.annotations ?? []).length === 0 ? "no annotations at all" : `kinds [${(pathway.annotations ?? []).map((annotation) => annotation.kind).join(", ")}]`}. ` +
        required.because,
      cause: required.cause,
    });
    return violations;
  }

  // Scope. One claim per occurrence, no claim about nothing, and no claim about two things.
  //
  // Two maps, and the difference between them is the whole rule. `naming` is every
  // annotation that mentions this occurrence's step id at all, which is what the duplicate
  // rule counts. `exclusive` is the annotations that mention this occurrence AND no other,
  // which is what the "is this occurrence annotated" question is allowed to count. An
  // annotation naming two occurrences appears in two `naming` lists and in no `exclusive`
  // list, so it satisfies neither of them. See the binding note in the file docstring.
  const naming = new Map<string, AuthoredAnnotation[]>(
    occurrences.map((occurrence) => [occurrence.stepId, []]),
  );
  const exclusive = new Map<string, AuthoredAnnotation[]>(
    occurrences.map((occurrence) => [occurrence.stepId, []]),
  );
  const alsoNamed = new Map<AuthoredAnnotation, readonly string[]>();

  for (const [index, annotation] of found.entries()) {
    const bound = boundOccurrences(annotation, occurrences);
    alsoNamed.set(
      annotation,
      bound.map((occurrence) => occurrence.stepId),
    );
    for (const occurrence of bound) {
      naming.get(occurrence.stepId)?.push(annotation);
      if (bound.length === 1) exclusive.get(occurrence.stepId)?.push(annotation);
    }

    if (bound.length === 0) {
      violations.push({
        where: `pathway ${pathway.id} / annotation[${index}] kind ${required.kind}`,
        expected:
          `the annotation to name the step it is a claim about, one of ` +
          `[${occurrences.map((occurrence) => occurrence.stepId).join(", ")}], in its value or ` +
          `its justification`,
        actual:
          `it names none of them, and this pathway has ${occurrences.length} places that each ` +
          `require their own ${required.kind}. An annotation that does not say which one it is ` +
          `about is a claim nothing downstream can attach to a centre. chem-core's ` +
          `AuthoredAnnotation carries no step pointer, so the step id written in the prose is ` +
          `the binding`,
        cause: required.cause,
      });
    }
  }

  for (const occurrence of occurrences) {
    const mine = naming.get(occurrence.stepId) ?? [];
    const onlyMine = exclusive.get(occurrence.stepId) ?? [];

    if (mine.length > 1) {
      violations.push({
        where: occurrence.where,
        expected: `exactly one "${required.kind}" annotation about ${occurrence.stepId}`,
        actual:
          `${mine.length} of them: ${mine.map((annotation) => JSON.stringify(annotation.value)).join(" and ")}. ` +
          `Two authored claims about the same thing cannot both be the one on file, and nothing ` +
          `downstream can pick between them. An annotation counts as a claim about every step ` +
          `id it names, so one that mentions a sibling step for contrast lands here too: name ` +
          `only the step this claim is about`,
        cause: required.cause,
      });
      continue;
    }

    if (onlyMine.length === 1) continue;

    // Exactly one annotation names this step and it names others too. That is one claim
    // spread over places whose correct answers can differ, so it is the claim for none of
    // them. This is the third pass adversary's finding and the reason `exclusive` exists.
    if (mine.length === 1) {
      const shared = mine[0] as AuthoredAnnotation;
      const others = (alsoNamed.get(shared) ?? []).filter((stepId) => stepId !== occurrence.stepId);
      violations.push({
        where: occurrence.where,
        expected:
          `one "${required.kind}" annotation that is a claim about ${occurrence.stepId} and ` +
          `about no other place in this pathway`,
        actual:
          `the only annotation naming this step, ${JSON.stringify(shared.value)}, also names ` +
          `${others.join(", ")}. One annotation is one claim, and one claim cannot be the ` +
          `authored answer at two chemically distinct places at once: those places can have ` +
          `different correct answers, and a single sentence asserting both is not two claims, ` +
          `it is one claim that does not say which place it is for. It is not read as ` +
          `covering either. Write one ${required.kind} per place, each naming only its own ` +
          `step id. ` +
          required.because,
        cause: required.cause,
      });
      continue;
    }

    violations.push({
      where: occurrence.where,
      expected: `one "${required.kind}" annotation naming ${occurrence.stepId}`,
      actual:
        `the pathway carries ${found.length} annotation(s) of that kind and none of them names ` +
        `this step, so this place is unannotated while another place is annotated twice or ` +
        `not at all. ` +
        required.because,
      cause: required.cause,
    });
  }

  // Shape, and grounding when the caller asked for it. Per annotation, whatever it bound to.
  for (const [index, annotation] of found.entries()) {
    const where = `pathway ${pathway.id} / annotation[${index}] kind ${annotation.kind}`;

    if (annotation.value.trim() === "") {
      violations.push({
        where,
        expected: "a non empty value, which is the authored claim itself",
        actual:
          "the value is empty, so the annotation records that somebody knew a claim was " +
          "needed here and not what the claim is",
        cause: required.cause,
      });
    }
    if (annotation.justification.trim() === "") {
      violations.push({
        where,
        expected: "a non empty justification saying why the value is what it is",
        actual:
          "the justification is empty. step.ts requires one so a validator can see that a " +
          "human made the claim rather than the engine inventing it, and an undefended claim " +
          "cannot be argued with later",
        cause: required.cause,
      });
    }

    const bound = boundOccurrences(annotation, occurrences);
    const grounding = bound.length === 0 ? occurrences : bound;
    const vocabulary = new Set<string>();
    let asked = false;
    for (const occurrence of grounding) {
      if (occurrence.vocabulary === undefined) continue;
      asked = true;
      for (const name of occurrence.vocabulary) vocabulary.add(name);
    }
    if (asked) {
      violations.push(
        ...annotationGroundingViolations(annotation, vocabulary, where, required.cause),
      );
    }
  }

  return violations;
}

/**
 * The names an annotation can be about: every atom id and species id in these states.
 *
 * Used by the grounding rule below. Ids rather than labels, because an id is what another
 * tool can look up and a label is prose that may be rewritten without changing anything.
 */
export function annotationVocabulary(
  states: readonly MechanismState[],
): ReadonlySet<string> {
  const vocabulary = new Set<string>();
  for (const state of states) {
    for (const member of state.members) {
      vocabulary.add(member.species.id);
      for (const atom of member.species.atoms) vocabulary.add(atom.id);
    }
  }
  return vocabulary;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Names from the vocabulary that appear in this text as whole words. */
export function namesIn(text: string, vocabulary: ReadonlySet<string>): readonly string[] {
  const found: string[] = [];
  for (const name of vocabulary) {
    if (name.trim() === "") continue;
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9_])${escapeForRegExp(name)}([^A-Za-z0-9_]|$)`,
      "i",
    );
    if (pattern.test(text)) found.push(name);
  }
  return found.sort();
}

/**
 * An authored claim about a specific site has to name the site.
 *
 * WHAT THIS ASSERTS, AND EXACTLY HOW FAR IT GOES.
 *
 * The value and justification, read together, name at least one atom id or species id that
 * is present in the state the claim is about. Nothing else. It does not read the sentence,
 * does not judge whether the reasoning is sound, and above all does not count characters.
 *
 * WHY NOT A LENGTH THRESHOLD, WHICH IS THE OBVIOUS FIX AND THE WRONG ONE.
 *
 * The Phase 1 adversary filed two fixtures whose annotations are the single character "z"
 * and the pair "x" and "y". A minimum length would catch both and would be satisfied by
 * typing two words, so it would trade a hole for a slightly narrower hole while reading in
 * a report as though content were being checked. A grounding requirement is not a grade
 * either, but it is a different KIND of requirement: it forces the claim to be about
 * something that exists in the fixture, and a claim about nothing cannot be about
 * something by accident.
 *
 * WHAT REMAINS HUMAN, STATED PLAINLY RATHER THAN IMPLIED.
 *
 * Whether the sentence is true. Whether a bicyclo[2.2.1] cage really cannot reach 180
 * degrees, whether 50 to 80 percent racemisation is the right range for this substrate in
 * this solvent, whether the reasoning teaches. None of that is machine checkable and no
 * amount of structural requirement makes it so. It is a human review gate, and
 * BUILD-PROMPT.md already stops for one. This rule is a floor under the gate, not the gate.
 *
 * It is gameable by writing an atom id and nothing else. That is worth saying out loud and
 * is still strictly more than the old rule, which was gameable by writing anything at all.
 */
export function annotationGroundingViolations(
  annotation: AuthoredAnnotation,
  vocabulary: ReadonlySet<string>,
  where: string,
  cause: string,
): readonly Violation[] {
  const text = `${annotation.value} ${annotation.justification}`;
  if (text.trim() === "") return [];
  if (namesIn(text, vocabulary).length > 0) return [];

  return [
    {
      where,
      expected:
        "the value or the justification to name at least one atom id or species id from " +
        "the state this claim is about, so the claim is anchored to something that exists",
      actual:
        `neither names any of them. The state holds ${vocabulary.size} name(s) and the ` +
        `annotation mentions none, so nothing connects what was written to the chemistry it ` +
        `is supposed to be about. This is a floor and not a grade: whether the claim is TRUE ` +
        `is a human review gate, and no check here reads for sense`,
      cause,
    },
  ];
}

/** The species in a state that contains this atom id, if any. */
export function speciesContaining(state: MechanismState, atomId: string): Species | undefined {
  return state.members
    .map((member) => member.species)
    .find((species) => species.atoms.some((atom) => atom.id === atomId));
}
