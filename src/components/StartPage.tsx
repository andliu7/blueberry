import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, CalendarDays, Check, GraduationCap, X } from "lucide-react";
import { PageBackground } from "@/components/ui/page-background";
import { TOPICS, REACTIONS as COURSE_REACTIONS } from "@/data/topics";
import { TRAINER_URL } from "@/data/site";
import { readGoals, writeGoals, daysUntil } from "@/lib/goals";
import { cn } from "@/lib/utils";
import { Action, Ask, Chip, ChipList, Frame, Hero, QuietAction } from "@/components/start/Frame";
import {
  canContinue,
  nextStep,
  normalizeStep,
  prevStep,
  progressPercent,
  toggleTopic,
  MAX_TOPICS,
  type StartAnswers,
  type StepId,
} from "@/components/start/flow";

/**
 * The funnel: goals, then a real first lesson, then the ask.
 *
 * "Get Started" does not open a price list. It opens this. The order is the
 * whole strategy: by the time anybody is asked to sign in they will have set a
 * goal and answered real course questions, and the question will have changed
 * from "is this worth it" to "am I willing to walk away from what I just did".
 *
 * **The lesson runs on the course's own data.** Every question is assembled
 * from `data/topics` - names and one-line summaries a person wrote - with the
 * other reactions' real names as the distractors. Nothing is invented to fill
 * a quiz slot, which is the same rule the rest of the site's chemistry lives
 * under. When the mechanism-drawing trainer moves in, its drawing exercise
 * replaces the teaser card at the end; the slot is already shaped for it.
 *
 * **Nothing before the final screen mentions signing in.** An account offered
 * on arrival is an account offered to somebody with nothing to protect.
 *
 * **The shape is blueberry_game's onboarding.** One question per screen on a
 * shared frame, steps in the hash so the back button works, big option chips
 * and a pinned action that is off until the screen is answered. See the note
 * at the top of `start/Frame.tsx` for what was borrowed and what was not.
 *
 * **Answers live in React state, not in the hash.** The step is in the URL
 * because back is a navigation gesture; the answers are not. Putting the picks
 * in the query string would make every chip tap a history entry, and back
 * would then walk pick by pick instead of screen by screen. The component
 * stays mounted across a hash change because `App` renders one `<StartPage>`
 * and passes the step down, so state survives a step; a reload starts from
 * whatever is in `localStorage`, which is the honest fallback.
 */

