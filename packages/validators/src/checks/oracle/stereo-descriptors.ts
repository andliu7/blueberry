import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import type { Adjudication, Evaluation } from "./adjudication.ts";
import { toNotMeasurable } from "./adjudication.ts";
import type { CorpusState, UnspecifiedStereoDeclaration } from "./corpus.ts";
import type { SpeciesPayload, SpeciesResult } from "./payload.ts";
import { oracleRun, unusableFailure, type ResultByRef } from "./run.ts";

/**
 * CHECK: authored stereodescriptors match the ones RDKit assigns.
 *
 * CLAUDE.md, "CIP stereodescriptors": chem-core does not implement CIP, RDKit assigns
 * descriptors in validators, and labels needed at runtime are precomputed at authoring
 * time and stored on the problem. This check is what makes that precomputation safe. The
 * authored label is a claim; rdCIPLabeler's answer is the reference; a disagreement is a
 * failure and the authored label is the thing presumed wrong.
 *
 * THIS IS NOT THE AROMATICITY EXCEPTION. CLAUDE.md's carve out is for aromaticity
 * perception and for sanitisation of reactive intermediates, not for CIP. An R that RDKit
 * calls S is a wrong label on a student's screen. It fails.
 *
 * FOUR THINGS ARE ASSERTED, each closing a way a wrong label can survive.
 *
 *   1. Authored and RDKit descriptors are equal, recomputed here rather than read off the
 *      sidecar's `agrees` field. CONTRACT.md says `agrees` is a convenience for a human
 *      reading raw output; a check that trusts the thing it is checking has checked
 *      nothing. The sidecar's own `agrees` is then compared against the recomputation, so
 *      a bug in either one is visible.
 *
 *   2. Every authored descriptor in the payload appears in the results. A descriptor the
 *      sidecar silently dropped would otherwise be a label nothing ever verified, which
 *      reads identically to a label that passed.
 *
 *   3. An authored descriptor at a centre RDKit does not label is a failure, not a pass.
 *      RDKit declining to assign means it does not see a defined stereocentre there, and
 *      an authored R on a centre that is not one is exactly the kind of thing that ends
 *      up drawn on a problem card.
 *
 *   4. A centre RDKit calls stereogenic that the author left unconfigured is a FAILURE,
 *      unless the corpus carries an `expect.unspecifiedStereoDeclared` entry naming that
 *      exact element. See the block above the loop at the bottom of evaluateSpecies for
 *      the five cases and why the declaration is not an opt out.
 *
 * A species carrying authored descriptors that did not sanitise is an adjudication item
 * rather than a pass or a failure: CONTRACT.md has the sidecar report nothing downstream
 * of a failed sanitisation, so there is no RDKit answer to compare against. The
 * sanitisation check owns the verdict on that state, and this check records only that the
 * comparison could not be made, so a declaration cannot silently take a descriptor
 * comparison with it.
 */

const CHECK_NAME = "oracle-stereo-descriptors";

const ATOM_DESCRIPTORS = ["R", "S"];
const BOND_DESCRIPTORS = ["E", "Z"];

function speciesPayloads(state: CorpusState): Map<string, SpeciesPayload> {
  const byId = new Map<string, SpeciesPayload>();
  for (const species of state.payload.species) byId.set(species.id, species);
  return byId;
}

function checkVocabulary(
  value: string | null,
  allowed: readonly string[],
  who: string,
  where: string,
  fixture: string,
): CheckFailure | null {
  if (value === null || value === undefined) return null;
  if (allowed.includes(value)) return null;
  return {
    expected: `${who} at ${where} is one of ${allowed.join(", ")}, or null`,
    actual: JSON.stringify(value),
    fixture,
  };
}

