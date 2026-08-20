import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Lock } from "lucide-react";
import { PageBackground } from "@/components/ui/page-background";
import { SiteFooter } from "@/components/ui/site-footer";
import { TOPICS } from "@/data/topics";
import { readGoals, writeGoals, daysUntil } from "@/lib/goals";
import { cn } from "@/lib/utils";

/**
 * Step one of four, and the reason the funnel is in this order.
 *
 * "Get Started" does not open a price list. It opens this. By the time anybody
 * is asked for money they will have set a goal, done a lesson and saved the
 * result, and the question will have changed from "is this worth paying for" to
 * "am I willing to lose what I have already built". Those are not the same
 * question and the second one is much easier to answer.
 *
 * **Nothing on this page mentions signing in.** That is deliberate and it is
 * the part most likely to get undone by a well-meaning edit later. An account
 * offered here is an account offered to somebody with nothing to protect.
 *
 * Steps two to four are drawn and not built. They are drawn anyway: a rail that
 * shows four steps and dims the three that are coming tells you how long this
 * is going to take, and a one-screen form that gives no hint of what follows is
 * how people bail out of a form they were two minutes from finishing.
 */

/** Four steps, and the fourth is the only one that costs anything. */
const STEPS = [
  { id: "goals", label: "Set your goals", note: "About a minute" },
  { id: "lesson", label: "Your first lesson", note: "Free, no account" },
  { id: "save", label: "Save what you built", note: "Now it is yours" },
  { id: "plan", label: "Pick a plan", note: "Keep going" },
] as const;

/** The default course. Changeable, and never blank. See the note on `Setup`. */
const DEFAULT_COURSE = "CHEM 241";

export function StartPage() {
  return (
    <div className="relative min-h-svh text-slate-900 dark:text-stone-100">
      <PageBackground />

      {/* No site header, and that is the point of a funnel page.

          Every other page here wears the full bar: search, browse, theme, the
          profile menu. This one gets a back link. A screen whose job is to have
          one thing done on it should not also offer eleven ways to go and do
          something else, and "browse the decks" from here is a visitor who
          never comes back to step two. */}
      <a
        href="#/home"
        className="mx-auto flex w-full max-w-3xl items-center gap-2 px-6 pt-5 text-sm font-semibold text-slate-600 hover:text-indigo-700 dark:text-stone-300 dark:hover:text-indigo-300"
      >
        <ChevronLeft className="size-4" />
        Home
      </a>

      <Setup />
      <SiteFooter />
    </div>
  );
}

function Setup() {
  const saved = useMemo(readGoals, []);

  /**
   * Everything arrives filled in.
   *
   * Never start a user at zero, and an empty form is zero: it is a list of work
   * you have not done, presented as the first thing you see. So the course is
   * already the one most people here are taking, the exam is a fortnight out,
   * and a topic is already picked. Every one of them is wrong for somebody and
   * every one of them is one tap to change, which is a far smaller ask than
   * three blank fields.
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
        ? // Never down to nothing. The last chip refuses to come off, because
          // an empty selection would disable the button that leaves this page
          // and the visitor would be stuck inside step one of four.
          current.length === 1
          ? current
          : current.filter((t) => t !== id)
        : current.length >= 3
          ? current
          : [...current, id],
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    writeGoals({ course: course.trim() || DEFAULT_COURSE, examOn: examOn || null, topicIds });
    // Step two is the lessons page for now. When the guided first lesson exists
    // this is the line that points at it instead.
    window.location.hash = "#/lessons";
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pt-10 pb-24">
      <Rail current={0} />

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
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-7 py-3.5 text-base font-semibold text-white shadow-[0_10px_36px_-10px_rgba(99,102,241,0.8)] transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
          >
            Start my first lesson
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </button>
          <span className="text-sm text-slate-600 dark:text-stone-400">
            Saved on this device. Nothing is sent anywhere yet.
          </span>
        </div>
      </form>
    </main>
  );
}

/**
 * The rail, and it never shows an empty bar.
 *
 * Step one is filled the moment you arrive, before you have typed anything,
 * because you have in fact done something: you decided to start. A progress bar
 * that reads zero on the screen you were just persuaded onto spends the goodwill
 * that got you there.
 */
function Rail({ current }: { current: number }) {
  const done = current + 1;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[0.7rem] tracking-[0.18em] text-slate-500 uppercase dark:text-stone-400">
          Step {done} of {STEPS.length}
        </p>
        <p className="text-xs text-slate-500 dark:text-stone-400">
          {STEPS[current]?.note}
        </p>
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
