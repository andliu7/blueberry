/**
 * The Hint key on a lesson question (owner, 25 Oct, Q9: "add hint").
 *
 * WHAT ONE PRESS DOES, the default the orchestrator chose and the owner can
 * change (BLOOM-STATES-SPEC.md section 7, Q9; STATUS.md):
 *   - it is free: no diamonds, no energy, nothing in the economy moves;
 *   - it shows ONE line of nudge, taken from words already written for this
 *     question (below), never the answer and never a new line of chemistry;
 *   - it greys out ONE wrong option, always the same one for a question, so a
 *     reload or a second visit never rules out a different option;
 *   - the answer that follows still clears the question, but it was not right
 *     on the first try (types.ts rightFirstTry), so the lesson is not flawless.
 *
 * WHERE THE NUDGE COMES FROM, first match wins, and every candidate that
 * contains the keyed answer's text is skipped:
 *   1. the ruled-out option's own `why`, first sentence: the common slip
 *      that option stands for, which is why it is the one greyed out (the
 *      first sentence speaks to that option; a later one often names the key);
 *   2. the lesson's key idea in the unit guide (its first idea not drawn from
 *      this very question);
 *   3. the question's brief;
 *   4. a plain line that names no chemistry at all.
 * The guide idea drawn from THIS question is never used: measured on
 * u8-dibal it read "DIBAL-H on a nitrile gives an aldehyde.", which with one
 * aldehyde on screen is the answer in other words.
 *
 * Pure: no React, and only firstSentence and types imported, so the node
 * suite holds it.
 */

import { firstSentence } from "../AnswerTray";
import type { McqBeat } from "../types";

/** The two fields of a guide idea the nudge reads (guide/types.ts GuideIdea). */
export interface HintIdea {
  readonly text: string;
  readonly source: string;
}

export type NudgeSource = "slip" | "lesson" | "brief" | "plain";

export interface HintNudge {
  readonly text: string;
  readonly source: NudgeSource;
}

/** Said when nothing written for the question is safe to show. Names no chemistry. */
export const PLAIN_NUDGE = "Read the question again, then weigh the options still in play.";

/** A small stable hash, so the ruled-out option depends on the question and nothing else. */
function stableHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash;
}

/**
 * The wrong option one Hint greys out, or null when the question has no wrong
 * option to spare. Never the keyed one. Deterministic: the same question always
 * rules out the same option.
 */
export function hintOptionId(beat: McqBeat): string | null {
  const wrong = beat.options.filter((option) => option.id !== beat.correctOptionId);
  if (wrong.length === 0) return null;
  return wrong[stableHash(beat.id) % wrong.length]!.id;
}

function keyText(beat: McqBeat): string {
  return beat.options.find((option) => option.id === beat.correctOptionId)?.text ?? "";
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A line is safe when it is not empty and never says the keyed answer's
 * words. A short key (three letters or fewer) is matched as whole words, so
 * a key of "One" rules out "gives one product" but not "options". A longer
 * key is matched anywhere, so "Ethanol" also rules out a line about
 * "Methanol": better a plainer nudge than one that spells the answer.
 */
export function nudgeIsSafe(text: string, beat: McqBeat): boolean {
  const line = text.trim().toLowerCase();
  const key = keyText(beat).trim().toLowerCase();
  if (line.length === 0) return false;
  if (key.length === 0) return true;
  if (key.length > 3) return !line.includes(key);
  const edge = (ch: string) => (/\w/.test(ch) ? "\\b" : "");
  return !new RegExp(`${edge(key[0]!)}${escapeRegExp(key)}${edge(key[key.length - 1]!)}`).test(line);
}

/**
 * The one-line nudge for a question. `ideas` is the lesson's guide ideas in
 * guide order (guideIdeasFor below), or empty when the unit has no guide or it
 * has not loaded yet.
 */
export function hintNudge(beat: McqBeat, ideas: readonly HintIdea[] = []): HintNudge {
  const out = hintOptionId(beat);
  const slip = beat.options.find((option) => option.id === out)?.why;
  const lesson = ideas.find((idea) => idea.source !== beat.id);
  const candidates: readonly (HintNudge | null)[] = [
    slip === undefined ? null : { text: firstSentence(slip).first, source: "slip" },
    lesson === undefined ? null : { text: firstSentence(lesson.text).first, source: "lesson" },
    beat.brief === undefined ? null : { text: beat.brief, source: "brief" },
  ];
  for (const candidate of candidates) {
    if (candidate !== null && nudgeIsSafe(candidate.text, beat)) return candidate;
  }
  return { text: PLAIN_NUDGE, source: "plain" };
}

/** The unit a lesson node belongs to, read off its id ("u1-allylic" is "u1"). */
export function hintUnitFor(node: string): string | null {
  return /^(u\d+)-/.exec(node)?.[1] ?? null;
}

/** The shape of a unit guide the nudge needs, so this file imports no guide data. */
export interface HintGuide {
  readonly stages: readonly { readonly lessons: readonly { readonly node: string; readonly ideas: readonly HintIdea[] }[] }[];
}

/** A lesson's guide ideas, in guide order, or empty. */
export function guideIdeasFor(guide: HintGuide | null, node: string): readonly HintIdea[] {
  if (guide === null) return [];
  for (const stage of guide.stages) {
    const lesson = stage.lessons.find((entry) => entry.node === node);
    if (lesson !== undefined) return lesson.ideas;
  }
  return [];
}
