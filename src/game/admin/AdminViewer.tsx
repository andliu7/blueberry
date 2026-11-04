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
import { challengeable } from "../beats/template";
import { McqVisualCard } from "../beats/mcq/McqVisualCard";
import { StructureFigure } from "../onboarding/StructureFigure";
import { lessonIndex, lessonSlides, type LessonRow, type Slide, type UnitRow } from "./slides";
import { PathwayDeck } from "./PathwayDeck";
import { planAccess, type PlanAccess, type PlanView } from "./planView";
import { LESSON_FILTERS, filterCounts, lessonTable, matchesFilter, scopeRows, type LessonFilter, type LessonTableRow } from "./lessonTable";
import "./admin.css";
import "./adminType.css";
import "./lessonsList.css";

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
// Bloom, the mascot gallery, opened inside the admin frame (#/app/admin/bloom) so the
// sidebar and its Home link stay on screen (owner, 3 Nov: "can't go back on Bloom").
const BerryGallery = lazy(() => import("../mascot/BerryGallery"));
const AdminShell = lazy(() => import("./AdminHome").then((m) => ({ default: m.AdminShell })));

const KIND_LABEL: Readonly<Record<Slide["kind"], string>> = {
  mcq: "Multiple choice",
  sort: "Sort",
  match: "Match",
  draw: "Draw it",
  synthesis: "Synthesis gap",
  trainer: "Trainer",
};

/* ------------------------------------------------------------ preview -- */

const PREVIEW_NOTE = "A preview: switching it changes what this page draws, never your account.";

/** View and plan as one choice: the four ways a lesson can be drawn. */
const PREVIEWS: readonly { readonly group: string; readonly options: readonly (readonly [ViewMode, PlanView, string])[] }[] = [
  {
    group: "Staff, answers shown",
    options: [
      ["admin", "pro", "Admin"],
      ["admin", "free", "Admin, Member plan"],
    ],
  },
  {
    group: "Student, answers hidden",
    options: [
      ["student", "free", "Member (Free)"],
      ["student", "pro", "Pro"],
    ],
  },
];

