/**
 * Authored student facing copy, and the machine readable half of the voice
 * contract.
 *
 * THE SHAPE. Three fields, the same three packages/feedback uses for Tier 1
 * mechanism copy: what happened, why, what to look at. The reasons that file
 * gives hold here too. A renderer needs to show them separately, because "what
 * to look at" is the part a student reads first when they are stuck. And a
 * reviewer needs to check the three jobs independently, because copy that
 * explains the chemistry beautifully and ends with "try again" has failed at
 * exactly one of them.
 *
 * One field is renamed from that file: `whatYouDid` is `whatHappened` here.
 * Same job, and the rename is the voice rule made structural. feedback's own
 * note says the subject is the drawing and not the student, because "that atom
 * has more bonds than it can hold" and "you gave an atom more bonds than it can
 * hold" state the same fact and only the second reads as an accusation. A
 * distractor explanation is about an answer, so the subject is the answer.
 *
 * THE LINT, and what it can and cannot do. `voiceViolations` below is a small
 * list of banned constructions from CLAUDE.md's voice section. It is a spelling
 * checker for tone: it catches the phrasings that are always wrong and it cannot
 * tell whether a sentence teaches. CLAUDE.md makes that half a human gate and
 * this function does not pretend otherwise. It exists so that the obvious
 * failures never reach the reviewer's queue and waste the read.
 *
 * It runs at CONSTRUCTION time and throws, because an authored problem with
 * condescending copy is an authoring defect and the repository's pattern for an
 * authoring defect is a constructor that refuses. Nothing at runtime lints a
 * student's own words.
 */

export interface Explanation {
  /**
   * What the answer says, in the student's terms.
   *
   * About the answer, not about the student. "This is the pressure you get by
   * multiplying where the relationship divides", never "you multiplied instead
   * of dividing".
   */
  readonly whatHappened: string;
  /**
   * Why that is not the answer. The chemistry, not the name of the rule.
   *
   * A student who reads this should be able to avoid the same mistake on a
   * different problem, which is the test for whether it is the chemistry or a
   * restatement of the marking.
   */
  readonly why: string;
  /**
   * What to look at instead. Concrete, and specific to this problem.
   *
   * Never "try again", never "review the chapter". It names the quantity to
   * recount, the bond to compare, or the step to re-read.
   */
  readonly lookAt: string;
}

/**
 * Banned constructions, from CLAUDE.md's voice section.
 *
 * Each entry is a pattern and the rule it comes from. The list is deliberately
 * short and conservative: every entry here is wrong in every context, so a hit
 * is never a judgement call. Constructions that are usually wrong but sometimes
 * fine are a reviewer's job, because a lint that a writer learns to work around
 * is worse than no lint.
 */
interface BannedConstruction {
  readonly pattern: RegExp;
  readonly rule: string;
}

const BANNED: readonly BannedConstruction[] = Object.freeze([
  {
    pattern: /\byou should have\b/i,
    rule: 'CLAUDE.md voice: no "you should have"',
  },
  {
    pattern: /\byou failed\b|\byou got it wrong\b/i,
    rule: "CLAUDE.md voice: no scolding constructions",
  },
  {
    pattern: /\bobviously\b|\bclearly,? you\b|\bof course\b/i,
    rule: "CLAUDE.md voice: no condescension. If it were obvious the student would have it",
  },
  {
    pattern: /\bas (?:you|we) (?:already )?know\b/i,
    rule: "CLAUDE.md voice: no faux patience",
  },
  {
    pattern: /\?/,
    rule: "CLAUDE.md voice: no rhetorical questions. State the thing to look at",
  },
  {
    pattern: /—/,
    rule: "CLAUDE.md communication: no em dashes anywhere",
  },
  {
    pattern: /^\s*$/,
    rule: "an empty field is not copy. All three fields are required",
  },
  {
    pattern: /\btry again\b|\breview the chapter\b/i,
    rule: "lookAt names a concrete thing to look at, never a restart",
  },
]);

export interface VoiceViolation {
  readonly field: keyof Explanation;
  readonly rule: string;
  readonly text: string;
}

/** Every banned construction found. Empty means the lint had nothing to say. */
export function voiceViolations(explanation: Explanation): readonly VoiceViolation[] {
  const found: VoiceViolation[] = [];
  const fields: readonly (keyof Explanation)[] = ["whatHappened", "why", "lookAt"];
  for (const field of fields) {
    const text = explanation[field];
    if (typeof text !== "string") {
      found.push({ field, rule: "all three fields are required strings", text: String(text) });
      continue;
    }
    for (const banned of BANNED) {
      if (banned.pattern.test(text)) {
        found.push({ field, rule: banned.rule, text });
      }
    }
  }
  return found;
}

/**
 * Build an explanation, refusing one that breaks the voice contract.
 *
 * Throws. This is the authoring path and a throw here happens at import time of
 * the corpus module, which is the earliest a defect in authored copy can
 * possibly surface. Nothing in the grading path calls this.
 */
export function createExplanation(input: Explanation): Explanation {
  const violations = voiceViolations(input);
  if (violations.length > 0) {
    const detail = violations
      .map((violation) => `${violation.field}: ${violation.rule}`)
      .join("; ");
    throw new Error(`Explanation breaks the voice contract. ${detail}`);
  }
  return Object.freeze({
    whatHappened: input.whatHappened,
    why: input.why,
    lookAt: input.lookAt,
  });
}