export function StartPage({ step: rawStep }: { step: string }) {
  const step = normalizeStep(rawStep);

  /**
   * Everything arrives filled in.
   *
   * Never start a user at zero, and an empty form is zero: a list of work you
   * have not done, presented as the first thing you see. Every default is
   * wrong for somebody and every one is one tap to change, which is a smaller
   * ask than three blank screens.
   */
  const [answers, setAnswers] = useState<StartAnswers>(() => {
    const saved = readGoals();
    return {
      course: saved?.course ?? DEFAULT_COURSE,
      examOn: saved?.examOn ?? defaultExamDate(),
      topicIds: saved?.topicIds.length ? saved.topicIds : TOPICS.slice(0, 1).map((t) => t.id),
      right: 0,
    };
  });

  const go = (to: StepId) => {
    window.location.hash = to === "welcome" ? "#/start" : `#/start/${to}`;
  };
  const back = () => {
    const previous = prevStep(step);
    if (previous !== null) go(previous);
  };
  const forward = () => {
    const next = nextStep(step);
    if (next !== null) go(next);
  };

  const set = (patch: Partial<StartAnswers>) =>
    setAnswers((current) => ({ ...current, ...patch }));

  /**
   * The goals are written after every goal screen, not once at the end.
   *
   * Three screens is three chances to reload, and the alternative is a visitor
   * who typed their course code, got distracted, came back and found it gone.
   * `writeGoals` is a single localStorage put and it swallows its own errors.
   */
  const commit = (next: StartAnswers) =>
    writeGoals({
      course: next.course.trim() || DEFAULT_COURSE,
      examOn: next.examOn,
      topicIds: next.topicIds,
    });

  const advance = () => {
    commit(answers);
    forward();
  };

  const onBack = prevStep(step) === null ? null : back;
  const percent = progressPercent(step);
  const gated = !canContinue(step, answers);

  return (
    <div className="relative text-slate-900 dark:text-stone-100">
      <PageBackground />
      {step === "welcome" && <Welcome percent={percent} onGo={forward} />}

      {step === "course" && (
        <Frame
          percent={percent}
          onBack={onBack}
          foot={<Action label="Continue" disabled={gated} onPress={advance} />}
        >
          <Ask>What are you taking?</Ask>
          <p className="mt-4 text-sm text-slate-600 dark:text-stone-400">
            Anything goes. It only decides what gets shown first.
          </p>
          <input
            value={answers.course}
            onChange={(e) => set({ course: e.target.value })}
            aria-label="Course"
            className="mt-3 w-full rounded-2xl border-2 border-slate-300 bg-white/80 px-4 py-3.5 text-lg font-semibold outline-none focus:border-indigo-500 dark:border-stone-700 dark:bg-stone-900/60 dark:focus:border-indigo-400"
          />
          <ChipList>
            {COURSE_SUGGESTIONS.map((code) => (
              <li key={code}>
                <Chip
                  picked={answers.course.trim() === code}
                  label={code}
                  icon={<GraduationCap className="size-5" />}
                  onPick={() => set({ course: code })}
                />
              </li>
            ))}
          </ChipList>
        </Frame>
      )}

      {step === "exam" && (
        <Frame
          percent={percent}
          onBack={onBack}
          foot={
            <>
              <Action label="Continue" onPress={advance} />
              <QuietAction
                label="Not sure yet"
                onPress={() => {
                  const next = { ...answers, examOn: null };
                  setAnswers(next);
                  commit(next);
                  forward();
                }}
              />
            </>
          }
        >
          <Ask>When is the next exam?</Ask>
          <p className="mt-4 text-sm text-slate-600 dark:text-stone-400">
            {examHint(answers.examOn)}
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-slate-300 bg-white/80 px-4 py-3.5 focus-within:border-indigo-500 dark:border-stone-700 dark:bg-stone-900/60 dark:focus-within:border-indigo-400">
            <CalendarDays className="size-5 shrink-0 text-slate-500 dark:text-stone-400" />
            <input
              type="date"
              value={answers.examOn ?? ""}
              onChange={(e) => set({ examOn: e.target.value || null })}
              aria-label="Exam date"
              className="w-full bg-transparent text-lg font-semibold outline-none"
            />
          </label>
        </Frame>
      )}

      {step === "topics" && (
        <Frame
          percent={percent}
          onBack={onBack}
          foot={<Action label="Start my first lesson" disabled={gated} onPress={advance} />}
        >
          <Ask>What do you want to nail first?</Ask>
          <p className="mt-4 text-sm text-slate-600 dark:text-stone-400">
            Up to {MAX_TOPICS}. {answers.topicIds.length} picked.
          </p>
          <ChipList>
            {TOPICS.map((topic) => (
              <li key={topic.id}>
                <Chip
                  picked={answers.topicIds.includes(topic.id)}
                  label={topic.name}
                  onPick={() => set({ topicIds: toggleTopic(answers.topicIds, topic.id) })}
                />
              </li>
            ))}
          </ChipList>
          <p className="mt-5 text-xs text-slate-500 dark:text-stone-500">
            Saved on this device. Nothing is sent anywhere yet.
          </p>
        </Frame>
      )}

      {step === "lesson" && (
        <MiniLesson
          percent={percent}
          onBack={onBack}
          onDone={(right) => {
            set({ right });
            forward();
          }}
        />
      )}

      {step === "finish" && (
        <Finish percent={percent} onBack={onBack} right={answers.right} course={answers.course} />
      )}
    </div>
  );
}

/** The default course. Changeable, and never blank. */
const DEFAULT_COURSE = "CHEM 241";

/**
 * One tap instead of typing, for the course this site was actually built for.
 * The input stays above it: a course code the site has never heard of is still
 * an answer, and a chip list that cannot express one would be a worse form.
 */
const COURSE_SUGGESTIONS = ["CHEM 241", "CHEM 231", "Organic chemistry II"];

function examHint(examOn: string | null): string {
  const days = daysUntil(examOn);
  if (days === null) return "Leave it blank if you would rather not think about it.";
  if (days === 0) return "Today. Right, let's be quick.";
  return `${days} day${days === 1 ? "" : "s"} away.`;
}

/* Step one: the welcome beat */

