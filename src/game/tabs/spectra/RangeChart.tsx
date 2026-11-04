/**
 * The range chart: where IR, 1H and 13C peaks land, and why. Owner brief, 3 Nov 2026: real
 * estimates, not a glossary; boxes on the axis with a representative molecule in each, how
 * withdrawing and donating neighbours move a range, broad or sharp marked, the fingerprint
 * region greyed, a short side panel on click, a chart beside the graph, and ranges a student
 * can edit (saved on this device) with a way back to the default.
 *
 * Every number comes from rangeChart.generated.ts (textbook range table, cited in
 * scripts/gen_spectra.py); every molecule and highlight is drawn by RDKit there.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { RANGE_BOXES } from "./rangeChart.generated";
import {
  FINGERPRINT_CM,
  RANGE_AXES,
  cardCentre,
  cleanRange,
  effective,
  formatRange,
  formatValue,
  fracOf,
  isFingerprint,
  loadEdits,
  packLanes,
  saveEdits,
  shiftDirection,
  ticks,
  valueAt,
  withEdit,
  withoutEdit,
  type RangeEdits,
} from "./rangeModel";
import type { RangeBox, RangeMode, RangeShift } from "./rangeTypes";
import "./rangeChart.css";

const CARD_PX = 92;
const DEFAULT_PICK: Record<RangeMode, string> = { ir: "ir-oh", h1: "h-ar", c13: "c-ketone" };
const SHIFT_KIND: Record<RangeShift["kind"], string> = {
  ewg: "Withdrawing neighbour",
  edg: "Donating neighbour",
  conj: "Conjugation",
  strain: "Ring strain",
  hbond: "Less hydrogen bonding",
};

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

const pct = (f: number) => `${(f * 100).toFixed(3)}%`;

function shapeWords(box: RangeBox): string {
  const s = box.shape === "broad" ? "Broad" : "Sharp";
  return box.strength === undefined ? s : `${s}, ${box.strength}`;
}

function Molecule({ svg, className }: { readonly svg: string; readonly className?: string }) {
  return <span className={className ?? "rc-mol"} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function RangeChart({ mode }: { readonly mode: RangeMode }) {
  const boxes = useMemo(() => RANGE_BOXES.filter((b) => b.mode === mode).slice().sort((a, b) => b.hi - a.hi || b.lo - a.lo), [mode]);
  const [picked, setPicked] = useState<Record<RangeMode, string>>(DEFAULT_PICK);
  const [edits, setEdits] = useState<RangeEdits>(() => loadEdits(storage()));
  const [plotPx, setPlotPx] = useState(960);
  const plotRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const axis = RANGE_AXES[mode];
  const selected = boxes.find((b) => b.id === picked[mode]) ?? boxes[0];

  useEffect(() => saveEdits(storage(), edits), [edits]);

  useLayoutEffect(() => {
    const el = plotRef.current;
    if (el === null) return;
    const measure = () => setPlotPx(el.clientWidth || 960);
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const cardFrac = CARD_PX / plotPx;
  // Lanes come from the DEFAULT ranges so the layout holds still while a student drags an edge.
  const lanes = useMemo(() => packLanes(boxes, mode, cardFrac), [boxes, mode, cardFrac]);
  const laneCount = Math.max(1, ...[...lanes.values()].map((l) => l + 1));
  const shiftRows = Math.max(1, ...boxes.map((b) => b.shifts.length));

  const pick = useCallback(
    (id: string) => {
      setPicked((p) => ({ ...p, [mode]: id }));
      // Bring the box into view inside the sideways scroller only; never scroll the page.
      const sc = scrollRef.current;
      const box = boxes.find((b) => b.id === id);
      if (sc !== null && box !== undefined && sc.scrollWidth > sc.clientWidth + 1) {
        const centre = ((fracOf(mode, box.hi) + fracOf(mode, box.lo)) / 2) * sc.scrollWidth;
        const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        sc.scrollTo({ left: Math.max(0, centre - sc.clientWidth / 2), behavior: reduce ? "auto" : "smooth" });
      }
    },
    [boxes, mode],
  );

  // On first paint (and on a mode change) show the picked box on a phone.
  useEffect(() => {
    pick(picked[mode]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const setRange = (box: RangeBox, a: number, b: number) => setEdits((e) => withEdit(e, box, cleanRange(mode, a, b)));

  // Dragging an edge of the selected box.
  const drag = useRef<{ edge: "hi" | "lo"; box: RangeBox } | null>(null);
  const valueFromPointer = (clientX: number): number => {
    const r = plotRef.current?.getBoundingClientRect();
    if (r === undefined || r.width === 0) return axis.max;
    return valueAt(mode, (clientX - r.left) / r.width);
  };
  const onHandleDown = (edge: "hi" | "lo", box: RangeBox) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { edge, box };
  };
  const onHandleMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d === null) return;
    const cur = effective(d.box, edits);
    const v = valueFromPointer(e.clientX);
    if (d.edge === "hi") setRange(d.box, Math.max(v, cur.lo + axis.snap * 2), cur.lo);
    else setRange(d.box, cur.hi, Math.min(v, cur.hi - axis.snap * 2));
  };
  const onHandleUp = () => {
    drag.current = null;
  };
  const onHandleKey = (edge: "hi" | "lo", box: RangeBox) => (e: ReactKeyboardEvent) => {
    const step = axis.snap * (e.shiftKey ? 10 : 1);
    // The axis runs high to low, so ArrowLeft makes the number bigger.
    const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? step : e.key === "ArrowRight" || e.key === "ArrowDown" ? -step : 0;
    if (delta === 0) return;
    e.preventDefault();
    const cur = effective(box, edits);
    if (edge === "hi") setRange(box, Math.max(cur.hi + delta, cur.lo + axis.snap * 2), cur.lo);
    else setRange(box, cur.hi, Math.min(cur.lo + delta, cur.hi - axis.snap * 2));
  };

  const sel = effective(selected, edits);
  const editedCount = boxes.filter((b) => edits[b.id] !== undefined).length;
  const fpLeft = fracOf(mode, FINGERPRINT_CM);
  const unitLabel = mode === "ir" ? "Wavenumber, cm⁻¹" : "Chemical shift, ppm";

  return (
    <div className="rc-layout" data-mode={mode}>
      <section className="rc-graph-card" aria-label={`${mode === "ir" ? "IR" : mode === "h1" ? "1H NMR" : "13C NMR"} range graph`}>
        <div className="rc-scroll" ref={scrollRef}>
          <div className="rc-plot" ref={plotRef} style={{ ["--lanes" as string]: laneCount, ["--shift-rows" as string]: shiftRows }}>
            {mode === "ir" ? (
              <div className="rc-fp" style={{ left: pct(fpLeft) }} aria-hidden="true">
                <span>Fingerprint region, greyed: compare, don’t read</span>
              </div>
            ) : null}
            {ticks(mode).map((t) => (
              <div key={t} className="rc-grid" style={{ left: pct(fracOf(mode, t)) }} aria-hidden="true" />
            ))}

            <div className="rc-lanes">
              {boxes.map((box) => {
                const r = effective(box, edits);
                const left = fracOf(mode, r.hi);
                const right = fracOf(mode, r.lo);
                const dl = fracOf(mode, box.hi);
                const dr = fracOf(mode, box.lo);
                const centre = cardCentre(dl, dr, cardFrac);
                const lane = lanes.get(box.id) ?? 0;
                const on = box.id === selected.id;
                const fp = isFingerprint(box);
                return (
                  <div key={box.id} className="rc-item" data-family={box.family} data-on={on} data-fp={fp} style={{ ["--lane" as string]: lane }}>
                    <button
                      type="button"
                      className="rc-card"
                      style={{ left: pct(centre) }}
                      aria-pressed={on}
                      aria-label={`${box.title}, ${formatRange(mode, r)} ${axis.unit}, ${shapeWords(box).toLowerCase()}${fp ? ", fingerprint region" : ""}`}
                      onClick={() => pick(box.id)}
                    >
                      <Molecule svg={box.example.svg} />
                      <span className="rc-card-label">
                        <b>{box.label}</b>
                      </span>
                    </button>
                    <div className="rc-bar" data-shape={box.shape} style={{ left: pct(left), width: pct(Math.max(right - left, 0.002)) }} aria-hidden="true">
                      {mode === "ir" ? <span className="rc-peak" /> : null}
                      {box.shape === "broad" && (right - left) * plotPx >= 48 ? <span className="rc-bar-tag">broad</span> : null}
                    </div>
                    {on ? (
                      <>
                        {(["hi", "lo"] as const).map((edge) => (
                          <span
                            key={edge}
                            role="slider"
                            tabIndex={0}
                            className="rc-handle"
                            data-edge={edge}
                            style={{ left: pct(edge === "hi" ? left : right) }}
                            aria-label={`${edge === "hi" ? "High" : "Low"} end of ${box.title}`}
                            aria-valuemin={axis.min}
                            aria-valuemax={axis.max}
                            aria-valuenow={edge === "hi" ? r.hi : r.lo}
                            aria-valuetext={`${formatValue(mode, edge === "hi" ? r.hi : r.lo)} ${axis.unit}`}
                            onPointerDown={onHandleDown(edge, box)}
                            onPointerMove={onHandleMove}
                            onPointerUp={onHandleUp}
                            onPointerCancel={onHandleUp}
                            onKeyDown={onHandleKey(edge, box)}
                          >
                            <i />
                          </span>
                        ))}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="rc-shifts" data-family={selected.family} aria-label="How neighbours move the selected range">
              {selected.shifts.length === 0 ? (
                <p className="rc-shift-empty" style={{ left: pct(Math.min(Math.max(fracOf(mode, sel.hi), 0.02), 0.6)) }}>
                  {selected.label}: no common neighbour moves this range much.
                </p>
              ) : (
                <>
                  <div className="rc-shift-guide" style={{ left: pct(fracOf(mode, sel.hi)), width: pct(fracOf(mode, sel.lo) - fracOf(mode, sel.hi)) }} aria-hidden="true" />
                  {selected.shifts.map((s, i) => {
                    const l = fracOf(mode, s.hi);
                    const r = fracOf(mode, s.lo);
                    const up = (s.hi + s.lo) / 2 > (sel.hi + sel.lo) / 2;
                    const textLeft = r < 0.62;
                    return (
                      <div key={s.label} className="rc-ghost-row" style={{ ["--row" as string]: i }} data-kind={s.kind}>
                        <div className="rc-ghost" style={{ left: pct(l), width: pct(Math.max(r - l, 0.004)) }} />
                        <span className="rc-ghost-text" style={textLeft ? { left: `calc(${pct(r)} + 0.5rem)` } : { right: `calc(${pct(1 - l)} + 0.5rem)` }}>
                          {up ? "← " : "→ "}
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="rc-axis" aria-hidden="true">
              {ticks(mode).map((t) => (
                <span key={t} className="rc-tick" style={{ left: pct(fracOf(mode, t)) }}>
                  {t}
                </span>
              ))}
            </div>
            <div className="rc-regions" aria-hidden="true">
              {mode === "ir" ? (
                <>
                  <span>← Stiffer bonds, lighter atoms</span>
                  <span>{unitLabel}</span>
                  <span>Weaker bonds, heavier atoms →</span>
                </>
              ) : (
                <>
                  <span>← Deshielded (downfield)</span>
                  <span>{unitLabel}</span>
                  <span>Shielded (upfield) →</span>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="rc-note">
          Every range is an <strong>estimate</strong> from a standard textbook table; real peaks can sit outside it. Drag the edges of the picked box, or type numbers, to keep your own version on this device.
        </p>
      </section>

      <aside className="rc-side">
        <section className="rc-panel" aria-live="polite" aria-label="Selected range" data-family={selected.family} data-fp={isFingerprint(selected)}>
          <div className="rc-panel-head">
            <span className="rc-chip">{selected.label}</span>
            <div>
              <p className="rc-kicker">{selected.title}</p>
              <h3>{selected.represents}</h3>
            </div>
          </div>
          <dl className="rc-facts">
            <div>
              <dt>Range</dt>
              <dd>
                {formatRange(mode, sel)} {axis.unit}
                {sel.edited ? <small> yours (default {formatRange(mode, selected)})</small> : null}
              </dd>
            </div>
            {mode === "c13" ? null : (
              <div>
                <dt>Peak</dt>
                <dd>{shapeWords(selected)}</dd>
              </div>
            )}
          </dl>
          {isFingerprint(selected) ? <p className="rc-fp-note">Fingerprint region: use it only to back up a group you found above 1500.</p> : null}
          <p className="rc-why">{selected.why}</p>
          <figure className="rc-example">
            <Molecule svg={selected.example.svg} className="rc-mol rc-mol--big" />
            <figcaption>
              {selected.example.name}
              {selected.example.estimate !== undefined ? <small>Estimate for the highlighted {mode === "h1" ? "H" : "C"}: {formatValue(mode, selected.example.estimate)} ppm</small> : null}
            </figcaption>
          </figure>
          {selected.shifts.length > 0 ? (
            <div className="rc-shift-list">
              <h4>What moves it</h4>
              <ul>
                {selected.shifts.map((s) => (
                  <li key={s.label} data-kind={s.kind}>
                    <div>
                      <b>{s.label}</b>
                      <span className="rc-shift-meta">
                        {SHIFT_KIND[s.kind]} · {shiftDirection(mode, selected, s)} · {formatRange(mode, s)} {axis.unit}
                      </span>
                      <span>{s.why}</span>
                    </div>
                    {s.example !== undefined ? <Molecule svg={s.example.svg} className="rc-mol rc-mol--small" /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rc-edit">
            <label>
              <span>High</span>
              <input
                key={`hi-${selected.id}-${sel.hi}`}
                inputMode="decimal"
                defaultValue={formatValue(mode, sel.hi)}
                aria-label={`High end of ${selected.title}, ${axis.unit}`}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value.trim() !== "" && Number.isFinite(n)) setRange(selected, n, sel.lo);
                  else e.target.value = formatValue(mode, sel.hi);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </label>
            <label>
              <span>Low</span>
              <input
                key={`lo-${selected.id}-${sel.lo}`}
                inputMode="decimal"
                defaultValue={formatValue(mode, sel.lo)}
                aria-label={`Low end of ${selected.title}, ${axis.unit}`}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (e.target.value.trim() !== "" && Number.isFinite(n)) setRange(selected, sel.hi, n);
                  else e.target.value = formatValue(mode, sel.lo);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
              />
            </label>
            <button type="button" className="pt-btn pt-btn--small" disabled={!sel.edited} onClick={() => setEdits((e) => withoutEdit(e, selected.id))}>
              Reset to default
            </button>
          </div>
        </section>

        <section className="rc-table-card" aria-label="All ranges">
          <table className="rc-table">
            <thead>
              <tr>
                <th scope="col">Group</th>
                <th scope="col">{axis.unit}</th>
                {mode === "c13" ? null : <th scope="col">Peak</th>}
              </tr>
            </thead>
            <tbody>
              {boxes.map((box) => {
                const r = effective(box, edits);
                const on = box.id === selected.id;
                return (
                  <tr key={box.id} data-on={on} data-fp={isFingerprint(box)} data-family={box.family}>
                    <th scope="row">
                      <button type="button" className="rc-row-btn" aria-pressed={on} onClick={() => pick(box.id)}>
                        <span className="rc-swatch" aria-hidden="true" />
                        <span>{box.title}</span>
                      </button>
                    </th>
                    <td>
                      {formatRange(mode, r)}
                      {r.edited ? <small className="rc-edited">edited</small> : null}
                    </td>
                    {mode === "c13" ? null : <td>{box.shape}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="pt-btn pt-btn--small rc-reset-all" disabled={editedCount === 0} onClick={() => setEdits((e) => boxes.reduce((acc, b) => withoutEdit(acc, b.id), e))}>
            Reset all {mode === "ir" ? "IR" : mode === "h1" ? "1H" : "13C"} ranges
          </button>
        </section>
      </aside>
    </div>
  );
}
