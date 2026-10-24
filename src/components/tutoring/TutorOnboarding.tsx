import { useState } from "react";
import { STYLE_LABEL } from "@/lib/tutoring/api";

/**
 * A new tutor's three-step walk-through, at the top of the tutor desk until
 * they press Done (tutors.onboarded_at). Short on purpose: paint your hours,
 * add time off, and how to read the questionnaire a student fills in.
 *
 * The sample card is made up and says so; it is not any student's answers.
 */

const STEPS = [
  {
    title: "1. Paint your weekly hours",
    body: (
      <>
        <p>
          Below this, drag across the hours you can teach. The pattern repeats every week, in your own time zone, so
          "Tuesdays 2 to 6" stays 2 to 6 when the clocks change.
        </p>
        <p className="mt-2">
          Each painted hour becomes a time a student can book. Press <strong>Save my hours</strong> when the grid looks
          right.
        </p>
      </>
    ),
  },
  {
    title: "2. Add time off",
    body: (
      <p>
        Away for a weekend, or an exam of your own? Add it under <strong>Time off</strong>. Those hours stop showing to
        students. Sessions already booked stay booked, so cancel any you cannot make; the student sees it cancelled on their page.
      </p>
    ),
  },
  {
    title: "3. Read the questionnaire",
    body: (
      <>
        <p>Every booking comes with four answers. Only you and the owner can read them. A made-up example:</p>
        <dl className="mt-3 grid gap-2 rounded-2xl border-2 border-[var(--site-border)]/50 bg-card p-3 text-sm">
          <div>
            <dt className="font-bold">Course</dt>
            <dd>CHEM241. Tells you which syllabus and exam style to expect.</dd>
          </div>
          <div>
            <dt className="font-bold">Stuck on</dt>
            <dd>&ldquo;Aldol condensations, which carbon attacks.&rdquo; Start here.</dd>
          </div>
          <div>
            <dt className="font-bold">Exam date</dt>
            <dd>In 9 days. Close exams want practice under time; far ones want ideas first.</dd>
          </div>
          <div>
            <dt className="font-bold">Style</dt>
            <dd>
              {STYLE_LABEL.walk_me_through}. Other answers: {STYLE_LABEL.practice_problems.toLowerCase()},{" "}
              {STYLE_LABEL.quick_questions.toLowerCase()}, or {STYLE_LABEL.mix.toLowerCase()}.
            </dd>
          </div>
        </dl>
        <p className="mt-2">After the hour, press <strong>Mark done</strong> on the session. That is what records it for pay.</p>
      </>
    ),
  },
];

export function TutorOnboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <section
      aria-labelledby="tutor-onboarding"
      className="bb-glow max-w-2xl rounded-3xl border-2 border-[var(--site-border)]/50 bg-card p-5 text-[0.95rem] leading-7 text-[var(--bb-deep)]"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--site-quiet)]">
        Getting started, step {step + 1} of {STEPS.length}
      </p>
      <h2 id="tutor-onboarding" className="title-face mt-1 text-xl font-extrabold">
        {s.title}
      </h2>
      <div className="mt-2">{s.body}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        {step > 0 && (
          <button type="button" className="sch-ghost" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        {last ? (
          <button type="button" className="sch-btn" onClick={onDone}>
            Done
          </button>
        ) : (
          <button type="button" className="sch-btn" onClick={() => setStep(step + 1)}>
            Next
          </button>
        )}
      </div>
    </section>
  );
}
