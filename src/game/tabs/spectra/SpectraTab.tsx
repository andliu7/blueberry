/**
 * The NMR and IR reference tool, built to sit beside the periodic table: same sheet, same
 * lipped buttons, same sliding switch, same wheel and button zoom habit.
 *
 * What it does:
 *  - 1H, 13C and IR, drawn from a predicted peak list for an example compound (RDKit-derived,
 *    scripts/gen_spectra.py; an additive-rule estimate, not a measurement, and labelled so).
 *  - DRAG ON THE SPECTRUM to select a range (nmrdb's gesture), or type the two numbers. The
 *    range is shaded, the peaks inside it are listed, and the class-handout ranges it overlaps
 *    are shown as chips you can tap to jump to.
 *  - Scroll wheel zooms around the pointer, plus, minus, "To selection" and Fit buttons; Move
 *    mode drags the view.
 *  - Steps panel: DOU from the formula (worked, not a calculator), then check the IR groups,
 *    then the shift ranges, then count signals against integration.
 *  - The molecule is drawn beside the spectrum. Selecting a range (or hovering a signal in the
 *    Signals list) rings the atoms whose H or C give those peaks, from atom indices RDKit
 *    produced with the prediction. 1H is drawn as a first-order simulation: each multiplet from
 *    its J, Pascal intensities, plus an optional integral trace.
 *  - "Use my image" swaps the built-in spectrum for the student's own NMR or IR picture, with
 *    its own zoom and drag. The picture stays in this browser tab (an object URL) and is never
 *    uploaded. Calibrate it (click two axis marks, type their values) and the same range tools
 *    shade the range on the picture and drag-select works on it.
 *
 * NOT AVAILABLE IN CHALLENGES AND TESTS: see ../../app/ui/toolAccess.tsx. There is no
 * calculator here on purpose; students use their own to build exam muscle memory.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SegmentedSwitch, type SegmentOption } from "../periodic/SegmentedSwitch";
import "../periodic/periodic.css";
import "./spectra.css";
import { SPECTRA_COMPOUNDS } from "./spectra.generated";
import { H1_LINE_WIDTH, labelRows, multipletLines, multipletWindow, peakView } from "./spectraModel";
import { StructureView } from "./StructureView";
import {
  AXES,
  c13Lines,
  douMeaning,
  douSteps,
  fractionAtValue,
  h1Integral,
  h1Intensity,
  h1Lines,
  h1Max,
  irCentre,
  matchRanges,
  signalAtoms,
  tickStep,
  validCalibration,
  valueAtFraction,
  type Calibration,
  type Line,
  type SpectrumKind,
} from "./spectraModel";
import type { SpectraCompound } from "./spectraTypes";

const KINDS: readonly SegmentOption<SpectrumKind>[] = [
  { id: "h1", label: "1H NMR" },
  { id: "c13", label: "13C NMR" },
  { id: "ir", label: "IR" },
];

const W = 1000;
const H = 400;
const PAD_L = 20;
const PAD_R = 20;
const PAD_T = 14;
const PAD_B = 34;

interface View {
  readonly left: number;
  readonly right: number;
}

const fullView = (kind: SpectrumKind): View => ({ left: AXES[kind].max, right: AXES[kind].min });

/** The opening view of each spectrum: fitted to the compound's own signals. */
function fitViews(c: SpectraCompound): Record<SpectrumKind, View> {
  return { h1: peakView("h1", c), c13: peakView("c13", c), ir: peakView("ir", c) };
}
const DEFAULT_ID = SPECTRA_COMPOUNDS.find((c) => c.smiles === "COc1ccc(C(C)=O)cc1")?.id ?? SPECTRA_COMPOUNDS[0].id;

