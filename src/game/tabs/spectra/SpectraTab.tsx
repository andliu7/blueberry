/**
 * The NMR and IR tool. It opens on the RANGE CHART (RangeChart.tsx): one axis per spectrum,
 * high to low, with a box for each range, a drawn example molecule in it, the peak shape, how
 * neighbours move it, and a chart beside it. Owner brief, 3 Nov 2026.
 *
 * "Compound spectra" switches to the older simulator (SpectrumSimulator.tsx): a predicted
 * spectrum for a library compound, drag-to-select, and "Use my image" for a student's own
 * spectrum picture.
 *
 * NOT AVAILABLE IN CHALLENGES AND TESTS: see ../../app/ui/toolAccess.tsx.
 */

import { lazy, Suspense, useState } from "react";
import { SegmentedSwitch, type SegmentOption } from "../periodic/SegmentedSwitch";
import "../periodic/periodic.css";
import "./spectra.css";
import { RangeChart } from "./RangeChart";
import type { RangeMode } from "./rangeTypes";

const SpectrumSimulator = lazy(() => import("./SpectrumSimulator"));

const MODES: readonly SegmentOption<RangeMode>[] = [
  { id: "ir", label: "IR" },
  { id: "h1", label: "¹H NMR" },
  { id: "c13", label: "¹³C NMR" },
];

const SUB: Record<RangeMode, string> = {
  ir: "Where each bond absorbs, broad or sharp. Tap a box.",
  h1: "Where each kind of H shows up, and what pushes it. Tap a box.",
  c13: "Where each kind of carbon shows up. Tap a box.",
};

export default function SpectraTab() {
  const [mode, setMode] = useState<RangeMode>("ir");
  const [view, setView] = useState<"ranges" | "compound">("ranges");

  if (view === "compound") {
    return (
      <>
        <div className="pt-toolbar sp-back">
          <button type="button" className="pt-btn" onClick={() => setView("ranges")}>
            ← Range chart
          </button>
        </div>
        <Suspense fallback={<p className="pt-hint sp-back">Loading compound spectra…</p>}>
          <SpectrumSimulator />
        </Suspense>
      </>
    );
  }

  return (
    <div className="pt-root sp-root">
      <div className="rc-top">
        <div>
          <h2 className="rc-title">Where peaks land, and why</h2>
          <p className="rc-sub">{SUB[mode]}</p>
        </div>
        <div className="pt-toolbar">
          <SegmentedSwitch label="Spectrum type" options={MODES} value={mode} onChange={setMode} compact />
          <button type="button" className="pt-btn" onClick={() => setView("compound")}>
            Compound spectra
          </button>
        </div>
      </div>
      <RangeChart key={mode} mode={mode} />
    </div>
  );
}
