/**
 * The staff lesson viewer, at #/app/admin and #/app/admin/<node> (queue item
 * 23, evening brief item 4).
 *
 * Open any lesson at any time, step through its questions as slides, and see
 * them as staff (answers shown) or as a student (answers hidden), on the
 * Member (Free) or the Pro plan.
 *
 * THE PLAN TOGGLE IS A VIEW, NEVER A GRANT. Both toggles are plain React state
 * in this component and nothing else: nothing here touches progress, the
 * journal, billing or the server, and adminViewer.test.ts reads this file's
 * imports to hold that. Editing text in place needs a table and RLS first;
 * the proposal is documentation/ADMIN-EDITS-PROPOSAL.md.
 *
 * Lazy (App.tsx), and App.tsx only mounts it for a staff role, so a student
 * never downloads this chunk.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { hrefForAdmin, hrefForChallenge, hrefForLesson } from "../app/routes";
import { navigate } from "../app/useHashRoute";
import { pressClassName } from "../app/ui/Press";
import { challengeable } from "../beats/template";
import { McqVisualCard } from "../beats/mcq/McqVisualCard";
import { StructureFigure } from "../onboarding/StructureFigure";
import { lessonIndex, lessonSlides, type LessonRow, type Slide, type UnitRow } from "./slides";
import { PathwayDeck } from "./PathwayDeck";
import { planAccess, type PlanAccess, type PlanView } from "./planView";
import "./admin.css";

export type ViewMode = "admin" | "student";

// The activity view (#/app/admin/activity) reads Supabase, so it is its own
// lazy chunk: opening a lesson here never downloads it.
const AdminActivity = lazy(() => import("./AdminActivity"));
// The two statistics boards (#/app/admin/stats), lazy for the same reason.
const BoardsPage = lazy(() => import("./BoardsPage"));
// The admin home (#/app/admin/home): the page the owner lands on.
const AdminHome = lazy(() => import("./AdminHome"));
// The task board (#/app/admin/tasks), lazy like the rest.
const TaskBoardPage = lazy(() => import("./TaskBoardPage"));
const AdminShell = lazy(() => import("./AdminHome").then((m) => ({ default: m.AdminShell })));

const KIND_LABEL: Readonly<Record<Slide["kind"], string>> = {
  mcq: "Multiple choice",
  sort: "Sort",
  match: "Match",
  draw: "Draw it",
  synthesis: "Synthesis gap",
  trainer: "Trainer",
};

/* ------------------------------------------------------------ toggles -- */

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly (readonly [T, string])[];
  readonly onChange: (next: T) => void;
}) {
  return (
    <div className="av-seg" role="group" aria-label={label}>
      <span className="av-seg__label">{label}</span>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          className="av-seg__btn"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- slide -- */

/** One slide, drawn for the chosen view and plan. Exported for the markup test. */
export function SlideCard({
  slide,
  view,
  plan,
  access,
}: {
  readonly slide: Slide;
  readonly view: ViewMode;
  readonly plan: PlanView;
  readonly access: PlanAccess;
}) {
  const staff = view === "admin";
  const locked = plan === "free" && access === "pro-only";
  return (
    <div className="av-slide-wrap">
      <article className={`av-slide${locked ? " av-slide--locked" : ""}`} aria-hidden={locked || undefined}>
        <p className="bb-eyebrow av-slide__kind">
          {KIND_LABEL[slide.kind]}
          {staff && slide.draft === true ? <span className="av-tag">Draft</span> : null}
        </p>
        <h2 className="bb-h2 av-slide__prompt">{slide.prompt}</h2>
        {slide.brief === undefined ? null : <p className="av-slide__brief">{slide.brief}</p>}
        {slide.visual === undefined ? null : (
          <div className="av-slide__visual">
            <McqVisualCard visual={slide.visual} />
          </div>
        )}
        {slide.cards === undefined ? null : (
          <ul className="av-cards">
            {slide.cards.map((card, i) => (
              <li key={`${i}:${card}`} className="av-card">
                {card}
              </li>
            ))}
          </ul>
        )}
        {slide.choices === undefined ? null : (
          <ul className="av-choices">
            {slide.choices.map((choice) => (
              <li
                key={choice.id}
                className={`av-choice${staff && choice.correct ? " av-choice--correct" : ""}`}
              >
                {choice.figure === undefined ? null : (
                  <StructureFigure figure={choice.figure} className="av-choice__figure" />
                )}
                <span className="av-choice__text">
                  {staff && choice.correct ? <span className="av-mark">Correct: </span> : null}
                  {choice.text}
                </span>
                {staff && choice.why !== undefined ? <span className="av-choice__why">{choice.why}</span> : null}
              </li>
            ))}
          </ul>
        )}
        {staff ? (
          <dl className="av-meta">
            {slide.answer.length > 0 ? (
              <div>
                <dt>Answer</dt>
                {slide.answer.map((line, i) => (
                  <dd key={i}>{line}</dd>
                ))}
              </div>
            ) : null}
            {slide.explanation === undefined ? null : (
              <div>
                <dt>Explanation</dt>
                <dd>{slide.explanation}</dd>
              </div>
            )}
            {slide.conditions === undefined ? null : (
              <div>
                <dt>Conditions</dt>
                <dd>{slide.conditions}</dd>
              </div>
            )}
            {slide.provenance === undefined ? null : (
              <div>
                <dt>Provenance</dt>
                <dd>{slide.provenance}</dd>
              </div>
            )}
            <div>
              <dt>Id</dt>
              <dd className="av-id">
                {slide.id} ({slide.slot})
              </dd>
            </div>
          </dl>
        ) : null}
      </article>
      {locked ? (
        <div className="av-lock" role="note">
          <p className="bb-h3">Pro lesson</p>
          <p>A Member sees the unit lock here.</p>
        </div>
      ) : null}
      {plan === "free" ? (
        <div className="av-ad" role="note">
          Ad space. A Member sees an ad here.
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- slideshow -- */

function Slideshow({
  lesson,
  unit,
  slides,
  view,
  plan,
}: {
  readonly lesson: LessonRow;
  readonly unit: UnitRow;
  readonly slides: readonly Slide[];
  readonly view: ViewMode;
  readonly plan: PlanView;
}) {
  const access = planAccess({ ...lesson, unitId: unit.unitId }, plan);

  return (
    <section className="av-show" aria-label={`${lesson.title} slides`}>
      <header className="av-show__head">
        <p className="bb-eyebrow">{unit.title}</p>
        <h1 className="bb-h1 av-show__title">{lesson.title}</h1>
        <div className="av-show__links">
          <a className={pressClassName({ variant: "secondary", size: "sm" })} href={hrefForLesson(lesson.id)}>
            Play this lesson
          </a>
          {challengeable(lesson.id) ? (
            <a className={pressClassName({ variant: "secondary", size: "sm" })} href={hrefForChallenge(lesson.id)}>
              Play the challenge
            </a>
          ) : null}
        </div>
      </header>
      <PathwayDeck
        lesson={lesson}
        unit={unit}
        questions={slides}
        renderQuestion={(slide) => <SlideCard slide={slide} view={view} plan={plan} access={access} />}
      />
    </section>
  );
}

/* --------------------------------------------------------------- page -- */

export default function AdminViewer({ node }: { readonly node: string | null }) {
  const [view, setView] = useState<ViewMode>("admin");
  const [plan, setPlan] = useState<PlanView>("pro");
  // "lessons" is the picker page; a bare #/app/admin lands on the dashboard.
  const lessonNode = node === "lessons" ? null : node;
  const [pickerOpen, setPickerOpen] = useState(lessonNode === null);
  useEffect(() => {
    if (node === null) navigate(hrefForAdmin("home"));
  }, [node]);

  // Built once per mount: walking every lesson plan is cheap but not free.
  const units = useMemo(() => lessonIndex(), []);
  const unit = lessonNode === null ? null : (units.find((u) => u.lessons.some((l) => l.id === lessonNode)) ?? null);
  const lesson = unit?.lessons.find((l) => l.id === lessonNode) ?? null;
  const slides = useMemo(() => (lessonNode === null ? [] : lessonSlides(lessonNode)), [lessonNode]);

  const lessonViewer = (
    <>
          <details className="av-prefs" open={lessonNode === null ? true : undefined}>
            <summary className="av-prefs__sum">Preview settings</summary>
          <p className="av-banner" role="note">
            Preview. Switching plan changes what this page draws, never your account. Nothing here saves.
            Play this lesson runs it for real, and like any run it writes this device's journal.
          </p>

          <div className="av-toggles">
            <Segmented
              label="View"
              value={view}
              options={[
                ["admin", "Admin"],
                ["student", "Student"],
              ]}
              onChange={setView}
            />
            <Segmented
              label="Plan"
              value={plan}
              options={[
                ["free", "Member (Free)"],
                ["pro", "Pro"],
              ]}
              onChange={setPlan}
            />
          </div>
          </details>

          <div className={`av-body${pickerOpen ? " av-body--list" : ""}`}>
            <nav className={`av-picker${pickerOpen ? " is-open" : ""}`} aria-label="Lessons">
              {units.map((u) => (
                <div key={u.unitId} className="av-picker__unit">
                  <p className="av-picker__unit-title">{u.title}</p>
                  <ul>
                    {u.lessons.map((l) => (
                      <li key={l.id}>
                        <a
                          className="av-picker__lesson"
                          href={hrefForAdmin(l.id)}
                          aria-current={l.id === lessonNode ? "page" : undefined}
                          onClick={() => setPickerOpen(false)}
                        >
                          {l.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="av-main">
              {lessonNode === null ? (
                <p className="av-empty">Pick a lesson to see its slides.</p>
              ) : lesson === null || unit === null ? (
                <p className="av-empty">No lesson called {lessonNode} is on the map.</p>
              ) : (
                // Keyed on the node: a new key makes React mount a fresh Slideshow,
                // so the slide index starts at 1 on every lesson.
                <Slideshow key={lessonNode} lesson={lesson} unit={unit} slides={slides} view={view} plan={plan} />
              )}
            </div>
          </div>
    </>
  );

  const page = (current: string, fallback: string, body: React.ReactNode) => (
    <Suspense fallback={<p className="av-empty">{fallback}</p>}>
      <AdminShell current={current}>{body}</AdminShell>
    </Suspense>
  );

  return (
    <div className="av-page">
      {node === "home" ? (
        <Suspense fallback={<p className="av-empty">Loading the admin home...</p>}>
          <AdminHome />
        </Suspense>
      ) : node === "tasks" ? (
        page("tasks", "Loading the task board...", <TaskBoardPage />)
      ) : node === "stats" ? (
        page("stats", "Loading the boards...", <BoardsPage />)
      ) : node === "activity" ? (
        page("activity", "Loading activity...", <AdminActivity />)
      ) : (
        page("lessons", "Loading the lesson viewer...", lessonViewer)
      )}
    </div>
  );
}
