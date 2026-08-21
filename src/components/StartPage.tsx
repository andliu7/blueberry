import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, Lock, X } from "lucide-react";
import { PageBackground } from "@/components/ui/page-background";
import { SiteFooter } from "@/components/ui/site-footer";
import { Blueberry } from "@/components/ui/blueberry";
import { TOPICS, REACTIONS as COURSE_REACTIONS } from "@/data/topics";
import { TRAINER_URL } from "@/data/site";
import { readGoals, writeGoals, daysUntil } from "@/lib/goals";
import { cn } from "@/lib/utils";

/**
 * The funnel: goals, then a real first lesson, then the ask.
 *
 * "Get Started" does not open a price list. It opens this. The order is the
 * whole strategy: by the time anybody is asked to sign in they will have set a
 * goal and answered real course questions, and the question will have changed
 * from "is this worth it" to "am I willing to walk away from what I just did".
 *
 * **The lesson runs on the course's own data.** Every question is assembled
 * from `data/topics` — names and one-line summaries a person wrote — with the
 * other reactions' real names as the distractors. Nothing is invented to fill
 * a quiz slot, which is the same rule the rest of the site's chemistry lives
 * under. When the mechanism-drawing trainer moves in, its drawing exercise
 * replaces the teaser card at the end; the slot is already shaped for it.
 *
 * **Nothing before the final screen mentions signing in.** An account offered
 * on arrival is an account offered to somebody with nothing to protect.
 */

/** Four steps, and only the last one asks for anything. */
const STEPS = [
  { id: "goals", label: "Set your goals", note: "About a minute" },
  { id: "lesson", label: "Your first lesson", note: "Free, no account" },
  { id: "save", label: "Save what you built", note: "Now it is yours" },
  { id: "plan", label: "Pick a plan", note: "Keep going" },
] as const;

/** The default course. Changeable, and never blank. See the note on `Goals`. */
const DEFAULT_COURSE = "CHEM 241";

