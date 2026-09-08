/**
 * The recipe strip: a lesson's progress bar built from beat-type badges in
 * order, per the committed spec blueberry_spec-question-badges_*.png.
 *
 * ONE INSTRUMENT, DRAWN FROM TWO COMMITTED IMAGES, and this is the whole
 * shape of the thing. blueberry_r9-lesson-mechanism and
 * blueberry_r9-lesson-reaction both draw ONE long green capsule between the
 * exit chip and the currency counter, filling left to right, with a grey
 * remainder ahead of it. blueberry_spec-question-badges draws the same slot
 * as a row of beat badges. They are not two bars: they are the same bar at
 * two zoom levels. So this is a CAPSULE with a continuous green flow across
 * everything behind the student, a periwinkle band on the beat they are
 * standing in, grey ahead, and the beat badges riding on top of all three.
 * From arm's length it is the frames' green capsule; up close it is the
 * sheet's recipe.
 *
 * A CONTROLLED, STATELESS VIEW. The segments arrive computed (template.ts's
 * recipeSegments for the beat runner, problemRecipeSegments for curriculum
 * problems) and so does the length of the green run (template.ts's
 * recipeProgress), because the web suite has no DOM and any rule living in
 * JSX is a rule nothing can test. This file only draws.
 *
 * ACCESSIBILITY. An ordered list rather than a progressbar role: a recipe is
 * a sequence of named things, and "step 3 of 6, matching, current" is more
 * information than a percentage. The current segment carries
 * aria-current="step"; each item names its beat and state to a reader. The
 * badge glyphs are aria-hidden because the text names them.
 *
 * THE GREEN NEVER RUNS OVER A MISS. `recipeProgress` takes a CLEARED
 * fraction, not an answered one. The previous build passed the answered
 * fraction, so a wrong answer filled the current segment solid green while
 * the panel underneath said "Not yet": a bar contradicting the screen it
 * sits on, and the opposite of DESIGN-GOALS' "green says you moved".
 *
 * THREE DELIBERATE DIVERGENCES FROM blueberry_spec-question-badges_*.png,
 * all named because everywhere else the image is the specification. The
 * measured colour work behind them is in beat-chrome.css.
 *
 *   1. THE IMAGE RIMS ITS GREEN SEGMENTS IN GREEN. DESIGN-GOALS' FILL-ONLY
 *      rule says the goal green is "never a hairline" on measured contrast
 *      (1.60:1 on cream), and the clause wins over the image where the two
 *      genuinely conflict. THERE IS NOW NO RIM ON ANY SEGMENT AT ALL: not a
 *      green one, and not the darker-tone substitute an earlier attempt
 *      reached for, which computed to #a7cd8e on #cfe7b6 and was a 1.34:1
 *      invisible green line, i.e. exactly the case the rule forbids while
 *      claiming in a comment that it did not. The segments meet with no
 *      stroke, which is also what makes the completed run read as ONE
 *      capsule rather than as a row of boxed cells.
 *   2. THE IMAGE DRAWS ITS BADGE GLYPHS LIGHTER THAN THE BADGE FACE, at
 *      1.46:1 measured on a #c8d6ff glyph over a #9eb0f8 face. The glyph
 *      IS the information on this strip, so it carries the 3:1 large-graphic
 *      floor. The image's figure/ground RELATIONSHIP is kept exactly, which
 *      is what a previous attempt inverted: a WHITE glyph on a coloured
 *      volumetric puck, on every state including the upcoming ones. What
 *      changed is only how dark the puck is, and it changed because
 *      DESIGN-GOALS names the contrast gate as the arbiter: white on the
 *      image's own #8f9ef0 measures 2.53:1 and fails.
 *   3. THE IMAGE STAMPS PADLOCKS ON TWO UPCOMING SEGMENTS. Owner ruling 4
 *      of 2026-09-04 is that a chip with no content still shows what KIND it
 *      will be, because an empty chip reads as broken; a padlock is that
 *      same hole with a different mark on it, and it is also untrue, since
 *      the beats of a lesson you are already inside are not locked. Upcoming
 *      segments keep their real motif, which is the treatment the image
 *      gives its seventh segment.
 */

