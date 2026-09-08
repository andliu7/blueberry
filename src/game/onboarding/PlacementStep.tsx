/**
 * The placement quiz, drawn to blueberry_r9-onboard-placement and wired to the
 * quiz machine that already exists in packages/curriculum.
 *
 * NOTHING ABOUT PLACEMENT IS DECIDED HERE. `createQuiz` and `reduceQuiz` own
 * which topic gets probed next, when the walk goes backwards, when it stops,
 * and what the recommendation is. This file supplies three things the machine
 * deliberately does not have: a rendering, a pick, and a NUMBER OF SECONDS.
 *
 * THE CLOCK, and it is the part worth reading twice. The machine reads no clock
 * of its own; elapsed seconds arrive as event data (see the machine's header,
 * and LOG.md's "The instruments that only worked before dark"). The clock this
 * file starts is `performance.now()`, which is MONOTONIC and has no calendar in
 * it: nothing here branches on the hour, the date or the timezone, so this
 * screen behaves identically at 9am and at 11pm and a test can drive it without
 * seeding a clock. The wall clock never enters the placement.
 *
 * The timer starts when the student presses start, not when the step mounts.
 * The Budgets row is "onboarding quiz, time to a course recommendation: under 3
 * minutes", and a stopwatch that runs while the student reads what the quiz is
 * would be measuring the wrong thing and reporting a number that flatters us.
 *
 * THE SHAPES. The image draws a 2x2 of option tiles, which is the multiple
 * choice and major product shape and covers 100 of the seed corpus's 158
 * problems. The other five answer kinds are not this frame's to invent a layout
 * for, so they are handed to the lesson's own ProblemView inside the same
 * frame. That import is one-way and read-only: the lesson surface belongs to
 * another builder and nothing here edits it.
 *
 * MAJOR PRODUCT NEEDS BOTH PICKS BEFORE CHECK IS LIVE, and that is a
 * correctness decision rather than a design one. `checkMajorProduct` grades a
 * product picked with no ranking argument as WRONG (`right_product_wrong_reason`,
 * detail "product selected with no ranking argument"). Letting CHECK fire on
 * the product alone would feed the placement walk a wrong answer the student
 * was never asked to avoid, and the walk would then probe backwards on a gap
 * that is not there. So the gate is both.
 *
 * THE TILE IS A PICTURE WITH A CAPTION NOW, which is the 2026-09-04 ruling
 * honoured rather than reported upward. See figures.ts for how the drawn
 * structures got here without a figure field in the corpus, and for what makes
 * that a shim with a boundary rather than a shell inventing chemistry.
 */

import { useMemo, useRef, useState } from "react";
import {
  QUESTION_CAP,
  SEED_CORPUS,
  createQuiz,
  reduceQuiz,
  type AnswerState,
  type CourseId,
  type Problem,
  type QuizState,
  type Recommendation,
} from "@blueberry/curriculum";
import { Berry } from "../mascot/Berry";
import { ProblemView } from "../lesson/ProblemView";
import { Action, ChipList, Frame, Hero, TrailingSkip } from "./Frame";
import { STEM_LONG_CHARS, tileIsDense, twoColumnGrid, progressPercent } from "./flow";
import { figureFor } from "./figures";
import { StructureFigure } from "./StructureFigure";
import {
  CONTINUE,
  PLACEMENT_CHECK,
  PLACEMENT_COUNTER,
  PLACEMENT_DONE_ASK,
  PLACEMENT_INTRO_ASK,
  PLACEMENT_REASON_ASK,
  PLACEMENT_SKIP_QUESTION,
  PLACEMENT_SKIP_SHORT,
  PLACEMENT_SKIPPED_ASK,
  PLACEMENT_START,
  fill,
  withoutMark,
} from "./copy";
import "./onboarding.css";

/** What the student has picked on the current question, before CHECK. */
interface Pick {
  readonly optionId: string | null;
  readonly reasonId: string | null;
}

