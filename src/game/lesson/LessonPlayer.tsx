/**
 * A lesson: the problems of one topic, one at a time, graded by the curriculum
 * package, ending in the reward moment.
 *
 * Why the lesson is "a topic's problems" and not an authored lesson object:
 * the curriculum corpus carries a topic on every problem and a LessonId on
 * none of them yet (ids.ts reserves the alias for Phase 5 and the authoring
 * waves have not filled it). Grouping by topic is the honest unit the data
 * supports today; when lessons are authored, this component takes a problem
 * list from them instead and nothing else changes.
 *
 * State is a small reducer-free useState set, because the flow is linear:
 * index, the current result, the tally. A useReducer would be ceremony here.
 *
 * Grading calls gradeAttempt and nothing else, so the tier order (notation
 * causes, authored distractors, diagnostic causes, the logged tail) is the
 * package's decision and this file cannot reorder it by accident.
 *
 * TWO STAGES AT THE END, piece P4, 2026-08-28. The reward moment answers what
 * this lesson paid; the streak screen answers whether the student is still the
 * kind of person who does this. They are two questions, so they get two
 * screens, which is what the bar does. The second one plays only when today
 * counted for the FIRST time on this clear, and that fact is asked of the
 * engine on both sides of the commit rather than worked out here: a streak
 * screen a student sees three times in an evening is a screen they learn to tap
 * through.
 *
 * BLOOM'S REACTIONS, piece P1, 2026-08-27. The character has an opinion in
 * the same render as the grade: `submit` decides the outcome and the run, and
 * `reactionFor` (src/mascot/berryReaction.ts) turns those into the face, the
 * motion and the state. Nothing here names a mood directly, so the lesson and
 * the trainer make the same face for the same outcome. The two timers below
 * are the tone rule: a sad face settles inside a second, and a charred berry
 * clears with a flash on the next correct answer, never on a clock.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  curriculumCause,
  gradeAttempt,
  topicDefinition,
  type AnswerState,
  type GradingResult,
  type Problem,
  type TopicId,
} from "@blueberry/curriculum";
import { Press } from "../app/ui/Press";
import { Card } from "../app/ui/Card";
import { ExitMark } from "../beats/chromeIcons";
import LessonGems from "../beats/LessonGems";
import { RecipeStrip } from "../beats/RecipeStrip";
import { problemRecipeSegments } from "../beats/template";
import { SchemeCard } from "./SchemeCard";
import { schemeFor } from "./lessonFigures";
import { Berry } from "../mascot/Berry";
import { costumeForSurface, type BerrySurface } from "../mascot/berryCostume";
import type { BerryState } from "../mascot/berryState";
import type { BerryMood } from "../mascot/berryMood";
import {
  CHARRED_LINE,
  SETTLED_AFTER_MISS,
  reactionFor,
  type Reaction,
  type ReactionOutcome,
} from "../mascot/berryReaction";
import { progress } from "../app/progress";
import type { Receipt } from "@blueberry/economy";
import { useProgress } from "../app/hooks";
import { ProblemView } from "./ProblemView";
import { FeedbackBody, feedbackHeadline } from "./Feedback";
import { ReactionStrip } from "./ReactionStrip";
import { ComboInterstitial } from "./ComboInterstitial";
import { RewardMoment } from "./RewardMoment";
import { StreakScreen } from "./StreakScreen";
import { LessonVideo } from "./LessonVideo";

export interface LessonPlayerProps {
  readonly topic: TopicId;
  readonly problems: readonly Problem[];
  readonly reducedMotion: boolean;
  readonly onExit: () => void;
  /** Called after the reward moment. Onboarding uses it to move to the paywall card. */
  readonly onFinished?: (correct: number, attempted: number) => void;
  readonly showVideo?: boolean;
  /**
   * Where the lesson is standing, for the costume. When absent it is derived
   * per problem: a reagent, product or structure question is reaction work
   * (lab coat), anything else is concept work (tweed).
   */
  readonly surface?: BerrySurface;
}

/**
 * The authored hook clip for a topic, when one exists.
 *
 * EMPTY TODAY AND THAT IS THE POINT. The content pipeline in CLAUDE.md says
 * the clips are authored by a named creator and that "nothing in the free
 * tier depends on video being present, so lessons must stand without them".
 * None is filmed, so no lesson schedules a hook, so no lesson draws one. The
 * day a clip lands its URL goes in here beside its topic id and the slot
 * appears with no other change.
 */
const HOOK_CLIPS: Readonly<Record<string, string>> = Object.freeze({});