import type { ReactNode } from "react";
import { recipeProgress, type BadgeKind, type RecipeSegment } from "./template";
import "./beat-chrome.css";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Tiny glyphs, one per badge kind in the committed badge vocabulary. */
const GLYPH: Readonly<Record<BadgeKind, ReactNode>> = {
  // A over B, the fraction the spec badge draws: the pick-one badge. The
  // three rows are set symmetrically about the middle (baselines 6.4 and
  // 14.6, rule at 8.6) because the spec draws a real fraction, and a rule
  // that hugs the numerator reads as a strikethrough at 14px.
  mcq: (
    <g>
      <g fill="currentColor" stroke="none" fontWeight={700}>
        <text x="8" y="6.4" fontSize="6.6" textAnchor="middle">
          A
        </text>
        <text x="8" y="14.6" fontSize="6.6" textAnchor="middle">
          B
        </text>
      </g>
      <path d="M4 8.6h8" {...STROKE} />
    </g>
  ),
  // Two cards, offset: the matching badge.
  match: (
    <g {...STROKE}>
      <rect x="2.5" y="2.5" width="7" height="9" rx="1.5" />
      <rect x="6.5" y="5" width="7" height="9" rx="1.5" />
    </g>
  ),
  // Bars of falling length with the swap arrow: the sort badge.
  sort: (
    <g {...STROKE}>
      <path d="M3 4h7M3 8h5M3 12h3" />
      <path d="M12.5 4.5v7m0 0-1.7-1.9m1.7 1.9 1.7-1.9" />
    </g>
  ),
  // A flask with a rising bubble: the build badge.
  synthesis: (
    <g {...STROKE}>
      <path d="M6.5 2.5h3M7 2.5v3.2L3.6 12a1.6 1.6 0 0 0 1.5 2.2h5.8a1.6 1.6 0 0 0 1.5-2.2L9 5.7V2.5" />
      <circle cx="8" cy="10.5" r="0.9" />
    </g>
  ),
  // The curved return arrow: misses coming back.
  recycle: (
    <g {...STROKE}>
      <path d="M12.5 8a4.5 4.5 0 1 1-1.7-3.5" />
      <path d="M11 1.8l-.2 2.9 2.9.2" />
    </g>
  ),
  // A cut gem: the lesson pays out. NOT A TICK, deliberately. The committed
  // spec uses a tick to mean COMPLETED, and the reward segment is `todo` for
  // the whole lesson, so a tick here put the image's done-mark on an unearned
  // slot from the first frame of every lesson. The gem is the product's own
  // reward currency and it is what the committed lesson frame draws in its
  // header, so the strip and the header now say "reward" the same way.
  reward: (
    <g {...STROKE}>
      <path d="M4.4 3h7.2l2.4 3.4L8 13.6 2 6.4Z" />
      <path d="M2 6.4h12M8 13.6 5.6 6.4 7 3M8 13.6l2.4-7.2L9 3" />
    </g>
  ),
  // A reagent bottle with a plus.
  reagents: (
    <g {...STROKE}>
      <path d="M4.5 2.5h4M5.3 2.5v2L3.5 7v6A1.5 1.5 0 0 0 5 14.5h3A1.5 1.5 0 0 0 9.5 13V7L7.7 4.5v-2" />
      <path d="M11.3 4.2h3M12.8 2.7v3" />
    </g>
  ),
  // A flask with a question mark: predict the product.
  product: (
    <g {...STROKE}>
      <path d="M6.5 2.5h3M7 2.5v3.2L3.6 12a1.6 1.6 0 0 0 1.5 2.2h5.8a1.6 1.6 0 0 0 1.5-2.2L9 5.7V2.5" />
      <path d="M6.9 9.4a1.1 1.1 0 1 1 1.3 1.1v.6" />
      <path d="M8.2 12.6h.01" />
    </g>
  ),
  // A plus over an equals: work the number. Drawn as arithmetic rather than
  // as three stacked rules, which at 14px was indistinguishable from the
  // sort badge's bars and read as a hamburger menu on the built screen.
  numeric: (
    <g {...STROKE}>
      <path d="M5.5 2.5v5M3 5h5" />
      <path d="M10 3.6l3.4 3.4M13.4 3.6L10 7" />
      <path d="M3 11h10M3 14h10" />
    </g>
  ),
  // A hexagon: draw the structure.
  structure: (
    <g {...STROKE}>
      <path d="M8 2.5 12.6 5.2v5.6L8 13.5 3.4 10.8V5.2Z" />
    </g>
  ),
};

