/**
 * Which trainer reactions have an authored walk. Kept apart from content.ts so
 * the lesson runner can ask "is there one?" without pulling every lesson's text
 * into its chunk; reactionLessons.test.ts pins this list to content.ts.
 */
export const REACTION_LESSON_IDS: readonly string[] = Object.freeze([
  "sn2",
  "proton-transfer",
  "carbonyl-addition",
  "e2",
  "williamson",
  "epoxide-basic",
  "epoxide-acidic",
  "grignard-methyl",
  "hydride-reduction",
  "cyanohydrin",
  "imine-attack",
  "alkene-protonation",
]);

export function hasReactionLesson(reactionId: string): boolean {
  return REACTION_LESSON_IDS.includes(reactionId);
}
