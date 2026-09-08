import type { Check } from "../../check.ts";
import { conservationArrowLegality } from "./arrow-legality.ts";
import { conservationCharge } from "./charge.ts";
import { conservationDisfavouredRateComparison } from "./rate-comparison.ts";
import { conservationElectronFlow } from "./electron-flow.ts";
import { conservationFixtureSchema } from "./fixture-loading.ts";
import { CONSERVATION_CHECK_NAMES } from "./fixture-schema.ts";
import { conservationMass } from "./mass.ts";
import { conservationPeriplanarityDeclaration } from "./periplanarity.ts";
import { conservationProtonTransfer } from "./proton-transfer.ts";
import { conservationSpectatorDeclaration } from "./spectator.ts";
import { conservationStepElementarity } from "./step-elementarity.ts";
import { conservationStepIdentity } from "./step-identity.ts";
import { conservationStereorandomAnnotation } from "./stereorandom-annotation.ts";
import { conservationValence } from "./valence.ts";

/**
 * The conservation check family.
 *
 * Thirteen checks, one export. src/checks/index.ts spreads this array into the registry, so
 * adding a check to this family is a change in this directory and nowhere else.
 * That was the point of the arrangement and it is what let the seventh be added without
 * touching the registry: the Phase 0 adversary had to file arrow legality as a report
 * rather than a fixture precisely because no such name existed, not because the wiring
 * was in the way. The eighth, ninth, and tenth arrived the same way, from a corpus builder
 * that could name three CLAUDE.md requirements it had no field to express.
 *
 * ORDER IS THE ORDER A FAILURE IS EASIEST TO READ IN.
 *
 * The loader first, because a file that never became a pathway is not a fixture any other
 * check has an opinion about, and because it is the only member of the family that is not a
 * violation finder. Then valence, because an atom whose declared charge disagrees with its structure makes
 * every total downstream wrong in a way that reads as a conservation error. Then the
 * three conservation laws in the order CLAUDE.md states them. Then arrow legality, which
 * is about the arrows one at a time and reads best straight after the check that is about
 * all of them at once. Then the two boundary checks, which are about what was allowed into
 * the arithmetic rather than about the arithmetic. Then the three annotation checks, which
 * are about what a human claimed rather than about anything computed, and which are last
 * because a fixture whose arithmetic is broken has a worse problem than a missing note.
 * Step identity is next to last, because it is the check that reads what a step CLAIMS to
 * be rather than what it does, and a step whose label is wrong is still worth reporting
 * after everything about its electrons has been agreed. Step elementarity is last, because
 * it is the only one that reads a step's arrows as a SET and asks whether they belong to
 * one barrier at all, and that question is worth putting after every question about whether
 * each arrow is individually sound.
 *
 * WHAT THE FAMILY DOES NOT COVER, so nobody reads a green run as more than it is.
 * Stereochemistry proper, sterics beyond the one detected neopentyl pattern, reactivity,
 * route ordering, and RDKit adjudication are other families. A step can conserve everything
 * here, carry every annotation CLAUDE.md asks for, and still be chemically wrong.
 */
export const conservationChecks: readonly Check[] = [
  conservationFixtureSchema,
  conservationValence,
  conservationMass,
  conservationCharge,
  conservationElectronFlow,
  conservationArrowLegality,
  conservationProtonTransfer,
  conservationSpectatorDeclaration,
  conservationStereorandomAnnotation,
  conservationPeriplanarityDeclaration,
  conservationDisfavouredRateComparison,
  conservationStepIdentity,
  conservationStepElementarity,
];

/**
 * The registered names must be exactly the names a fixture is allowed to put in
 * `expect.mustFail`.
 *
 * Checked at module load rather than inside a check, because if the two lists drift then
 * a fixture's negative control points at a check that does not run, and every check in
 * the family would then have to notice separately. Throwing here is a harness error, and
 * src/cli.ts reports that as exit 3 with no results, which is the correct outcome for a
 * suite that cannot describe itself.
 */
const registeredNames = conservationChecks.map((check) => check.name).sort();
const declaredNames = [...CONSERVATION_CHECK_NAMES].sort();
if (registeredNames.join("|") !== declaredNames.join("|")) {
  throw new Error(
    `conservation family mismatch. Registered: ${registeredNames.join(", ")}. ` +
      `Nameable in a fixture's mustFail: ${declaredNames.join(", ")}. ` +
      `A fixture cannot name a check that does not run, and a check with no nameable ` +
      `name can never be given a negative control.`,
  );
}