/**
 * Every badge kind that has a drawn glyph, for the suite.
 *
 * EVERY NODE CARRIES ITS MOTIF (owner ruling 4, 2026-09-04) applies to the
 * strip's chips exactly as it applies to the pathway's: a segment whose badge
 * has no glyph draws an empty chip, and an empty chip reads as broken rather
 * than as unauthored. A test compares this list against BADGE_LABEL's keys,
 * so adding a badge kind without drawing it fails the suite instead of
 * shipping a hole. Derived from GLYPH rather than written twice.
 */
export const GLYPH_BADGE_KINDS: readonly BadgeKind[] = Object.freeze(Object.keys(GLYPH) as BadgeKind[]);

/**
 * The cleared mark: a white tick, drawn only on a segment behind the student.
 *
 * The committed spec marks a completed beat with a saturated green disc
 * carrying a white tick, and the previous build had nothing on the strip that
 * said "this one is done" beyond the fill behind it. Heavier stroke than the
 * motif glyphs because a tick at 14px on a saturated fill is the one mark on
 * this strip that has to read at a glance.
 */
const CLEARED = (
  <g {...STROKE} strokeWidth={2.4}>
    <path d="M3.6 8.4 6.7 11.5 12.6 4.8" />
  </g>
);

/**
 * Which mark a segment draws: its own beat motif, or the cleared tick.
 *
 * A ONE LINE RULE PULLED OUT OF THE JSX, for the reason this whole package
 * keeps doing that: the web suite runs in node with no DOM, so a rule that
 * lives in a ternary inside a render is a rule nothing can test. There are
 * two live promises in it. A segment behind the student is marked as cleared
 * rather than merely tinted, which the previous build had nothing for. And
 * "cleared" is never what an unearned segment draws, which is the bug this
 * function's test names: the reward slot's glyph used to BE a tick and the
 * reward slot is `todo` for the whole lesson, so every lesson opened with a
 * done-mark sitting in its last segment.
 */
export function badgeMark(state: RecipeSegment["state"], badge: BadgeKind): BadgeKind | "cleared" {
  return state === "done" ? "cleared" : badge;
}

const STATE_WORD: Readonly<Record<RecipeSegment["state"], string>> = {
  done: "done",
  current: "you are here",
  todo: "coming up",
};

export interface RecipeStripProps {
  readonly segments: readonly RecipeSegment[];
  /**
   * 0 to 1: how far through the CURRENT segment's own beats the student has
   * CLEARED. Never how many they have answered: see the file header. Omit it
   * for single-beat segments, where partway does not exist.
   */
  readonly currentFraction?: number;
  readonly reducedMotion?: boolean;
  readonly className?: string;
}

export function RecipeStrip({ segments, currentFraction, reducedMotion = false, className = "" }: RecipeStripProps) {
  const position = segments.findIndex((segment) => segment.state === "current");
  const flow = recipeProgress(segments, currentFraction ?? 0);
  return (
    // The capsule. The green flow is a SIBLING of the badge row rather than a
    // per-segment fill, which is what lets one continuous bar cross every
    // cleared segment with no seam in it: the frames draw one capsule, and a
    // fill drawn inside each segment would draw six.
    <div className={`recipe-strip ${reducedMotion ? "recipe-strip--still" : ""} ${className}`}>
      <span className="recipe-strip__flow" aria-hidden style={{ width: `${flow * 100}%` }} />
      <ol
        className="recipe-strip__beats"
        aria-label={`Lesson recipe, ${position < 0 ? segments.length : position + 1} of ${segments.length}`}
      >
        {segments.map((segment, index) => {
          const current = segment.state === "current";
          return (
            <li
              key={`${segment.slot}-${index}`}
              className="recipe-strip__seg"
              data-state={segment.state}
              data-badge={segment.badge}
              aria-current={current ? "step" : undefined}
              title={segment.label}
            >
              {/* THE PUCK, on every state. The committed sheet draws each
                  in-strip badge as a volumetric object: a coloured face, a
                  white glyph, and a thick lip of the same hue under it. An
                  earlier attempt drew the upcoming ones as flat pale discs
                  with a transparent lip and a dark glyph, which is the
                  sheet's own relationship inverted and read as dark specks
                  rather than as pucks. Face, ink and lip are all set per
                  state in beat-chrome.css; nothing here knows a colour. */}
              <span className="recipe-strip__badge" aria-hidden>
                <svg viewBox="0 0 16 16" role="presentation" focusable="false">
                  {badgeMark(segment.state, segment.badge) === "cleared" ? CLEARED : GLYPH[segment.badge]}
                </svg>
              </span>
              <span className="sr-only">
                {segment.label}, {STATE_WORD[segment.state]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
