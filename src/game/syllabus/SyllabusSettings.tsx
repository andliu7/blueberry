/**
 * Me, Settings, Syllabus (STATUS C1): #/app/me/settings/syllabus.
 *
 * The student pastes their Orgo II syllabus (or picks a .txt or .md file),
 * presses Read, and sees the order Blueberry proposes, grouped by unit, with
 * every topic it was not sure of at the top. They answer those flags, move
 * units and sections up or down (the order START walks), set a unit's week
 * (its map chip), mark a unit, section or single lesson not covered, set the
 * first day of Week 1 when the syllabus gives no dates, and switch side
 * quests on for the checkpoint, section test and unit exam. Save writes the
 * plan (syllabusPlan.ts); the map then shows each unit's week and START
 * follows it.
 *
 * Opened through React.lazy from MeTab, so the parser, the aliases and this
 * screen load only here, never on the game's first open. It renders inside
 * the Me tab, which loads tabs/me/me.css, so it borrows those cards.
 */
import { useId, useMemo, useReducer, useState, useSyncExternalStore, type ReactNode } from "react";
import { PATHWAY_UNITS, unitName, unitNumber } from "../demo/pathwayMap";
import { unitSections } from "../tabs/pathway/testOuts";
import { syllabusEdit, type EditState } from "./syllabusEdit";
import { accepted, isFlagged, matchLines, unitCandidate } from "./syllabusMatch";
import { parseSyllabus } from "./syllabusParse";
import { sectionKey, syllabusStore, type SyllabusPlan } from "./syllabusPlan";
import { needsTermStart, sanitisePlan, shortDate, weekOfUnit } from "./syllabusWeeks";
import { getSyllabusSyncStatus, subscribeSyllabusSyncStatus, type SyllabusSyncStatus } from "./syllabusSync";

const SYNC_LINE: Readonly<Record<SyllabusSyncStatus, string>> = {
  account: "Saved to your account.",
  syncing: "Saved on this device.",
  device: "Saved on this device.",
  idle: "Saved on this device. Sign in to keep it on every device.",
};

/** The same plan, whenever it was stamped: compared as sorted JSON without updatedAt. */
function same(a: SyllabusPlan | null, b: SyllabusPlan | null): boolean {
  const key = (plan: SyllabusPlan | null) => (plan === null ? "null" : JSON.stringify({ ...plan, updatedAt: 0, termStart: plan.termStart ?? null }, (_k, v: unknown) => (v !== null && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => (x < y ? -1 : 1))) : v)));
  return key(a) === key(b);
}

function label(unitId: string): string {
  const unit = PATHWAY_UNITS.find((entry) => entry.id === unitId);
  return unit === undefined ? unitId : `${unitNumber(unit.title)}: ${unitName(unit.title)}`;
}

function Card({ children, title }: { readonly children: ReactNode; readonly title: string }) {
  return (
    <section className="me-card">
      <h2 className="me-h2">{title}</h2>
      {children}
    </section>
  );
}

/** Up and down buttons for one row of a list. */
function Mover({ name, first, last, onMove }: { readonly name: string; readonly first: boolean; readonly last: boolean; readonly onMove: (by: -1 | 1) => void }) {
  return (
    <span className="flex shrink-0 gap-1">
      <button type="button" className="btn3d btn3d--secondary btn3d--sm" disabled={first} aria-label={`Move ${name} up`} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button type="button" className="btn3d btn3d--secondary btn3d--sm" disabled={last} aria-label={`Move ${name} down`} onClick={() => onMove(1)}>
        ↓
      </button>
    </span>
  );
}