const NOTHING_PICKED: Pick = Object.freeze({ optionId: null, reasonId: null });

/** The hero berry on the two screens that hold one sentence and one button. */
const HERO_BERRY_PX = 132;

/**
 * THE PEEKING BERRY'S SIZE, AND WHY IT IS NOT 168.
 *
 * blueberry_r9-onboard-placement draws him rising from behind CHECK, cropped
 * by the right screen edge, overlapping nothing but the button's right end and
 * empty ground. The previous pass drew 168px anchored at the foot's own bottom,
 * which rose 170px into the body and covered the fourth tile's caption: at 390
 * by 844 the words "The secondary amine N-H" were unreadable in the unpicked
 * state. A mascot that occludes an answer is worse than no mascot.
 *
 * 128, anchored at the page's bottom edge, puts his crown about 32px above the
 * top of CHECK, which is where the image puts it, and `.ob[data-peek="true"]
 * .ob__body` reserves exactly that much air under the last row so the overlap
 * can only ever land on empty ground.
 */
const PEEK_BERRY_PX = 128;

export interface PlacementStepProps {
  readonly claimedCourse: CourseId | null;
  readonly reducedMotion: boolean;
  readonly onBack: () => void;
  /**
   * The walk finished. The recommendation may be null when the student skipped
   * every question, which is a real outcome and not an error; choose-your-start
   * falls back to the claimed course in that case (see flow.resolveStart).
   */
  readonly onDone: (recommendation: Recommendation | null) => void;
}