export function StartPage() {
  const [stage, setStage] = useState<"goals" | "lesson" | "done">("goals");
  const [score, setScore] = useState(0);

  return (
    <div className="relative min-h-svh text-slate-900 dark:text-stone-100">
      <PageBackground />

      {/* No site header, and that is the point of a funnel page. A screen
          whose job is to have one thing done on it should not offer eleven
          ways to go and do something else. One back link. */}
      <a
        href="#/home"
        className="mx-auto flex w-full max-w-3xl items-center gap-2 px-6 pt-5 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300 dark:hover:text-indigo-300"
      >
        <ChevronLeft className="size-4" />
        Home
      </a>

      <main className="relative mx-auto w-full max-w-3xl px-6 pt-10 pb-24">
        {/* The click's acknowledgement. Get Started lands here on the same
            frame — the page is not actually slow — but a screen that simply
            *is different* does not tell the hand that pressed the button it
            was heard. A skeleton that shimmers once and dissolves does. It is
            pointer-events-none from birth: the real form is interactive
            underneath for its entire life. */}
        <ArrivalSkeleton />

        <Rail current={stage === "goals" ? 0 : stage === "lesson" ? 1 : 2} />

        {stage === "goals" && <GoalsForm onDone={() => setStage("lesson")} />}
        {stage === "lesson" && (
          <MiniLesson
            onDone={(right) => {
              setScore(right);
              setStage("done");
            }}
          />
        )}
        {stage === "done" && <Finish score={score} />}
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * A skeleton of the goals screen, shown for half a second over the real one.
 *
 * Rendered opaque on the first frame and fading from the second, so the
 * transition from the hero is: press → new page skeleton, instantly → content
 * resolves. The blocks match the real layout's bones (rail, heading, three
 * fields, button) so the resolve reads as the same page sharpening rather
 * than as one page replacing another.
 */
function ArrivalSkeleton() {
  const [gone, setGone] = useState(false);
  if (gone) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-6 top-10 z-10"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.45, delay: 0.25, ease: "easeOut" }}
      onAnimationComplete={() => setGone(true)}
    >
      <div className="rounded-xl bg-[#faf9ff] p-1 dark:bg-[#171327]">
        {[
          "h-2 w-40",
          "mt-4 h-1.5 w-full",
          "mt-10 h-10 w-4/5",
          "mt-6 h-4 w-2/3",
          "mt-10 h-11 w-64",
          "mt-8 h-11 w-52",
          "mt-8 h-9 w-full",
          "mt-10 h-12 w-56",
        ].map((c) => (
          <div
            key={c}
            className={cn(
              "bb-shimmer rounded-lg bg-slate-900/8 dark:bg-white/10",
              c,
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Step one: goals ─────────────────────────────────────────────────────── */

function GoalsForm({ onDone }: { onDone: () => void }) {
  const saved = useMemo(readGoals, []);

  /**
   * Everything arrives filled in.
   *
   * Never start a user at zero, and an empty form is zero: a list of work you
   * have not done, presented as the first thing you see. Every default is
   * wrong for somebody and every one is one tap to change, which is a smaller
   * ask than three blank fields.
   */
  const [course, setCourse] = useState(saved?.course ?? DEFAULT_COURSE);
  const [examOn, setExamOn] = useState(saved?.examOn ?? defaultExamDate());
  const [topicIds, setTopicIds] = useState<string[]>(
    saved?.topicIds.length ? saved.topicIds : TOPICS.slice(0, 1).map((t) => t.id),
  );

  const days = daysUntil(examOn);

  const toggleTopic = (id: string) =>
    setTopicIds((current) =>
      current.includes(id)
        ? current.length === 1
          ? current // The last chip refuses to come off; an empty selection
          : current.filter((t) => t !== id) // would strand the visitor here.
        : current.length >= 3
          ? current
          : [...current, id],
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    writeGoals({ course: course.trim() || DEFAULT_COURSE, examOn: examOn || null, topicIds });
    onDone();
  };

  return (
    <>
      <h1 className="title-face mt-10 text-4xl leading-tight sm:text-5xl">
        Let's set this up around your exam.
      </h1>
      <p className="mt-3 max-w-xl text-base text-slate-700 dark:text-stone-300">
        Three questions, and then you are straight into a lesson. No account, nothing to pay, and
        what you do next is yours to keep.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-8">
        <Field label="What are you taking?" hint="Anything goes. It only decides what gets shown first.">
          <input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-stone-700 dark:bg-stone-900/60 dark:focus:ring-indigo-900"
          />
        </Field>

        <Field
          label="When is the next exam?"
          hint={
            days === null
              ? "Leave it blank if you would rather not think about it."
              : days === 0
                ? "Today. Right, let's be quick."
                : `${days} day${days === 1 ? "" : "s"} away.`
          }
        >
          <input
            type="date"
            value={examOn ?? ""}
            onChange={(e) => setExamOn(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-stone-700 dark:bg-stone-900/60 dark:focus:ring-indigo-900"
          />
        </Field>

        <Field
          label="What do you want to nail first?"
          hint={`Up to three. ${topicIds.length} picked.`}
        >
          <div className="flex flex-wrap gap-2">
            {TOPICS.map((topic) => {
              const on = topicIds.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic.id)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                    on
                      ? "border-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white"
                      : "border-slate-300 bg-white/70 text-slate-700 hover:border-slate-400 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-300",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                  {topic.name}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="submit"
            className="bb-press group inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-7 py-3.5 text-base font-semibold text-white focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
          >
            Start my first lesson
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </button>
          <span className="text-sm text-slate-600 dark:text-stone-400">
            Saved on this device. Nothing is sent anywhere yet.
          </span>
        </div>
      </form>
    </>
  );
}

/* ── Step two: the first lesson ──────────────────────────────────────────── */

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
 * reactions' real names — a wrong option that is a real thing you will meet
 * later is still teaching; an invented one is noise.
 */
function buildQuiz(): Quiz[] {
  const byId = (id: string) => COURSE_REACTIONS.find((r) => r.id === id);
  const names = (...ids: string[]) => ids.map((id) => byId(id)?.name ?? "");

  const quiz: Quiz[] = [];

  const hydro = byId("hydroboration");
  if (hydro) {
    quiz.push({
      prompt: `"${hydro.summary}" — which reaction is this?`,
      options: names("electrophilic-addition", "hydroboration", "halogenation", "epoxidation"),
      answer: 1,
      why: hydro.whyThisReagent,
    });
  }

  const epox = byId("epoxidation");
  if (epox) {
    quiz.push({
      prompt: `"${epox.summary}" — which reaction is this?`,
      options: names("halogenation", "electrophilic-addition", "epoxidation", "hydroboration"),
      answer: 2,
      why: epox.whyThisReagent,
    });
  }

  const halo = byId("halogenation");
  if (halo) {
    quiz.push({
      prompt: `"${halo.summary}" — which reaction is this?`,
      options: names("halogenation", "epoxidation", "hydroboration", "electrophilic-addition"),
      answer: 0,
      why: halo.whyThisReagent,
    });
  }

  return quiz.filter((q) => q.options.every(Boolean));
}

const QUIZ = buildQuiz();

/** How long the feedback holds before the next card. Longer when wrong: there is reading to do. */
const NEXT_RIGHT_MS = 900;
const NEXT_WRONG_MS = 2600;

function MiniLesson({ onDone }: { onDone: (right: number) => void }) {
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
    const wasRight = i === q.answer;
    if (wasRight) setRight((n) => n + 1);
    window.setTimeout(
      () => {
        setPicked(null);
        setAt((n) => n + 1);
      },
      wasRight ? NEXT_RIGHT_MS : NEXT_WRONG_MS,
    );
  };

  return (
    <div className="mt-10">
      {/* The lesson's own progress, separate from the funnel rail: cards done
          out of cards total, filled from the first card — arriving here is
          already progress. */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/12">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-500"
            style={{ width: `${((at + 1) / total) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs text-slate-500 dark:text-stone-400">
          {Math.min(at + 1, total)}/{total}
        </span>
      </div>

      {!onTeaser && q && (
        <motion.div
          key={at}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="mt-8"
        >
          <h2 className="text-xl leading-relaxed font-semibold sm:text-2xl">{q.prompt}</h2>

          <div className="mt-6 grid gap-3">
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
                    "flex items-center justify-between rounded-2xl border px-5 py-3.5 text-left text-base font-medium transition-all",
                    !revealed &&
                      "bb-press-soft cursor-pointer border-slate-300 bg-white/75 hover:border-indigo-400 dark:border-stone-700 dark:bg-stone-900/60 dark:hover:border-indigo-500",
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
              className="mt-5 rounded-xl border border-slate-200 bg-white/70 p-4 text-sm leading-relaxed text-slate-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300"
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
          className="mt-8"
        >
          {/* The last card sells the thing the site does that a textbook
              cannot: you will draw the mechanism yourself, and it gets marked
              as you draw. The trainer is still its own app, so this card is
              honest about that — and when it moves in, this is the slot the
              real drawing exercise takes over. */}
          <h2 className="text-xl leading-relaxed font-semibold sm:text-2xl">
            One more thing — the part you draw yourself.
          </h2>
          <p className="mt-3 max-w-xl text-base text-slate-700 dark:text-stone-300">
            Reading a mechanism is not knowing it. On Blueberry you push the electrons yourself,
            arrow by arrow, and get told exactly where a wrong step went wrong. That part lives in
            our trainer while it moves in here.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={TRAINER_URL}
              target="_blank"
              rel="noreferrer"
              className="bb-press-soft inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/80 px-6 py-3 text-base font-semibold text-slate-800 transition hover:border-indigo-400 hover:shadow-md dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100"
            >
              Try the trainer
              <ArrowUpRight className="size-4" />
            </a>
            <button
              type="button"
              onClick={() => onDone(right)}
              className="bb-press group inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-7 py-3.5 text-base font-semibold text-white"
            >
              Finish the lesson
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Step three: the ask, now that there is something to lose ────────────── */

function Finish({ score }: { score: number }) {
  const goals = useMemo(readGoals, []);
  const built = [
    goals ? `goals for ${goals.course}` : null,
    goals?.examOn ? "an exam countdown" : null,
    `${score} of ${QUIZ.length} first-try answers`,
  ].filter(Boolean) as string[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-10"
    >
      <div className="flex items-start gap-5">
        <div className="hidden h-24 w-24 shrink-0 sm:block">
          <Blueberry mood="proud" flat className="h-full w-full" label="Blueberry, proud of you." />
        </div>
        <div>
          <h1 className="title-face text-4xl leading-tight sm:text-5xl">
            That's a real start.
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-700 dark:text-stone-300">
            You have {joinList(built)} — all of it sitting on this device, and only on this
            device. An account is what makes it yours instead of this browser's.
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <a
          href="#/signup"
          className="bb-press group inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-7 py-3.5 text-base font-semibold text-white"
        >
          Save my progress — free
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </a>
        <a
          href="#/lessons"
          className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 dark:text-stone-300 dark:decoration-stone-600 dark:hover:text-white"
        >
          Keep going without one
        </a>
      </div>

      <p className="mt-4 text-xs text-slate-500 dark:text-stone-500">
        Free means free. The paid tier is for the parts that cost something to run, and it is
        explained on the plans, not sprung on you.
      </p>
    </motion.div>
  );
}

/** "a, b and c" — an Oxford-free list, matching the site's voice. */
function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/* ── Shared bits ─────────────────────────────────────────────────────────── */

/**
 * The rail, and it never shows an empty bar.
 *
 * Step one is filled the moment you arrive, before you have typed anything,
 * because you have in fact done something: you decided to start. A progress
 * bar that reads zero on the screen you were just persuaded onto spends the
 * goodwill that got you there.
 */
function Rail({ current }: { current: number }) {
  const done = current + 1;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[0.7rem] tracking-[0.18em] text-slate-500 uppercase dark:text-stone-400">
          Step {done} of {STEPS.length}
        </p>
        <p className="text-xs text-slate-500 dark:text-stone-400">{STEPS[current]?.note}</p>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-900/10 dark:bg-white/12">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-700"
          style={{ width: `${(done / STEPS.length) * 100}%` }}
        />
      </div>

      <ol className="mt-4 grid gap-2 sm:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step.id}
            className={cn(
              "flex items-center gap-1.5 text-sm",
              i === current
                ? "font-semibold text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-stone-500",
            )}
          >
            {i > current && <Lock className="size-3 shrink-0" aria-hidden />}
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-lg font-semibold">{label}</p>
      {hint && <p className="mt-1 mb-3 text-sm text-slate-600 dark:text-stone-400">{hint}</p>}
      {children}
    </div>
  );
}

/** A fortnight out: far enough to be plausible, close enough to feel like a deadline. */
function defaultExamDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default StartPage;