function PreviewAs({
  view,
  plan,
  onChange,
}: {
  readonly view: ViewMode;
  readonly plan: PlanView;
  readonly onChange: (view: ViewMode, plan: PlanView) => void;
}) {
  return (
    <label className="al-preview" title={PREVIEW_NOTE}>
      <span className="al-preview__key">Preview as</span>
      <select
        value={`${view}:${plan}`}
        aria-describedby="al-preview-note"
        onChange={(event) => {
          const [v, p] = event.target.value.split(":") as [ViewMode, PlanView];
          onChange(v, p);
        }}
      >
        {PREVIEWS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map(([v, p, text]) => (
              <option key={`${v}:${p}`} value={`${v}:${p}`}>
                {text}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span id="al-preview-note" className="sr-only">
        {PREVIEW_NOTE}
      </span>
    </label>
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
          <ul className={`av-choices${slide.choices.some((c) => c.figure !== undefined) ? " av-choices--fig" : ""}`}>
            {slide.choices.map((choice) => (
              <li
                key={choice.id}
                className={`av-choice${staff && choice.correct ? " av-choice--correct" : ""}`}
              >
                {choice.figure === undefined ? (
                  slide.choices!.some((c) => c.figure !== undefined) ? <span className="av-choice__fig" aria-hidden="true" /> : null
                ) : (
                  <span className="av-choice__fig">
                    <StructureFigure figure={choice.figure} className="av-choice__figure" />
                  </span>
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
  present,
  onPresent,
}: {
  readonly lesson: LessonRow;
  readonly unit: UnitRow;
  readonly slides: readonly Slide[];
  readonly view: ViewMode;
  readonly plan: PlanView;
  readonly present: boolean;
  readonly onPresent: (next: boolean) => void;
}) {
  const access = planAccess({ ...lesson, unitId: unit.unitId }, plan);
  return (
    <section className="av-show" aria-label={`${lesson.title} slides`}>
      <PathwayDeck
        lesson={lesson}
        unit={unit}
        questions={slides}
        present={present}
        onPresent={onPresent}
        renderQuestion={(slide) => <SlideCard slide={slide} view={view} plan={plan} access={access} />}
        sectionAction={(section) =>
          section === "challenge" && challengeable(lesson.id) ? (
            <p className="al-secact">
              <a className="al-btn" href={hrefForChallenge(lesson.id)}>
                Play the challenge
              </a>
            </p>
          ) : null
        }
      />
    </section>
  );
}

/* --------------------------------------------------------------- icons -- */

function Icon({ d }: { readonly d: string }) {
  return (
    <svg className="al-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
const ICON_PLUS = "M8 5v6M5 8h6M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5Z";
const ICON_SEARCH = "M7 12.25a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5ZM14.25 14.25l-3.5-3.5";
const ICON_LEFT = "M10 3.5 5.5 8l4.5 4.5";
const ICON_RIGHT = "M6 3.5 10.5 8 6 12.5";
const ICON_PLAY = "M5 3.25v9.5L12.5 8 5 3.25Z";
const ICON_EXPORT = "M8 10V2.5M5 5.25 8 2.25l3 3M3 9.5v3.25c0 .55.45 1 1 1h8c.55 0 1-.45 1-1V9.5";
const ICON_COLUMNS = "M2.75 2.75h10.5v10.5H2.75zM6.25 2.75v10.5M9.75 2.75v10.5";

/* ---------------------------------------------------------------- pills -- */

function AccessPill({ access }: { readonly access: LessonTableRow["access"] }) {
  return access === "open" ? (
    <span className="al-pill al-pill--free">Free</span>
  ) : (
    <span className="al-pill al-pill--pro">Pro only</span>
  );
}

/* ----------------------------------------------------------------- list -- */

/** The columns an owner can switch on and off; Lesson and Members always show. */
export type LessonColumn = "type" | "questions" | "drafts" | "id";
const COLUMNS: readonly (readonly [LessonColumn, string])[] = [
  ["type", "Type"],
  ["questions", "Questions"],
  ["drafts", "Drafts"],
  ["id", "Id"],
];
// Drafts start hidden: nearly every lesson has them, so the column mostly repeats Questions.
export const DEFAULT_COLUMNS: readonly LessonColumn[] = ["type", "questions", "id"];

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** The shown rows as CSV, every column whether or not it is on screen. */
export function lessonsCsv(rows: readonly LessonTableRow[]): string {
  const head = ["Id", "Lesson", "Unit", "Type", "Questions", "Drafts", "Members"];
  const body = rows.map((r) =>
    [r.id, r.title, r.unitTitle, r.type, r.questions, r.drafts, r.access === "open" ? "Free" : "Pro only"].map(csvCell).join(","),
  );
  return [head.join(","), ...body].join("\n");
}

function downloadCsv(rows: readonly LessonTableRow[]) {
  const blob = new Blob([lessonsCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "blueberry-lessons.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** The Lessons list: Stripe's payments list, one row per lesson, grouped by unit. Exported for the markup test. */
export function LessonsList({
  rows,
  units,
  filter,
  onFilter,
  unitId,
  onUnit,
  query,
  onQuery,
  columns = DEFAULT_COLUMNS,
  onColumns = () => undefined,
}: {
  readonly rows: readonly LessonTableRow[];
  readonly units: readonly UnitRow[];
  readonly filter: LessonFilter;
  readonly onFilter: (next: LessonFilter) => void;
  readonly unitId: string | null;
  readonly onUnit: (next: string | null) => void;
  readonly query: string;
  readonly onQuery: (next: string) => void;
  readonly columns?: readonly LessonColumn[];
  readonly onColumns?: (next: readonly LessonColumn[]) => void;
}) {
  const scoped = scopeRows(rows, unitId, query);
  const counts = filterCounts(scoped);
  const shown = scoped.filter((row) => matchesFilter(row, filter));
  const filtered = unitId !== null || query !== "" || filter !== "all";
  const on = (c: LessonColumn) => columns.includes(c);
  const span = 2 + columns.length;
  const firstOpen = shown.find((r) => r.access === "open") ?? shown[0];
  return (
    <section className="al" aria-label="All lessons">
      <header className="ah-page-head al-head">
        <h1 className="ah-page-title">Lessons</h1>
        <div className="al-head__acts">
          <label className="al-search">
            <Icon d={ICON_SEARCH} />
            <input
              type="search"
              aria-label="Search lessons"
              placeholder="Search by title or id"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
            />
          </label>
          {firstOpen === undefined ? null : (
            <a className="ah-primary al-play" href={hrefForLesson(firstOpen.id)} title={`Play ${firstOpen.title}`}>
              <Icon d={ICON_PLAY} />
              Play first lesson
            </a>
          )}
        </div>
      </header>

      <div className="al-tabs" role="group" aria-label="Show">
        {LESSON_FILTERS.map(([id, label]) => (
          <button key={id} type="button" className="al-tab" aria-pressed={filter === id} onClick={() => onFilter(id)}>
            <span className="al-tab__label">{label}</span>
            <span className="al-tab__count">{counts[id]}</span>
          </button>
        ))}
      </div>

      <div className="al-filters">
        <label className={`al-chip${unitId === null ? "" : " is-set"}`}>
          <Icon d={ICON_PLUS} />
          <span className="al-chip__key">Unit</span>
          <select value={unitId ?? ""} onChange={(event) => onUnit(event.target.value === "" ? null : event.target.value)}>
            <option value="">All units</option>
            {units
              .filter((u) => u.lessons.length > 0)
              .map((u) => (
                <option key={u.unitId} value={u.unitId}>
                  {u.title}
                </option>
              ))}
          </select>
        </label>
        {filtered ? (
          <button
            type="button"
            className="al-clear"
            onClick={() => {
              onUnit(null);
              onQuery("");
              onFilter("all");
            }}
          >
            Clear filters
          </button>
        ) : null}
        <span className="al-filters__acts">
          <button type="button" className="al-btn al-btn--sm" onClick={() => downloadCsv(shown)} disabled={shown.length === 0}>
            <Icon d={ICON_EXPORT} />
            Export
          </button>
          <details className="al-cols">
            <summary className="al-btn al-btn--sm">
              <Icon d={ICON_COLUMNS} />
              Edit columns
            </summary>
            <div className="al-cols__menu" role="group" aria-label="Columns">
              <p className="al-cols__head">Fixed columns</p>
              <p className="al-cols__fixed">Lesson, Members</p>
              <p className="al-cols__head">Shown columns</p>
              {COLUMNS.map(([id, label]) => (
                <label key={id} className="al-cols__opt">
                  <input
                    type="checkbox"
                    checked={on(id)}
                    onChange={(event) =>
                      onColumns(COLUMNS.map(([c]) => c).filter((c) => (c === id ? event.target.checked : on(c))))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </details>
        </span>
      </div>

      <div className="al-table-wrap">
        <table className="al-table">
          <thead>
            <tr>
              <th scope="col">Lesson</th>
              {on("type") ? (
                <th scope="col" className="al-col-type">
                  Type
                </th>
              ) : null}
              {on("questions") ? (
                <th scope="col" className="al-num al-col-q">
                  Questions
                </th>
              ) : null}
              {on("drafts") ? (
                <th scope="col" className="al-num al-col-d">
                  Drafts
                </th>
              ) : null}
              <th scope="col">Members</th>
              {on("id") ? (
                <th scope="col" className="al-col-id">
                  Id
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => {
              const head =
                i === 0 || shown[i - 1]!.unitId !== row.unitId ? (
                  <tr key={`unit:${row.unitId}`} className="al-group">
                    <th scope="colgroup" colSpan={span}>
                      {row.unitTitle}
                      <span className="al-group__n">{shown.filter((r) => r.unitId === row.unitId).length} lessons</span>
                    </th>
                  </tr>
                ) : null;
              return [
                head,
                <tr
                  key={row.id}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("a") === null) navigate(hrefForAdmin(row.id));
                  }}
                >
                  <td className="al-col-title">
                    <a href={hrefForAdmin(row.id)}>{row.title}</a>
                    <span className="al-sub">
                      {row.type} · {row.questions} {row.questions === 1 ? "question" : "questions"}
                    </span>
                  </td>
                  {on("type") ? (
                    <td className="al-col-type">
                      <span className="al-pill">{row.type}</span>
                    </td>
                  ) : null}
                  {on("questions") ? <td className="al-num al-col-q">{row.questions}</td> : null}
                  {on("drafts") ? (
                    <td className="al-num al-col-d">{row.drafts === 0 ? <span className="al-dash">—</span> : row.drafts}</td>
                  ) : null}
                  <td>
                    <AccessPill access={row.access} />
                  </td>
                  {on("id") ? <td className="al-col-id">{row.id}</td> : null}
                </tr>,
              ];
            })}
            {shown.length === 0 ? (
              <tr className="al-none">
                <td colSpan={span}>No lessons match these filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="al-count">
        {shown.length} {shown.length === 1 ? "result" : "results"}
      </p>
    </section>
  );
}

/* --------------------------------------------------------------- detail -- */

function LessonDetail({
  rows,
  node,
  lesson,
  unit,
  slides,
  view,
  onView,
  plan,
  onPlan,
}: {
  readonly rows: readonly LessonTableRow[];
  readonly node: string;
  readonly lesson: LessonRow | null;
  readonly unit: UnitRow | null;
  readonly slides: readonly Slide[];
  readonly view: ViewMode;
  readonly onView: (next: ViewMode) => void;
  readonly plan: PlanView;
  readonly onPlan: (next: PlanView) => void;
}) {
  const at = rows.findIndex((r) => r.id === node);
  const row = at < 0 ? null : rows[at]!;
  // Present lives here so its one button sits in the header beside Play.
  const [present, setPresent] = useState(false);
  useEffect(() => setPresent(false), [node]);
  const prev = at > 0 ? rows[at - 1] : undefined;
  const next = at >= 0 && at < rows.length - 1 ? rows[at + 1] : undefined;
  const step = (target: LessonTableRow | undefined, label: string, d: string) =>
    target === undefined ? (
      <span className="al-step is-off" aria-hidden="true">
        <Icon d={d} />
      </span>
    ) : (
      <a className="al-step" href={hrefForAdmin(target.id)} aria-label={`${label}: ${target.title}`} title={target.title}>
        <Icon d={d} />
      </a>
    );
  return (
    <section className="al-detail" aria-label="Lesson">
      <nav className="al-crumbs" aria-label="Breadcrumb">
        <a className="al-crumbs__back" href={hrefForAdmin("lessons")}>
          <Icon d={ICON_LEFT} />
          Lessons
        </a>
        {unit === null ? null : (
          <>
            <span className="al-crumbs__sep" aria-hidden="true">
              /
            </span>
            <span className="al-crumbs__unit">{unit.title}</span>
          </>
        )}
        {row === null ? null : (
          <span className="al-crumbs__steps">
            {step(prev, "Previous lesson", ICON_LEFT)}
            <span className="al-crumbs__pos">
              {at + 1} of {rows.length}
            </span>
            {step(next, "Next lesson", ICON_RIGHT)}
          </span>
        )}
      </nav>

      {lesson === null || unit === null || row === null ? (
        <p className="av-empty">No lesson called {node} is on the map.</p>
      ) : (
        <>
          <header className="ah-page-head al-dhead">
            <div className="al-dhead__text">
              <h1 className="ah-page-title al-dhead__title">{lesson.title}</h1>
              <AccessPill access={row.access} />
            </div>
            <div className="al-dhead__acts">
              <PreviewAs
                view={view}
                plan={plan}
                onChange={(v, p) => {
                  onView(v);
                  onPlan(p);
                }}
              />
              <button type="button" className="al-btn al-present" aria-pressed={present} onClick={() => setPresent(true)} title="Present (F)">
                Present
              </button>
              <a className="ah-primary al-play" href={hrefForLesson(lesson.id)}>
                <span className="al-wide">Play this lesson</span>
                <span className="al-narrow">Play</span>
              </a>
            </div>
            {/* The facts a Details column used to repeat, on one line under the title. The unit
                is already in the breadcrumb, so it is not said twice. */}
            <p className="al-dmeta">
              <span>{row.type}</span>
              <span className="tabular-nums">
                {row.questions} {row.questions === 1 ? "question" : "questions"}
              </span>
              <span className="tabular-nums">{row.drafts === 0 ? "No drafts" : `${row.drafts} ${row.drafts === 1 ? "draft" : "drafts"}`}</span>
              <span className="al-dmeta__id">{lesson.id}</span>
            </p>
          </header>

          {/* Keyed on the node: a new key mounts a fresh deck, so every lesson opens on slide 1. */}
          <Slideshow key={node} lesson={lesson} unit={unit} slides={slides} view={view} plan={plan} present={present} onPresent={setPresent} />
        </>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- page -- */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export default function AdminViewer({ node }: { readonly node: string | null }) {
  const [view, setView] = useState<ViewMode>("admin");
  const [plan, setPlan] = useState<PlanView>("pro");
  // The list's filters live here, not in the list: the viewer stays mounted across
  // admin pages, so going back from a lesson finds the list as it was left.
  const [filter, setFilter] = useState<LessonFilter>("all");
  const [unitFilter, setUnitFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [columns, setColumns] = useState<readonly LessonColumn[]>(DEFAULT_COLUMNS);
  // "lessons" is the list (Stripe's payments list); a lesson id opens its detail page.
  const lessonNode = node === "lessons" ? null : node;
  useEffect(() => {
    if (node === null) navigate(hrefForAdmin("home"));
  }, [node]);

  // Built once per mount: every lesson's slides, for the list's counts.
  const units = useMemo(() => lessonIndex(), []);
  const rows = useMemo(() => lessonTable(units, lessonSlides), [units]);
  const unit = lessonNode === null ? null : (units.find((u) => u.lessons.some((l) => l.id === lessonNode)) ?? null);
  const lesson = unit?.lessons.find((l) => l.id === lessonNode) ?? null;
  const slides = useMemo(() => (lessonNode === null ? [] : lessonSlides(lessonNode)), [lessonNode]);

  const lessonViewer =
    lessonNode === null ? (
      <LessonsList
        rows={rows}
        units={units}
        filter={filter}
        onFilter={setFilter}
        unitId={unitFilter}
        onUnit={setUnitFilter}
        query={query}
        onQuery={setQuery}
        columns={columns}
        onColumns={setColumns}
      />
    ) : (
      <LessonDetail
        rows={rows}
        node={lessonNode}
        lesson={lesson}
        unit={unit}
        slides={slides}
        view={view}
        onView={setView}
        plan={plan}
        onPlan={setPlan}
      />
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
      ) : node === "bloom" ? (
        page("bloom", "Loading Bloom...", <BerryGallery reducedMotion={prefersReducedMotion()} />)
      ) : (
        page("lessons", "Loading the lesson viewer...", lessonViewer)
      )}
    </div>
  );
}