/**
 * The screen that only bonds.
 *
 * It asks nothing, records nothing and branches on nothing: Berry is large, he
 * says hello, and the only thing that happened is that they met him. It is the
 * one moment in the funnel where the mascot is a relationship rather than a
 * piece of chrome, and it is also the acknowledgement that the hero's button
 * was pressed - a screen that is visibly a different screen, painting on the
 * first frame, with nothing to wait for.
 */
function Welcome({ percent, onGo }: { percent: number; onGo: () => void }) {
  return (
    <Frame
      percent={percent}
      onBack={null}
      leaveHref="#/home"
      align="centre"
      foot={
        <>
          <Action label="Get started" shape="stadium" onPress={onGo} />
          <QuietAction
            label="I already have an account"
            onPress={() => {
              window.location.hash = "#/signin";
            }}
          />
        </>
      }
    >
      <Hero line="Hi, I'm Blueberry." mood="happy">
        <h1 className="title-face mt-2 text-3xl leading-tight sm:text-4xl">
          Let's set this up around your exam.
        </h1>
        <p className="mt-3 max-w-md text-base text-slate-700 dark:text-stone-300">
          Three questions, and then you are straight into a lesson. No account, nothing to pay, and
          what you do next is yours to keep.
        </p>
      </Hero>
    </Frame>
  );
}

/* Step five: the first lesson */

interface Quiz {
  prompt: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  /** Shown after answering, right or wrong. His words, from the data. */
  why?: string;
}

/**
 * The questions, assembled from the course data at module load.
 *
 * Looked up by id and skipped if missing, so an edit to the course content
 * degrades this lesson rather than crashing it. The distractors are the other
 * reactions' real names - a wrong option that is a real thing you will meet
 * later is still teaching; an invented one is noise.
 */
function buildQuiz(): Quiz[] {
  const byId = (id: string) => COURSE_REACTIONS.find((r) => r.id === id);
  const names = (...ids: string[]) => ids.map((id) => byId(id)?.name ?? "");

  const quiz: Quiz[] = [];

  const hydro = byId("hydroboration");
  if (hydro) {
    quiz.push({
      prompt: `"${hydro.summary}" - which reaction is this?`,
      options: names("electrophilic-addition", "hydroboration", "halogenation", "epoxidation"),
      answer: 1,
      why: hydro.whyThisReagent,
    });
  }

  const epox = byId("epoxidation");
  if (epox) {
    quiz.push({
      prompt: `"${epox.summary}" - which reaction is this?`,
      options: names("halogenation", "electrophilic-addition", "epoxidation", "hydroboration"),
      answer: 2,
      why: epox.whyThisReagent,
    });
  }

  const halo = byId("halogenation");
  if (halo) {
    quiz.push({
      prompt: `"${halo.summary}" - which reaction is this?`,
      options: names("halogenation", "epoxidation", "hydroboration", "electrophilic-addition"),
      answer: 0,
      why: halo.whyThisReagent,
    });
  }

  return quiz.filter((q) => q.options.every(Boolean));
}

const QUIZ = buildQuiz();

/**
 * The lesson, on the same frame as every other step and owning its own foot.
 *
 * **Answering no longer advances on a timer.** The old version moved on 900ms
 * after a right answer and 2600ms after a wrong one, which meant the one card
 * with something to read was the one card you were hurried through. Pick,
 * read, then press Continue: the pinned action holds exactly one control on
 * every card, which is what the frame is for.
 */
