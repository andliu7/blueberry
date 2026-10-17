/**
 * The trainer each Unit 1 lesson ends on, for the nodes whose map link is a
 * lesson beat but whose lesson still closes on the arrow-pushing engine.
 *
 * WHY THIS TABLE EXISTS (2026-10-16, U1-P1). These four nodes used to link the
 * map straight to the trainer, so their pool questions (21 MCQs between them)
 * were never shown. Their map link is now { kind: "beat" }, which opens the
 * lesson, and the lesson's produce step reads the trainer from here instead of
 * from the map link. The ids are the exact links the map carried before, so
 * the same mechanism plays as before; only the questions in front of it are new.
 *
 * Data only, with a type-only import, so the pathway map (entry chunk) can read
 * it without pulling any lesson content in.
 */
import type { PlayableLink } from "../../demo/pathwayMap";

export type LessonTrainerLink = Exclude<PlayableLink, { readonly kind: "beat" }>;

export const LESSON_TRAINERS: Readonly<Record<string, LessonTrainerLink>> = Object.freeze({
  "u1-allylic": { kind: "resonance", id: "res-allyl-1" },
  "u1-12v14": { kind: "sequence", id: "seq-diene" },
  /*
   * u1-x2 PLAYS AS A LESSON, NOT AS AN IN-A-ROW RUN, decided 2026-10-16.
   * Its role is practice and its pool has 12 items, enough for a run. But the
   * owner kept its mechanism (2026-09-29), and the in-a-row run is a whole
   * mode of its own (PracticeRunner owns its header, ending and banking), so a
   * trainer cannot follow it without a second run system. As a lesson it gets
   * the meet step (u1-x2-why-14), nine rung-1 questions with a recycle pass,
   * then the Br2 sequence in the trainer. The two L2 items (two-equiv,
   * chd-warm) wait for a higher rung. beats/practice/pools.ts reads this
   * table so the node is not treated as a run node.
   */
  "u1-x2": { kind: "sequence", id: "seq-diene-br2" },
  "u1-da": { kind: "reaction", id: "diels-alder" },
});

/** The trainer a node's lesson ends on, or undefined when it has none here. */
export function lessonTrainerFor(nodeId: string): LessonTrainerLink | undefined {
  return LESSON_TRAINERS[nodeId];
}
