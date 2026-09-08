/**
 * The easy MCQ beat on screen, in the shape of the reference captures: a top
 * bar, a scrolling sheet, and one full width button pinned at the bottom that
 * never moves.
 *
 * WHY THIS COMPONENT HOLDS NO STATE AT ALL. It used to hold its own answer and
 * grade on the first tap, and a harsh review found what that costs: a scroll
 * fling mis-tap was an irreversible wrong answer with a mistake card toast
 * behind it. The pick / commit split that fixes it lives in session.ts, where a
 * test can hold it, because the web suite runs in a node environment with no
 * DOM and any rule that lives in JSX is a rule nothing can test. So this file
 * is a controlled component: every value it renders arrives as a prop and every
 * gesture leaves as a callback. If you are debugging a wrong verdict at 1am, it
 * is not in this file. McqRunner.tsx is the piece that owns the session.
 *
 * THE THREE THINGS THE REFERENCE CAPTURES SHOW AND THE FIRST ATTEMPT MISSED.
 *
 *   1. PICK, THEN PRESS. "fill in the blank.png" and the how_to capture both
 *      put a full width CHECK under the options, and in the how_to capture it
 *      is visibly inactive because nothing is picked yet. A tap selects; the
 *      button commits. Selecting is free and changeable.
 *
 *   2. THE BUTTON DOES NOT MOVE. "short explanation.png" puts CONTINUE in the
 *      same full bleed slot at the bottom of the sheet that CHECK occupied,
 *      after an explanation that can be several lines. Here that is a sticky
 *      action bar rather than the last child of a growing column, so the way
 *      forward is in the same place before and after the answer. `pb-safe` is
 *      theme.css's safe area inset, so it clears the home indicator too.
 *
 *   3. THE TOP BAR CARRIES AN EXIT, ONE BAR AND ONE COUNT, and nothing
 *      else. This used to say "an exit and a flag", after an older Duolingo
 *      capture. The committed lesson frames
 *      (blueberry_r9-lesson-mechanism, blueberry_r9-lesson-reaction) are the
 *      newer and more specific reference for this exact row and they draw
 *      three things: the violet exit chip, one long progress capsule, and a
 *      currency count paired with a DRAWN ICON. No flag, and no level chip.
 *      The flag is not cut, because a student who meets a confusing authored
 *      beat still needs a way to say so; it moves to the foot of the
 *      question, where it says what it does in words.
 *
 * NO RED ON THIS SCREEN, the rule lesson/Feedback.tsx already set: the student
 * is learning, not being marked down. The answer is marked with the `--good`
 * family and the option they committed keeps its periwinkle stroke, so they
 * can still see what they chose beside what was right.
 *
 * SELECTION IS SAID WITH FORM, NEVER WITH A WORD. blueberry_r9-lesson-reaction
 * marks the picked candidate by keeping the cream fill and adding an indigo
 * stroke and a visible bottom lip: the card lifts, the way every other control
 * in this product lifts. An earlier build tinted it with a violet wash and
 * then wrote the literal word "picked" down the right hand side, which is a
 * control captioning a state it failed to draw. The four looks live in one
 * `data-state` vocabulary shared with the picture tiles; see optionState below
 * and beat-chrome.css for the drawing.
 *
 * CONTRAST. The options that were neither the answer nor the pick are pushed
 * back by SURFACE and nothing else. They used to carry `opacity-70` on top of
 * `text-bb-muted-foreground`, which blends to 3.59:1 in light and 4.05:1 in dark,
 * both under the 4.5:1 body floor the Budgets table fixes. De-emphasis comes
 * from the surface, never from thinning the ink.
 *
 * KEYBOARD. The options stay focusable after the answer, marked `aria-disabled`
 * with the handler returning early, rather than `disabled`. A disabled element
 * leaves the tab order, and the element the student just activated leaving the
 * tab order dumps focus to the document and makes them Tab the whole page to
 * reach Continue. That is the same reason focus moves to the explanation when
 * it appears: it is one Tab from there to the button, and a screen reader hears
 * the explanation rather than a silent jump.
 *
 * THE QUESTION IS A PICTURE FIRST, owner ruling 1 of 2026-09-04: "a question
 * that is only prose has already lost the student", and it names every beat
 * type. So the stem is followed by a drawn visual, from `mcqFigures.ts`: the
 * scheme for a transformation, the molecule for a question about one, the two
 * molecules for a question that compares. The earlier note here said a
 * question needing a drawn structure needed a renderer that was another
 * surface's; the renderer is `onboarding/StructureFigure` and it is in this
 * app, so the note was a gap rather than a boundary. `moleculeId` on a McqBeat
 * is still ignored: the visual is keyed on the beat id, which is what lets an
 * MCQ draw a scheme or a pair rather than only a single molecule.
 *
 * AND THE ANSWERS ARE PICTURES TOO, WHERE THEY CAN BE. Owner ruling 2 of the
 * same day: "OPTION CARDS ARE PICTURES WITH CAPTIONS, not captions with
 * pictures". A beat whose options are positions or structures renders as the
 * committed frame's 2 by 2 tile grid, drawn from the option-figure table in
 * `mcqFigures.ts`; a beat whose options are RULES keeps the word rows, because
 * a rule is not a molecule and the reference frame draws its own rule answers
 * as words as well. The table decides which, all or nothing per beat, and this
 * file only asks it.
 */

