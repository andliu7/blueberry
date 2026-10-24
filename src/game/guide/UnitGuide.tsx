/**
 * THE UNIT GUIDEBOOK PAGE. Opened from the GUIDEBOOK key on the unit card in
 * the pathway (PathwayTab owns the open state and the lesson doors).
 *
 * The bar it is judged against is a phone guidebook screen, where every tip
 * is a full width tinted block: a bold heading, one sentence with the key
 * words in colour, then a large boxed example. So each lesson here is one
 * TIP CARD: its title and START, ONE key idea, and ONE drawing in a white
 * example card that fills the width, the drawing as the hero. Everything
 * else (the other ideas, why a lesson is shut) sits behind "More on this".
 *
 *   bar          Back and the unit's progress, the same count the path shows.
 *                It sticks to the top of the page, and the page sits ABOVE
 *                the app's header and tab bar, so Back never scrolls away
 *   hero         unit name with the header reveal (andliu's per-letter rise),
 *                one intro line and Bloom
 *   side         Up next with its START, and on a wide screen a sticky list
 *                of the stages beside the reading column
 *   stages       one fold per stage, ONE open at a time so the page stays
 *                short; the student's current stage opens first. Each stage
 *                title rises with the same header reveal
 *
 * Where the student is (the guide open, which stage) rides in the URL
 * (guideLink.ts), so Back from a lesson or a reload comes back to it.
 *
 * Every chemistry line comes from u1Guide.ts (quoted from the pools) and every
 * structure from u1Guide.figures.ts (RDKit, scripts/guide_u1.py). This file
 * only lays them out.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Press } from "../app/ui/Press";
import { showDraftMarks } from "../app/flags";
import { Berry } from "../mascot/Berry";
import { HUMAN_GATE_MARK } from "../pathway-sheet/nodeSheetModel";
import { revealWords } from "../tabs/pathway/pathwayLayout";
import type { ChargeGateNode } from "../charge/chargeGateModel";
import { GuideMol } from "./GuideMol";
import { guideInHash, savedGuideScroll, saveGuideScroll, writeGuideToHash } from "./guideLink";
import type { GuideExample, GuideIdea, GuideLesson, GuidePanel, GuideStage, LessonDoor, UnitGuide } from "./types";
import "./guide.css";
import { plural } from "@/lib/helpers";

export interface UnitGuidePageProps {
  readonly guide: UnitGuide;
  /** "Unit 1" */
  readonly unitLabel: string;
  /** "Conjugation, Resonance & Dienes" */
  readonly unitName: string;
  /** Every lesson and checkpoint in the unit, by node id, as the pathway sees it right now. */
  readonly doors: ReadonlyMap<string, LessonDoor>;
  /** The path's own unit count (lessons done of the main-line total), so the two never disagree. */
  readonly progress: { readonly done: number; readonly total: number };
  /** START on a lesson. The pathway opens its usual charge sheet ON TOP of this page. */
  readonly onStart: (gate: ChargeGateNode) => void;
  readonly onClose: () => void;
  /** True while a sheet is open above the page: its keys (Escape, Tab) belong to that sheet. */
  readonly covered: boolean;
  readonly reducedMotion: boolean;
}

/** The stage a student should land on: where they stand, else the first one not finished. */
export function openingStage(guide: UnitGuide, doors: ReadonlyMap<string, LessonDoor>): string {
  const current = guide.stages.find((stage) => stageNodes(stage).some((node) => doors.get(node)?.state === "current"));
  const unfinished = guide.stages.find((stage) => !stage.optional && stageNodes(stage).some((node) => doors.get(node)?.state !== "done"));
  return (current ?? unfinished ?? guide.stages[0]!).id;
}

function stageNodes(stage: GuideStage): readonly string[] {
  return [...stage.lessons.map((lesson) => lesson.node), ...(stage.checkpoint ? [stage.checkpoint] : [])];
}

/**
 * A stage's eyebrow in the map's words (audit 23 Oct, section 5 #11: the map
 * said "Section 2" where the guide said "Stage B", with different cuts). The
 * map sections its lessons sit in: "Section 2", "Sections 3 and 4", or
 * "Sections 1 to 3". The guide's own "Stage A" when the path gave no sections.
 */