export default function SyllabusSettings() {
  const stored = useSyncExternalStore(syllabusStore.subscribe, syllabusStore.getSnapshot);
  // useMemo: sanitise (known ids only) once per stored value, not on every render.
  const saved = useMemo(() => (stored === null ? null : sanitisePlan(stored)), [stored]);
  const sync = useSyncExternalStore(subscribeSyllabusSyncStatus, getSyllabusSyncStatus);
  // useReducer: every adjustment is one action through syllabusEdit.ts, so the
  // screen and its tests run the same pure steps. The third argument builds
  // the first state once, from the saved plan.
  const [state, send] = useReducer(syllabusEdit, saved, (plan): EditState => ({ rows: [], plan }));
  // The saved plan can change while the screen is open (account sync adopts a
  // newer one). Keeping the last one seen and comparing during render is
  // React's "adjust state when a prop changes" pattern: no effect, no flash.
  // The new plan is shown only when the student has no unsaved edits.
  const [seen, setSeen] = useState(saved);
  if (saved !== seen) {
    setSeen(saved);
    if (state.rows.length === 0 && same(state.plan, seen)) send({ type: "load", plan: saved });
  }
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  // Any edit after a save clears the "Saved" line, so "Not saved yet" can show.
  const dispatch: Dispatch = (action) => {
    setNotice(null);
    send(action);
  };
  const fieldId = useId();
  const fileId = useId();

  const read = () => {
    dispatch({ type: "read", rows: matchLines(parseSyllabus(draft)) });
  };

  const pickFile = (file: File | undefined) => {
    if (file === undefined) return;
    const reader = new FileReader();
    reader.onload = () => setDraft(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  };

  const save = () => {
    syllabusStore.replace(state.plan);
    setNotice("Saved. Your path follows this order now.");
  };

  const clear = () => {
    syllabusStore.replace(null);
    send({ type: "clear" });
    setDraft("");
    setNotice("Cleared. Your path is back to Blueberry's order.");
  };

  const plan = state.plan;
  const unsaved = plan !== null && same(plan, saved) === false;

  return (
    <div className="flex flex-col gap-4">
      <Card title="Paste your syllabus">
        <label htmlFor={fieldId} className="mt-1 block text-scale-sm me-muted">
          Copy the schedule from your syllabus and paste it here. Blueberry matches each week's topics to its units and asks
          about anything it is not sure of. Only the plan is saved, not the text.
        </label>
        <textarea
          id={fieldId}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          rows={6}
          spellCheck={false}
          placeholder={"Week 3: Aromaticity, Huckel\nOct 14  Exam 2: Ch 15-17"}
          className="mt-3 w-full rounded-2xl border-2 border-bb-input bg-bb-card px-3 py-2 text-scale-base"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" disabled={draft.trim() === ""} onClick={read} className="btn3d btn3d--primary">
            Read my syllabus
          </button>
          <label htmlFor={fileId} className="btn3d btn3d--secondary">
            Choose a .txt file
          </label>
          <input id={fileId} type="file" accept=".txt,.md,text/plain,text/markdown" className="sr-only" onChange={(event) => pickFile(event.currentTarget.files?.[0])} />
        </div>
        <p className="mt-2 text-scale-sm me-muted">A PDF? Open it, select the schedule, copy and paste.</p>
      </Card>

      {plan === null ? null : <Flags state={state} dispatch={dispatch} />}
      {plan === null || !needsTermStart(plan) ? null : <TermStart plan={plan} dispatch={dispatch} />}
      {plan === null ? null : <Order plan={plan} dispatch={dispatch} />}
      {plan === null || plan.exams.length === 0 ? null : <Exams plan={plan} />}

      <section className="me-card">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn3d btn3d--primary" disabled={plan === null || !unsaved} onClick={save}>
            Save my syllabus
          </button>
          <button type="button" className="btn3d btn3d--secondary" disabled={plan === null && saved === null} onClick={clear}>
            Clear
          </button>
        </div>
        <p className="mt-2 text-scale-sm me-muted">{saved === null ? "Nothing saved yet. Your path uses Blueberry's order." : SYNC_LINE[sync]}</p>
        <div role="status" aria-live="polite">
          {notice === null ? null : <p className="mt-2 text-scale-sm font-semibold">{notice}</p>}
          {plan !== null && unsaved && notice === null ? <p className="mt-2 text-scale-sm font-semibold">Not saved yet.</p> : null}
        </div>
      </section>
    </div>
  );
}

type Dispatch = (action: Parameters<typeof syllabusEdit>[1]) => void;

/** Every topic Blueberry was not sure of, first, so nothing low-confidence slips into the order unseen. */
function Flags({ state, dispatch }: { readonly state: EditState; readonly dispatch: Dispatch }) {
  const flags = state.rows.flatMap((row, at) => row.matches.flatMap((match, topic) => (isFlagged(row, match) ? [{ row, at, match, topic }] : [])));
  const answered = state.rows.flatMap((row, at) => row.matches.flatMap((match, topic) => (match.chosen !== undefined ? [{ row, at, match, topic }] : [])));
  if (flags.length === 0 && answered.length === 0) return null;
  return (
    <Card title={flags.length === 0 ? "All checked" : `Check these (${flags.length})`}>
      {flags.length === 0 ? null : <p className="mt-1 text-scale-sm me-muted">Not sure about these lines. Pick the unit each one teaches, or mark it not covered.</p>}
      <ul className="mt-3 flex flex-col gap-3">
        {flags.map(({ row, at, match, topic }) => (
          <li key={`${at}-${topic}`} className="rounded-[12px] border-2 border-bb-border p-3" data-flag="true">
            <p className="text-scale-sm me-muted">{row.line.raw}</p>
            <p className="mt-1 font-bold">{match.topic}</p>
            {match.best === null ? null : <p className="text-scale-sm me-muted">{`Best guess: ${label(match.best.unitId)}`}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                aria-label={`Pick a unit for ${match.topic}`}
                className="min-h-11 w-full min-w-0 rounded-2xl border-2 border-bb-input bg-bb-card px-3 text-scale-sm"
                value=""
                onChange={(event) => {
                  const unitId = event.currentTarget.value;
                  if (unitId === "") return;
                  const exact = match.candidates.find((candidate) => candidate.unitId === unitId);
                  dispatch({ type: "resolve", row: at, topic, choice: exact !== undefined ? { ...exact, confidence: 1, explicit: true } : unitCandidate(unitId) });
                }}
              >
                <option value="">Not sure: pick a unit</option>
                {PATHWAY_UNITS.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {label(unit.id)}
                  </option>
                ))}
              </select>
              <button type="button" className="btn3d btn3d--ghost btn3d--sm" onClick={() => dispatch({ type: "resolve", row: at, topic, choice: "not-covered" })}>
                Not covered
              </button>
            </div>
          </li>
        ))}
      </ul>
      {answered.length === 0 ? null : (
        <p className="mt-3 text-scale-sm me-muted">
          {`You answered ${answered.length}: `}
          {answered.map(({ match }) => `${match.topic} (${match.chosen === "not-covered" ? "not covered" : label(accepted(match)?.unitId ?? "")})`).join(", ")}
        </p>
      )}
    </Card>
  );
}

