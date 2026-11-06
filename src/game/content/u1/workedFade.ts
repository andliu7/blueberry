/**
 * THE FADE after a worked example (ADDED 3 Nov, Unit 1 review suggestion 1).
 * A practice lesson opens on a worked example (lessonExplainers.ts, `worked`)
 * on its preview. Its FIRST question then carries the example's first step as
 * the opening line of its brief; the questions after it carry nothing, so the
 * help fades from all steps, to one, to none. Kept apart from the explainer
 * prose because the lesson runner loads this, and the card prose stays out of
 * that chunk (LessonHelp.tsx is lazy for the same reason). Prompts only, no
 * chemistry: each line restates the first step of its worked example.
 *
 * CHANGED 3 Nov (checker): a step must hold for whichever question comes
 * first. The lesson opens on its pool's first question, and a practice run
 * may open on any of them, so each line is written to be true for every
 * question in its lesson (u1-da-predict opens on butadiene and propenal, with
 * no donor; u1-rank-radical opens on plain alkyl radicals, with no C=C).
 */
export const U1_FIRST_STEPS: Readonly<Record<string, string>> = {
  "u1-rank-cation": "First step: count the carbons bonded to each charged carbon.",
  "u1-rank-anion": "First step: ask what alkyl groups do to a full lone pair. They push in, and that hurts.",
  "u1-rank-radical": "First step: look for a C=C next to each radical carbon. With none, count the carbons on the radical carbon, as for cations.",
  "u1-energy-diagram": "First step: find the lower hump and the deeper well. The hump sets speed, the well sets stability.",
  "u1-hx-dienes": "First step: put H+ on the end carbon that leaves the more substituted cation.",
  "u1-x2": "First step: as with HX, put X+ on C1 and find the two carbons that share the charge.",
  "u1-nbs-practice": "First step: circle every carbon bonded to a C=C carbon. Those are the allylic carbons.",
  "u1-da-predict": "First step: join the diene's two end carbons to the dienophile's C=C. If the diene carries a donor, find its δ− end before you join.",
  "u1-da-3d": "First step: draw the flat ring, then decide where each group points.",
};

/** The beat with its lesson's first step leading the brief, or the beat unchanged when the lesson has none. */
export function withFirstStep<T extends { readonly brief?: string }>(node: string, beat: T): T {
  const step = U1_FIRST_STEPS[node];
  if (step === undefined) return beat;
  return { ...beat, brief: beat.brief === undefined ? step : `${step} ${beat.brief}` };
}

/** A lesson's question list with only the FIRST question carrying the step. */
export function fadeFirst<T extends { readonly brief?: string }>(node: string, beats: readonly T[]): readonly T[] {
  return beats.length === 0 ? beats : [withFirstStep(node, beats[0]!), ...beats.slice(1)];
}
