/**
 * The pathway slideshow for one lesson (staff only, mounted by AdminViewer).
 *
 * In the page the section tabs are the only navigation: a tab shows its whole
 * section top to bottom. F (or the header's Present button) fills the whole
 * viewport with the deck one slide at a time: big type, the Prev/Next bar pinned
 * to the bottom, Left and Right step, Escape leaves. Content comes from
 * deckModel.ts, which reads the same code the lesson runs on.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Press } from "../app/ui/Press";
import { SECTION_LABEL, overviewSummary, pathwayDeck, sectionStarts, type DeckDiagram, type DeckSection, type DeckSlide } from "./deckModel";
import type { LessonRow, Slide, UnitRow } from "./slides";
import type { PlanAccess, PlanView } from "./planView";
import type { ViewMode } from "./AdminViewer";

/* ------------------------------------------------------------ diagrams -- */

/** A row of counter dots 0..n with a marked dot, drawn in plain SVG. */
function Dots({ n, y, mark, from }: { readonly n: number; readonly y: number; readonly mark?: number; readonly from?: number }) {
  const step = 600 / Math.max(1, n);
  return (
    <g>
      {Array.from({ length: n + 1 }, (_, i) => {
        const x = 20 + i * step;
        const on = from !== undefined ? i <= from : i <= (mark ?? -1);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={15} className={on ? "pd-dg__on" : "pd-dg__off"} />
            <text x={x} y={y + 4} textAnchor="middle" className={on ? "pd-dg__onink" : "pd-dg__ink"}>
              {i}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function DeckDiagramView({ diagram }: { readonly diagram: DeckDiagram }) {
  if (diagram.kind === "run") {
    const top = Math.max(diagram.clearAt, ...diagram.tiers.map((t) => t.at));
    const step = 600 / top;
    return (
      <figure className="pd-fig">
        <svg className="pd-dg" viewBox="0 0 640 130" role="img" aria-label={`A run counts right answers in a row up to ${top}`}>
          <Dots n={top} y={56} from={diagram.clearAt} />
          <text x={20 + diagram.clearAt * step} y={22} textAnchor="middle" className="pd-dg__tag">
            Clears at {diagram.clearAt}
          </text>
          {diagram.tiers.map((t) => (
            <g key={t.name}>
              <path d={`M ${20 + t.at * step} 76 v 12`} className="pd-dg__line" />
              <text x={20 + t.at * step} y={112} textAnchor="middle" className="pd-dg__tag">
                {t.name} {t.at}
              </text>
            </g>
          ))}
        </svg>
        <figcaption className="pd-fig__cap">A miss comes back {diagram.gap} problems later, once per session.</figcaption>
      </figure>
    );
  }
  if (diagram.kind === "failback") {
    const n = diagram.at;
    const step = 600 / n;
    const x = (i: number) => 20 + i * step;
    const from = diagram.below ? n - 2 : n;
    const to = diagram.below ? 0 : n - 1;
    const label = diagram.below ? "miss: back to 0" : "miss: back one";
    const mid = (x(from) + x(to)) / 2;
    return (
      <figure className="pd-fig">
        <svg className="pd-dg" viewBox="0 0 640 150" role="img" aria-label={diagram.below ? `Below ${diagram.tier} a miss resets the run to 0` : `From ${diagram.tier} up a miss steps back one`}>
          <Dots n={n} y={36} mark={from} />
          <path d={`M ${x(from)} 54 Q ${mid} 96 ${x(to) + (diagram.below ? 8 : 10)} 56`} className="pd-dg__arrow" />
          <text x={mid} y={128} textAnchor="middle" className="pd-dg__tag">
            {label}
          </text>
        </svg>
      </figure>
    );
  }
  if (diagram.kind === "pace") {
    return (
      <svg className="pd-dg" viewBox="0 0 640 150" role="img" aria-label="Pace moves between minus one, zero and plus one">
        {[
          { x: 20, label: "-1", sub: "easier" },
          { x: 250, label: "0", sub: "as written" },
          { x: 480, label: "+1", sub: "harder" },
        ].map((b) => (
          <g key={b.label}>
            <rect x={b.x} y={40} width={140} height={80} rx={16} className="pd-dg__box" />
            <text x={b.x + 70} y={80} textAnchor="middle" className="pd-dg__big">
              {b.label}
            </text>
            <text x={b.x + 70} y={106} textAnchor="middle" className="pd-dg__ink">
              {b.sub}
            </text>
          </g>
        ))}
        <path d="M 392 62 H 478" className="pd-dg__arrow" />
        <text x={435} y={30} textAnchor="middle" className="pd-dg__tag">
          2 flawless
        </text>
        <path d="M 248 98 H 162" className="pd-dg__arrow" />
        <text x={205} y={140} textAnchor="middle" className="pd-dg__tag">
          under half
        </text>
        <path d="M 162 62 H 248" className="pd-dg__arrow" />
        <text x={205} y={30} textAnchor="middle" className="pd-dg__tag">
          1 flawless
        </text>
      </svg>
    );
  }
  const rows = [
    { name: "Run", rule: `${diagram.clearAt}+ in a row` },
    { name: "Challenge", rule: "all right first time" },
    { name: "Exam", rule: `${diagram.examPct}% first time` },
  ];
  return (
    <ul className="pd-pass" aria-label="Pass rules">
      {rows.map((r) => (
        <li key={r.name}>
          <b>{r.name}</b>
          <span>{r.rule}</span>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- slides -- */

/** "17 (15 mcq, 1 match, 1 sort)" reads as the figure, with its breakdown on a quiet line below. */
function FactValue({ value, empty }: { readonly value: string; readonly empty: boolean }) {
  const split = /^(\S+) \((.+)\)$/.exec(value);
  if (empty || split === null) return <dd className={empty ? "is-empty" : undefined}>{value}</dd>;
  return (
    <dd>
      {split[1]}
      <span className="pd-facts__sub">{split[2]}</span>
    </dd>
  );
}

export function DeckInfo({ slide }: { readonly slide: DeckSlide }) {
  return (
    <article className="pd-slide">
      <p className="bb-eyebrow pd-slide__section">
        {SECTION_LABEL[slide.section]}
        {slide.flag === undefined ? null : <span className="av-tag">{slide.flag}</span>}
      </p>
      <h2 className="bb-h2 pd-slide__title">{slide.title}</h2>
      {slide.lead === undefined ? null : <p className="pd-slide__lead">{slide.lead}</p>}
      {slide.diagram === undefined ? null : <DeckDiagramView diagram={slide.diagram} />}
      {slide.facts === undefined ? null : (
        <dl className="pd-facts">
          {slide.facts.map((fact) => (
            <div key={fact.label}>
              <dt>{fact.label}</dt>
              <FactValue value={fact.value} empty={fact.empty === true} />
            </div>
          ))}
        </dl>
      )}
      {slide.points === undefined || slide.points.length === 0 ? null : (
        <ul className="pd-points">
          {slide.points.map((point, i) => (
            <li key={`${i}:${point}`}>{point}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

const KIND_WORD: Readonly<Record<Slide["kind"], string>> = {
  mcq: "Multiple choice",
  sort: "Sort",
  match: "Match",
  draw: "Draw it",
  synthesis: "Synthesis gap",
  trainer: "Trainer",
};

/**
 * The Overview tab in the page (not presenting): a full-width summary, not a slide.
 * The page header already names the lesson, so it is not said again here.
 */
function OverviewPage({
  lesson,
  questions,
  onOpen,
}: {
  readonly lesson: LessonRow;
  readonly questions: readonly Slide[];
  readonly onOpen: (slideId: string) => void;
}) {
  const sum = useMemo(() => overviewSummary(lesson, questions), [lesson, questions]);
  const byKind = new Map<string, number>();
  for (const q of questions) byKind.set(KIND_WORD[q.kind], (byKind.get(KIND_WORD[q.kind]) ?? 0) + 1);
  const mix = [...byKind].map(([kind, n]) => `${n} ${kind.toLowerCase()}`).join(", ");
  return (
    <div className="pd-ov">
      <section className="pd-ov__sec" aria-labelledby="pd-ov-obj">
        <h2 id="pd-ov-obj" className="pd-ov__h">
          Learning objective
        </h2>
        {sum.objective === null ? (
          <p className="pd-ov__empty">No objective written for this lesson yet.</p>
        ) : (
          <p className="pd-ov__lead">{sum.objective}</p>
        )}
        {sum.keyIdea === null ? null : <p className="pd-ov__note">Key idea: {sum.keyIdea}</p>}
        <dl className="pd-ov__facts">
          <div>
            <dt>Steps in a run</dt>
            <dd>{sum.stepCount}</dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>
              {questions.length}
              {mix === "" ? null : <span className="pd-ov__sub">{mix}</span>}
            </dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd className={sum.moves === undefined ? "is-empty" : undefined}>
              {sum.moves === undefined ? "Not graded yet" : `${sum.moves} moves`}
            </dd>
          </div>
          <div>
            <dt>Drafts</dt>
            <dd className={sum.drafts.length === 0 ? "is-empty" : undefined}>{sum.drafts.length === 0 ? "None" : sum.drafts.length}</dd>
          </div>
        </dl>
      </section>

      <section className="pd-ov__sec" aria-labelledby="pd-ov-steps">
        <h2 id="pd-ov-steps" className="pd-ov__h">
          The run, step by step
        </h2>
        {sum.rows.length === 0 ? (
          <p className="pd-ov__empty">Nothing is authored for this lesson.</p>
        ) : (
          <table className="pd-ov__table">
            <thead>
              <tr>
                <th scope="col" className="pd-ov__n">
                  #
                </th>
                <th scope="col">Slot</th>
                <th scope="col">What plays</th>
                <th scope="col" className="pd-ov__num">
                  Questions
                </th>
                <th scope="col" className="pd-ov__act">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sum.rows.map((row, i) => (
                <tr key={`${i}:${row.slot}`}>
                  <td className="pd-ov__n">{i + 1}</td>
                  <td className="pd-ov__slot">{row.slot}</td>
                  <td>{row.steps.join(", then ")}</td>
                  <td className="pd-ov__num">{row.questions === 0 ? <span className="pd-ov__dash">—</span> : row.questions}</td>
                  <td className="pd-ov__act">
                    {row.firstId === undefined || row.questions === 0 ? null : (
                      <button type="button" className="pd-ov__link" onClick={() => onOpen(row.firstId!)}>
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="pd-ov__sec" aria-labelledby="pd-ov-drafts">
        <h2 id="pd-ov-drafts" className="pd-ov__h">
          Drafts to check
          <span className="pd-ov__count">{sum.drafts.length}</span>
        </h2>
        {sum.drafts.length === 0 ? (
          <p className="pd-ov__empty">Every question in this lesson has passed its human check.</p>
        ) : (
          <>
            <p className="pd-ov__note">Pool items still waiting on a human check.</p>
            <ol className="pd-ov__drafts">
              {sum.drafts.map((d) => (
                <li key={d.id}>
                  <span className="pd-ov__kind">{KIND_WORD[d.kind]}</span>
                  <span className="pd-ov__prompt">{d.prompt}</span>
                  <button type="button" className="pd-ov__link" onClick={() => onOpen(d.id)}>
                    Review
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </div>
  );
}

/** The tabs shown in the page; the rest live under More so the row fits one line. */
const MORE_SECTIONS: readonly DeckSection[] = ["overarching", "chosen", "algorithms"];

export function PathwayDeck({
  lesson,
  unit,
  questions,
  renderQuestion,
  present,
  onPresent,
  sectionAction,
}: {
  readonly lesson: LessonRow;
  readonly unit: UnitRow;
  readonly questions: readonly Slide[];
  readonly renderQuestion: (slide: Slide) => React.ReactNode;
  /** Present mode is owned by the page header, which carries the one Present button. */
  readonly present: boolean;
  readonly onPresent: (next: boolean) => void;
  /** An action drawn at the top of a section in the page, such as Play the challenge. */
  readonly sectionAction?: (section: DeckSection) => React.ReactNode;
}) {
  const deck = useMemo(() => pathwayDeck(lesson, unit, questions), [lesson, unit, questions]);
  const starts = useMemo(() => sectionStarts(deck), [deck]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [scrollTo, setScrollTo] = useState<string | null>(null);
  const prevAt = useRef(0);
  const last = deck.length - 1;
  const at = Math.min(index, last);
  const slide = deck[at]!;
  useEffect(() => {
    setDir(at >= prevAt.current ? "fwd" : "back");
    prevAt.current = at;
  }, [at]);

  // In the page the tabs are the only way through a lesson; the arrow keys step
  // slides only while presenting. F presents from either.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "f" || event.key === "F") onPresent(!present);
      else if (event.key === "Escape" && present) onPresent(false);
      else if (!present) return;
      else if (event.key === "ArrowLeft" || event.key === "PageUp") setIndex((i) => Math.max(0, i - 1));
      else if (event.key === "ArrowRight" || event.key === "PageDown") setIndex((i) => Math.min(last, i + 1));
      else if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(last);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, present, onPresent]);

  // Present mode owns the viewport, so the page behind it must not scroll.
  useEffect(() => {
    if (!present) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [present]);

  const current = starts.filter((s) => s.at <= at).pop();
  const section: DeckSection = current?.section ?? "overview";
  const sectionSlides = deck.filter((d) => d.section === section);

  // A View or Review link on the Overview opens its section and brings that item into view.
  useEffect(() => {
    if (scrollTo === null || present) return;
    document.getElementById(`pd-item-${scrollTo}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
    setScrollTo(null);
  }, [scrollTo, present]);

  // Keep the current tab in view when the row scrolls sideways (phone widths).
  // Scrolls the rail only, never the page.
  const railRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const tab = rail?.querySelector<HTMLElement>('[aria-current="step"]');
    if (rail == null || tab == null || rail.scrollWidth <= rail.clientWidth) return;
    const left = tab.offsetLeft - rail.offsetLeft;
    if (left < rail.scrollLeft || left + tab.offsetWidth > rail.scrollLeft + rail.clientWidth) {
      rail.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [section, present]);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!moreOpen) return;
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && moreRef.current?.contains(event.target as Node)) return;
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [moreOpen]);

  const tab = (s: (typeof starts)[number]) => {
    const fill = s.at + s.count <= at ? 1 : s.at > at ? 0 : (at - s.at + 1) / s.count;
    const here = section === s.section;
    return (
      <button
        key={s.section}
        type="button"
        className={`pd-rail__btn${present && fill === 1 && !here ? " is-done" : ""}`}
        aria-current={here ? "step" : undefined}
        onClick={() => setIndex(s.at)}
      >
        {SECTION_LABEL[s.section]}
        <span className="pd-rail__n">{s.count}</span>
        <span className="pd-rail__fill" aria-hidden="true" style={{ transform: `scaleX(${present ? fill : here ? 1 : 0})` }} />
      </button>
    );
  };
  const mainTabs = present ? starts : starts.filter((s) => !MORE_SECTIONS.includes(s.section));
  const moreTabs = present ? [] : starts.filter((s) => MORE_SECTIONS.includes(s.section));
  const moreHere = moreTabs.some((s) => s.section === section);

  return (
    <div className={`pd${present ? " pd--present" : ""}`} role={present ? "dialog" : undefined} aria-label={present ? `${lesson.title} presentation` : undefined}>
      <div className="pd-top">
        {/* Presenting, the title and Exit share their own row, so Exit never sits on the tabs. */}
        {present ? (
          <div className="pd-top__row">
            <p className="pd-top__title">
              {lesson.title}
              {current === undefined ? null : <span className="pd-top__section">{SECTION_LABEL[current.section]}</span>}
            </p>
            <button type="button" className="pd-present" onClick={() => onPresent(false)}>
              Exit<span className="pd-key"> (Esc)</span>
            </button>
          </div>
        ) : null}
        {/* A phone has no room for a tab row without clipping one: the section is a picker. */}
        {present ? null : (
          <label className="pd-pick">
            <span className="pd-pick__key">Section</span>
            <select value={section} onChange={(e) => setIndex(starts.find((s) => s.section === e.target.value)?.at ?? 0)}>
              {starts.map((s) => (
                <option key={s.section} value={s.section}>
                  {SECTION_LABEL[s.section]} ({s.count})
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="pd-tabs">
          <nav className="pd-rail" aria-label="Lesson sections" ref={railRef}>
            {mainTabs.map(tab)}
          </nav>
          {moreTabs.length === 0 ? null : (
            <div className="pd-more" ref={moreRef}>
              <button
                type="button"
                className="pd-rail__btn pd-more__btn"
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                aria-current={moreHere ? "step" : undefined}
                onClick={() => setMoreOpen((o) => !o)}
              >
                {moreHere ? SECTION_LABEL[section] : "More"}
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="pd-rail__fill" aria-hidden="true" style={{ transform: `scaleX(${moreHere ? 1 : 0})` }} />
              </button>
              {moreOpen ? (
                <div className="pd-more__menu" role="menu">
                  {moreTabs.map((s) => (
                    <button
                      key={s.section}
                      type="button"
                      role="menuitem"
                      className="pd-more__item"
                      aria-current={section === s.section ? "true" : undefined}
                      onClick={() => {
                        setIndex(s.at);
                        setMoreOpen(false);
                      }}
                    >
                      {SECTION_LABEL[s.section]}
                      <span className="pd-rail__n">{s.count}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <div className="pd-card">
        {present ? (
          <div className="pd-stage">
            <div key={at} className={`pd-move pd-move--${dir}`}>
              {slide.question === undefined ? <DeckInfo slide={slide} /> : renderQuestion(slide.question)}
            </div>
          </div>
        ) : (
          /* In the page a tab shows its whole section top to bottom, so there is no
             second pager: the tabs alone move through the lesson. */
          <div className="pd-stage">
            <div key={section} className="pd-move pd-move--fwd pd-list">
              {sectionAction?.(section)}
              {sectionSlides.map((d) => (
                <div key={d.id} id={`pd-item-${d.id}`} className="pd-item">
                  {d.id === "overview" ? (
                    <OverviewPage
                      lesson={lesson}
                      questions={questions}
                      onOpen={(id) => {
                        setIndex(Math.max(0, deck.findIndex((x) => x.id === id)));
                        setScrollTo(id);
                      }}
                    />
                  ) : d.question === undefined ? (
                    <DeckInfo slide={d} />
                  ) : (
                    renderQuestion(d.question)
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {present ? (
          <div className="pd-foot">
            <nav className="av-steps pd-steps" aria-label="Slides">
              <Press variant="secondary" size="sm" onClick={() => setIndex(Math.max(0, at - 1))} disabled={at === 0}>
                Prev
              </Press>
              <span className="av-steps__count" aria-live="polite">
                <span className="pd-key">Slide </span>
                {at + 1} of {deck.length}
              </span>
              <Press variant="primary" size="sm" onClick={() => setIndex(Math.min(last, at + 1))} disabled={at === last}>
                Next
              </Press>
            </nav>
            <p className="pd-hint">Left and Right step, Home and End jump, Esc leaves.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export type { PlanAccess, PlanView, ViewMode };
