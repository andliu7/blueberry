"use client";
import React, { useEffect, useRef, useState } from "react";

/*
 * A colour picker dialog in the style of the macOS Colors panel: a swatch grid,
 * a hue and saturation spectrum, and RGB sliders with a hex field.
 *
 * Adapted from the owner's pasted `apple-color-picker.tsx` (28 Oct). What changed:
 *  - Surfaces and text come from the theme tokens (bg-card, text-foreground...), so
 *    the dialog follows dark mode instead of the fixed light-grey Apple look.
 *  - The spectrum answers touch and pen (pointer events with capture); the original
 *    listened to mouse events only, so it did nothing on a phone.
 *  - `onChange` only ever receives a complete "#rrggbb". The original called it on
 *    every keystroke in the hex box, and a partial hex turned the RGB and HSV state
 *    black until the sixth digit arrived.
 *  - Every swatch and slider has a name for a screen reader; Escape closes the dialog.
 *  - Opacity is off unless `showOpacity` is set: the page ground has no alpha.
 *  - No external icon package; the three icons are inline.
 */

type Rgb = { r: number; g: number; b: number };
type Hsv = { h: number; s: number; v: number };

const PipetteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m2 22 1-1h3l9-9" />
    <path d="M3 21v-3l9-9" />
    <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
  </svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

/* ---------------- colour maths ---------------- */

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;