export function stageEyebrow(stage: GuideStage, doors: ReadonlyMap<string, LessonDoor>): string {
  const numbers = [...new Set(stageNodes(stage).flatMap((node) => {
    const section = doors.get(node)?.section;
    return section === undefined ? [] : [section];
  }))].sort((a, b) => a - b);
  const first = numbers[0];
  const last = numbers[numbers.length - 1];
  if (first === undefined || last === undefined) return stage.label;
  if (first === last) return `Section ${first}`;
  return numbers.length === 2 ? `Sections ${first} and ${last}` : `Sections ${first} to ${last}`;
}

/**
 * A stage's count, by the path's rule: main-line lessons and checkpoints
 * count, side quests do not. So the stages add up to the path's "x / 18".
 */
export function stageCount(stage: GuideStage, doors: ReadonlyMap<string, LessonDoor>) {
  const nodes = stageNodes(stage);
  const main = nodes.filter((node) => doors.get(node)?.sideQuest === false);
  return {
    done: main.filter((node) => doors.get(node)?.state === "done").length,
    total: main.length,
    side: nodes.length - main.length,
  };
}

const FOCUSABLE = 'button:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])';

export function UnitGuidePage({ guide, unitLabel, unitName, doors, progress, onStart, onClose, covered, reducedMotion }: UnitGuidePageProps) {
  // The one open stage (null: all folded). A stage named in the URL wins, so
  // Back from a lesson reopens the stage the student was reading.
  const [open, setOpen] = useState<string | null>(() => {
    const spot = guideInHash();
    const named = spot?.unit === guide.unitId ? guide.stages.find((stage) => stage.id === spot.stage) : undefined;
    return named?.id ?? openingStage(guide, doors);
  });
  // Whether this page was reopened from the URL (Back, reload), read once on
  // the first render: only then does it go back to where it was scrolled.
  const [returning] = useState(() => guideInHash()?.unit === guide.unitId);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const backRef = useRef<HTMLButtonElement | null>(null);
  // Set by a tap on a fold, so the effect below scrolls only after a tap,
  // never on the first render.
  const tapped = useRef(false);

  // Put the guide and its open stage in the URL, and keep it there.
  useEffect(() => {
    writeGuideToHash({ unit: guide.unitId, stage: open });
  }, [guide.unitId, open]);

  // useLayoutEffect runs after the DOM is built but before the browser
  // paints, so a returning student never sees the page jump from the top.
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (page === null) return;
    if (returning) page.scrollTop = savedGuideScroll(guide.unitId);
    const onScroll = () => saveGuideScroll(guide.unitId, page.scrollTop);
    page.addEventListener("scroll", onScroll, { passive: true });
    return () => page.removeEventListener("scroll", onScroll);
  }, [guide.unitId, returning]);

  // After a tap opens a stage, bring its title to the top: the fold above it
  // just closed, so without this the student lands mid way down another stage.
  useEffect(() => {
    if (!tapped.current || open === null) return;
    tapped.current = false;
    pageRef.current?.querySelector(`[data-stage="${open}"]`)?.scrollIntoView({ block: "start", behavior: reducedMotion ? "auto" : "smooth" });
  }, [open, reducedMotion]);

  // Focus starts on Back, and goes back to whatever opened the page (the
  // GUIDEBOOK key) when it closes. An effect's cleanup is React's "on unmount".
  useEffect(() => {
    const active = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    // Reopened from the URL (Back, reload), nothing opened it: return focus to
    // the unit card's GUIDEBOOK key, the control that would have.
    // Looked up when the page closes, since the card may have redrawn since.
    backRef.current?.focus();
    return () => {
      const opener = active?.isConnected === true ? active : document.querySelector<HTMLElement>(".path-unitcard__guide");
      opener?.focus();
    };
  }, []);

  // Closing on purpose (Back, Escape) takes the guide out of the URL. A route
  // change (starting a lesson) closes it WITHOUT that, so the path entry the
  // browser's Back returns to still names the guide and reopens it.
  const closeAndForget = () => {
    writeGuideToHash(null);
    onClose();
  };

  // Escape closes, unless a sheet is open above the page (then Escape is the
  // sheet's). Starting a lesson changes the route, and the page goes with it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !covered) {
        event.stopPropagation();
        writeGuideToHash(null);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onClose);
    };
  }, [onClose, covered]);

  // A FOCUS TRAP: Tab off the last control wraps to the first, and Shift+Tab
  // off the first wraps to the last, so focus never leaks to the app behind.
  const trapTab = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || covered || pageRef.current === null) return;
    const all = [...pageRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = all[0];
    const last = all[all.length - 1];
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const toggle = (id: string) => {
    tapped.current = true;
    setOpen((before) => (before === id ? null : id));
  };
  // The side list only opens a stage (it never folds the open one shut).
  const goTo = (id: string) => {
    tapped.current = true;
    setOpen(id);
  };

  const dialog = (
    <div ref={pageRef} className="ug-overlay" role="dialog" aria-modal="true" aria-label={`${unitLabel} guidebook`} onKeyDown={trapTab}>
      <div className="ug-bar">
        <div className="ug-bar__in">
          <button ref={backRef} type="button" className="ug-back bb-back-disc" aria-label="Back to the path" onClick={closeAndForget}>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="ug-bar__label">{unitLabel} guidebook</span>
          {progress.total > 0 ? (
            <span className="ug-bar__count" aria-label={`${progress.done} of ${progress.total} lessons done`}>
              {progress.done} / {progress.total}
            </span>
          ) : null}
        </div>
      </div>

      <article className="ug-page" data-placeholder-copy={guide.placeholder ? "human-gate" : undefined}>
        <header className="ug-hero">
          <div className="ug-hero__text">
            <h1 className="ug-title">
              <span className="sr-only">{unitName}</span>
              <Reveal text={unitName} still={reducedMotion} />
            </h1>
            <p className="ug-intro">{guide.intro}</p>
            {guide.placeholder && showDraftMarks() ? <p className="ug-draft">{HUMAN_GATE_MARK}</p> : null}
          </div>
          <div className="ug-hero__bloom" aria-hidden>
            <Berry reducedMotion={reducedMotion} sizePx={64} />
          </div>
        </header>

        <aside className="ug-side" aria-label="Where you are">
          <UpNext guide={guide} doors={doors} onStart={onStart} />
          {/* On a wide screen: the stages as a sticky list, filling the space
              beside the reading column. Hidden on a phone, where the folds
              themselves are the list. */}
          <nav className="ug-toc" aria-label="Sections">
            {guide.stages.map((stage) => {
              const count = stageCount(stage, doors);
              return (
                <button
                  key={stage.id}
                  type="button"
                  className="ug-toc__item"
                  data-goto={stage.id}
                  aria-current={open === stage.id ? "true" : undefined}
                  onClick={() => goTo(stage.id)}
                >
                  <span className="ug-toc__eyebrow">{stageEyebrow(stage, doors)}</span>
                  <span className="ug-toc__title">{stage.title}</span>
                  <span className="ug-toc__count">{count.total > 0 ? `${count.done} / ${count.total}` : "Side quest"}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="ug-stages">
        {guide.stages.map((stage) => {
          const isOpen = open === stage.id;
          const bodyId = `ug-stage-${stage.id}`;
          const count = stageCount(stage, doors);
          return (
            <section key={stage.id} className="ug-stage" data-stage={stage.id}>
              <h2 className="ug-stage__h">
                <button type="button" className="ug-stage__toggle" aria-expanded={isOpen} aria-controls={bodyId} onClick={() => toggle(stage.id)}>
                  <span className="ug-stage__lines">
                    <span className="ug-stage__eyebrow">
                      {stageEyebrow(stage, doors)}
                      {stage.optional ? <span className="ug-tag">Side quest</span> : null}
                    </span>
                    <span className="ug-stage__title">
                      <span className="sr-only">{stage.title}</span>
                      <Reveal text={stage.title} still={reducedMotion} />
                    </span>
                  </span>
                  <span className="ug-stage__count">{count.total > 0 ? `${count.done} / ${count.total}` : `${count.side} steps`}</span>
                  <svg className="ug-stage__caret" viewBox="0 0 24 24" aria-hidden>
                    <path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </h2>
              {isOpen ? (
                <div id={bodyId} className="ug-stage__body">
                  {stage.lessons.map((lesson) => (
                    <LessonBlock key={lesson.node} lesson={lesson} example={guide.examples[lesson.node]} door={doors.get(lesson.node)} sideStage={stage.optional} onStart={onStart} />
                  ))}
                  <Mistakes stage={stage} />
                  {stage.checkpoint === null ? null : <Checkpoint node={stage.checkpoint} door={doors.get(stage.checkpoint)} onStart={onStart} />}
                </div>
              ) : null}
            </section>
          );
        })}
        </div>
      </article>
    </div>
  );
  // A PORTAL renders the page as a child of <body>, outside the path's own
  // stacking context, so it really does sit above the app header and tab bar.
  // A server render (the tests) has no document, so it renders in place.
  return typeof document === "undefined" ? dialog : createPortal(dialog, document.body);
}

/** The unit name, letter by letter, rising out of its clip (pathway.css .path-reveal). */
function Reveal({ text, still }: { readonly text: string; readonly still: boolean }) {
  return (
    <span className={`path-reveal${still ? " path-reveal--still" : ""}`} aria-hidden>
      {revealWords(text).map((word, w) => (
        <Fragment key={w}>
          {w > 0 ? " " : null}
          <span className="path-reveal__word">
            {word.map((letter) => (
              <span key={letter.index} className="path-reveal__clip">
                <span className="path-reveal__ch" style={{ "--i": letter.index } as CSSProperties}>
                  {letter.text}
                </span>
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/** An idea line with its `mark` words in colour. */
function Idea({ idea }: { readonly idea: GuideIdea }) {
  const at = idea.mark === undefined ? -1 : idea.text.indexOf(idea.mark);
  if (idea.mark === undefined || at < 0) return <>{idea.text}</>;
  return (
    <>
      {idea.text.slice(0, at)}
      <strong className="ug-hi">{idea.mark}</strong>
      {idea.text.slice(at + idea.mark.length)}
    </>
  );
}

function LessonBlock({
  lesson,
  example,
  door,
  sideStage,
  onStart,
}: {
  readonly lesson: GuideLesson;
  readonly example: GuideExample | undefined;
  readonly door: LessonDoor | undefined;
  /** The whole stage is a side quest and says so once, on its header. */
  readonly sideStage: boolean;
  readonly onStart: (gate: ChargeGateNode) => void;
}) {
  const state = door?.state ?? "locked";
  const title = door?.title ?? lesson.node;
  const [key, ...more] = lesson.ideas;
  const shut = door?.gate == null ? (door?.note ?? "Not open yet.") : null;
  return (
    <article className={`ug-lesson ug-lesson--${state}`} data-lesson={lesson.node} aria-labelledby={`ug-l-${lesson.node}`}>
      <div className="ug-lesson__head">
        <StateDot state={state} />
        <h3 id={`ug-l-${lesson.node}`} className="ug-lesson__title">
          {title}
          {door?.sideQuest && !sideStage ? <span className="ug-tag ug-tag--soft">Side quest</span> : null}
        </h3>
        {/* Never the primary key, even on the current lesson: Up next, at
            the top of the page, owns the one primary START. */}
        <LessonKey door={door} label={state === "done" ? "Again" : "Start"} primary={false} name={title} onStart={onStart} />
      </div>

      {key === undefined ? null : (
        <p className="ug-key">
          <Idea idea={key} />
        </p>
      )}

      {example === undefined ? null : <Example example={example} />}

      {more.length > 0 || shut !== null ? (
        <details className="ug-more">
          <summary>{shut === null ? "More on this" : "More on this, and why it is locked"}</summary>
          <ul className="ug-ideas">
            {more.map((idea) => (
              <li key={idea.quote}>{idea.text}</li>
            ))}
          </ul>
          {shut === null ? null : <p className="ug-shut">{shut}</p>}
        </details>
      ) : null}
    </article>
  );
}

/**
 * The lesson the student is on, with its START, at the top of the page. The
 * guide opens on the student's stage, and that stage starts with lessons
 * already done, so on a phone the current one was below the fold.
 */
function UpNext({
  guide,
  doors,
  onStart,
}: {
  readonly guide: UnitGuide;
  readonly doors: ReadonlyMap<string, LessonDoor>;
  readonly onStart: (gate: ChargeGateNode) => void;
}) {
  const node = guide.stages.flatMap(stageNodes).find((id) => doors.get(id)?.state === "current");
  const door = node === undefined ? undefined : doors.get(node);
  if (door === undefined || door.gate === null) return null;
  const gate = door.gate;
  return (
    <div className="ug-next">
      <span className="ug-next__text">
        <span className="ug-next__eyebrow">Up next</span>
        <span className="ug-next__title">{door.title}</span>
      </span>
      <Press variant="primary" size="sm" className="ug-next__go" aria-label={`Start up next: ${door.title}`} onClick={() => onStart(gate)}>
        Start
      </Press>
    </div>
  );
}

const STATE_SAID: Record<LessonDoor["state"], string> = {
  done: "Done",
  current: "Up next",
  open: "Open",
  review: "Review",
  locked: "Locked",
};

/** A small circle on the title line: a tick when done, a lock when shut, filled when it is up next. */
function StateDot({ state }: { readonly state: LessonDoor["state"] }) {
  return (
    <span className={`ug-dot ug-dot--${state}`} title={STATE_SAID[state]}>
      <span className="sr-only">{STATE_SAID[state]}: </span>
      {state === "done" ? (
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M6 12.5 10.2 16.5 18 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : state === "locked" ? (
        <svg viewBox="0 0 24 24" aria-hidden>
          <rect x="6" y="11" width="12" height="9" rx="2" fill="currentColor" />
          <path d="M9 11V8.5a3 3 0 0 1 6 0V11" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      ) : null}
    </span>
  );
}

/** START (or AGAIN) as a small key on the title line, or nothing when the lesson is shut. */
function LessonKey({
  door,
  label,
  primary,
  name,
  onStart,
}: {
  readonly door: LessonDoor | undefined;
  readonly label: string;
  readonly primary: boolean;
  readonly name: string;
  readonly onStart: (gate: ChargeGateNode) => void;
}) {
  const gate = door?.gate ?? null;
  if (gate === null) return null;
  return (
    <Press variant={primary ? "primary" : "secondary"} size="sm" className="ug-start" aria-label={`${label}: ${name}`} onClick={() => onStart(gate)}>
      {label}
    </Press>
  );
}

/**
 * One row of an example, read off its panels: what goes in (`lead`), the
 * arrow, and what comes out (`result`). A comparison or a pair of
 * contributors has no arrow, and is all result.
 */
interface SchemeRow {
  readonly lead: readonly GuidePanel[];
  readonly arrow: Extract<GuidePanel, { kind: "arrow" }> | null;
  readonly result: readonly GuidePanel[];
}

export function schemeRows(panels: readonly GuidePanel[]): SchemeRow[] {
  const rows: GuidePanel[][] = [[]];
  for (const panel of panels) {
    if (panel.kind === "break") rows.push([]);
    else rows[rows.length - 1]!.push(panel);
  }
  return rows.map((row) => {
    const at = row.map((panel) => panel.kind).lastIndexOf("arrow");
    if (at < 0) return { lead: [], arrow: null, result: row };
    return { lead: row.slice(0, at), arrow: row[at] as Extract<GuidePanel, { kind: "arrow" }>, result: row.slice(at + 1) };
  });
}

const leadKey = (row: SchemeRow) => row.lead.map((panel) => (panel.kind === "mol" ? panel.smiles : panel.kind)).join(" ");

function Example({ example }: { readonly example: GuideExample }) {
  // The caption is the drawing's accessible name. On screen the key idea
  // above already says it, and saying it twice was the clutter.
  //
  // A reaction reads DOWN the phone: what goes in, a down arrow with the
  // conditions beside it, then the product drawn large on its own line, so a
  // product never shares a cramped row. Two rows that start from the same
  // thing (cold vs warm) share that start and split into two columns.
  const rows = schemeRows(example.panels);
  const fork = rows.length > 1 && rows.every((row) => row.arrow !== null && leadKey(row) === leadKey(rows[0]!));
  return (
    <figure className="ug-example" role="img" aria-label={example.caption}>
      {fork ? (
        <>
          <Group panels={rows[0]!.lead} className="ug-lead" />
          <div className="ug-fork">
            {rows.map((row, at) => (
              <div key={at} className="ug-fork__arm">
                <DownArrow panel={row.arrow!} />
                <Group panels={row.result} className="ug-result" />
              </div>
            ))}
          </div>
        </>
      ) : (
        rows.map((row, at) => (
          <div key={at} className="ug-scheme">
            {row.lead.length > 0 ? <Group panels={row.lead} className="ug-lead" /> : null}
            {row.arrow === null ? null : <DownArrow panel={row.arrow} />}
            {/* A comparison ("A is more stable than B") stacks on a phone, so
                the relation reads as one line between the two drawings. */}
            <Group panels={row.result} className={row.result.some((panel) => panel.kind === "beats") ? "ug-result ug-result--compare" : "ug-result"} />
          </div>
        ))
      )}
    </figure>
  );
}

function Group({ panels, className }: { readonly panels: readonly GuidePanel[]; readonly className: string }) {
  return (
    <div className={className}>
      {panels.map((panel, at) => (
        <Panel key={at} panel={panel} />
      ))}
    </div>
  );
}

/** The reaction arrow, pointing down, with the reagent above the conditions to its right. */
function DownArrow({ panel }: { readonly panel: Extract<GuidePanel, { kind: "arrow" }> }) {
  return (
    <div className="ug-down">
      <svg viewBox="0 0 16 40" aria-hidden>
        <path d="M8 2v34M2.5 30 8 36l5.5-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="ug-down__text">
        <span className="ug-down__over">{panel.over}</span>
        {panel.under === undefined ? null : <span className="ug-down__under">{panel.under}</span>}
      </span>
    </div>
  );
}

function Panel({ panel }: { readonly panel: GuidePanel }) {
  switch (panel.kind) {
    case "mol":
      // --w is the drawing's own width in units; guide.css turns it into px
      // at one of two scales, so every bond on the page has one length.
      return (
        <span className={`ug-mol${panel.focus === true ? " ug-mol--focus" : ""}`} style={{ "--w": panel.figure.w } as CSSProperties}>
          <GuideMol figure={panel.figure} />
          {panel.name === undefined ? null : <span className="ug-mol__name">{panel.name}</span>}
        </span>
      );
    case "arrow":
      return <DownArrow panel={panel} />;
    case "plus":
      return <span className="ug-op" aria-hidden>+</span>;
    case "resonance":
      return (
        <span className="ug-op" aria-label="resonance">
          <svg viewBox="0 0 40 12" aria-hidden>
            <path d="M3 6h34M8 1.5 3 6l5 4.5M32 1.5 37 6l-5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    case "beats":
      return (
        <span className="ug-beats">
          <span className="ug-beats__sign" aria-hidden>
            &gt;
          </span>
          <span className="ug-beats__words">more stable than</span>
        </span>
      );
    case "break":
      return null;
    case "energy":
      return <EnergyDiagram />;
    case "ladder":
      return <Ladder panel={panel} />;
  }
}

/**
 * A generic two product reaction coordinate. It draws no particular reaction:
 * the kinetic product sits over the LOWER hump in the SHALLOWER well, the
 * thermodynamic one over the higher hump in the deeper well, which is the
 * picture the energy diagram lesson asks students to read.
 */
function EnergyDiagram() {
  return (
    <svg className="ug-energy" viewBox="0 0 240 132" role="img" aria-label="Energy diagram: the kinetic product has the lower hump, the thermodynamic product the deeper well">
      <path d="M14 8v120h220" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
      <text x="3" y="20" className="ug-energy__axis">G</text>
      {/* start, then two paths out of it */}
      <path d="M22 70h26C66 70 72 40 88 40s24 42 52 42h90" fill="none" className="ug-energy__k" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 70C70 70 80 20 102 20s34 84 66 84h62" fill="none" className="ug-energy__t" strokeWidth="3" strokeLinecap="round" />
      <text x="232" y="76" textAnchor="end" className="ug-energy__lbl ug-energy__lbl--k">Kinetic</text>
      <text x="232" y="120" textAnchor="end" className="ug-energy__lbl ug-energy__lbl--t">Thermodynamic</text>
    </svg>
  );
}

/** A pi MO ladder from the script's Huckel numbers: lowest energy at the bottom. */
function Ladder({ panel }: { readonly panel: Extract<GuidePanel, { kind: "ladder" }> }) {
  const top = 14;
  const span = 104;
  const xs = panel.levels.map((level) => level.x);
  const hi = Math.max(...xs);
  const lo = Math.min(...xs);
  // x is the Huckel coefficient on beta: larger x is LOWER energy (beta < 0).
  const yOf = (x: number) => top + ((x - lo) / (hi - lo || 1)) * span;
  return (
    <svg className="ug-ladder" viewBox="0 0 240 132" role="img" aria-label={`Pi MO ladder: HOMO ${panel.levels[panel.homo]?.name}, LUMO ${panel.levels[panel.lumo]?.name}`}>
      {panel.levels.map((level, at) => {
        const y = yOf(level.x);
        const tag = at === panel.homo ? "HOMO" : at === panel.lumo ? "LUMO" : null;
        return (
          <g key={level.name}>
            <text x="16" y={y + 5} className="ug-ladder__name">{level.name}</text>
            <line x1="52" y1={y} x2="120" y2={y} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            {level.electrons >= 1 ? <path d={`M76 ${y + 9}v-18M72 ${y - 5}l4-4 4 4`} className="ug-ladder__e" fill="none" strokeWidth="2" strokeLinecap="round" /> : null}
            {level.electrons >= 2 ? <path d={`M96 ${y - 9}v18M92 ${y + 5}l4 4 4-4`} className="ug-ladder__e" fill="none" strokeWidth="2" strokeLinecap="round" /> : null}
            <text x="130" y={y + 5} className="ug-ladder__nodes">
              {plural(level.nodes, "node", "nodes")}
            </text>
            {tag === null ? null : (
              <text x="196" y={y + 5} className={`ug-ladder__tag ug-ladder__tag--${tag.toLowerCase()}`}>
                {tag}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Mistakes({ stage }: { readonly stage: GuideStage }) {
  return (
    <aside className="ug-tip" aria-label={`${stage.title}: watch out for`}>
      <h3 className="ug-tip__h">Watch out</h3>
      <ul className="ug-tip__list">
        {stage.mistakes.map((item) => (
          <li key={item.mistake}>
            <span className="ug-tip__bad">
              <span className="sr-only">Mistake: </span>
              {item.mistake}
            </span>{" "}
            <span className="ug-tip__fix">
              <span className="sr-only">Fix: </span>
              {item.fix}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function Checkpoint({
  node,
  door,
  onStart,
}: {
  readonly node: string;
  readonly door: LessonDoor | undefined;
  readonly onStart: (gate: ChargeGateNode) => void;
}) {
  const title = door?.title ?? node;
  return (
    <div className="ug-check" data-lesson={node}>
      <span className="ug-check__icon" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d="M6 3v18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M7 4h11l-2.5 4L18 12H7z" fill="currentColor" />
        </svg>
      </span>
      <div className="ug-check__text">
        <p className="ug-check__eyebrow">Checkpoint</p>
        <p className="ug-check__title">{title}</p>
        {door?.gate == null ? <p className="ug-shut">{door?.note ?? "Not open yet."}</p> : null}
      </div>
      <LessonKey door={door} label={door?.state === "done" ? "Again" : "Take it"} primary={door?.state === "current"} name={title} onStart={onStart} />
    </div>
  );
}