import { useEffect, useRef, type ReactNode } from "react";

import { Berry } from "../../mascot/Berry";
import { ChipPress } from "../ChipPress";
import { type MasteryLevel, type McqBeat } from "../types";
import { ExitMark, FlagMark, GemMark } from "../chromeIcons";
import { McqVisualCard } from "./McqVisualCard";
import { mcqOptionTiles, mcqVisualFor } from "./mcqFigures";
import { StructureFigure } from "../../onboarding/StructureFigure";
import { revealHeading, type McqReveal } from "./grade";
import type { McqProgress } from "./session";
import "../beat-chrome.css";
import "../../lesson/scheme.css";

/**
 * Which of the four looks an option is wearing. One vocabulary, shared by the
 * picture tiles and the word rows, so a lesson that shows both does not teach
 * two ways of saying the same thing. See beat-chrome.css for the drawing.
 */
function optionState(answered: boolean, isAnswer: boolean, isSelected: boolean): string {
  if (!answered) return isSelected ? "picked" : "rest";
  if (isAnswer) return "answer";
  return isSelected ? "chosen" : "other";
}

/**
 * The glyph that says which card is which, once the answer is revealed.
 *
 * WCAG 1.4.1: colour may not be the ONLY visual means of conveying
 * information. Before this the graded row said "answer" with a green fill and
 * "the one you chose" with a periwinkle stroke, and nothing else. A student
 * with a colour vision deficiency, or anyone reading in sunlight, got two
 * cards that differ by a hue they cannot separate. Both Mobbin references mark
 * this with a glyph rather than a fill: Quizlet's screen 44 puts a cross on
 * the choice and a tick on the answer, and screen 38 leads its banner with one.
 *
 * NO RED, and that is not an oversight. beat-chrome.css already records the
 * rule ("No red on this screen, the rule lesson/Feedback.tsx already set") and
 * it comes from CLAUDE.md's voice section: the reader is stressed, a mistake is
 * the normal step, and the copy is a coach on the student's side. So this takes
 * the reference's INFORMATION, which is "this was yours and this was right",
 * and leaves its scolding colour. The chosen card is labelled in words, in the
 * same periwinkle it already wore.
 *
 * The sr-only text is what a screen reader gets, and it is why the glyphs are
 * aria-hidden: a tick read aloud as "check mark" beside the words "correct
 * answer" is the same fact twice.
 */
function OptionMark({ state }: { readonly state: string }): React.ReactElement | null {
  if (state === "answer") {
    return (
      <span className="option-mark option-mark--answer">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
          <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">correct answer</span>
      </span>
    );
  }
  if (state === "chosen") {
    return (
      <span className="option-mark option-mark--chosen">
        <span aria-hidden>your pick</span>
        <span className="sr-only">the answer you chose</span>
      </span>
    );
  }
  return null;
}

export interface McqBeatViewProps {
  readonly beat: McqBeat;
  readonly level: MasteryLevel;
  /** The option under the finger. Not yet an answer. Null before the first tap. */
  readonly selectedId: string | null;
  /** The graded result, or null while the student is still picking. */
  readonly reveal: McqReveal | null;
  readonly progress: McqProgress;
  /** "Check" before the commit, "Continue" after. From session.commitLabel. */
  readonly primaryLabel: string;
  /** Whether the one button is live. Inactive with nothing picked, per the how_to capture. */
  readonly primaryEnabled: boolean;
  /** Commit the pick, or move on once it is committed. One slot, one handler. */
  readonly onPrimary: () => void;
  readonly onSelect: (optionId: string) => void;
  /** The X. Leaves the run without recording anything for this beat. */
  readonly onExit: () => void;
  /** The flag. Says this beat reads wrong or unclear. */
  readonly onReport: () => void;
  /** Whether this beat has already been flagged, so the bar can say it landed. */
  readonly reported: boolean;
  /**
   * The one line how to strip, in the shape of the reference capture where a
   * mascot says what this kind of question wants. Defaults to on at L0, the
   * first meeting and the only rung where it is news.
   */
  readonly showHowTo?: boolean;
  readonly reducedMotion?: boolean;
  /**
   * Replaces the thin per-question bar: the beat runner passes the lesson's
   * recipe strip so the top bar carries the committed frame (X, the strip,
   * the counters) with one progress instrument rather than two stacked bars.
   */
  readonly progressSlot?: ReactNode;
  /** The header's currency counter. See McqRunner for why it is not beat.diamonds. */
  readonly currencySlot?: ReactNode;
}

