/**
 * The rank-up moment.
 *
 * THE HIERARCHY IS P2'S, AND IT IS THE THING THIS SCREEN IS JUDGED ON: one hero
 * thing, reasons beneath, and no second copy of the number. On this screen the
 * hero is the BADGE, not a figure, and that is a decision rather than a
 * shortcut. The reward moment one screen earlier has already spent the big
 * number on XP; a second enormous number immediately after it would be two
 * heroes in one sequence and neither would land. So there is no score anywhere
 * here: the mark is the hero, the rank name is its caption, the claim is the
 * reason, and the pills are what it paid.
 *
 * WHY THE MARK RATHER THAN THE NAME. Owner rulings 1 and 2 of 2026-09-04 are
 * written about molecules and they generalise exactly: the picture comes first
 * and the name sits under it, because the name is a label on the thing rather
 * than the thing. A rank-up screen whose hero is a word is a caption with a
 * picture, which is the shape ruling 2 rejects.
 *
 * WHY THIS IS SCARCE, AND WHY THAT MATTERS. CLAUDE.md takes from Duolingo "the
 * tiered badge that means something because it was scarce". There are five of
 * these in a whole course. That is the entire argument for giving a rank its
 * own screen instead of a toast, and it is also the argument against reusing
 * the reward moment's confetti: a celebration that looks identical to the one a
 * student sees after every lesson is not a scarcer moment, it is the same
 * moment twice. The light here is the completed-state GLOW instead, which
 * DESIGN-GOALS makes the language for a thing that is finished.
 *
 * ONE PLACE THE NUMBER APPEARS, AND IT IS NOT A REPEAT. `receiptFor` writes a
 * "New rank: X" diamond line for every band an event crossed, and the reward
 * moment shows a diamond TOTAL with those lines carried only as the card's
 * accessible name. So the figure on the pill below is the first and only time
 * that award is visible text, and it is the itemisation of one line of a total
 * shown elsewhere, which is the same relationship the reward moment's own
 * reason chips have to its hero.
 *
 * THE CLOCK. One requestAnimationFrame loop giving elapsed milliseconds since
 * mount, and every beat is a start time on it, so there is one place a tap can
 * skip to the end and reduced motion simply starts there. This is a third copy
 * of `useStageClock`; RewardMoment.tsx and StreakScreen.tsx each carry their
 * own, and the shape is small enough that a shared one would mean a moment
 * importing another moment. Noted rather than hidden: if a fourth appears it
 * should be lifted into a hook of its own.
 */

import { useEffect, useRef, useState } from "react";
import type { Receipt } from "@blueberry/economy";
import { ChipPress } from "../beats/ChipPress";
import { DiamondMark } from "../app/ui/HudIcons";
import { RankMark } from "./RankMark";
import { rankUpFromReceipt } from "./masteryModel";
import "./mastery.css";

/**
 * The beats, in milliseconds from mount.
 *
 * The badge arrives first and alone, and the words follow it. That order is the
 * hierarchy made temporal: for the first 460 ms the only thing on the screen is
 * the mark, so a still of the opening frame is a picture rather than a headline.
 * It ends at 1800, which is inside the 2500 the two sibling moments end on,
 * because this screen has less to say and should not hold a student longer for
 * saying it.
 */
const BEATS = Object.freeze({
  badge: 0,
  name: 460,
  claim: 700,
  pills: 950,
  pillStep: 120,
  next: 1320,
  action: 1450,
  end: 1800,
});

/** Elapsed ms since mount, on one rAF loop. `skipped` and reduced motion start at the end. */
function useStageClock(end: number, reducedMotion: boolean, skipped: boolean): number {
  const [elapsed, setElapsed] = useState(reducedMotion ? end : 0);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (reducedMotion || skipped) {
      setElapsed(end);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(end, now - started);
      setElapsed(t);
      if (t < end) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [end, reducedMotion, skipped]);
  return elapsed;
}

export interface RankUpMomentProps {
  /**
   * The receipt for the clear that crossed the band. The same object the reward
   * moment and the streak screen animate, so all three read one source and none
   * of them can disagree with the others about what just happened.
   */
  readonly receipt: Receipt;
  readonly reducedMotion: boolean;
  readonly onContinue: () => void;
}

/**
 * Renders null when this receipt crossed no rank, so a caller may mount it
 * unconditionally. `rankUpFromReceipt` is exported separately for a caller that
 * needs to know BEFORE mounting, which is what a stage sequence needs.
 */
export function RankUpMoment({ receipt, reducedMotion, onContinue }: RankUpMomentProps) {
  const [skipped, setSkipped] = useState(false);
  const now = useStageClock(BEATS.end, reducedMotion, skipped);
  const model = rankUpFromReceipt(receipt);
  if (model === null) return null;

  const at = (beat: number) => (now >= beat ? " is-in" : "");

  const pills: readonly { readonly key: string; readonly mark: boolean; readonly text: string }[] = [
    ...(model.diamonds > 0 ? [{ key: "diamonds", mark: true, text: `+${model.diamonds}` }] : []),
    { key: "keep", mark: false, text: "Yours to keep" },
    ...(model.crossed.length > 1 ? [{ key: "double", mark: false, text: `${model.crossed.length} ranks in one go` }] : []),
  ];

  return (
    // Tapping anywhere skips to the last frame. The acknowledgement is the frame
    // itself, so there is nothing to acknowledge separately and nothing waits.
    <div className="rankup-stage" onPointerDown={() => setSkipped(true)}>
      <div className="rankup-hero">
        <RankMark
          motif={model.badge.motif}
          tone="current"
          sizePx={132}
          glow
          className={`rankup-badge${at(BEATS.badge)}`}
        />
      </div>

      <div className={`rankup-in${at(BEATS.name)}`}>
        <p className="rankup-eyebrow">New rank</p>
        <h1 className="rankup-name title-face">{model.badge.name}</h1>
      </div>

      {/* The reason the badge means anything, and ECONOMY.md's own words for
          this rank. It sits UNDER the mark and the name, never over them. */}
      <p className={`rankup-claim rankup-in${at(BEATS.claim)}`}>{model.claim}</p>

      <div className="rankup-pills">
        {pills.map((pill, index) => (
          <span key={pill.key} className={`rankup-pill rankup-in${at(BEATS.pills + index * BEATS.pillStep)}`}>
            {pill.mark ? <DiamondMark className="rankup-pill__mark" /> : null}
            {pill.text}
          </span>
        ))}
      </div>

      {/* One quiet line looking forward. Not a target and not a shortfall: no
          number, no distance, just the name of the next thing. */}
      <p className={`rankup-next rankup-in${at(BEATS.next)}`}>
        {model.next === null ? "Top of the ladder." : `${model.next.name} is next.`}
      </p>

      <div className={`rankup-actions rankup-in${at(BEATS.action)}`}>
        {/* The taxonomy sheet's CONTINUE, which is the periwinkle chip and not
            the green one: green is CLAIM, and the reward moment already
            collected. Pointer down, so the press is the first frame of
            feedback and the 100 ms budget is met by construction. */}
        <ChipPress variant="check" className="w-full" onPointerDown={onContinue}>
          Continue
        </ChipPress>
      </div>
    </div>
  );
}