/** The first day of Week 1, for a syllabus that numbers its weeks but gives no dates. */
function TermStart({ plan, dispatch }: { readonly plan: SyllabusPlan; readonly dispatch: Dispatch }) {
  const id = useId();
  return (
    <Card title="When does Week 1 start?">
      <label htmlFor={id} className="mt-1 block text-scale-sm me-muted">
        Your syllabus numbers its weeks but gives no dates, so Blueberry cannot tell which week it is. Set the first day of
        Week 1 and START follows the week. Without it, START walks your order from the top.
      </label>
      <input
        id={id}
        type="date"
        value={plan.termStart ?? ""}
        onChange={(event) => dispatch({ type: "setTermStart", date: event.currentTarget.value === "" ? null : event.currentTarget.value })}
        className="mt-3 min-h-11 rounded-2xl border-2 border-bb-input bg-bb-card px-3 text-scale-base"
      />
    </Card>
  );
}

/** Week 1 to the syllabus's last week (at least 16), for the week picker. */
function weekChoices(plan: SyllabusPlan): number[] {
  const last = Math.max(16, ...plan.weeks.map((week) => week.week));
  return Array.from({ length: last }, (_, at) => at + 1);
}

/** The units in the student's order, each with its sections and side quests behind a disclosure. */
function Order({ plan, dispatch }: { readonly plan: SyllabusPlan; readonly dispatch: Dispatch }) {
  const missing = PATHWAY_UNITS.filter((unit) => !plan.unitOrder.includes(unit.id));
  return (
    <>
      <Card title="Your order">
        <p className="mt-1 text-scale-sm me-muted">
          Up and down set the order START walks once this week's unit is done. The week sets the chip a unit wears on the map.
          The map itself keeps Blueberry's order.
        </p>
        {plan.unitOrder.length === 0 ? <p className="mt-1 text-scale-sm">No units matched yet. Answer the lines above, or add units below.</p> : null}
        <ol className="mt-3 flex flex-col gap-3">
          {plan.unitOrder.map((unitId, at) => {
            const unit = PATHWAY_UNITS.find((entry) => entry.id === unitId)!;
            const off = plan.notCovered.includes(unitId);
            const week = weekOfUnit(plan, unitId);
            const order = plan.sectionOrder[unitId] ?? unitSections(unit).map((section) => section.number);
            const sections = unitSections(unit);
            const quests = unit.nodes.filter((node) => node.kind === "branch" && node.playable !== undefined);
            return (
              <li key={unitId} className="rounded-[12px] border-2 border-bb-border p-3" data-unit={unitId} data-off={off ? "true" : "false"}>
                <div className="flex items-center gap-2">
                  <span className="me-chip" data-tone={off ? undefined : "primary"}>
                    {off ? "Not covered" : week === null ? "No week" : `Week ${week}`}
                  </span>
                  <span className={`min-w-0 flex-1 font-bold leading-snug ${off ? "me-muted line-through" : ""}`}>{label(unitId)}</span>
                  <Mover name={unitNumber(unit.title)} first={at === 0} last={at === plan.unitOrder.length - 1} onMove={(by) => dispatch({ type: "moveUnit", unitId, by })} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" className="btn3d btn3d--ghost btn3d--sm" aria-pressed={off} onClick={() => dispatch({ type: "toggleCovered", key: unitId })}>
                    {off ? "Put back on my syllabus" : "Not covered"}
                  </button>
                  <select
                    aria-label={`Week for ${unitNumber(unit.title)}`}
                    className="min-h-11 min-w-0 rounded-2xl border-2 border-bb-input bg-bb-card px-3 text-scale-sm"
                    value={week === null ? "" : String(week)}
                    onChange={(event) => dispatch({ type: "assignWeek", unitId, week: event.currentTarget.value === "" ? null : Number(event.currentTarget.value) })}
                  >
                    <option value="">No week</option>
                    {weekChoices(plan).map((number) => (
                      <option key={number} value={number}>{`Week ${number}`}</option>
                    ))}
                  </select>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-scale-sm font-semibold">Sections{quests.length > 0 ? " and side quests" : ""}</summary>
                  <ul className="mt-2 flex flex-col gap-2">
                    {order.map((number, i) => {
                      const section = sections.find((entry) => entry.number === number);
                      if (section === undefined) return null;
                      const key = sectionKey(unitId, number);
                      const covered = !plan.notCovered.includes(key);
                      const lessons = section.sources.flatMap((id) => unit.nodes.filter((node) => node.id === id));
                      return (
                        <li key={key}>
                          <div className="flex items-center gap-2">
                            <label className="flex min-w-0 flex-1 items-center gap-2 text-scale-sm">
                              <input type="checkbox" checked={covered} onChange={() => dispatch({ type: "toggleCovered", key })} />
                              <span className={covered ? "" : "me-muted line-through"}>{`Section ${number}: ${section.title}`}</span>
                            </label>
                            <Mover name={`Section ${number}`} first={i === 0} last={i === order.length - 1} onMove={(by) => dispatch({ type: "moveSection", unitId, section: number, by })} />
                          </div>
                          {/* One lesson in or out, for a course that skips a single topic. Off with its section. */}
                          <ul className="ml-7 mt-1 flex flex-col gap-1">
                            {lessons.map((node) => {
                              const on = covered && !plan.notCovered.includes(node.id);
                              return (
                                <li key={node.id}>
                                  <label className="flex items-center gap-2 text-scale-sm">
                                    <input type="checkbox" checked={on} disabled={!covered} onChange={() => dispatch({ type: "toggleCovered", key: node.id })} />
                                    <span className={on ? "" : "me-muted line-through"}>{node.title}</span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                  {quests.length === 0 ? null : (
                    <>
                      <p className="mt-3 text-scale-sm font-semibold">Side quests: count on the checkpoint, section test and unit exam</p>
                      <ul className="mt-1 flex flex-col gap-1">
                        {quests.map((node) => (
                          <li key={node.id}>
                            <label className="flex items-center gap-2 text-scale-sm">
                              <input type="checkbox" role="switch" checked={plan.sideQuests.includes(node.id)} onChange={() => dispatch({ type: "toggleSideQuest", nodeId: node.id })} />
                              {node.title}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </details>
              </li>
            );
          })}
        </ol>
      </Card>
      {missing.length === 0 ? null : (
        <Card title="Not on your syllabus">
          <p className="mt-1 text-scale-sm me-muted">Still playable on the map. Add any your course teaches.</p>
          <ul className="mt-2 flex flex-col gap-2">
            {missing.map((unit) => (
              <li key={unit.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-scale-sm">{label(unit.id)}</span>
                <button type="button" className="btn3d btn3d--secondary btn3d--sm" aria-label={`Add ${unitNumber(unit.title)}`} onClick={() => dispatch({ type: "addUnit", unitId: unit.id })}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Exams({ plan }: { readonly plan: SyllabusPlan }) {
  return (
    <Card title="Exams">
      <ul className="mt-2 flex flex-col gap-1">
        {plan.exams.map((exam, at) => (
          <li key={at} className="text-scale-sm">
            <span className="font-bold">{exam.date === null ? exam.title : `${exam.title}, ${shortDate(exam.date)}`}</span>
            {exam.unitIds.length === 0 ? null : `: ${exam.unitIds.map((id) => unitNumber(PATHWAY_UNITS.find((unit) => unit.id === id)?.title ?? id)).join(", ")}`}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-scale-sm me-muted">The map marks the units due before your next exam. Your Charge exam date setting is not changed.</p>
    </Card>
  );
}