/** One signal blown up, so splitting reads without zooming the main plot. */
function MultipletInset({ peak, active, onPick }: { peak: SpectraCompound["h1"][number]; active: boolean; onPick: () => void }) {
  const w = multipletWindow(peak);
  const lines = multipletLines(peak);
  const top = Math.max(1e-9, ...lines.map((l) => h1Intensity(lines, l.x)));
  const IW = 200;
  const IH = 90;
  const pts: string[] = [];
  for (let i = 0; i <= 160; i++) {
    const v = w.left - ((w.left - w.right) * i) / 160;
    pts.push(`${(6 + (i / 160) * (IW - 12)).toFixed(1)},${(IH - 16 - Math.min(h1Intensity(lines, v) / top, 1.05) * (IH - 34)).toFixed(1)}`);
  }
  return (
    <button type="button" className="sp-inset" aria-pressed={active} onClick={onPick} aria-label={`${peak.shift.toFixed(2)} ppm, ${peak.nH} H, ${peak.exch ? "broad singlet" : peak.mult}`}>
      <svg viewBox={`0 0 ${IW} ${IH}`} aria-hidden="true">
        <line className="sp-axis" x1="6" x2={IW - 6} y1={IH - 16} y2={IH - 16} />
        <path className="sp-curve" d={`M${pts.join("L")}`} />
      </svg>
      <span>
        <strong>{peak.shift.toFixed(2)}</strong> {peak.nH}H, {peak.exch ? "s, broad" : peak.mult}
      </span>
    </button>
  );
}

function clamp(v: number, a: number, b: number): number {
  return Math.min(Math.max(v, a), b);
}