function evaluateSpecies(
  state: CorpusState,
  payload: SpeciesPayload,
  result: SpeciesResult,
  declarations: readonly UnspecifiedStereoDeclaration[],
  failures: CheckFailure[],
  adjudications: Adjudication[],
): void {
  const fixture = state.stateRef;
  const where = `${state.stateRef} species:${payload.id}`;

  if (!result.sanitization.ok) {
    const authoredAtoms = payload.atoms.filter((atom) => atom.stereo?.authoredDescriptor != null);
    const authoredBonds = payload.bonds.filter((bond) => bond.stereo?.authoredDescriptor != null);
    if (authoredAtoms.length > 0 || authoredBonds.length > 0 || declarations.length > 0) {
      adjudications.push({
        category: "not-comparable",
        where,
        finding:
          `${authoredAtoms.length} authored atom descriptor(s), ` +
          `${authoredBonds.length} authored bond descriptor(s) and ` +
          `${declarations.length} unspecified stereo declaration(s) could not be compared ` +
          `against RDKit, because this species did not sanitise ` +
          `(${result.sanitization.errorKind ?? "unknown"}). The sanitisation check owns ` +
          `the verdict on the state. These claims remain unverified. The declarations are ` +
          `not treated as stale here: CONTRACT.md has the sidecar report nothing downstream ` +
          `of a failed sanitisation, so there is no list of unspecified elements to be ` +
          `absent from.`,
      });
    }
    return;
  }

  const atomResults = new Map(result.atomDescriptors.map((one) => [one.atomId, one]));
  const bondResults = new Map(result.bondDescriptors.map((one) => [one.bondId, one]));

  for (const atom of payload.atoms) {
    const authored = atom.stereo?.authoredDescriptor ?? null;
    if (authored === null) continue;
    const descriptor = atomResults.get(atom.id);
    if (descriptor === undefined) {
      failures.push({
        expected: `an RDKit descriptor for atom ${atom.id}, which the author labelled ${authored}`,
        actual: "the oracle returned no descriptor for it, so the label was never verified",
        fixture,
      });
    }
  }

  for (const bond of payload.bonds) {
    const authored = bond.stereo?.authoredDescriptor ?? null;
    if (authored === null) continue;
    const descriptor = bondResults.get(bond.id);
    if (descriptor === undefined) {
      failures.push({
        expected: `an RDKit descriptor for bond ${bond.id}, which the author labelled ${authored}`,
        actual: "the oracle returned no descriptor for it, so the label was never verified",
        fixture,
      });
    }
  }

  for (const descriptor of result.atomDescriptors) {
    const at = `${where} atom:${descriptor.atomId}`;
    const badRdkit = checkVocabulary(descriptor.rdkit, ATOM_DESCRIPTORS, "the RDKit descriptor", at, fixture);
    if (badRdkit !== null) failures.push(badRdkit);
    const badAuthored = checkVocabulary(descriptor.authored, ATOM_DESCRIPTORS, "the authored descriptor", at, fixture);
    if (badAuthored !== null) failures.push(badAuthored);

    const agree = descriptor.rdkit === descriptor.authored;
    if (descriptor.agrees !== agree) {
      failures.push({
        expected: `the sidecar's agrees flag matches a recomputation: ${agree}`,
        actual: `the sidecar reported agrees ${descriptor.agrees} for rdkit ${String(descriptor.rdkit)} against authored ${String(descriptor.authored)}`,
        fixture,
      });
    }

    if (descriptor.authored === null) continue;
    if (descriptor.rdkit === null) {
      failures.push({
        expected: `RDKit assigns ${descriptor.authored} at ${at}`,
        actual:
          "RDKit assigned no CIP descriptor there, so it does not see a defined " +
          "stereocentre at that atom",
        fixture,
      });
      continue;
    }
    if (descriptor.rdkit !== descriptor.authored) {
      failures.push({
        expected: `authored ${descriptor.authored} at ${at}`,
        actual:
          `RDKit says ${descriptor.rdkit}. CLAUDE.md: where RDKit and chem-core disagree, ` +
          `RDKit is presumed correct. The authored label is wrong`,
        fixture,
      });
    }
  }

  for (const descriptor of result.bondDescriptors) {
    const at = `${where} bond:${descriptor.bondId}`;
    const badRdkit = checkVocabulary(descriptor.rdkit, BOND_DESCRIPTORS, "the RDKit descriptor", at, fixture);
    if (badRdkit !== null) failures.push(badRdkit);
    const badAuthored = checkVocabulary(descriptor.authored, BOND_DESCRIPTORS, "the authored descriptor", at, fixture);
    if (badAuthored !== null) failures.push(badAuthored);

    const agree = descriptor.rdkit === descriptor.authored;
    if (descriptor.agrees !== agree) {
      failures.push({
        expected: `the sidecar's agrees flag matches a recomputation: ${agree}`,
        actual: `the sidecar reported agrees ${descriptor.agrees} for rdkit ${String(descriptor.rdkit)} against authored ${String(descriptor.authored)}`,
        fixture,
      });
    }

    if (descriptor.authored === null) continue;
    if (descriptor.rdkit === null) {
      failures.push({
        expected: `RDKit assigns ${descriptor.authored} at ${at}`,
        actual:
          "RDKit assigned no CIP descriptor there, so it does not see a defined " +
          "stereogenic double bond. CONTRACT.md warns that arrangement and " +
          "authoredDescriptor are different statements: cis is geometry, Z is CIP",
        fixture,
      });
      continue;
    }
    if (descriptor.rdkit !== descriptor.authored) {
      failures.push({
        expected: `authored ${descriptor.authored} at ${at}`,
        actual:
          `RDKit says ${descriptor.rdkit}. CLAUDE.md: where RDKit and chem-core disagree, ` +
          `RDKit is presumed correct. The authored label is wrong`,
        fixture,
      });
    }
  }

  // An unlabelled stereo element is a HARD FAILURE unless it is declared.
  //
  // It became a hard failure when a validator pass noticed the blanket adjudication
  // claimed its authority from python/CONTRACT.md, a file written by the same builder the
  // oracle grades. CLAUDE.md grants exactly one exception, narrowly: RDKit aromaticity
  // perception is a model rather than ground truth, so aromaticity disagreements go to
  // human adjudication. It says nothing about unlabelled stereocentres, and a suite does
  // not get to widen its own exceptions.
  //
  // The chemistry agrees with the letter. CLAUDE.md names Br2 addition to cis and trans
  // 2-butene as reference fixtures, racemic against meso, and says an implementation that
  // swaps them has a sign error in the addition geometry. The carbons RDKit flags on a
  // bridged bromonium are the ones that decide which you get. Leaving them unpinned is how
  // that sign error survives a green run. Both are pinned in the corpus.
  //
  // WHY A DECLARATION EXISTS AT ALL. Some potential stereo elements are artifacts of how
  // the state is written rather than centres anybody could pin. The benzenonium sigma
  // complex is the case in hand: the corpus writes one localised resonance structure, so
  // the two ring branches leaving the sp3 carbon are inequivalent to RDKit's CIP ranking,
  // while the real delocalised pentadienyl cation has a mirror plane through that carbon.
  // Pinning R or S there would be inventing chemistry, and so would deleting the check.
  //
  // THE FIVE CASES. Three are failures, one is an adjudication, one never arises.
  //
  //   unspecified, nothing declared          FAILURE, unchanged
  //   unspecified, declared with a reason    ADJUDICATION, for a human
  //   unspecified, declared with no reason   FAILURE, an unsigned skip is not a declaration
  //   declared, element is not unspecified   FAILURE, the declaration is stale
  //   declared, element is not in the state  FAILURE, the declaration names nothing
  //
  // This is the shape of sanitizationMayFail in sanitization.ts, deliberately, down to
  // the stale rule. The stale rule is the load bearing one: without it, a declaration
  // written once outlives the chemistry it was written about and quietly covers whatever
  // shows up at that id later.
  //
  // ADJUDICATION RATHER THAN PASS is chosen for the same reason it is chosen there. A
  // declared artifact is a claim a human should read once and either accept or argue with,
  // and the queue size line in adjudication.ts is what makes a growing pile of them
  // visible. A silent pass would make the count of declarations invisible, and the number
  // of places the suite has stopped asserting is exactly the number a reviewer needs.
  const declaredByElement = new Map<string, UnspecifiedStereoDeclaration>();
  for (const declaration of declarations) {
    declaredByElement.set(`${declaration.kind}:${declaration.ref}`, declaration);
  }
  const covered = new Set<string>();

  for (const element of result.unspecifiedPotentialStereo) {
    // A null ref is an element centred on something with no corpus id, a hydrogen this
    // sidecar materialised for instance. Nothing can name it, so nothing can declare it.
    const key = element.ref === null ? null : `${element.kind}:${element.ref}`;
    const declaration = key === null ? undefined : declaredByElement.get(key);

    if (declaration === undefined) {
      failures.push({
        expected: `an authored configuration on the ${element.kind} stereo element at ${where}`,
        actual:
          `RDKit sees a potential ${element.kind} stereo element with no configuration on it. ` +
          `Species SMILES ${result.canonicalSmiles ?? "unavailable"}. Pin the configuration in ` +
          `the corpus. If it is not a real stereocentre, say why in an ` +
          `expect.unspecifiedStereoDeclared entry naming ${element.kind} ` +
          `${element.ref ?? "(unnameable, no corpus id)"}, which is a recorded claim a human ` +
          `reads, not something this check may assume`,
        fixture: `${fixture} ${element.kind}:${element.ref ?? "unmapped"}`,
      });
      continue;
    }

    // Marked covered either way. The declaration does name this element, so the stale
    // rule below has nothing to say about it, and one problem should report once.
    covered.add(key as string);

    if (declaration.justification.trim() === "") {
      failures.push({
        expected: `a justification on the declaration for ${element.kind} ${element.ref} at ${where}`,
        actual:
          `the declaration by ${declaration.declaredBy} carries an empty justification, so ` +
          `it covers nothing. A declaration is a recorded act an adversary can read and ` +
          `argue with. Without one written down it is an unsigned skip`,
        fixture: `${fixture} ${element.kind}:${element.ref}`,
      });
      continue;
    }

    adjudications.push({
      category: "stereo-unspecified",
      where: `${where} ${element.kind}:${element.ref}`,
      finding:
        `RDKit reports a potential ${element.kind} stereo element with no configuration ` +
        `on it, and ${declaration.declaredBy} declared it an artifact of how this state is ` +
        `written rather than an unlabelled centre. Species SMILES ` +
        `${result.canonicalSmiles ?? "unavailable"}. Justification on file: ` +
        `${declaration.justification} A human decides whether that reasoning holds, or ` +
        `whether the element should be pinned after all.`,
    });
  }

  const speciesAtomIds = new Set(payload.atoms.map((atom) => atom.id));
  const speciesBondIds = new Set(payload.bonds.map((bond) => bond.id));

  for (const declaration of declarations) {
    const key = `${declaration.kind}:${declaration.ref}`;
    if (covered.has(key)) continue;

    const known =
      declaration.kind === "atom"
        ? speciesAtomIds.has(declaration.ref)
        : speciesBondIds.has(declaration.ref);

    failures.push({
      expected: `the declared ${declaration.kind} ${declaration.ref} at ${where} is still an unspecified potential stereo element`,
      actual: known
        ? `RDKit reports ${result.unspecifiedPotentialStereo.length} unspecified element(s) ` +
          `here and this is not one of them, so the declaration by ${declaration.declaredBy} ` +
          `is stale. Withdraw it. A declaration left behind stops describing the chemistry ` +
          `it was written about and starts covering whatever appears at that id next`
        : `no ${declaration.kind} ${declaration.ref} exists in this species at all, so the ` +
          `declaration by ${declaration.declaredBy} names nothing and can never be matched`,
      fixture: `${fixture} ${key}`,
    });
  }
}