/* THE TWO PILLS ABOVE THE STEM ARE GONE, and the information is not.
   blueberry_r9-lesson-reaction opens on the question itself: no kind chip, no
   topic chip, nothing between the top bar and the words. Both pills were
   restating what the screen already says elsewhere. The answer KIND is the
   current badge in the recipe strip, which carries the same words as its
   title and to a screen reader (beats/template.ts's BADGE_LABEL), and the
   TOPIC is what the student tapped to get here and what the exit returns
   them to. Two rows of chrome bought nothing and cost the question its place
   at the top of the frame. */

function surfaceForProblem(problem: Problem): BerrySurface {
  switch (problem.answer.kind) {
    case "reagents":
    case "major_product":
    case "structure":
      return "reactionNode";
    default:
      return "conceptNode";
  }
}

/** The working face: focused, and leaning in when a new problem arrives. */
const WORKING_MOOD: BerryMood = "focused";

/**
 * A graded result as an outcome the mascot understands. A notation cause is
 * the near miss: the chemistry was right and the reporting slipped, which is
 * the curriculum's counterpart of the trainer's valid but not requested route.
 */
function outcomeOf(result: GradingResult): ReactionOutcome {
  if (result.kind === "correct") return "correct";
  if (result.kind === "named_cause" && curriculumCause(result.cause).specificity === "notation") return "nearMiss";
  return "wrong";
}

