/**
 * The one Bloom that answers a graded lesson step: the berry from
 * useBerryReactions inside its BloomStage (combo sparkles, confetti, the
 * Reduced puff), at the verdict's size. BLOOM-STATES-SPEC.md, section 4.
 *
 * WHY THE HOOK IS NOT IN HERE. A verdict area mounts fresh on every answer
 * (the answer tray does), and a hook inside it would forget the run each time:
 * no combo, no third-miss char, no "wrong again". So the surface that grades
 * owns `useBerryReactions` for the whole run and hands it in; this file only
 * draws it, so the MCQ, the sort ladder, the match board and the synthesis gap
 * draw it the same way.
 */

import { Berry } from "../mascot/Berry";
import { BloomStage } from "../mascot/BloomStage";
import { costumeForNode, type BerryCostume } from "../mascot/berryCostume";
import type { BerryState } from "../mascot/berryState";
import { stateForNode } from "../mascot/berryTopicState";
import type { BerryReactions } from "../mascot/useBerryReactions";
import { isSectionFinal, pathwayNode } from "../demo/pathwayMap";

/** What a lesson makes Bloom on every surface it grades on: the topic's state and the lesson's costume. */
export interface BloomLook {
  readonly state: BerryState;
  readonly costume: BerryCostume;
}

/**
 * The look for a lesson node (BLOOM-STATES-SPEC.md, section 4, "Lesson surface
 * has a costume"). Pure table reads, so the MCQ, the sort ladder, the match
 * board and the synthesis gap all dress the berry the same way.
 */
export function bloomLookForNode(node: string): BloomLook {
  const mapNode = pathwayNode(node);
  return {
    state: stateForNode(node),
    costume: costumeForNode(mapNode === null ? null : { ...mapNode, final: isSectionFinal(mapNode) }),
  };
}

export interface BloomVerdictBerryProps {
  readonly bloom: BerryReactions;
  readonly reducedMotion: boolean;
  /** The topic's state. The reaction's char wins over it. */
  readonly state?: BerryState;
  readonly costume?: BerryCostume;
  /** 56 in a tray. Answer reactions must still read at 40. */
  readonly sizePx?: number;
}

export function BloomVerdictBerry({ bloom, reducedMotion, state = "neutral", costume, sizePx = 56 }: BloomVerdictBerryProps) {
  const charred = bloom.berry.state === "charred";
  return (
    <BloomStage {...bloom.stage} reducedMotion={reducedMotion}>
      <Berry {...bloom.berry} state={charred ? "charred" : state} costume={costume} sizePx={sizePx} reducedMotion={reducedMotion} />
    </BloomStage>
  );
}