/** "#rgb" or "#rrggbb" to "#rrggbb" (lower case), or null when it is neither. */
function normaliseHex(hex: string): string | null {
  if (HEX6.test(hex)) return hex.toLowerCase();
  if (HEX3.test(hex)) return ("#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]).toLowerCase();
  return null;
}

function hexToRgb(hex: string): Rgb {
  const full = normaliseHex(hex) ?? "#000000";
  return { r: parseInt(full.slice(1, 3), 16), g: parseInt(full.slice(3, 5), 16), b: parseInt(full.slice(5, 7), 16) };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  h /= 360;
  s /= 100;
  v /= 100;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const [r, g, b] = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][i % 6];
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/* ---------------- the swatch grid ---------------- */

const GRID_COLORS = [
  "#FFFFFF", "#EBEBEB", "#D6D6D6", "#C2C2C2", "#ADADAD", "#999999", "#858585", "#707070", "#5C5C5C", "#474747", "#333333", "#000000",
  "#003366", "#336699", "#3366CC", "#003399", "#000099", "#0000CC", "#000066", "#333366", "#663399", "#660099", "#330066", "#330033",
  "#006699", "#0099CC", "#0066CC", "#0033CC", "#0000FF", "#3333FF", "#333399", "#6633CC", "#9933CC", "#9900CC", "#6600CC", "#660066",
  "#0099CC", "#00CCFF", "#0099FF", "#0066FF", "#3366FF", "#6666FF", "#6666CC", "#9966CC", "#CC66FF", "#CC33FF", "#9900FF", "#990099",
  "#33CCCC", "#66FFFF", "#33CCFF", "#3399FF", "#6699FF", "#9999FF", "#9999CC", "#CC99FF", "#FF99FF", "#FF66FF", "#CC00FF", "#CC00CC",
  "#66CCCC", "#99FFFF", "#66CCFF", "#6699FF", "#99CCFF", "#CCCCFF", "#CC99CC", "#FFCCFF", "#FF99FF", "#FF66FF", "#FF33FF", "#FF00FF",
  "#99CCCC", "#CCFFFF", "#99CCFF", "#9999FF", "#CCCCFF", "#FFFFFF", "#FFCCFF", "#FF99FF", "#FF66FF", "#FF00FF", "#CC00CC", "#990099",
  "#CCFFCC", "#FFFFCC", "#FFFF99", "#FFFF66", "#FFFF33", "#FFFF00", "#FFCC00", "#FF9900", "#FF6600", "#FF3300", "#FF0000", "#CC0000",
  "#99FF99", "#CCFF99", "#CCCC66", "#CCCC33", "#CCCC00", "#CC9900", "#CC6600", "#CC3300", "#CC0000", "#990000", "#660000", "#330000",
  "#66FF66", "#99FF66", "#99CC66", "#99CC33", "#999900", "#996600", "#993300", "#990000", "#660000", "#330000", "#000000", "#000000",
  "#33FF33", "#66FF33", "#66CC33", "#669933", "#666600", "#663300", "#660000", "#330000", "#000000", "#000000", "#000000", "#000000",
  "#00FF00", "#33FF00", "#33CC00", "#339900", "#336600", "#333300", "#330000", "#000000", "#000000", "#000000", "#000000", "#000000",
];

const TABS = ["Grid", "Spectrum", "Slider"] as const;
type Tab = (typeof TABS)[number];

function SegmentedControl({ selected, onChange }: { selected: Tab; onChange: (t: Tab) => void }) {
  return (
    <div role="tablist" aria-label="Picker type" className="relative mb-4 flex items-center rounded-[10px] bg-muted p-[2px]">
      {TABS.map((option) => {
        const on = selected === option;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(option)}
            className={`relative z-10 min-h-[44px] flex-1 rounded-[8px] text-[13px] font-semibold transition-colors ${on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function ColorGrid({ selectedHex, onChange }: { selectedHex: string; onChange: (hex: string) => void }) {
  const current = normaliseHex(selectedHex);
  return (
    <div className="grid h-[200px] grid-cols-12 gap-px overflow-hidden rounded-lg bg-border p-px" role="group" aria-label="Swatches">
      {GRID_COLORS.map((color, idx) => {
        const on = current !== null && current === color.toLowerCase();
        return (
          <button
            key={idx}
            type="button"
            aria-label={color}
            aria-pressed={on}
            className="relative h-full w-full hover:z-10 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          >
            {on && <span className="pointer-events-none absolute inset-0 z-20 border-2 border-white mix-blend-difference" />}
          </button>
        );
      })}
    </div>
  );
}

function SpectrumPicker({ hsv, onChange }: { hsv: Hsv; onChange: (hsv: Hsv) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);

  const move = (clientX: number, clientY: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    const x = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (clientY - box.top) / box.height));
    onChange({ h: x * 360, s: 100 - y * 100, v: 100 });
  };

  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    const next = { ...hsv };
    if (e.key === "ArrowLeft") next.h = (hsv.h - step * 3.6 + 360) % 360;
    else if (e.key === "ArrowRight") next.h = (hsv.h + step * 3.6) % 360;
    else if (e.key === "ArrowUp") next.s = Math.min(100, hsv.s + step);
    else if (e.key === "ArrowDown") next.s = Math.max(0, hsv.s - step);
    else return;
    e.preventDefault();
    onChange({ ...next, v: 100 });
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Hue and saturation"
      aria-valuemin={0}
      aria-valuemax={360}
      aria-valuenow={Math.round(hsv.h)}
      aria-valuetext={`hue ${Math.round(hsv.h)} degrees, saturation ${Math.round(hsv.s)} percent`}
      onKeyDown={key}
      className="relative h-[200px] w-full cursor-crosshair touch-none overflow-hidden rounded-xl shadow-inner"
      style={{
        background:
          "linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #FFF, transparent), linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)",
      }}
      onPointerDown={(e) => {
        drag.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (drag.current) move(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        drag.current = false;
      }}
      onPointerCancel={() => {
        drag.current = false;
      }}
    >
      <div
        className="pointer-events-none absolute -ml-2 -mt-2 size-4 rounded-full border-2 border-white shadow-md"
        style={{ left: `${(hsv.h / 360) * 100}%`, top: `${100 - hsv.s}%`, backgroundColor: rgbToHex(hsvToRgb(hsv)) }}
      />
    </div>
  );
}

const CHANNELS = [
  { label: "Red", key: "r" as const, to: "#FF0000" },
  { label: "Green", key: "g" as const, to: "#00FF00" },
  { label: "Blue", key: "b" as const, to: "#0000FF" },
];

function SliderPicker({ rgb, hex, onChangeRgb, onChangeHex }: { rgb: Rgb; hex: string; onChangeRgb: (rgb: Rgb) => void; onChangeHex: (hex: string) => void }) {
  // The hex box keeps what is being typed; only a complete colour is passed up.
  const [text, setText] = useState(hex.replace("#", ""));
  useEffect(() => setText(hex.replace("#", "")), [hex]);

  return (
    <div className="flex h-[200px] flex-col justify-between py-2">
      {CHANNELS.map(({ label, key, to }) => (
        <div key={key} className="flex items-center gap-3">
          <div className="w-12 text-xs font-semibold uppercase text-muted-foreground">{label}</div>
          <div className="relative h-6 flex-1 rounded-full shadow-inner" style={{ background: `linear-gradient(to right, #000000, ${to})` }}>
            <input
              type="range"
              min={0}
              max={255}
              value={rgb[key]}
              aria-label={label}
              onChange={(e) => onChangeRgb({ ...rgb, [key]: parseInt(e.target.value, 10) })}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div className="pointer-events-none absolute top-1/2 -mt-2.5 size-5 rounded-full border border-border bg-background shadow-md" style={{ left: `calc(${(rgb[key] / 255) * 100}% - 10px)` }} />
          </div>
          <input
            type="number"
            min={0}
            max={255}
            value={rgb[key]}
            aria-label={`${label} value`}
            onChange={(e) => onChangeRgb({ ...rgb, [key]: Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0)) })}
            className="h-8 w-14 rounded border border-border bg-background px-1 text-center text-xs text-foreground"
          />
        </div>
      ))}
      <div className="flex items-center justify-between">
        <label htmlFor="apc-hex" className="text-xs text-muted-foreground">
          Hex #
        </label>
        <input
          id="apc-hex"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (!/^[0-9A-Fa-f]{0,6}$/.test(v)) return;
            setText(v);
            if (v.length === 6) onChangeHex("#" + v);
          }}
          className="h-9 w-24 rounded border border-border bg-background px-2 text-right text-sm font-medium uppercase text-foreground"
        />
      </div>
    </div>
  );
}