export function LessonPlayer({ topic, problems, reducedMotion, onExit, onFinished, showVideo = true, surface }: LessonPlayerProps) {
  const snapshot = useProgress();
  const definition = useMemo(() => topicDefinition(topic), [topic]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [videoDone, setVideoDone] = useState(!showVideo);
  // What the reward moment plays: the store's receipt for the clear, the
  // balance the store derived after it, whether this was the student's first
  // diamond ever (the long catch), and the session stopwatch. Nothing here is
  // added up locally; ECONOMY.md, "the client animates what the server
  // concluded".
  const [finished, setFinished] = useState<{
    receipt: Receipt;
    diamondBalance: number;
    firstDiamond: boolean;
    elapsedMs: number;
    /**
     * Today counted for the FIRST time on this clear, so the streak screen
     * plays after the reward moment. `receipt.streak.counted` alone is not
     * that fact: it is true for the second and third lesson of the same
     * evening too, and a streak screen a student sees three times a day is a
     * screen they learn to tap through. The engine is asked both halves, one
     * before the clear and one after; nothing here works it out.
     */
    streakJustCounted: boolean;
  } | null>(null);
  /** Which of the two end-of-lesson stages is on screen. */
  const [stage, setStage] = useState<"reward" | "streak">("reward");
  const startedAtRef = useRef<number>(performance.now());

  // The reaction in play and a key that bumps each time one fires, so the
  // same reaction twice in a row still replays. `settled` is the post-sad
  // face; `charred` outlives the reaction it arrived with (see the header).
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [reactionKey, setReactionKey] = useState(0);
  const [settled, setSettled] = useState(false);
  const [charred, setCharred] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [combo, setCombo] = useState<number | null>(null);
  const [showCombo, setShowCombo] = useState(false);
  const correctRunRef = useRef(0);
  const missRunRef = useRef(0);
  const settleTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const problem = problems[index];
  const total = problems.length;
  const costume = costumeForSurface(surface ?? (problem === undefined ? "conceptNode" : surfaceForProblem(problem)));

  const fire = (next: Reaction) => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    setReaction(next);
    setReactionKey((k) => k + 1);
    setSettled(false);
    if (next.holdMs !== null) {
      // The sad beat ends on this timer; the face settles to the hint offer.
      settleTimer.current = window.setTimeout(() => setSettled(true), reducedMotion ? 1 : next.holdMs);
    }
  };

  const submit = (state: AnswerState) => {
    if (problem === undefined || result !== null) return;
    const graded = gradeAttempt(problem, state);
    const outcome = outcomeOf(graded);
    setResult(graded);
    setAttempted((n) => n + 1);

    if (outcome === "correct") {
      setCorrect((n) => n + 1);
      correctRunRef.current += 1;
      missRunRef.current = 0;
      if (charred) {
        // The recovery beat: a brighter puff clears the char.
        setCharred(false);
        setFlashKey((k) => k + 1);
      }
    } else if (outcome === "wrong") {
      correctRunRef.current = 0;
      missRunRef.current += 1;
    } else {
      // A near miss breaks neither run: the chemistry was right.
    }

    const next = reactionFor(outcome, { correctRun: correctRunRef.current, missRun: missRunRef.current });
    if (next.state === "charred") setCharred(true);
    setCombo(next.combo);
    fire(next);
  };

  const goToNext = () => {
    if (index + 1 < total) {
      setIndex(index + 1);
      setResult(null);
      setReaction(null);
      setSettled(false);
      setReactionKey((k) => k + 1);
      return;
    }
    const firstDiamond = snapshot.economy.diamonds.earned === 0;
    const countedBefore = snapshot.economy.streak.todayCounted;
    progress.completeLesson(topic, correct, attempted, problems.map((p) => p.id));
    // The store commits synchronously, so the receipt for this clear is the
    // snapshot's lastReceipt by the time completeLesson returns.
    const after = progress.getSnapshot();
    const receipt = after.lastReceipt;
    if (receipt === null) return;
    setStage("reward");
    setFinished({
      receipt,
      diamondBalance: after.economy.diamonds.balance,
      firstDiamond: firstDiamond && receipt.diamonds.length > 0,
      elapsedMs: performance.now() - startedAtRef.current,
      streakJustCounted: !countedBefore && receipt.streak.counted,
    });
  };

  const advance = () => {
    // A milestone answer shows its interstitial before the next problem.
    if (combo !== null && !showCombo) {
      setShowCombo(true);
      return;
    }
    setShowCombo(false);
    setCombo(null);
    goToNext();
  };

  const skip = () => {
    // A structure problem the shell cannot draw: not counted, not penalised.
    if (index + 1 < total) {
      setIndex(index + 1);
      setResult(null);
      setReaction(null);
    } else {
      goToNext();
    }
  };

  if (finished !== null) {
    // Two stages, in the bar's own order: what the lesson paid, and then the
    // streak, on the one day the streak has something new to say. The second
    // one is skipped entirely when today was already counted, so it stays a
    // once-a-day moment rather than a screen between the student and the exit.
    const leave = () => (onFinished === undefined ? onExit() : onFinished(correct, attempted));
    if (stage === "streak") {
      return <StreakScreen receipt={finished.receipt} reducedMotion={reducedMotion} onContinue={leave} />;
    }
    return (
      <RewardMoment
        receipt={finished.receipt}
        diamondBalance={finished.diamondBalance}
        firstDiamond={finished.firstDiamond}
        correct={correct}
        attempted={attempted}
        reducedMotion={reducedMotion}
        onContinue={() => (finished.streakJustCounted ? setStage("streak") : leave())}
      />
    );
  }

  if (problem === undefined) {
    return (
      <Card>
        <p className="text-scale-sm text-bb-muted-foreground">No problems are authored for this topic yet.</p>
        <Press variant="secondary" className="mt-3" onPointerDown={onExit}>
          Back
        </Press>
      </Card>
    );
  }

  // The berry's props for the moment. While working: focused, goggles down
  // when the coat has them, leaning in at a fresh problem. After grading: the
  // reaction, then the settled face once a sad beat has had its second.
  const state: BerryState = charred ? "charred" : "neutral";
  const berryReacting = reaction !== null && result !== null;
  const berry = berryReacting
    ? {
        mood: settled && reaction.holdMs !== null ? SETTLED_AFTER_MISS.mood : reaction.mood,
        behaviour: settled && reaction.holdMs !== null ? SETTLED_AFTER_MISS.behaviour : reaction.behaviour,
        behaviourKey: reactionKey + (settled ? 1000 : 0),
        chain: reaction.chain,
        sparkleKey: reaction.sparkles ? reactionKey : 0,
        flashKey,
        state,
        costume,
        working: false,
        reducedMotion,
      }
    : {
        mood: WORKING_MOOD,
        behaviour: "leanIn" as const,
        behaviourKey: reactionKey,
        state,
        costume,
        working: true,
        reducedMotion,
      };

  const outcome = result === null ? null : outcomeOf(result);
  const nextLabel = index + 1 < total ? "Next" : "Finish lesson";
  const recipe = problemRecipeSegments(
    problems.map((p) => p.answer.kind),
    index,
  );
  const scheme = schemeFor(problem.id);
  const clip = HOOK_CLIPS[topic];

  return (
    // THE LESSON FILLS THE SCREEN. The S3 capture had a short numeric question
    // occupying the top third and roughly 65 percent of the phone left as bare
    // lavender, which is the same "empty flat colour" finding the splash
    // carried. The lavender is a GROUND you see around cards, and a screen
    // whose one job is a question should not be mostly ground.
    //
    // So the column is full height and the card is the flex child that grows,
    // with the answer block pushed to the bottom of it. That is the reference
    // bar's own lesson shape (prompt at the top, the action under the thumb at
    // the bottom edge), it is mobile-ui's "one screen, one job", and it is what
    // the approved lesson concept shows: a cream field edge to edge with the
    // controls low, not a small card floating in a field of ground.
    //
    // TWO GROWTH CLAUSES BECAUSE THERE ARE TWO MOUNTS, and ONE OF THEM DOES
    // NOT WORK TODAY. In onboarding the parent is a flex column, so `flex-1`
    // is the clause that fires and this column fills it.
    //
    // Inside the shell it does not, and the previous note here claimed it did.
    // Measured on a 390 by 844 phone at #/courses/orgo_2/oxidation_and_
    // reduction_ladder: `main` is 670px tall and this column comes out 497,
    // leaving 173px of bare ground under the card. The cause is that Shell's
    // `main` is `display: block` (classes `min-h-0 flex-1`), so `flex-1` here
    // is inert, and a percentage min-height against a parent whose SPECIFIED
    // height is auto resolves to auto no matter what height flexbox later gave
    // it. `min-h-full` and `max-h-full` are both no-ops in that mount.
    //
    // THE FIX IS ONE CLASS IN A FILE THIS BUILDER DOES NOT OWN: `main` needs
    // `flex flex-col` beside the `min-h-0 flex-1` it already carries, and then
    // this column's `flex-1` fires in both mounts and the well below scrolls
    // rather than the page. Reported to the integrator rather than worked
    // around, because the alternative is hardcoding the header and tab bar
    // heights into a calc() here, which breaks silently the next time the
    // shell chrome changes.
    <div className="lesson-frame mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-3 px-4 pt-3 pb-0 md:px-6 md:pt-4">
      {/* THE RECIPE STRIP replaces the bare percentage bar that used to sit
          here. A percentage says how far; the committed spec
          (blueberry_spec-question-badges_*.png) says a lesson shows its BEAT
          COMPOSITION up front, so the bar is one badge per question in the
          order they arrive, completed green, current violet, the rest quiet.
          The segments are computed by a pure function in beats/template.ts,
          which is where the suite can hold the rule. */}
      <header className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onPointerDown={onExit}
          aria-label="Leave this lesson"
          title="Leave this lesson"
          /* The committed mechanism frame's filled violet squircle, shared
             with the beat runner's own exit. See beats/beat-chrome.css for
             why the outlined navy circle went: it was neither of the two
             treatments the frames draw, and it gave the way OUT of a lesson
             the heaviest stroke in the header row. */
          className="lesson-exit"
        >
          <ExitMark />
        </button>
        <div className="min-w-0 flex-1">
          <RecipeStrip segments={recipe} reducedMotion={reducedMotion} />
        </div>
        {/* THE COUNTER IS THE FRAMES' COUNTER. blueberry_r9-lesson-reaction
            pairs its number with a drawn gem and
            blueberry_r9-lesson-mechanism with a drawn flask and flame; both
            count a CURRENCY. This slot used to read "3/7", which is the
            recipe strip's own job said again in digits beside it. */}
        {/* ONE COUNTER, ONE IMPLEMENTATION. beats/LessonGems.tsx is the same
            component the beat runner's header draws, and its own header
            records why the balance is derived with the course rather than
            read off the plain snapshot: without the course as the mastery
            denominator this slot showed 0 while the shell's HUD, twenty
            pixels above it, showed 2025. */}
        <LessonGems />
      </header>

      {/* THE HOOK SLOT IS EMPTY RATHER THAN FAKED, which is the rule
          beats/template.ts already states for the beat runner's own hook:
          "no node carries one yet ... so the slot stays empty rather than
          being faked". This player was the one place still breaking it. On a
          390 by 844 phone the unfilmed strip cost about 92 pixels between the
          top bar and the question, which is a row of the screen spent telling
          a student that something they cannot watch does not exist, on the
          free lesson CLAUDE.md holds to the highest bar in the product.
          LessonVideo keeps its unfilmed strip because a SCHEDULED hook whose
          asset has not landed is a real state and deserves an honest render;
          what changes is that an UNSCHEDULED hook is no longer scheduled. */}
      {!videoDone && clip !== undefined ? (
        <LessonVideo title={definition.label} src={clip} onSkip={() => setVideoDone(true)} />
      ) : null}

      {/* NO OUTER CARD. Both committed lesson frames put the stem and the
          reaction scheme directly on the cream page, and the SCHEME CARD is
          the only bounded surface on the frame. The previous build wrapped
          the stem, the scheme, the input and the CHECK inside one 2px
          navy-outlined rounded Card, which added a box the frames do not
          have, drew the heaviest stroke on the screen around the question,
          and pushed the action button into the middle of the page with about
          250px of empty cream under it. The card is gone; the scheme card
          keeps its own surface, because that one IS in the frame. */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-3">
        {/* THE STEM IS THE LIGHTEST LARGE TEXT ON THE FRAME, which is the
            hierarchy both committed frames set: "Push the arrows for the
            first step of this SN1." and "Predict the major product." are
            large and REGULAR, because the loudest thing on a chemistry
            question is meant to be the chemistry. A previous build set the
            stem semibold, making it the heaviest element on the screen and
            inverting that.

            THE CONTENT FACE, per DESIGN-TOKENS' typography split: a question
            stem is CONTENT, so it is set in --font-sans (the system stack,
            which body already carries) and never in the rounded display
            face. Personality lives at the celebration, not between the
            student and the chemistry. */}
        <div className="flex shrink-0 flex-col gap-1">
          <p className="text-scale-xl font-normal leading-snug text-bb-foreground">{problem.prompt}</p>
        </div>

        {/* THE QUESTION IS A PICTURE FIRST. Owner ruling 1 of 2026-09-04:
            "a question that is only prose has already lost the student".
            blueberry_r9-lesson-reaction puts a scheme card directly under the
            stem, and that card is the loudest thing on the frame. `schemeFor`
            returns null for a corpus question the figure table has not met,
            in which case the question falls back to its prompt and a test
            fails; see lessonFigures.ts for why that fallback exists and what
            stops a student ever seeing it. */}
        {scheme !== null ? <SchemeCard scheme={scheme} /> : null}

        {/* THE DEAD ZONE, and where it went. The S3 judge's carry against this
            exact frame was "a large dead zone": the prompt sat at the top, the
            answer was pushed to the bottom by an `mt-auto`, and the hole
            between them was most of a phone screen. Pushing content apart is
            not the same as filling a screen.

            So the answer region is the GROWING child now, and the answer
            itself grows inside it (ProblemView's option list stretches its
            rows, its forms fill the well). That is the committed frame's own
            shape, blueberry_r9-lesson-reaction: prompt at the top, big option
            cards spanning the middle, the action under the thumb. There is no
            `mt-auto` left to open a hole with. */}
        {/* THE MASCOT IS ANCHORED, NOT FLOATING, the second half of the same
            carry, and it stands INSIDE the answer region rather than beside
            it. That containment is the whole fix: the region ends at the
            bottom of ProblemView's own action chip, so `bottom: 0` against it
            lands the berry's feet on that chip and nothing here has to know
            how tall the chip, the card's padding or the card's border are.
            As a sibling of this region it was anchored to the CARD instead,
            which put it a border-width lower and let the card's rounded edge
            cut across it. Decoration: aria hidden, no pointer target, no
            reserved row, and dropped entirely while the reaction strip has
            its own berry on screen, because DESIGN-GOALS allows exactly one
            berry to a frame. */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <ProblemView key={problem.id} problem={problem} locked={result !== null} onSubmit={submit} onSkip={skip} />
          {!berryReacting ? (
            <span className="berry-anchor" aria-hidden>
              <Berry {...berry} sizePx={72} />
            </span>
          ) : null}
        </div>

        {result !== null && outcome !== null && berryReacting ? (
          <ReactionStrip
            outcome={outcome}
            headline={feedbackHeadline(result)}
            caption={reaction.state === "charred" ? CHARRED_LINE : null}
            berry={berry}
            continueLabel={nextLabel}
            onContinue={advance}
          >
            <FeedbackBody result={result} />
            {result.kind !== "correct" ? (
              <details className="rounded-xl bg-bb-card/70 p-3 text-scale-sm">
                <summary className="cursor-pointer rounded-2xl border-2 border-bb-border px-3 py-2 font-semibold text-bb-foreground">Show the worked answer</summary>
                <p className="mt-2 text-bb-muted-foreground">{problem.solution.whatHappened}</p>
                <p className="mt-1 text-bb-muted-foreground">{problem.solution.why}</p>
              </details>
            ) : null}
          </ReactionStrip>
        ) : null}
      </div>

      {showCombo && combo !== null && reaction !== null ? (
        <ComboInterstitial
          count={combo}
          topicLabel={definition.label}
          reaction={reaction}
          reactionKey={reactionKey + 5000}
          costume={costume}
          reducedMotion={reducedMotion}
          progress={{ index: index + 1, total }}
          onContinue={advance}
        />
      ) : null}
    </div>
  );
}
