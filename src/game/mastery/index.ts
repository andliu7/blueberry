/**
 * What the mastery piece hands out.
 *
 * TWO SURFACES, ONE MODEL. The rank CARD is the standing answer to "am I going
 * to be okay on the exam"; the rank-up MOMENT is the scarce screen that happens
 * five times in a course. Both read `masteryModel.ts`, which reads an
 * `EconomySnapshot` and computes no mastery of its own, because CLAUDE.md is
 * explicit that the rating is derived server side and the client renders it.
 *
 * ------------------------------------------------------------------ FOR THE
 * INTEGRATOR
 *
 * THE CARD. It needs one prop and the Me tab already has it in hand:
 *
 *   import { MasteryCard } from "../../mastery";
 *   <MasteryCard economy={snapshot.economy} />
 *
 * `snapshot.economy` is the same `EconomySnapshot` MeTab.tsx already reads for
 * the diamond and streak stats, derived once per commit against the course
 * universe. Nothing new has to be plumbed, and passing the journal instead
 * would introduce a second derivation, which app/progress.ts explains at length
 * is how two surfaces start disagreeing about one number.
 *
 * WHERE IT MAY GO. docs/ECONOMY.md: mastery "belongs on the pathway and the
 * profile", and it says in the same breath NEVER SHOW MASTERY INSIDE A NODE,
 * because "mid-problem it is only anxiety". So: Me, and the pathway header if a
 * later round wants it there. Not the lesson player, not a beat, not the HUD
 * during a problem. That is a placement rule this package cannot enforce, so it
 * is stated here where whoever mounts it will read it.
 *
 * `reviewHref` defaults to the review deck; pass one only if a surface has a
 * better destination for its own restore action.
 *
 * THE MOMENT. It is a third stage in the lesson's finish sequence, after the
 * reward moment and beside the streak screen, and it takes the same three props
 * those two take so it drops into the same switch:
 *
 *   const rankUp = rankUpFromReceipt(finished.receipt);   // null most lessons
 *   ...
 *   if (stage === "rank") {
 *     return <RankUpMoment receipt={finished.receipt} reducedMotion={reducedMotion} onContinue={leave} />;
 *   }
 *
 * ORDER MATTERS AND IT IS NOT ARBITRARY. Reward, then rank, then streak. The
 * reward moment is what the lesson paid; the rank is what the course now says
 * about the student; the streak is the day. Putting the rank first would open
 * on the scarcest screen and then step down twice. `RankUpMoment` renders null
 * when the receipt crossed no band, so a caller that would rather mount it
 * unconditionally can, but a stage sequence should ask `rankUpFromReceipt`
 * first so it does not schedule an empty stage.
 *
 * NOTHING HERE IS AN ENTITLEMENT AND NOTHING HERE GATES ANYTHING. Both surfaces
 * read a derived snapshot and draw it. Phase 6 replaces the source; no line in
 * this folder changes when it does.
 */

export { MasteryCard, type MasteryCardProps } from "./MasteryCard";
export { RankUpMoment, type RankUpMomentProps } from "./RankUpMoment";
export { RankMark, type RankMarkProps, type RankTone } from "./RankMark";
export { masteryCardModel, rankMotif, rankUpFromReceipt } from "./masteryModel";
export type { LadderRow, LadderState, MasteryCardModel, RankMotif, RankReading, RankUpModel } from "./masteryModel";