export function PlacementStep({ claimedCourse, reducedMotion, onBack, onDone }: PlacementStepProps) {
  const [state, setState] = useState<QuizState | null>(null);
  const [pick, setPick] = useState<Pick>(NOTHING_PICKED);
  const startedAt = useRef<number>(0);

  const begin = () => {
    startedAt.current = performance.now();
    setPick(NOTHING_PICKED);
    setState(createQuiz({ problems: SEED_CORPUS, claimedCourse }));
  };

  const elapsed = () => Math.round((performance.now() - startedAt.current) / 1000);

  const advance = (event: Parameters<typeof reduceQuiz>[1]) => {
    setState((current) => (current === null ? current : reduceQuiz(current, event)));
    setPick(NOTHING_PICKED);
  };

  const submit = (answer: AnswerState) =>
    advance({ kind: "answerSubmitted", state: answer, elapsedSeconds: elapsed() });
  const skip = () => advance({ kind: "skipped", elapsedSeconds: elapsed() });

  const asked = state?.asked.length ?? 0;
  const percent = progressPercent("placement", asked);

  /* ---------------------------------------------------------------- */
  /* Before the stopwatch starts                                       */
  /* ---------------------------------------------------------------- */

  if (state === null) {
    return (
      <Frame
        percent={percent}
        onBack={onBack}
        foot={<Action label={PLACEMENT_START} onPress={begin} />}
      >
        {/* THE CENTRED HERO, not the small [berry][bubble] row the question
            steps use, and the reason is what this screen holds. A question
            step's row is small because four chips sit under it; this screen
            has nothing under it at all, and the row left three quarters of the
            page empty above a lone button. Same two objects, composed for a
            screen whose whole job is one sentence and one press. */}
        <Hero
          line={PLACEMENT_INTRO_ASK}
          reducedMotion={reducedMotion}
          sizePx={HERO_BERRY_PX}
          behaviour="idle"
        />
      </Frame>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Finished                                                          */
  /* ---------------------------------------------------------------- */

  if (state.phase === "finished") {
    const recommendation = state.recommendation;
    return (
      <Frame
        percent={percent}
        onBack={onBack}
        foot={<Action label={CONTINUE} onPress={() => onDone(recommendation)} />}
      >
        {/* A student who skipped every question has no starting point to be
            shown, and "that is your starting point" would then be a sentence
            about nothing. The skipped line names what happens instead, plainly
            and without treating the skipping as a failure. */}
        <Hero
          line={recommendation === null ? PLACEMENT_SKIPPED_ASK : PLACEMENT_DONE_ASK}
          reducedMotion={reducedMotion}
          sizePx={HERO_BERRY_PX}
          mood="happy"
        />
      </Frame>
    );
  }

  const problem = SEED_CORPUS.find((candidate) => candidate.id === state.currentProblem);
  // The machine only leaves `currentProblem` null in the finished phase, which
  // the branch above has already taken. This is the impossible case made
  // harmless rather than a crash on the first screen a student ever sees.
  if (problem === undefined) {
    return (
      <Frame
        percent={percent}
        onBack={onBack}
        foot={<Action label={CONTINUE} onPress={() => onDone(state.recommendation)} />}
      >
        <Hero
          line={PLACEMENT_DONE_ASK}
          reducedMotion={reducedMotion}
          sizePx={HERO_BERRY_PX}
          mood="happy"
        />
      </Frame>
    );
  }

  return (
    <Question
      problem={problem}
      percent={percent}
      asked={asked}
      pick={pick}
      reducedMotion={reducedMotion}
      onBack={onBack}
      onPick={setPick}
      onSubmit={submit}
      onSkip={skip}
    />
  );
}

/* ------------------------------------------------------------------ */
/* One question                                                        */
/* ------------------------------------------------------------------ */

function Question({
  problem,
  percent,
  asked,
  pick,
  reducedMotion,
  onBack,
  onPick,
  onSubmit,
  onSkip,
}: {
  readonly problem: Problem;
  readonly percent: number;
  readonly asked: number;
  readonly pick: Pick;
  readonly reducedMotion: boolean;
  readonly onBack: () => void;
  readonly onPick: (pick: Pick) => void;
  readonly onSubmit: (state: AnswerState) => void;
  readonly onSkip: () => void;
}) {
  const answer = problem.answer;
  const counter = fill(PLACEMENT_COUNTER, { n: asked + 1, total: QUESTION_CAP });

  const options = useMemo(() => {
    if (answer.kind === "multiple_choice") return answer.options;
    if (answer.kind === "major_product") return answer.candidates;
    return null;
  }, [answer]);

  const reasons = answer.kind === "major_product" ? answer.reasons : null;

  /*
   * WHETHER THIS QUESTION GETS THE PICTURE-FIRST LAYOUT.
   *
   * blueberry_r9-onboard-placement draws a 2x2 of tiles, each one a drawn
   * structure over a short caption. The condition is the option COUNT and
   * nothing else: three options in a 2x2 leaves a hole and five leaves a
   * widow. See flow.twoColumnGrid for why an earlier length condition was
   * wrong and how the tall tile answers the worry it was built on.
   */
  const tiled = twoColumnGrid(options ?? []);

  const ready =
    answer.kind === "multiple_choice"
      ? pick.optionId !== null
      : answer.kind === "major_product"
        ? pick.optionId !== null && pick.reasonId !== null
        : false;

  const check = () => {
    if (answer.kind === "multiple_choice" && pick.optionId !== null) {
      onSubmit({ kind: "multiple_choice", optionId: pick.optionId });
      return;
    }
    if (answer.kind === "major_product" && pick.optionId !== null && pick.reasonId !== null) {
      onSubmit({ kind: "major_product", candidateId: pick.optionId, reasonId: pick.reasonId });
    }
  };

  return (
    <Frame
      percent={percent}
      onBack={onBack}
      /* THE X, NOT THE CHEVRON. blueberry_r9-onboard-placement draws an X at
         the head of a placement question, and back from here does leave the
         quiz rather than step one question inside it, so the mark and the act
         agree. The screens before the stopwatch starts keep the chevron: back
         from those really is one step of the flow. */
      leading="leave"
      /* THE WIDE COLUMN. The placement image breaks its answer board OUT of
         the text column: the tiles run x 23 to 367 of a 390 wide frame where
         the question image's chips run 46 to 344. Same frame, two measured
         column widths, and this is the screen that gets the wider one. */
      column="wide"
      /* SKIP LIVES IN THE HEADER ROW, because the image's foot holds CHECK
         alone and its header row draws three elements, not two. */
      trailing={
        <TrailingSkip
          label={PLACEMENT_SKIP_QUESTION}
          short={PLACEMENT_SKIP_SHORT}
          onPress={onSkip}
        />
      }
      peek={options !== null}
      foot={
        options === null ? (
          /* The handed-off shapes carry their own submit and their own skip
             inside ProblemView, so the frame's CHECK would be a second control
             for the same act. It is drawn and switched off rather than removed,
             which is the same rule the gated CONTINUE follows: a control that
             disappears teaches nothing about why it was not available. */
          <Action label={PLACEMENT_CHECK} disabled onPress={check} />
        ) : (
          <div className="ob-peek">
            <Action label={PLACEMENT_CHECK} disabled={!ready} onPress={check} />
            {/* CROPPED BY THE SCREEN EDGE AND CLAMPED TO THE BUTTON BAND.
                See PEEK_BERRY_PX: he rises about 32px over CHECK's top, which
                is where the image puts him, and the body reserves that air. */}
            <Berry
              className="ob-peek__berry"
              behaviour="idle"
              mood="curious"
              reducedMotion={reducedMotion}
              sizePx={PEEK_BERRY_PX}
            />
          </div>
        )
      }
    >
      <p className="ob-kicker">{withoutMark(counter)}</p>
      {/*
        THE STEM IS SIZED SO THE ANSWER SET IS NEVER WHAT GETS CUT.

        blueberry_r9-onboard-placement draws a single line question at y=127
        and the whole 2x2 clear beneath it, from y=187 to 541, with CHECK below
        that and air between. The corpus does not oblige: the first problem the
        walk serves is a 45 word compound stem that rendered 257px tall, pushed
        the grid down, overflowed the body, and sliced the second row of tiles
        flat at the foot band with no fade and no scroll cue. A student's first
        real chemistry screen showed two whole answers and two half answers.

        The frame cannot shorten an authored prompt and must not try. What it
        can do is refuse to let the prompt take the answers' room: a long stem
        drops a type size and gets a capped scroller of its own, and the grid
        below it never shrinks. If anything has to be scrolled to, it is the
        words the student can already partly see, never the options they are
        being asked to choose between.
      */}
      <p className="ob-stem" data-long={problem.prompt.length > STEM_LONG_CHARS ? "true" : "false"}>
        {problem.prompt}
      </p>

      {options === null ? (
        // Numeric, reagents, structure, ordering and matching. The lesson's own
        // view already draws each of them and already submits the right
        // AnswerState; re-implementing five boards inside onboarding would be
        // two surfaces to keep in step for no gain.
        <div className="ob-handoff">
          <ProblemView key={problem.id} problem={problem} locked={false} onSubmit={onSubmit} onSkip={onSkip} />
        </div>
      ) : (
        <ChipList grid={tiled}>
          {options.map((option) => (
            <li key={option.id}>
              <Tile
                picked={pick.optionId === option.id}
                caption={option.text}
                figure={figureFor(problem.id, option.id)}
                pictureFirst={tiled}
                onPick={() => onPick({ optionId: option.id, reasonId: pick.reasonId })}
              />
            </li>
          ))}
        </ChipList>
      )}

      {reasons === null || pick.optionId === null ? null : (
        <>
          <p className="ob-substep">{withoutMark(PLACEMENT_REASON_ASK)}</p>
          {/* THE REASON HALF IS NEVER PICTURE-FIRST, and that is the rule
              read correctly rather than an exemption from it. "Option cards
              are pictures with captions" is about the THING being reasoned
              about. A ranking argument is not a thing, it is a sentence, and
              there is no structure that draws "the tertiary cation is more
              stable", so the reasons stay text tiles at every length. */}
          <ChipList grid={twoColumnGrid(reasons)}>
            {reasons.map((reason) => (
              <li key={reason.id}>
                <Tile
                  picked={pick.reasonId === reason.id}
                  caption={reason.text}
                  figure={null}
                  pictureFirst={false}
                  onPick={() => onPick({ optionId: pick.optionId, reasonId: reason.id })}
                />
              </li>
            ))}
          </ChipList>
        </>
      )}
    </Frame>
  );
}

/**
 * One periwinkle answer tile: a drawn structure with its name under it.
 *
 * THIS IS RULING 2 OF 2026-09-04 HONOURED. "The image comes first and the name
 * comes second... OPTION CARDS ARE PICTURES WITH CAPTIONS, not captions with
 * pictures", and "the name sits UNDER it, small and light (the muted ink,
 * never the body ink)". blueberry_r9-onboard-placement draws exactly that:
 * four periwinkle tiles, each a drawn carbocation over the words Methyl,
 * Primary, Secondary and Tertiary set small and light.
 *
 * WHERE THE PICTURE COMES FROM, since the previous pass reported truthfully
 * that there is none in the corpus. `ChoiceOption` in packages/curriculum is
 * `{ id, text }` and `Problem` carries no figure field, so the figures are
 * authored in figures.ts against exact problem-and-option ids, and a coverage
 * test walks the real quiz machine to prove every option a student can be
 * served has one. That file's header records what makes it a shim with a
 * boundary rather than a shell deriving chemistry from an option's words.
 *
 * `data-visual` stays, and it is now the countable proof rather than the
 * countable gap: "figure" where a structure is drawn, "name" where the tile
 * falls back to words. The reason tiles of a major-product question are
 * legitimately "name": a ranking argument is a sentence and has no structure.
 *
 * Periwinkle because DESIGN-GOALS makes it the LESSON colour and this is the
 * first lesson-shaped thing a student touches. `data-stacking` is the sticker
 * audit's opt-in for the stacked edge.
 */
function Tile({
  picked,
  caption,
  figure,
  pictureFirst,
  onPick,
}: {
  readonly picked: boolean;
  /** The option's own words: the caption under the picture. */
  readonly caption: string;
  readonly figure: ReturnType<typeof figureFor>;
  /** True in the 2x2, where the tile is tall enough to hold a drawing. */
  readonly pictureFirst: boolean;
  readonly onPick: () => void;
}) {
  /*
   * A FIGURE IS DRAWN WHEREVER THERE IS ONE, AND THE 2x2 IS NOT THE CONDITION.
   *
   * An earlier draft of this component only drew the picture in the four
   * option grid, which quietly meant every three candidate major-product
   * question went back to being prose. The count decides the LAYOUT (a 2x2
   * needs four); the ruling that every question carries a visual has no count
   * in it at all. So a three option question stacks its rows and each row is
   * still a drawing with its name beside it, which is the chip family's own
   * icon-then-label composition carrying real chemistry instead of a sticker.
   */
  const drawn = figure !== null;
  return (
    <button
      type="button"
      className="ob-tile"
      aria-pressed={picked}
      data-visual={drawn ? "figure" : "name"}
      data-shape={pictureFirst ? "tile" : "row"}
      data-stacking=""
      onClick={onPick}
    >
      {drawn ? <StructureFigure className="ob-tile__figure" figure={figure} /> : null}
      <span
        className="ob-tile__caption"
        data-layout={drawn ? "caption" : pictureFirst ? "tile" : "row"}
        data-dense={!drawn && pictureFirst && tileIsDense(caption) ? "true" : "false"}
      >
        {caption}
      </span>
    </button>
  );
}
