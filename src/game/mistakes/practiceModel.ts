/**
 * Turning banked mistakes back into questions, and the rules of the practice
 * run. Pure: no React, no storage, so the why-step rule is testable in node.
 */

import { pathwayNode } from "../demo/pathwayMap";
import { lessonMcqBeats, lessonPoolItems } from "../beats/template";
import type { McqBeat } from "../beats/types";
import type { PoolEntry } from "../content/u1/types";
import { openMistakes, type BankedMistake, type MistakeSnapshot, type WhyId } from "./mistakeBank";

export type Playable =
  | { readonly kind: "mcq"; readonly mistake: BankedMistake; readonly beat: McqBeat }
  | { readonly kind: "draw"; readonly mistake: BankedMistake; readonly entry: PoolEntry };

/** The live question behind a saved row, or null when the lesson no longer has it. */
export function playableFor(mistake: BankedMistake): Playable | null {
  if (mistake.kind === "mcq") {
    const beat = lessonMcqBeats(mistake.node).find((one) => one.id === mistake.id);
    return beat === undefined ? null : { kind: "mcq", mistake, beat };
  }
  const entry = lessonPoolItems(mistake.node, "draw").find((one) => one.id === mistake.id);
  return entry === undefined ? null : { kind: "draw", mistake, entry };
}

/** Open mistakes that can still be played, oldest miss first. */
export function practiceQueue(snapshot: MistakeSnapshot): readonly Playable[] {
  return openMistakes(snapshot)
    .map(playableFor)
    .filter((one): one is Playable => one !== null);
}

/** Row copy for the list: the question's own words, and the lesson it came from. */
export function mistakeTitle(play: Playable): string {
  return play.kind === "mcq" ? play.beat.prompt : "Draw the structure";
}

export function lessonTitle(node: string): string {
  return pathwayNode(node)?.title ?? "";
}

/** The XP a finished practice run is worth on the start button: a small flat amount per question. */
export function practiceXp(count: number): number {
  return Math.min(count, 10) * 2;
}

/**
 * THE WHY RULE. After a miss in practice the student must say why before the
 * run moves on. Continue is only live once a reason is chosen.
 */
export function canMoveOn(missed: boolean, why: WhyId | null): boolean {
  return !missed || why !== null;
}

/** A question missed in practice comes back once more at the end of the run. */
export function requeueOnMiss(queue: readonly Playable[], index: number, alreadyRetried: ReadonlySet<string>): readonly Playable[] {
  const current = queue[index];
  if (current === undefined || alreadyRetried.has(current.mistake.key)) return queue;
  return [...queue, current];
}