export function evaluateStereoDescriptors(
  states: readonly CorpusState[],
  resultByRef: ResultByRef,
): Evaluation {
  const failures: CheckFailure[] = [];
  const adjudications: Adjudication[] = [];

  for (const state of states) {
    const result = resultByRef.get(state.stateRef);
    if (result === undefined) {
      failures.push({
        expected: "a sidecar result for every corpus state",
        actual: "none came back",
        fixture: state.stateRef,
      });
      continue;
    }

    const payloads = speciesPayloads(state);
    const analysed = new Set(result.species.map((one) => one.id));
    const declarationsBySpecies = new Map(
      state.species.map((one) => [one.id, one.unspecifiedStereoDeclared]),
    );

    for (const [speciesId, payload] of payloads) {
      if (analysed.has(speciesId)) continue;
      const authored =
        payload.atoms.filter((atom) => atom.stereo?.authoredDescriptor != null).length +
        payload.bonds.filter((bond) => bond.stereo?.authoredDescriptor != null).length;
      const declared = (declarationsBySpecies.get(speciesId) ?? []).length;
      if (authored === 0 && declared === 0) continue;
      failures.push({
        expected: `${authored} authored descriptor(s) and ${declared} unspecified stereo declaration(s) on species ${speciesId} verified against RDKit`,
        actual:
          "the species produced no result at all, so nothing was verified. A build error " +
          "is a data error in the corpus and is never covered by a sanitizationMayFail " +
          "declaration, and a declaration on a species RDKit never saw covers nothing",
        fixture: state.stateRef,
      });
    }

    for (const species of result.species) {
      const payload = payloads.get(species.id);
      if (payload === undefined) continue; // Reported by oracle-sanitization.
      const declarations = declarationsBySpecies.get(species.id) ?? [];
      evaluateSpecies(state, payload, species, declarations, failures, adjudications);
    }
  }

  return { failures, adjudications };
}

export const oracleStereoDescriptors: Check = {
  name: CHECK_NAME,
  description:
    "every authored R/S and E/Z label equals the descriptor rdCIPLabeler assigns to the same atom or bond, and every stereo element RDKit reports unconfigured is either pinned or declared an artifact with a reason",

  async run(context): Promise<CheckResult> {
    const run = await oracleRun(context);
    if (run.kind === "unusable") return failed([unusableFailure(CHECK_NAME, null)]);

    const evaluation = evaluateStereoDescriptors(run.data.corpus.states, run.data.resultByRef);
    const notMeasurable = toNotMeasurable(CHECK_NAME, evaluation.adjudications);

    if (evaluation.failures.length > 0) {
      return failed(evaluation.failures, { notMeasurable });
    }
    return passed({ notMeasurable });
  },
};
