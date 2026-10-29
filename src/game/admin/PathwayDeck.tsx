/**
 * The pathway slideshow for one lesson (staff only, mounted by AdminViewer).
 *
 * One idea per slide. Left and Right step, Home and End jump to the ends, and
 * the section rail jumps by topic. F (or the Present button) fills the whole
 * viewport with the deck: no sidebar, banner or toggles, big type, and the
 * Prev/Next bar pinned to the bottom. Escape leaves. Content comes from
 * deckModel.ts, which reads the same code the lesson runs on.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Press } from "../app/ui/Press";
import { SECTION_LABEL, pathwayDeck, sectionStarts, type DeckDiagram, type DeckSlide } from "./deckModel";
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
              <dd>{fact.value}</dd>
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

export function PathwayDeck({
  lesson,
  unit,
  questions,
  renderQuestion,
}: {
  readonly lesson: LessonRow;
  readonly unit: UnitRow;
  readonly questions: readonly Slide[];
  readonly renderQuestion: (slide: Slide) => React.ReactNode;
}) {
  const deck = useMemo(() => pathwayDeck(lesson, unit, questions), [lesson, unit, questions]);
  const starts = useMemo(() => sectionStarts(deck), [deck]);
  const [index, setIndex] = useState(0);
  const [present, setPresent] = useState(false);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const prevAt = useRef(0);
  const last = deck.length - 1;
  const at = Math.min(index, last);
  const slide = deck[at]!;
  useEffect(() => {
    setDir(at >= prevAt.current ? "fwd" : "back");
    prevAt.current = at;
  }, [at]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowLeft" || event.key === "PageUp") setIndex((i) => Math.max(0, i - 1));
      else if (event.key === "ArrowRight" || event.key === "PageDown") setIndex((i) => Math.min(last, i + 1));
      else if (event.key === "Home") setIndex(0);
      else if (event.key === "End") setIndex(last);
      else if (event.key === "f" || event.key === "F") setPresent((p) => !p);
      else if (event.key === "Escape") setPresent(false);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last]);

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

  return (
    <div className={`pd${present ? " pd--present" : ""}`} role={present ? "dialog" : undefined} aria-label={present ? `${lesson.title} presentation` : undefined}>
      <div className="pd-top">
        {present ? <p className="pd-top__title">{lesson.title}</p> : null}
        <nav className="pd-rail" aria-label="Deck sections">
          {starts.map((s) => (
            <button
              key={s.section}
              type="button"
              className="pd-rail__btn"
              aria-current={current?.section === s.section ? "step" : undefined}
              onClick={() => setIndex(s.at)}
            >
              {SECTION_LABEL[s.section]}
              <span className="pd-rail__n">{s.count}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="pd-present"
          aria-pressed={present}
          onClick={() => setPresent((p) => !p)}
        >
          {present ? "Exit (Esc)" : "Present (F)"}
        </button>
      </div>
      <div
        className="pd-bar"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={deck.length}
        aria-valuenow={at + 1}
        aria-label="Deck progress"
      >
        <span style={{ width: `${((at + 1) / deck.length) * 100}%` }} />
      </div>
      <div className="pd-stage">
        <div key={at} className={`pd-move pd-move--${dir}`}>
          {slide.question === undefined ? <DeckInfo slide={slide} /> : renderQuestion(slide.question)}
        </div>
      </div>
      <div className="pd-foot">
        <nav className="av-steps pd-steps" aria-label="Slides">
          <Press variant="secondary" size="sm" onClick={() => setIndex(Math.max(0, at - 1))} disabled={at === 0}>
            Prev
          </Press>
          <span className="av-steps__count" aria-live="polite">
            Slide {at + 1} of {deck.length}
          </span>
          <Press variant="primary" size="sm" onClick={() => setIndex(Math.min(last, at + 1))} disabled={at === last}>
            Next
          </Press>
        </nav>
        <p className="pd-hint">Left and Right step, Home and End jump, F presents.</p>
      </div>
    </div>
  );
}

export type { PlanAccess, PlanView, ViewMode };