const HOW_TO_PICKING = "Pick one, then press Check. You can change your mind as many times as you like first.";
const HOW_TO_REVEALED = "Read the reason, then press Continue. Nothing here is timed.";

export function McqBeatView({
  beat,
  level,
  selectedId,
  reveal,
  progress,
  primaryLabel,
  primaryEnabled,
  onPrimary,
  onSelect,
  onExit,
  onReport,
  reported,
  showHowTo,
  reducedMotion = false,
  progressSlot,
  currencySlot,
}: McqBeatViewProps) {
  const answered = reveal !== null;
  const howTo = showHowTo ?? level === 0;
  const revealRef = useRef<HTMLElement | null>(null);

  // Move focus to the explanation the frame it appears. The React pattern is a
  // ref plus an effect keyed on the thing that changed, which is the ordinary
  // way to touch a DOM node after render. It is here so a keyboard or switch
  // user hears the explanation and is one Tab from the button, instead of being
  // dropped on the document because the option they pressed left the tab order.
  useEffect(() => {
    if (reveal !== null) revealRef.current?.focus();
  }, [reveal]);

  const choose = (optionId: string) => {
    if (answered) return;
    onSelect(optionId);
  };

  const visual = mcqVisualFor(beat.id);
  const tiles = mcqOptionTiles(
    beat.id,
    beat.options.map((option) => option.id),
  );

  return (
    // `min-h-0 flex-1` rather than `h-full max-h-full`: percentages resolve
    // to auto when no ancestor has a definite height, which is exactly how
    // this sheet came out 464px tall on an 844px screen. The runner's stage
    // is a flex column now, so growing is a flex clause, not a percentage.
    <div className="mcq-sheet mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col">
      {/* The top bar, per the reference: a way out, how far along, a way to
          report, and the reward count. Fixed height so nothing below it moves. */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-3 pb-2 md:px-6">
        <button
          type="button"
          onPointerDown={onExit}
          aria-label="Leave this lesson"
          title="Leave this lesson"
          className="lesson-exit"
        >
          <ExitMark />
        </button>

        {progressSlot !== undefined ? (
          <div className="min-w-0 flex-1">{progressSlot}</div>
        ) : (
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-bb-muted"
            role="progressbar"
            aria-label="Questions answered"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.answered}
          >
            <div
              className="h-full rounded-full bg-bb-primary"
              style={{
                width: `${Math.round(progress.fraction * 100)}%`,
                transition: reducedMotion ? "none" : "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </div>
        )}

        {/* THE COUNTER IS A DRAWN GEM AND A NUMBER, and there is nothing else
            in this row. Both committed frames pair the count with an icon (a
            flask and flame in the mechanism frame, a gem in the reaction
            frame) and neither carries a flag up here; the previous build
            showed a bare numeral beside a U+2691 flag button, so the number
            did not say what it counted and the row carried a control the
            frames do not have. The flag itself is not cut, only moved: see
            the quiet report control at the foot of the question.

            IT ARRIVES AS A SLOT, and the fallback is this beat's own payout
            rather than nothing, so a runner mounted on its own still draws a
            counter instead of a hole where one belongs. */}
        {currencySlot ?? (
          beat.diamonds !== undefined ? (
            <span className="lesson-currency" aria-label={`${beat.diamonds} gems for this question`}>
              <GemMark />
              {beat.diamonds}
            </span>
          ) : null
        )}
      </div>

      {/* Everything that can grow lives in the one scrolling region, so the
          action bar below it is the only fixed thing on the screen. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 md:px-6">
        {reported ? (
          <p className="fade-in rounded-2xl border border-bb-border bg-bb-muted px-3 py-2 text-scale-sm text-bb-muted-foreground">
            Thanks, this one is flagged for review. Carry on when you are ready.
          </p>
        ) : null}

        {howTo ? (
          // Rendered at every stage rather than unmounted on answer. Unmounting
          // it was pulling the option list up under the student's finger at the
          // exact frame they tapped; the line changes, the row stays.
          <div className="flex items-center gap-3">
            <Berry mood="curious" sizePx={44} reducedMotion={reducedMotion} />
            <p className="flex min-h-13 items-center rounded-2xl border border-bb-border bg-bb-card px-3 py-2 text-scale-sm text-bb-muted-foreground">
              {answered ? HOW_TO_REVEALED : HOW_TO_PICKING}
            </p>
          </div>
        ) : null}

        {/* THE FRAME OPENS ON THE QUESTION. Neither r9 lesson frame has
            anything between the top bar and the stem, and lesson/LessonPlayer
            had already recorded that decision ("THE TWO PILLS ABOVE THE STEM
            ARE GONE"); this view had not followed it and still drew a muted
            "With guides" mastery chip in that gap. The rung is not lost: it
            decides which beats the session serves and whether the how-to line
            appears, which is a behaviour rather than a label.

            THE CONTENT FACE AND THE REGULAR WEIGHT, per DESIGN-TOKENS'
            typography split and the frames' own hierarchy. Both frames set
            the stem in a REGULAR weight: it is the lightest large text on
            the frame, because the loudest thing is meant to be the chemistry
            underneath it. The previous build set it at 600, which made the
            stem the heaviest element on the screen and inverted that. */}
        <div>
          <h2 className="text-scale-xl font-normal leading-snug text-bb-foreground">{beat.prompt}</h2>
          {beat.brief !== undefined ? (
            <p className="mt-1 text-scale-sm text-bb-muted-foreground">{beat.brief}</p>
          ) : null}
        </div>

        {/* THE VISUAL. Null only for a beat the figure table has not met, in
            which case the question falls back to its words and
            test/mcqFigures.test.ts fails; see mcqFigures.ts for why that
            fallback exists and what stops a student ever seeing it. */}
        {visual === null ? null : <McqVisualCard visual={visual} />}

        {/* A group of aria-pressed buttons rather than a radiogroup: a real
            radiogroup needs roving tabindex and arrow key handling, and this
            list is four items a student taps. Boring beats clever here.

            TWO SHAPES, AND THE CONTENT PICKS. "OPTION CARDS ARE PICTURES WITH
            CAPTIONS", owner ruling 2, and blueberry_r9-lesson-reaction draws
            the candidates as a 2 by 2 of tiles carrying a drawn structure over
            a short name. So a beat whose options are POSITIONS or STRUCTURES
            gets that grid, from the option-figure table in mcqFigures.ts. A
            beat whose options are RULES ("activating and meta directing") gets
            the word rows below it, because a rule is not a molecule and the
            reference frame draws its own rule answers as words too. The table
            decides, never this file, and it is all-or-nothing per beat so a
            comparison is never half drawn.

            THE ROWS STRETCH WHILE THE QUESTION IS OPEN, which is the S3
            dead-zone carry applied to this screen: three short options and a
            screenful of empty cream become three big option cards. Once the
            answer is revealed the growth stops, because the explanation
            underneath is the thing that needs the room then. */}
        {tiles !== null ? (
          // `shrink-0`, and NO growth clause. The tiles carry their own aspect
          // ratio now, so growing the grid could never make them bigger; what
          // it did instead was let flexbox SHRINK the grid below its rows'
          // own height, and the second row then overflowed on top of the
          // explanation panel underneath. Measured after grading: the third
          // tile drew across the reveal text.
          <ul className="option-tiles shrink-0" role="group" aria-label="Answer options">
            {beat.options.map((option) => {
              const isAnswer = option.id === beat.correctOptionId;
              const isSelected = selectedId === option.id;
              const tile = tiles[option.id] as NonNullable<(typeof tiles)[string]>;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => choose(option.id)}
                    aria-disabled={answered || undefined}
                    aria-pressed={isSelected}
                    data-state={optionState(answered, isAnswer, isSelected)}
                    className="option-tile"
                  >
                    <StructureFigure figure={tile.figure} className="option-tile__figure" />
                    {/* THE NAME SITS UNDER THE PICTURE, small and in the muted
                        ink, per ruling 2: the name is a label on the thing
                        rather than the thing. The option's full authored
                        wording still reaches a screen reader, because the
                        caption is a short name and the option is a sentence. */}
                    <span className="option-tile__caption" aria-hidden>
                      {tile.name ?? option.text}
                    </span>
                    <span className="sr-only">{option.text}</span>
                    <OptionMark state={optionState(answered, isAnswer, isSelected)} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div
            role="group"
            aria-label="Answer options"
            className={`flex flex-col gap-2 ${answered ? "shrink-0" : "min-h-0 flex-1"}`}
          >
            {beat.options.map((option) => {
              const isAnswer = option.id === beat.correctOptionId;
              const isSelected = selectedId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(option.id)}
                  aria-disabled={answered || undefined}
                  aria-pressed={isSelected}
                  data-state={optionState(answered, isAnswer, isSelected)}
                  className={`option-card text-scale-base font-normal ${
                    answered ? "" : "max-h-36 flex-1"
                  }`}
                >
                  {/* The lift says picked and the fill says answer, and since
                      the graded states also carry a mark neither fact is told
                      by colour alone. See OptionMark. */}
                  <span>{option.text}</span>
                  <OptionMark state={optionState(answered, isAnswer, isSelected)} />
                </button>
              );
            })}
          </div>
        )}

        {reveal !== null ? (
          // The short explanation, in the shape of the reference capture: the
          // claim in full weight, then one muted line under it.
          <section
            ref={revealRef}
            tabIndex={-1}
            aria-live="polite"
            className={`fade-in rounded-2xl border p-4 outline-none ${
              reveal.matchedAnswer ? "border-good/40 bg-good-soft" : "border-bb-primary/30 bg-bb-primary/5"
            }`}
          >
            <h3
              className={`text-scale-base font-semibold ${
                reveal.matchedAnswer ? "text-good-ink" : "text-bb-foreground"
              }`}
            >
              {revealHeading(reveal)}
            </h3>
            <p className="mt-2 text-scale-sm text-bb-foreground">{reveal.chosenWhy}</p>
            {!reveal.matchedAnswer ? (
              <p className="mt-2 text-scale-sm text-bb-muted-foreground">
                <span className="font-semibold text-bb-foreground">{reveal.answerText}. </span>
                {reveal.answerWhy}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* THE REPORT CONTROL, MOVED OUT OF THE TOP BAR. Neither committed
            lesson frame has a flag in the header; both carry an exit, one
            progress bar and one currency count, and nothing else. The
            affordance is not cut, because a student who meets a wrong or
            unclear authored beat needs a way to say so; it moves to the foot
            of the question, where it is out of the way of the chemistry, and
            it says what it does in the coach's own words rather than in a
            bare symbol. */}
        <button type="button" onPointerDown={onReport} aria-pressed={reported} className="lesson-report">
          <FlagMark />
          {reported ? "Flagged, thank you" : "Something wrong with this question?"}
        </button>
      </div>

      {/* The one slot the way forward always lives in. Sticky as well as last
          in a flex column, so it stays put whether this sheet has a bounded
          height of its own or scrolls with the page around it. */}
      <div className="beat-action-bar pb-safe sticky bottom-0 shrink-0 border-t border-bb-border bg-bb-card px-4 pt-3 pb-3 md:px-6">
        {/* THE MASCOT IS ANCHORED, NOT FLOATING, the S3 judge's carry against
            the question screen. Both committed lesson frames stand the berry
            in the bottom right with its toes on the action row, so that is
            where it stands: on an edge the layout owns rather than in the
            middle of the content. Decoration to the layout, so it reserves no
            row, shifts nothing, and takes no pointer events; the Check's own
            label is centred, so the berry never covers it. Dropped while the
            explanation is on screen, because that panel has its own reacting
            berry and DESIGN-GOALS allows exactly one on a frame. */}
        {answered ? null : (
          <span className="berry-anchor berry-anchor--bar" aria-hidden>
            <Berry mood="focused" working sizePx={68} reducedMotion={reducedMotion} />
          </span>
        )}
        {/* THE COMMIT IS A CHIP. The S3 judge's carry was an outlined Check
            whose disabled state was ambiguous; ChipPress is the committed
            button-types sheet's own construction, the sheet's PERIWINKLE
            check face over a darker bottom edge when it is live and the
            sheet's cool grey-blue disabled pill with no travel when it is
            not, so "nothing picked yet" is a different object rather than a
            dimmer one. The label is CHECK then CONTINUE in one slot that
            does not move, which is BUTTON-MECHANICS' content swap. */}
        <ChipPress className="w-full" disabled={!primaryEnabled} onClick={onPrimary}>
          {primaryLabel}
        </ChipPress>
      </div>
    </div>
  );
}
