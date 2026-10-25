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
 * GREEN RIGHT, RED WRONG (A2 round 4, owner direction 2026-10-15 item 2).
 * This screen used to have no red at all; the owner reversed that. The answer
 * is marked green with a tick, a wrong pick red with a cross, and the verdict
 * is the shared AnswerTray docked where CHECK was.
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
 * leaves the tab order and dumps focus to the document. Once the answer is in,
 * AnswerTray moves focus to its CONTINUE key and announces the verdict.
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
import { BloomStage } from "../../mascot/BloomStage";
import { CHARRED_LINE } from "../../mascot/berryReaction";
import type { BerryReactions } from "../../mascot/useBerryReactions";
import type { BerryState } from "../../mascot/berryState";
import type { BerryCostume } from "../../mascot/berryCostume";
import { useIdleInput } from "../../mascot/useIdleInput";
import { ChipPress } from "../ChipPress";
import { type MasteryLevel, type McqBeat } from "../types";
import { ExitMark, FlagMark } from "../chromeIcons";
import { LessonBar } from "../LessonBar";
import { ToolRail } from "../../app/ui/ToolRail";
import { McqVisualCard } from "./McqVisualCard";
import { mcqOptionTiles, mcqVisualFor } from "./mcqFigures";
import { StructureFigure } from "../../onboarding/StructureFigure";
import { type McqReveal } from "./grade";
import { AnswerTray, TrayWhy } from "../AnswerTray";
import { BloomVerdictBerry } from "../BloomVerdictBerry";
import { OptionMark } from "./OptionMark";
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
  /** Right answers in a row, this one included, for the green tray's combo chip. */
  readonly combo?: number;
  /**
   * Replaces the thin per-question bar: the beat runner passes the lesson's
   * recipe strip so the top bar carries the committed frame (X, the strip,
   * the counters) with one progress instrument rather than two stacked bars.
   */
  readonly progressSlot?: ReactNode;
  /**
   * Bloom's reaction state, owned by McqRunner (useBerryReactions). Absent in
   * a preview that renders the view alone: the berries then stand still.
   */
  readonly bloom?: BerryReactions;
  /** What the lesson's topic makes the berry (berryTopicState.ts). */
  readonly topicState?: BerryState;
  /** What it wears for this lesson (berryCostume.ts costumeForNode). */
  readonly costume?: BerryCostume;
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
  combo,
  bloom,
  topicState = "neutral",
  costume,
}: McqBeatViewProps) {
  const answered = reveal !== null;
  // 15s with no press on an unanswered question: the bar berry thinks, with
  // thought dots. The beat id resets the quiet clock for each new question.
  const idle = useIdleInput(answered ? "off" : "midItem", beat.id);
  // The char outlives the tray it arrived in (it clears on the next right
  // answer), so the bar berry wears it too; otherwise the topic's state.
  const charred = bloom?.berry.state === "charred";
  const berryState: BerryState = charred ? "charred" : topicState;
  const howTo = showHowTo ?? level === 0;
  const choose = (optionId: string) => {
    if (answered) return;
    onSelect(optionId);
  };

  // THE OPTIONS STAY IN SIGHT ABOVE THE TRAY, AND SO DOES THE QUESTION. Once
  // the answer is in, the column scrolls only by as much as the options reach
  // under the tray, and never so far that the question's own heading leaves
  // the top (the mascot's hint line goes first). A2 round 5 scrolled with a
  // margin the size of the whole tray, which overshot to the bottom of the
  // column on a phone and pushed the question out of sight (A2 round 6
  // critic). Measured against the column's own bottom edge rather than the
  // tray's, because the tray is still sliding in when this runs. A ref is a
  // handle on the rendered DOM node; the effect runs after React has painted.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!answered) return;
    const scroller = scrollRef.current;
    const group = scroller?.querySelector<HTMLElement>('[aria-label="Answer options"]');
    if (scroller == null || group == null || scroller.scrollHeight <= scroller.clientHeight) return;
    const view = scroller.getBoundingClientRect();
    const overlap = group.getBoundingClientRect().bottom - (view.bottom - 12);
    if (overlap <= 0) return;
    const heading = scroller.querySelector<HTMLElement>("h1");
    const roomAbove = heading === null ? overlap : heading.getBoundingClientRect().top - view.top;
    scroller.scrollBy({ top: Math.min(overlap, Math.max(0, roomAbove)), behavior: reducedMotion ? "auto" : "smooth" });
  }, [answered, reducedMotion]);

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
      {/* The top bar: a way out and how far along, nothing else (A2 round 6).
          The gem count and the two tools used to ride here too, and two blind
          judges read the row as a cluster of cryptic icons rather than as
          progress. The tools moved to the foot of the question, beside the
          report link; the gems are on the pathway and the lesson-complete
          screen. */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-3 pb-2 md:px-6">
        {/* onClick, not onPointerDown, so Enter and Space leave too. */}
        <button
          type="button"
          onClick={onExit}
          aria-label="Leave this lesson"
          title="Leave this lesson"
          className="lesson-exit"
        >
          <ExitMark />
        </button>

        {progressSlot !== undefined ? (
          <div className="min-w-0 flex-1">{progressSlot}</div>
        ) : (
          <div className="min-w-0 flex-1">
            <LessonBar fraction={progress.fraction} label="Questions answered" reducedMotion={reducedMotion} />
          </div>
        )}
      </div>

      {/* Everything that can grow lives in the one scrolling region, so the
          action bar below it is the only fixed thing on the screen.

          ONE QUESTION, ONE PHONE SCREEN (owner, 20 Oct: "free up some of the
          free space, so that it can fit into one page"). The gaps here are
          12px rather than 16px, the stem is one heading step down (below)
          and the option rows are a little shorter (beat-chrome.css). Measured
          at 390 by 844: the stem, the picture, the options and Check all sit
          on the first screen. */}
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 md:px-6">
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
            <Berry mood="curious" sizePx={36} reducedMotion={reducedMotion} />
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
            stem the heaviest element on the screen and inverted that.

            ONE STEP DOWN ON SIZE as well (bb-h2, 20px, not bb-h1's 24px):
            a long stem at 24px ran to four lines on a phone and alone pushed
            the last option under the Check bar. It is still the largest text
            on the screen. */}
        <div>
          <h1 className="bb-h2 text-bb-foreground">{beat.prompt}</h1>
          {beat.brief !== undefined ? (
            <p className="mt-2 text-scale-sm text-bb-muted-foreground">{beat.brief}</p>
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
            underneath is the thing that needs the room then.

            GROW, BUT NEVER SHRINK BELOW THE ROWS. The group is `flex-1`
            without `min-h-0`: with it, a long stem let flexbox squeeze the
            group shorter than its own rows, and the rows then drew on top
            of the tools and the report link underneath (measured at 375 by
            667 on u1-hx-dienes). Without it the column scrolls instead. */}
        {tiles !== null ? (
          // `shrink-0`, and NO growth clause. The tiles carry their own aspect
          // ratio now, so growing the grid could never make them bigger; what
          // it did instead was let flexbox SHRINK the grid below its rows'
          // own height, and the second row then overflowed on top of the
          // explanation panel underneath. Measured after grading: the third
          // tile drew across the reveal text.
          <ul className="option-tiles shrink-0" role="group" aria-label="Answer options">
            {beat.options.map((option, index) => {
              const isAnswer = option.id === beat.correctOptionId;
              const isSelected = selectedId === option.id;
              const tile = tiles[option.id] as NonNullable<(typeof tiles)[string]>;
              // Every tile question shows A, B, C under the drawings until
              // Check, then the names: "Pick the thiol" over a tile captioned
              // "ethanethiol" was answered by reading (audit 23 Oct, top-25 #11).
              // A first meeting too: the audit's three examples are all L0, and
              // the names still teach once they appear with the answer.
              const named = answered;
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
                      {named ? (tile.name ?? option.text) : String.fromCharCode(65 + index)}
                    </span>
                    {/* Kept for a screen reader even before Check: without a
                        name, a drawing is no option at all to a student who
                        cannot see it. */}
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
            className={`flex flex-col gap-2 ${answered ? "shrink-0" : "flex-1"}`}
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

        {/* THE REPORT CONTROL, MOVED OUT OF THE TOP BAR. Neither committed
            lesson frame has a flag in the header; both carry an exit, one
            progress bar and one currency count, and nothing else. The
            affordance is not cut, because a student who meets a wrong or
            unclear authored beat needs a way to say so; it moves to the foot
            of the question, where it is out of the way of the chemistry, and
            it says what it does in the coach's own words rather than in a
            bare symbol. */}
        {/* The foot row: the report link, and the two tools (periodic table,
            look up) that used to crowd the header (A2 round 6). ToolRail owns
            its own open sheet, so nothing here holds state for it. */}
        <div className="lesson-foot-row">
          <ToolRail className="lesson-tools" />
          <button type="button" onClick={onReport} aria-pressed={reported} className="lesson-report">
            <FlagMark />
            {reported ? "Flagged, thank you" : "Something wrong with this question?"}
          </button>
        </div>
      </div>

      {/* The one slot the way forward always lives in. Before the answer it
          holds CHECK (a flat grey slab until something is picked, green once
          it is live). After the answer the SAME slot becomes the answer tray,
          green or red, with CONTINUE in the tray's colour (AnswerTray.tsx).
          Sticky as well as last in a flex column, so it stays put whether this
          sheet has a bounded height of its own or scrolls with the page. */}
      {reveal !== null ? (
        <AnswerTray
          tone={reveal.matchedAnswer ? "right" : "wrong"}
          title={reveal.matchedAnswer ? "Nice!" : "Not quite"}
          combo={combo}
          badge={!reveal.matchedAnswer && reveal.firstMeeting ? "First look, no penalty" : undefined}
          actionLabel={primaryLabel}
          onAction={onPrimary}
          actionDisabled={!primaryEnabled}
          mascot={
            // ONE BERRY FOR THE VERDICT. The bar berry above unmounts with
            // the action bar, and this one takes its place in the tray, so
            // the moment has one Bloom and one reaction. It mounts already
            // holding the graded face, which is what lands on the first frame.
            bloom !== undefined ? (
              <BloomVerdictBerry bloom={bloom} state={topicState} costume={costume} reducedMotion={reducedMotion} />
            ) : undefined
          }
        >
          {charred ? <p className="answer-tray__charred">{CHARRED_LINE}</p> : null}
          {/* A2 round 5: the tray reads in one glance. A wrong answer leads with
              the labelled correct answer in large type, then ONE sentence of why,
              then why the student's own pick misses, open (audit 23 Oct, section
              5 #6). The rest of the author's why is one tap away in "Why?". */}
          {reveal.matchedAnswer ? (
            <TrayWhy lead={reveal.chosenWhy} />
          ) : (
            <>
              <p className="answer-tray__label">Correct answer:</p>
              <p className="answer-tray__answer answer-tray__answer--big">{reveal.answerText}</p>
              <TrayWhy lead={reveal.answerWhy} yours={reveal.chosenWhy} />
            </>
          )}
        </AnswerTray>
      ) : (
        <div className="beat-action-bar foot-bleed pb-safe sticky bottom-0 shrink-0 border-t-2 border-bb-border bg-bb-card px-4 pt-3 pb-3 md:px-6">
          {/* THE MASCOT IS ANCHORED, NOT FLOATING: he stands on the action
              row, bottom right, decoration only (no row reserved, no pointer
              events). Gone once the tray is up, one effect per moment. */}
          <span className="berry-anchor berry-anchor--bar" aria-hidden>
            <BloomStage reducedMotion={reducedMotion} thinking={idle === "thinking"}>
              <Berry
                mood={idle === "thinking" ? "thinking" : "focused"}
                state={berryState}
                costume={costume}
                working
                sizePx={68}
                reducedMotion={reducedMotion}
              />
            </BloomStage>
          </span>
          <ChipPress className="w-full" disabled={!primaryEnabled} onClick={onPrimary}>
            {primaryLabel}
          </ChipPress>
        </div>
      )}
    </div>
  );
}