function OpacitySlider({ opacity, hex, onChange }: { opacity: number; hex: string; onChange: (n: number) => void }) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Opacity</div>
      <div className="flex items-center gap-3">
        <div
          className="relative h-6 flex-1 overflow-hidden rounded-full bg-white shadow-inner"
          style={{
            backgroundImage: "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%)",
            backgroundSize: "8px 8px",
            backgroundPosition: "0 0, 4px 0, 4px -4px, 0px 4px",
          }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(to right, transparent, ${hex})` }} />
          <input type="range" min={0} max={100} value={opacity} aria-label="Opacity" onChange={(e) => onChange(parseInt(e.target.value, 10))} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
          <div className="pointer-events-none absolute top-1/2 -mt-2.5 size-5 rounded-full border border-border bg-background shadow-md" style={{ left: `calc(${opacity}% - 10px)` }} />
        </div>
        <span className="w-12 text-right text-sm font-medium text-foreground">{opacity}%</span>
      </div>
    </div>
  );
}

function RecentColors({ recent, current, onSelect, onAdd }: { recent: string[]; current: string; onSelect: (hex: string) => void; onAdd: () => void }) {
  return (
    <div className="mt-4 flex gap-4 border-t border-border pt-4">
      <div className="size-12 shrink-0 rounded-lg border border-border shadow-inner" style={{ backgroundColor: current }} role="img" aria-label={`Current colour ${current}`} />
      <div className="grid flex-1 grid-cols-6 content-start gap-2">
        {recent.map((color) => (
          <button key={color} type="button" aria-label={`Use ${color}`} onClick={() => onSelect(color)} className="size-6 rounded-full border border-border shadow-sm transition-transform hover:scale-110" style={{ backgroundColor: color }} />
        ))}
        {recent.length < 12 && (
          <button type="button" aria-label="Save this colour" onClick={onAdd} className="flex size-6 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground hover:bg-accent">
            <PlusIcon />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- the dialog ---------------- */

export interface AppleColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  /** "#rgb" or "#rrggbb". Anything else starts at the default blue. */
  initialColor?: string;
  /** Called with a complete "#rrggbb" each time the colour changes. */
  onChange?: (hex: string) => void;
  /** Show the opacity slider. It does not change what `onChange` returns. */
  showOpacity?: boolean;
  title?: string;
}

const DEFAULT_RECENT = ["#000000", "#FFFFFF", "#FF3B30", "#FF9500", "#FFCC00", "#4CD964", "#5AC8FA", "#007AFF", "#5856D6", "#FF2D55"];

export function AppleColorPicker({ isOpen, onClose, initialColor = "#007AFF", onChange, showOpacity = false, title = "Colors" }: AppleColorPickerProps) {
  const start = normaliseHex(initialColor) ?? "#007aff";
  const [tab, setTab] = useState<Tab>("Grid");
  const [hex, setHex] = useState(start);
  const [rgb, setRgb] = useState<Rgb>(hexToRgb(start));
  const [hsv, setHsv] = useState<Hsv>(rgbToHsv(hexToRgb(start)));
  const [opacity, setOpacity] = useState(100);
  const [recent, setRecent] = useState(DEFAULT_RECENT);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const commit = (next: Rgb, nextHsv?: Hsv) => {
    const nextHex = rgbToHex(next);
    setRgb(next);
    setHex(nextHex);
    // Keep the hue the finger chose; recomputing it from RGB drops it on greys.
    setHsv(nextHsv ?? rgbToHsv(next));
    onChange?.(nextHex);
  };
  const fromHex = (value: string) => {
    const full = normaliseHex(value);
    if (full) commit(hexToRgb(full));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="pointer-events-auto relative w-[300px] max-w-[calc(100vw-32px)] select-none overflow-hidden rounded-[24px] border border-border bg-card/95 p-4 text-card-foreground shadow-2xl backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="p-2 text-primary">
            <PipetteIcon />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent">
            <XIcon />
          </button>
        </div>
        <SegmentedControl selected={tab} onChange={setTab} />
        <div className="h-[200px]">
          {tab === "Grid" && <ColorGrid selectedHex={hex} onChange={fromHex} />}
          {tab === "Spectrum" && <SpectrumPicker hsv={hsv} onChange={(h) => commit(hsvToRgb(h), h)} />}
          {tab === "Slider" && <SliderPicker rgb={rgb} hex={hex} onChangeRgb={(c) => commit(c)} onChangeHex={fromHex} />}
        </div>
        {showOpacity && <OpacitySlider opacity={opacity} hex={hex} onChange={setOpacity} />}
        <RecentColors recent={recent} current={hex} onSelect={fromHex} onAdd={() => setRecent((prev) => (prev.includes(hex) ? prev : [hex, ...prev].slice(0, 12)))} />
      </div>
    </div>
  );
}

export default AppleColorPicker;