/** Visible-range spectrum path. NMR: summed Lorentzians. IR: transmittance dips. */
function curve(kind: SpectrumKind, compound: SpectraCompound, view: View, toX: (v: number) => number): string {
  const n = 900;
  const span = view.left - view.right;
  const yTop = PAD_T;
  const yBase = H - PAD_B;
  const pts: string[] = [];
  if (kind === "ir") {
    for (let i = 0; i <= n; i++) {
      const v = view.left - (span * i) / n;
      let t = 0;
      for (const b of compound.ir) {
        const w = b.broad ? (b.hi - b.lo) / 2.2 : Math.max((b.hi - b.lo) / 2.6, 14);
        const depth = b.strength === "strong" ? 0.85 : b.strength === "medium" ? 0.5 : 0.25;
        const c = irCentre(b);
        t = Math.max(t, depth * Math.exp(-(((v - c) / w) ** 2)));
      }
      // The fingerprint region below 1500 is a texture, not a lookup: a faint ripple, flagged on screen.
      if (v < 1500) t = Math.max(t, 0.12 + 0.1 * Math.sin(v / 17) * Math.sin(v / 53));
      pts.push(`${toX(v).toFixed(1)},${(yTop + (yBase - yTop) * t).toFixed(1)}`);
    }
    return `M${pts.join("L")}`;
  }
  const lines: Line[] = kind === "h1" ? h1Lines(compound.h1) : c13Lines(compound.c13);
  const lw = kind === "h1" ? H1_LINE_WIDTH : 0.35;
  // 1H: scale to the tallest line of the simulation, so a lone singlet and a triplet both fill the plot.
  const max = kind === "h1" ? h1Max(lines) : 1;
  for (let i = 0; i <= n; i++) {
    const v = view.left - (span * i) / n;
    const y = h1Intensity(lines, v, lw) / max;
    pts.push(`${toX(v).toFixed(1)},${(yBase - Math.min(y, 1.05) * (yBase - yTop - 78)).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

/** Integral trace path (1H): running H count, drawn as a stepped rise over the spectrum, nmrdb style. */
function integralPath(compound: SpectraCompound, view: View, toX: (v: number) => number): string {
  const lines = h1Lines(compound.h1);
  const total = compound.h1.reduce((s, p) => s + p.nH, 0) || 1;
  const n = 500;
  const span = view.left - view.right;
  const yBase = H - PAD_B - 6;
  const yTop = PAD_T + 22;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const v = view.left - (span * i) / n;
    const f = Math.min(h1Integral(lines, v) / total, 1);
    pts.push(`${toX(v).toFixed(1)},${(yBase - f * (yBase - yTop) * 0.55).toFixed(1)}`);
  }
  return `M${pts.join("L")}`;
}

interface DragState {
  mode: "select" | "move" | "image" | "image-select";
  start: number;
  startView: View;
  moved: boolean;
  px: number;
  py: number;
  iv: { s: number; x: number; y: number };
}

type ImageMode = "move" | "select" | "calibrate";

interface SignalRow {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
  readonly at: number;
  readonly lo: number;
  readonly hi: number;
  readonly atoms: readonly number[];
}

function signalRows(kind: SpectrumKind, compound: SpectraCompound): SignalRow[] {
  if (kind === "h1") {
    return compound.h1.map((p, i) => ({
      key: `h${i}`,
      label: `${p.shift.toFixed(2)} ppm`,
      detail: `${p.nH}H, ${p.exch ? "s, broad" : p.mult}${p.mult === "s" || p.exch ? "" : `, J ${p.j} Hz`}. ${p.env}`,
      at: p.shift,
      lo: p.shift - 0.12,
      hi: p.shift + 0.12,
      atoms: p.atoms,
    }));
  }
  if (kind === "c13") {
    return compound.c13.map((p, i) => ({
      key: `c${i}`,
      label: `${Math.round(p.shift)} ppm`,
      detail: `${p.nC}C. ${p.env}`,
      at: p.shift,
      lo: p.shift - 3,
      hi: p.shift + 3,
      atoms: p.atoms,
    }));
  }
  return compound.ir.map((b, i) => ({
    key: `i${i}`,
    label: `${b.hi}-${b.lo} cm-1`,
    detail: `${b.label}, ${b.strength}${b.broad ? ", broad" : ""}`,
    at: irCentre(b),
    lo: b.lo,
    hi: b.hi,
    atoms: [],
  }));
}

export default function SpectraTab() {
  const [kind, setKind] = useState<SpectrumKind>("h1");
  const [compoundId, setCompoundId] = useState(DEFAULT_ID);
  const [views, setViews] = useState<Record<SpectrumKind, View>>(() => fitViews(SPECTRA_COMPOUNDS.find((c) => c.id === DEFAULT_ID) ?? SPECTRA_COMPOUNDS[0]));
  const [range, setRange] = useState<{ a: number; b: number } | null>(null);
  const [move, setMove] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imageView, setImageView] = useState({ s: 1, x: 0, y: 0 });
  const [imageMode, setImageMode] = useState<ImageMode>("move");
  const [calPts, setCalPts] = useState<number[]>([]);
  const [calVals, setCalVals] = useState<[string, string]>(["", ""]);
  const [formula, setFormula] = useState("");
  const [integral, setIntegral] = useState(true);
  const [hover, setHover] = useState<readonly number[] | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const compound = SPECTRA_COMPOUNDS.find((c) => c.id === compoundId) ?? SPECTRA_COMPOUNDS[0];
  const view = views[kind];
  const fitView = peakView(kind, compound);
  const axis = AXES[kind];
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  const calibration: Calibration | null = useMemo(() => {
    const v1 = Number(calVals[0]);
    const v2 = Number(calVals[1]);
    if (calPts.length < 2 || calVals[0].trim() === "" || calVals[1].trim() === "" || Number.isNaN(v1) || Number.isNaN(v2)) return null;
    const c = { f1: calPts[0], v1, f2: calPts[1], v2 };
    return validCalibration(c) ? c : null;
  }, [calPts, calVals]);

  useEffect(
    () => () => {
      if (image !== null) URL.revokeObjectURL(image);
    },
    [image],
  );

  const toX = useCallback((v: number) => PAD_L + ((view.left - v) / (view.left - view.right)) * (W - PAD_L - PAD_R), [view]);
  const toValue = useCallback(
    (clientX: number) => {
      const r = svgRef.current?.getBoundingClientRect();
      if (r === undefined || r.width === 0) return view.left;
      const px = ((clientX - r.left) / r.width) * W;
      return view.left - ((px - PAD_L) / (W - PAD_L - PAD_R)) * (view.left - view.right);
    },
    [view],
  );
  /** 0..1 across the (zoomed) image layer, whatever the zoom and pan. */
  const imageFraction = (clientX: number): number => {
    const r = layerRef.current?.getBoundingClientRect();
    return r === undefined || r.width === 0 ? 0 : (clientX - r.left) / r.width;
  };

  const setView = useCallback(
    (next: View) => {
      const full = fullView(kind);
      let left = Math.min(next.left, full.left);
      let right = Math.max(next.right, full.right);
      const minSpan = (full.left - full.right) / 200;
      if (left - right < minSpan) {
        const mid = (left + right) / 2;
        left = mid + minSpan / 2;
        right = mid - minSpan / 2;
      }
      setViews((v) => ({ ...v, [kind]: { left, right } }));
    },
    [kind],
  );

  const zoomAround = useCallback(
    (factor: number, centre: number) => {
      const full = fullView(kind);
      const span = (view.left - view.right) * factor;
      if (span >= full.left - full.right) {
        setView(full);
        return;
      }
      const f = (centre - view.right) / (view.left - view.right);
      let right = centre - span * f;
      let left = right + span;
      if (left > full.left) {
        left = full.left;
        right = left - span;
      }
      if (right < full.right) {
        right = full.right;
        left = right + span;
      }
      setView({ left, right });
    },
    [kind, view, setView],
  );

  // Wheel needs a non-passive listener to stop the page scrolling under it.
  const wheelRef = useRef(zoomAround);
  wheelRef.current = zoomAround;
  const valueRef = useRef(toValue);
  valueRef.current = toValue;
  useEffect(() => {
    const el = svgRef.current;
    if (el === null || image !== null) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e.deltaY < 0 ? 1 / 1.25 : 1.25, valueRef.current(e.clientX));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [image, kind]);

  const onDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = toValue(e.clientX);
    drag.current = { mode: move ? "move" : "select", start: v, startView: view, moved: false, px: e.clientX, py: e.clientY, iv: imageView };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d === null) return;
    if (Math.abs(e.clientX - d.px) > 4) d.moved = true;
    if (!d.moved) return;
    const r = svgRef.current?.getBoundingClientRect();
    if (d.mode === "move" && r !== undefined) {
      const dv = ((e.clientX - d.px) / r.width) * (W / (W - PAD_L - PAD_R)) * (d.startView.left - d.startView.right);
      setView({ left: d.startView.left + dv, right: d.startView.right + dv });
    } else if (d.mode === "select") {
      setRange({ a: clamp(d.start, axis.min, axis.max), b: clamp(toValue(e.clientX), axis.min, axis.max) });
    }
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d !== null && !d.moved && d.mode === "select") setRange(null);
  };

  // Image pointer handling: move pans, select drags a range (needs a calibration), calibrate drops marks.
  const onImageDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const mode = imageMode === "select" && calibration !== null ? "image-select" : "image";
    drag.current = { mode, start: imageFraction(e.clientX), startView: view, moved: false, px: e.clientX, py: e.clientY, iv: imageView };
  };
  const onImageMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d === null) return;
    if (Math.abs(e.clientX - d.px) > 4 || Math.abs(e.clientY - d.py) > 4) d.moved = true;
    if (!d.moved) return;
    if (d.mode === "image-select" && calibration !== null) {
      setRange({ a: valueAtFraction(calibration, d.start), b: valueAtFraction(calibration, imageFraction(e.clientX)) });
    } else if (d.mode === "image" && imageMode !== "calibrate") {
      setImageView({ ...d.iv, x: d.iv.x + e.clientX - d.px, y: d.iv.y + e.clientY - d.py });
    }
  };
  const onImageUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (d === null || d.moved) return;
    if (imageMode === "calibrate") {
      const f = imageFraction(e.clientX);
      setCalPts((pts) => (pts.length >= 2 ? [f] : [...pts, f]));
      if (calPts.length >= 2) setCalVals(["", ""]);
    } else if (d.mode === "image-select") setRange(null);
  };

  const lo = range === null ? null : Math.min(range.a, range.b);
  const hi = range === null ? null : Math.max(range.a, range.b);
  const rows = useMemo(() => signalRows(kind, compound), [kind, compound]);
  const inside = useMemo(() => {
    if (lo === null || hi === null) return [] as SignalRow[];
    return rows.filter((r) => r.at >= lo && r.at <= hi);
  }, [rows, lo, hi]);
  const refs = lo === null || hi === null ? matchRanges(kind, axis.min, axis.max) : matchRanges(kind, lo, hi);
  const rung = useMemo(
    () => (hover !== null ? hover : lo === null || hi === null ? [] : signalAtoms(kind, compound, lo, hi)),
    [hover, kind, compound, lo, hi],
  );

  const ticks = useMemo(() => {
    const step = tickStep(view.left - view.right);
    const out: number[] = [];
    for (let v = Math.ceil(view.right / step) * step; v <= view.left + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
    return out;
  }, [view]);

  const path = useMemo(() => curve(kind, compound, view, toX), [kind, compound, view, toX]);
  const intPath = useMemo(() => (kind === "h1" ? integralPath(compound, view, toX) : ""), [kind, compound, view, toX]);
  const dou = douSteps(formula === "" ? compound.formula : formula);

  const pickFile = (file: File | undefined) => {
    if (file === undefined || !file.type.startsWith("image/")) return;
    setImage(URL.createObjectURL(file));
    setImageView({ s: 1, x: 0, y: 0 });
    setImageMode("calibrate");
    setCalPts([]);
    setCalVals(["", ""]);
    setRange(null);
  };

  const setNumber = (which: "a" | "b", text: string) => {
    const n = Number(text);
    if (text.trim() === "" || Number.isNaN(n)) return;
    const base = range ?? { a: axis.min, b: axis.min };
    setRange({ ...base, [which]: image === null ? clamp(n, axis.min, axis.max) : n });
  };

  const zoomIn = () => (image === null ? zoomAround(1 / 1.5, (view.left + view.right) / 2) : setImageView((v) => ({ ...v, s: Math.min(v.s * 1.4, 8) })));
  const zoomOut = () => (image === null ? zoomAround(1.5, (view.left + view.right) / 2) : setImageView((v) => ({ ...v, s: Math.max(v.s / 1.4, 1) })));
  const fit = () => (image === null ? setView(fitView) : setImageView({ s: 1, x: 0, y: 0 }));
  const toSelection = () => {
    if (lo === null || hi === null || hi - lo < 1e-6) return;
    const pad = (hi - lo) * 0.15;
    setView({ left: hi + pad, right: lo - pad });
  };
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const atFit = image === null ? near(view.left, fitView.left) && near(view.right, fitView.right) : imageView.s === 1;
  const atFull = near(view.left, axis.max) && near(view.right, axis.min);
  const unit = axis.unit;
  const kindLabel = KINDS.find((k) => k.id === kind)?.label ?? "";
  const canSelect = image === null || calibration !== null;
  const matches = SPECTRA_COMPOUNDS.filter((c) => {
    const q = search.trim().toLowerCase();
    return q === "" || c.name.toLowerCase().includes(q) || c.formula.toLowerCase().includes(q) || c.smiles.toLowerCase().includes(q);
  });
  const bandFrac =
    image !== null && calibration !== null && lo !== null && hi !== null
      ? { left: Math.min(fractionAtValue(calibration, lo), fractionAtValue(calibration, hi)), right: Math.max(fractionAtValue(calibration, lo), fractionAtValue(calibration, hi)) }
      : null;

  return (
    <div className="pt-root sp-root">
      <div className="pt-toolbar">
        <SegmentedSwitch
          label="Spectrum type"
          options={KINDS}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setRange(null);
            setHover(null);
          }}
          compact
        />
        <div className="pt-toolbar-actions">
          <button type="button" className="pt-btn pt-btn--icon" aria-label="Zoom out" disabled={image === null ? atFull : atFit} onClick={zoomOut}>
            −
          </button>
          <button type="button" className="pt-btn pt-btn--icon" aria-label="Zoom in" onClick={zoomIn}>
            +
          </button>
          <button type="button" className="pt-btn" aria-label="Fit the whole spectrum" disabled={atFit} onClick={fit}>
            Fit
          </button>
          {image === null ? (
            <button type="button" className="pt-btn" aria-label="Show the whole axis" disabled={atFull} onClick={() => setView(fullView(kind))}>
              Full axis
            </button>
          ) : null}
        </div>
      </div>

      <div className="sp-controls">
        {image === null ? (
          <button type="button" className="pt-btn pt-btn--toggle" aria-pressed={pickerOpen} onClick={() => setPickerOpen((o) => !o)}>
            Compound: {compound.name} ({compound.formula})
          </button>
        ) : (
          <span className="sp-note">Showing your image. Calibrate it once, then select ranges on it.</span>
        )}
        <label className="pt-btn sp-upload">
          Use my image
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {image === null ? (
          <>
            <button type="button" className="pt-btn pt-btn--toggle" aria-pressed={move} onClick={() => setMove((m) => !m)} title="Drag moves the view instead of selecting">
              Move
            </button>
            {kind === "h1" ? (
              <button type="button" className="pt-btn pt-btn--toggle" aria-pressed={integral} onClick={() => setIntegral((m) => !m)} title="Show the running integral">
                Integral
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" className="pt-btn" onClick={() => setImage(null)}>
            Built-in spectrum
          </button>
        )}
      </div>

      {image === null && pickerOpen ? (
        <section className="sp-card sp-picker" aria-label="Choose a compound">
          <label className="sp-field">
            <span>Find</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name, formula or SMILES, e.g. butanone" aria-label="Search the library by name, formula or SMILES" />
          </label>
          <div className="sp-grid">
            {matches.map((c) => (
              <button
                key={c.id}
                type="button"
                className="sp-thumb"
                aria-pressed={c.id === compoundId}
                aria-label={`${c.name}, ${c.formula}`}
                onClick={() => {
                  setCompoundId(c.id);
                  setViews(fitViews(c));
                  setRange(null);
                  setHover(null);
                  setPickerOpen(false);
                }}
              >
                <span dangerouslySetInnerHTML={{ __html: c.svg }} />
                <small>{c.name}</small>
              </button>
            ))}
            {matches.length === 0 ? (
              <p className="sp-empty">
                Nothing in the library matches. It holds {SPECTRA_COMPOUNDS.length} structures, predicted ahead of time with RDKit; a new structure has to be added to the library.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {image !== null ? (
        <>
          <div className="sp-controls" role="group" aria-label="Image mode">
            {(["calibrate", "select", "move"] as const).map((m) => (
              <button key={m} type="button" className="pt-btn pt-btn--toggle" aria-pressed={imageMode === m} disabled={m === "select" && calibration === null} onClick={() => setImageMode(m)}>
                {m === "calibrate" ? "1. Calibrate" : m === "select" ? "2. Select range" : "Move"}
              </button>
            ))}
          </div>
          {imageMode === "calibrate" ? (
            <section className="sp-card" aria-label="Calibrate the axis">
              <p className="sp-empty">
                Click a tick mark on your picture, then a second one far from it. Type what each mark reads in {unit}. The scale between them is assumed straight.
              </p>
              <div className="sp-range">
                {[0, 1].map((i) => (
                  <label key={i}>
                    Mark {i + 1} {calPts[i] === undefined ? "(not placed)" : "(placed)"}
                    <input
                      inputMode="decimal"
                      aria-label={`Value at mark ${i + 1}, ${unit}`}
                      value={calVals[i]}
                      onChange={(e) => setCalVals((v) => (i === 0 ? [e.target.value, v[1]] : [v[0], e.target.value]))}
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="pt-btn pt-btn--small"
                  onClick={() => {
                    setCalPts([]);
                    setCalVals(["", ""]);
                  }}
                >
                  Start over
                </button>
              </div>
              <p className="sp-empty">{calibration === null ? "Not calibrated yet." : "Calibrated. Switch to Select range and drag across a signal."}</p>
            </section>
          ) : null}
          <div
            className="sp-image"
            data-mode={imageMode}
            role="img"
            aria-label="Your spectrum image"
            onPointerDown={onImageDown}
            onPointerMove={onImageMove}
            onPointerUp={onImageUp}
            onWheel={(e) => setImageView((v) => ({ ...v, s: clamp(v.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 8) }))}
          >
            <div ref={layerRef} className="sp-image-layer" style={{ transform: `translate(${imageView.x}px, ${imageView.y}px) scale(${imageView.s})` }}>
              <img src={image} alt="" draggable={false} />
              {bandFrac !== null ? (
                <div className="sp-image-band" style={{ left: `${bandFrac.left * 100}%`, width: `${Math.max((bandFrac.right - bandFrac.left) * 100, 0.3)}%` }} />
              ) : null}
              {calPts.map((f, i) => (
                <div key={i} className="sp-image-mark" style={{ left: `${f * 100}%` }}>
                  <span>{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="sp-main">
          <div className="sp-plot">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="sp-svg"
              data-move={move}
              role="img"
              aria-label={`Simulated ${kindLabel} spectrum of the compound with formula ${compound.formula}`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onDoubleClick={() => setRange(null)}
            >
              {lo !== null && hi !== null ? (
                <rect
                  className="sp-band"
                  x={toX(Math.min(hi, view.left))}
                  y={PAD_T}
                  width={Math.max(toX(Math.max(lo, view.right)) - toX(Math.min(hi, view.left)), 1)}
                  height={H - PAD_B - PAD_T}
                />
              ) : null}
              <line className="sp-axis" x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} />
              {ticks.map((t) => (
                <g key={t}>
                  <line className="sp-axis" x1={toX(t)} x2={toX(t)} y1={H - PAD_B} y2={H - PAD_B + 6} />
                  <text className="sp-tick" x={toX(t)} y={H - PAD_B + 22} textAnchor="middle">
                    {t}
                  </text>
                </g>
              ))}
              <text className="sp-unit" x={W - PAD_R} y={H - 2} textAnchor="end">
                {unit}
              </text>
              {kind === "h1" && integral ? <path className="sp-integral" d={intPath} /> : null}
              <path className="sp-curve" d={path} />
              {kind === "h1" || kind === "c13"
                ? (() => {
                    const ps: { shift: number; text: string; sub: string }[] =
                      kind === "h1"
                        ? compound.h1.map((p) => ({ shift: p.shift, text: p.shift.toFixed(2), sub: `${p.nH}H` }))
                        : compound.c13.map((p) => ({ shift: p.shift, text: String(Math.round(p.shift)), sub: "" }));
                    const rows = labelRows(ps.map((p) => toX(p.shift)), 46);
                    return ps.map((p, i) =>
                      p.shift <= view.left && p.shift >= view.right ? (
                        <g key={`${p.shift}${i}`} className="sp-label" data-hit={lo !== null && hi !== null && p.shift >= lo && p.shift <= hi}>
                          <line className="sp-leader" x1={toX(p.shift)} x2={toX(p.shift)} y1={PAD_T + 30 + rows[i] * 28} y2={PAD_T + 78} />
                          <text className="sp-int" x={toX(p.shift)} y={PAD_T + 12 + rows[i] * 28} textAnchor="middle">
                            {p.text}
                          </text>
                          {p.sub !== "" ? (
                            <text className="sp-int sp-int-sub" x={toX(p.shift)} y={PAD_T + 26 + rows[i] * 28} textAnchor="middle">
                              {p.sub}
                            </text>
                          ) : null}
                        </g>
                      ) : null,
                    );
                  })()
                : null}
              {kind === "ir" ? (
                <text className="sp-fp" x={toX(1000)} y={PAD_T + 12} textAnchor="middle">
                  fingerprint, compare do not read
                </text>
              ) : null}
            </svg>
          </div>
          <StructureView compound={compound} atoms={rung} />
        </div>
      )}
      {image === null && kind === "h1" ? (
        <section className="sp-card" aria-label="Signals expanded">
          <h3 className="sp-h">Each signal expanded</h3>
          <div className="sp-insets">
            {compound.h1.map((p, i) => (
              <MultipletInset
                key={`${p.shift}${i}`}
                peak={p}
                active={lo !== null && hi !== null && p.shift >= lo && p.shift <= hi}
                onPick={() => {
                  setRange({ a: p.shift + 0.12, b: p.shift - 0.12 });
                  setHover(null);
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
      <p className="pt-hint">
        {image !== null
          ? "Scroll or use the buttons to zoom your image, drag to move it."
          : "Drag across the spectrum to select a range; the atoms behind those peaks are ringed on the structure. Scroll to zoom, double-click to clear. A first-order simulation from predicted shifts, so expect differences from a real spectrum."}
      </p>

      {canSelect ? (
        <section className="sp-card" aria-label="Selected range">
          <div className="sp-range">
            <label>
              From{" "}
              <input inputMode="decimal" aria-label={`Range start, ${unit}`} defaultValue="" key={`a${hi}`} onBlur={(e) => setNumber("a", e.target.value)} placeholder={hi === null ? "" : String(Number(hi.toFixed(2)))} />
            </label>
            <label>
              to{" "}
              <input inputMode="decimal" aria-label={`Range end, ${unit}`} defaultValue="" key={`b${lo}`} onBlur={(e) => setNumber("b", e.target.value)} placeholder={lo === null ? "" : String(Number(lo.toFixed(2)))} />
            </label>
            <span className="sp-unit-chip">{unit}</span>
            {image === null ? (
              <button type="button" className="pt-btn pt-btn--small" disabled={range === null} onClick={toSelection}>
                To selection
              </button>
            ) : null}
            <button type="button" className="pt-btn pt-btn--small" disabled={range === null} onClick={() => setRange(null)}>
              Clear
            </button>
          </div>
          {image !== null ? null : range === null ? (
            <p className="sp-empty">No range yet. Pick a handout range below, drag on the spectrum, or pick a signal in the list.</p>
          ) : (
            <ul className="sp-list" aria-label="Peaks in the range">
              {inside.length === 0 ? (
                <li className="sp-empty">No peak of this compound falls in the range.</li>
              ) : (
                inside.map((p) => (
                  <li key={p.key}>
                    <strong>{p.label}</strong> {p.detail}
                  </li>
                ))
              )}
            </ul>
          )}
          <p className="sp-sub">{range === null ? "Handout ranges" : "Handout ranges that overlap"}</p>
          <div className="sp-chips" role="group" aria-label="Handout ranges">
            {refs.map((r) => (
              <button key={r.title + r.hi} type="button" className="sp-chip" onClick={() => setRange({ a: r.hi, b: r.lo })} title={r.description}>
                {r.title} <span>{r.hi === r.lo ? r.hi : `${r.hi}–${r.lo}`}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {image === null ? (
        <section className="sp-card" aria-label="Signals">
          <h3 className="sp-h">Signals in {kindLabel}</h3>
          <ul className="sp-signals">
            {rows.map((r) => (
              <li key={r.key}>
                <button
                  type="button"
                  className="sp-signal"
                  aria-pressed={lo !== null && hi !== null && r.at >= lo && r.at <= hi}
                  onClick={() => setRange({ a: r.hi, b: r.lo })}
                  onMouseEnter={() => setHover(r.atoms)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(r.atoms)}
                  onBlur={() => setHover(null)}
                >
                  <strong>{r.label}</strong> {r.detail}
                </button>
              </li>
            ))}
          </ul>
          <p className="sp-formula-note">{kind === "ir" ? "IR bands are tied to a group, not to single atoms, so none are ringed." : "Tap a signal to select it and ring its atoms."}</p>
        </section>
      ) : null}

      <section className="sp-card" aria-label="Steps">
        <h3 className="sp-h">Steps</h3>
        <ol className="sp-steps">
          <li>
            <strong>Degree of unsaturation.</strong> Formula{" "}
            <input className="sp-formula" value={formula} placeholder={compound.formula} onChange={(e) => setFormula(e.target.value)} aria-label="Molecular formula" />
            {dou === null ? (
              <span className="sp-warn"> Type a formula like C4H8O.</span>
            ) : (
              <span className="sp-work">
                <code>{dou.line}</code> = <b>{dou.dou}</b>
                <em>{douMeaning(dou.dou)}</em>
              </span>
            )}
            <span className="sp-formula-note">The formula is (2C + 2 + N − H − X) / 2. Do the arithmetic yourself.</span>
          </li>
          <li>
            <strong>IR first.</strong> Which groups are here? Tap a band to look at it.
            <div className="sp-chips">
              {compound.ir.map((b) => (
                <button
                  key={b.label + b.hi}
                  type="button"
                  className="sp-chip"
                  onClick={() => {
                    setKind("ir");
                    setRange({ a: b.hi, b: b.lo });
                  }}
                >
                  {b.label}{" "}
                  <span>
                    {b.hi}–{b.lo}
                  </span>
                </button>
              ))}
            </div>
          </li>
          <li>
            <strong>Check the shift ranges.</strong> Select each signal on 1H and 13C and read the handout ranges that overlap it.
          </li>
          <li>
            <strong>Count and split.</strong> The integrations should add up to the H in the formula; the splitting tells you the neighbours (n + 1).
          </li>
        </ol>
      </section>
    </div>
  );
}