function MiniLesson({
  percent,
  onBack,
  onDone,
}: {
  percent: number;
  onBack: (() => void) | null;
  onDone: (right: number) => void;
}) {
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);

  /** The teaser card sits after the quiz, so `total` is quiz + 1. */
  const total = QUIZ.length + 1;
  const onTeaser = at >= QUIZ.length;
  const q = QUIZ[at];

  const pick = (i: number) => {
    if (picked !== null || !q) return;
    setPicked(i);
    if (i === q.answer) setRight((n) => n + 1);
  };

  const next = () => {
    setPicked(null);
    setAt((n) => n + 1);
  };

  return (
    <Frame
      percent={percent}
      onBack={onBack}
      foot={
        onTeaser ? (
          <Action label="Finish the lesson" onPress={() => onDone(right)} />
        ) : (
          <Action
            label={picked === null ? "Pick an answer" : picked === q?.answer ? "Nice" : "Got it"}
            disabled={picked === null}
            onPress={next}
          />
        )
      }
    >
      {/* The lesson's own count, separate from the funnel bar at the top:
          cards done out of cards total, filled from the first card, because
          arriving here is already progress. */}
      <p className="text-center font-mono text-xs tracking-[0.18em] text-slate-500 uppercase dark:text-stone-400">
        Card {Math.min(at + 1, total)} of {total}
      </p>

      {!onTeaser && q && (
        <motion.div
          key={at}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-6"
        >
          <Ask>{q.prompt}</Ask>

          <div className="mt-6 grid gap-2.5">
            {q.options.map((option, i) => {
              const isAnswer = i === q.answer;
              const isPicked = picked === i;
              const revealed = picked !== null;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => pick(i)}
                  disabled={revealed}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left text-base font-semibold transition-all",
                    !revealed &&
                      "bb-press-soft cursor-pointer border-slate-300 bg-white/80 hover:border-indigo-400 dark:border-stone-700 dark:bg-stone-900/60 dark:hover:border-indigo-500",
                    revealed &&
                      isAnswer &&
                      "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
                    revealed &&
                      isPicked &&
                      !isAnswer &&
                      "border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200",
                    revealed && !isPicked && !isAnswer && "opacity-45",
                  )}
                >
                  {option}
                  {revealed && isAnswer && <Check className="size-5 shrink-0 text-emerald-600" />}
                  {revealed && isPicked && !isAnswer && (
                    <X className="size-5 shrink-0 text-rose-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* The why, in the course's own words, shown right or wrong: the
              moment after answering is the one moment anybody reads these. */}
          {picked !== null && q.why && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm leading-relaxed text-slate-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300"
            >
              {q.why}
            </motion.p>
          )}
        </motion.div>
      )}

      {onTeaser && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-6"
        >
          {/* The last card sells the thing the site does that a textbook
              cannot: you will draw the mechanism yourself, and it gets marked
              as you draw. The trainer is still its own app, so this card is
              honest about that - and when it moves in, this is the slot the
              real drawing exercise takes over. */}
          <Ask>One more thing. The part you draw yourself.</Ask>
          <p className="mt-5 text-base text-slate-700 dark:text-stone-300">
            Reading a mechanism is not knowing it. On Blueberry you push the electrons yourself,
            arrow by arrow, and get told exactly where a wrong step went wrong. That part lives in
            our trainer while it moves in here.
          </p>
          <a
            href={TRAINER_URL}
            className="bb-press-soft mt-6 inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-white/80 px-5 py-3 text-base font-semibold text-slate-800 transition hover:border-indigo-400 dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100"
          >
            Try the trainer
            <ArrowUpRight className="size-4" />
          </a>
        </motion.div>
      )}
    </Frame>
  );
}

/* Step six: the ask, now that there is something to lose */

function Finish({
  percent,
  onBack,
  right,
  course,
}: {
  percent: number;
  onBack: (() => void) | null;
  right: number;
  course: string;
}) {
  const goals = useMemo(readGoals, []);
  const built = [
    `goals for ${course || goals?.course || DEFAULT_COURSE}`,
    goals?.examOn ? "an exam countdown" : null,
    `${right} of ${QUIZ.length} first-try answers`,
  ].filter(Boolean) as string[];

  return (
    <Frame
      percent={percent}
      onBack={onBack}
      align="centre"
      foot={
        <>
          <Action
            label="Save my progress, free"
            onPress={() => {
              window.location.hash = "#/signup";
            }}
          />
          <QuietAction
            label="Keep going without one"
            onPress={() => {
              window.location.hash = "#/lessons";
            }}
          />
        </>
      }
    >
      <Hero line="That's a real start." mood="proud">
        <p className="mt-2 max-w-md text-base text-slate-700 dark:text-stone-300">
          You have {joinList(built)}, all of it sitting on this device and only on this device. An
          account is what makes it yours instead of this browser's.
        </p>
        <p className="mt-5 max-w-md text-xs text-slate-500 dark:text-stone-500">
          Free means free. The paid tier is for the parts that cost something to run, and it is
          explained on the plans, not sprung on you.
        </p>
      </Hero>
    </Frame>
  );
}

/** "a, b and c" - an Oxford-free list, matching the site's voice. */
function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** A fortnight out: far enough to be plausible, close enough to feel like a deadline. */
function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default StartPage;
