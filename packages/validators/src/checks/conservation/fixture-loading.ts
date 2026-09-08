import type { Check } from "../../check.ts";
import { conservationCheck, LOADER_CHECK_NAME, type ViolationFinder } from "./family.ts";

/**
 * CHECK 13. Every file in fixtures/ becomes a pathway, unless it says it must not.
 *
 * WHY THE LOADER IS A CHECK RATHER THAN A SILENT PRECONDITION.
 *
 * It always was a check. It just had no name. `conservationCheck.run` has reported every
 * load error as a failure since the family was written, once per check in the family, and
 * `parseFixture` has been the only thing standing between a malformed file and twelve
 * checks reading nonsense. What it lacked was a NAME in `CONSERVATION_CHECK_NAMES`, and a
 * name is what lets a fixture declare, in its own file, that being refused is the point.
 *
 * The fourth pass adversary filed the fixture that needed it: two SN1 capture steps in one
 * pathway authored with the same step id, correct chemistry throughout, each capture
 * carrying its own honest and correctly grounded racemisation annotation, and unwritable,
 * because annotation binding keys on the step id string and a shared id binds every
 * annotation to both occurrences at once. `parsePathway` now refuses that file, and the
 * long note there argues at length why the refusal belongs in the parser rather than in a
 * violation finder: no arithmetic is corrupted, no chem-core `CauseId` names the mistake,
 * and a step id is a property of the FILE rather than of the chemistry the file describes.
 *
 * WHY THIS FINDER RETURNS NOTHING, WHICH IS THE WHOLE SHAPE OF THE CHECK.
 *
 * A fixture that reaches a violation finder is one the loader already accepted. There is
 * nothing left for this finder to find. Its verdict is delivered entirely through the two
 * paths in family.ts:
 *
 *   a refused fixture that declared this check     the control fired. Recorded in this
 *                                                  check's NOT MEASURABLE section, with the
 *                                                  refusal message, on every run.
 *   a fixture that declared this check and LOADED  a failure here, and only here, saying
 *                                                  the loader accepted what the fixture
 *                                                  says it must refuse.
 *   a refused fixture that declared nothing        a failure in every check, unchanged.
 *
 * That third row is the one that keeps this from being a loosening. Nothing is exempted by
 * default and nothing is exempted by a flag a check controls. The exemption is authored in
 * the fixture, in the same field every other negative control in this corpus uses, and it
 * requires the fixture's own header and expectation to have parsed before it can be read at
 * all.
 *
 * WHAT THIS CHECK IS NOT. It is not a second schema. It asserts nothing about a fixture's
 * contents beyond what `fixture-schema.ts` already asserts by parsing it. Adding a rule to
 * the schema is a change in that file; this one only gives the outcome a name.
 */
const find: ViolationFinder = () => [];

export const conservationFixtureSchema: Check = conservationCheck({
  name: LOADER_CHECK_NAME,
  description:
    "every file in fixtures/ parses into a chem-core pathway against the fixture schema, and a fixture that declares in its own expect.mustFail that the loader must refuse it is in fact refused",
  find,
});
