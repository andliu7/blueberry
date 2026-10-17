"use client"

import * as React from "react"

/*
 * Slit Type FAQ: a frequently-asked-questions section set in one ink on one
 * paper. The display headline rises letter by letter through a hard
 * horizontal slit as the section scrolls in, and the questions sit on
 * full-width ruled rows.
 *
 * Opening a question is the signature: ink floods the row from the left and
 * the question inverts exactly where the edge passes, because a paper-coloured
 * copy of the row is clipped in step with the ink. The answer is printed in
 * paper colour, so the flood is what reveals it. Closing wipes the ink out to
 * the right. The + turns into an x.
 *
 * A real FAQ: buttons with aria-expanded / aria-controls, up/down/Home/End between
 * questions, single or multiple open, a #hash deep link per question with a
 * copy-link button, search with highlighted matches and an empty state that
 * hands off to contact, optional category chips and an optional ticker.
 * Colours come from presets (signal, cobalt, moss, carbon) with a designed dark
 * version of each, or from ink / paper props.
 *
 * Owner-supplied component (pasted 2026-10-15), copied as given apart from the
 * line breaks in two "\n" strings that the paste had split; the FAQ page adapts it.
 */

export type SlitPreset = "signal" | "cobalt" | "moss" | "carbon"

export type SlitPalette = {
  /** Background. */
  paper: string
  /** Type, rules and the flood. */
  ink: string
  /** Text on the flood. Defaults to whichever of paper, white or black reads best on the ink. */
  onInk?: string
}

export type FaqItem = {
  question: string
  /** Any node: paragraphs, links, lists. */
  answer: React.ReactNode
  /** Plain text of the answer for search, if `answer` is not a string. Extracted from the node when omitted. */
  answerText?: string
  /** Matches one of `categories`. */
  category?: string
  /** Stable id for the #hash deep link. Defaults to a slug of the question. */
  id?: string
}

export type SlitTypeFaqProps = {
  items?: FaqItem[]
  /** Display headline. Use "\n" for line breaks. Set in capitals. */
  headline?: string
  /** How much of each capital the slit hides at rest, 0 to 0.5. Hovering the headline lifts the letters clear. 0 sets it whole. */
  slit?: number
  /** One or two sentences under the headline. */
  intro?: React.ReactNode
  preset?: SlitPreset
  /** Override the light palette of the preset. */
  palette?: SlitPaletteInput
  /** Override the dark palette of the preset. */
  darkPalette?: SlitPaletteInput
  /** "auto" follows a `.dark` class on any ancestor (shadcn / Tailwind convention). */
  theme?: "auto" | "light" | "dark"
  /** "single" closes the open question when another opens. */
  type?: "single" | "multiple"
  /** Index or id of the question(s) open on first render. Pass [] for none. */
  defaultOpen?: number | string | (number | string)[]
  /** Controlled: the ids of the open questions. Pair with `onOpenChange`. */
  open?: string[]
  /** Prefixed to every question id, so two FAQs on one page never share a #hash. */
  idPrefix?: string
  /** Show the search field. */
  search?: boolean
  searchLabel?: string
  /** Category chips, filtered against `item.category`. Omit to hide the chips. */
  categories?: string[]
  /** Optional line of short phrases that runs between rules under the headline. */
  ticker?: string[]
  /** Closing row. Pass null to drop it. */
  contact?: { prompt: string; label: string; href: string } | null
  /** Show a copy-link button in each open answer. */
  copyLinks?: boolean
  /** Write the open question's id into location.hash. */
  syncHash?: boolean
  /** Minimum height of the section. Any CSS length. The default 0 lets the section size to its questions. */
  minHeight?: number | string
  /** Font stacks. Pass your own, e.g. "var(--font-sans)". */
  displayFont?: string
  textFont?: string
  onOpenChange?: (openIds: string[]) => void
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

const PRESETS: { [k: string]: { light: SlitPalette; dark: SlitPalette } } = {
  signal: {
    light: { paper: "#ffffff", ink: "#e10e17", onInk: "#ffffff" },
    dark: { paper: "#140c0c", ink: "#ff4a3d", onInk: "#140c0c" },
  },
  cobalt: {
    light: { paper: "#f6f7ff", ink: "#1d3cf5", onInk: "#ffffff" },
    dark: { paper: "#0b1030", ink: "#7b8cff", onInk: "#0b1030" },
  },
  moss: {
    light: { paper: "#f4f6ef", ink: "#1f4d2b", onInk: "#f4f6ef" },
    dark: { paper: "#0e1a12", ink: "#8fd19e", onInk: "#0e1a12" },
  },
  carbon: {
    light: { paper: "#f3f3f1", ink: "#111111", onInk: "#f3f3f1" },
    dark: { paper: "#131313", ink: "#f1f1ee", onInk: "#131313" },
  },
}

// #region logic
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "question"
  )
}

/** Ids for every item: its own id, or a slug of the question, made unique. */
export function itemIds(questions: string[], ids: (string | undefined)[]): string[] {
  const seen: { [k: string]: number } = {}
  return questions.map((q, i) => {
    const base = ids[i] || slugify(q)
    seen[base] = (seen[base] || 0) + 1
    return seen[base] > 1 ? base + "-" + seen[base] : base
  })
}

/** Lower-case words of a query; every word must appear somewhere in the text. */
export function queryWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

export function matches(text: string, query: string): boolean {
  const words = queryWords(query)
  if (!words.length) return true
  const t = text.toLowerCase()
  return words.every((w) => t.includes(w))
}

/** Splits text into plain and matched runs so matches can be marked. Overlapping words merge. */
export function highlightRuns(text: string, query: string): { text: string; hit: boolean }[] {
  const words = queryWords(query)
  if (!words.length || !text) return [{ text, hit: false }]
  const t = text.toLowerCase()
  const marks = new Array(text.length).fill(false)
  for (const w of words) {
    let at = t.indexOf(w)
    while (at > -1) {
      for (let k = at; k < at + w.length; k++) marks[k] = true
      at = t.indexOf(w, at + 1)
    }
  }
  const runs: { text: string; hit: boolean }[] = []
  for (let k = 0; k < text.length; k++) {
    const last = runs[runs.length - 1]
    if (last && last.hit === marks[k]) last.text += text[k]
    else runs.push({ text: text[k], hit: marks[k] })
  }
  return runs
}

/** A short excerpt of `text` around the first matched word, or "" when nothing matches. */
export function snippet(text: string, query: string, radius = 44): string {
  const words = queryWords(query)
  if (!words.length || !text) return ""
  const t = text.toLowerCase()
  let at = -1
  for (const w of words) {
    const i = t.indexOf(w)
    if (i > -1 && (at < 0 || i < at)) at = i
  }
  if (at < 0) return ""
  let from = Math.max(0, at - radius)
  let to = Math.min(text.length, at + radius * 2)
  if (from > 0) from = text.indexOf(" ", from) + 1 || from
  if (to < text.length) to = text.lastIndexOf(" ", to) > at ? text.lastIndexOf(" ", to) : to
  return (from > 0 ? "…" : "") + text.slice(from, to).trim() + (to < text.length ? "…" : "")
}

/** Which ids start open, from an index, an id, or a list of both. */
export function resolveOpen(spec: number | string | (number | string)[] | undefined, ids: string[], single: boolean, prefix = ""): string[] {
  if (spec === undefined) return []
  const list = Array.isArray(spec) ? spec : [spec]
  const out: string[] = []
  for (const s of list) {
    const named = typeof s === "string" ? (ids.includes(s) ? s : ids.includes(prefix + s) ? prefix + s : undefined) : undefined
    const id = typeof s === "number" ? ids[s] : named
    if (id && !out.includes(id)) out.push(id)
  }
  return single ? out.slice(0, 1) : out
}

/** Roving focus between question buttons. Returns -1 for keys it does not handle. */
export function nextFocus(key: string, i: number, n: number): number {
  if (!n) return -1
  if (key === "ArrowDown") return (i + 1) % n
  if (key === "ArrowUp") return (i - 1 + n) % n
  if (key === "Home") return 0
  if (key === "End") return n - 1
  return -1
}

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance of a #rgb or #rrggbb colour; NaN for anything else. */
export function luminance(hex: string): number {
  let h = hex.trim().replace("#", "")
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-f]{6}$/i.test(h)) return NaN
  const r = channel(parseInt(h.slice(0, 2), 16))
  const g = channel(parseInt(h.slice(2, 4), 16))
  const b = channel(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const x = luminance(a)
  const y = luminance(b)
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Text colour for the flood: the paper if it reads (4.5:1), else white or near-black, whichever reads better. */
export function pickOnInk(ink: string, paper: string): string {
  const onPaper = contrast(ink, paper)
  if (Number.isNaN(onPaper)) return paper
  if (onPaper >= 4.5) return paper
  return contrast(ink, "#ffffff") >= contrast(ink, "#111111") ? "#ffffff" : "#111111"
}
// #endregion

const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect

/** Plain text of a React node, for search. */
function nodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(" ")
  if (React.isValidElement(node)) return nodeText((node.props as { children?: React.ReactNode }).children)
  return ""
}

function Marked({ text, query }: { text: string; query: string }) {
  const runs = highlightRuns(text, query)
  return (
    <>
      {runs.map((r, k) =>
        r.hit ? (
          <mark key={k} className="stf-mark">
            {r.text}
          </mark>
        ) : (
          <React.Fragment key={k}>{r.text}</React.Fragment>
        ),
      )}
    </>
  )
}

function PlusIcon() {
  return (
    <span className="stf-cell" aria-hidden="true">
      <svg className="stf-plus" viewBox="0 0 32 32" fill="none">
        <path d="M16 1v30M1 16h30" stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  )
}

const DEFAULT_ITEMS: FaqItem[] = [
  {
    question: "What files should I send?",
    answer:
      "One PDF with a page per ink colour, each in greyscale. Pure black prints at full strength and grey prints as a screen, so set tints in grey, not in colour. Add 3 mm bleed and keep text 5 mm from the trim.",
  },
  {
    question: "How many ink colours can one print have?",
    answer:
      "Up to five. We run two machines with five drums between them, and every colour is its own pass through the press. Each extra colour adds about a day to the job.",
  },
  {
    question: "Why does every copy look slightly different?",
    answer:
      "Risograph is a stencil process. Layers can drift a millimetre or two against each other and solid areas pick up a little texture. That is the look. If a job needs exact registration, it belongs on an offset press.",
  },
  {
    question: "Which papers can you print on?",
    answer:
      "Uncoated stock from 90 to 300 gsm, in white, natural and about thirty colours. Soy ink never fully dries on coated or glossy paper, so we will not run it.",
  },
  {
    question: "What is the smallest run you take?",
    answer:
      "Fifty copies. Every colour needs its own master, and below fifty the masters cost more than the printing. Zines, posters and postcards can share masters in one batch.",
  },
  {
    question: "How long does an order take?",
    answer:
      "Five working days from the moment you approve the proof. Rush jobs ship in two working days for 30 percent more, when the drums are free.",
  },
  {
    question: "Can I see a proof before the full run?",
    answer:
      "A digital proof is free and arrives within a day. A printed proof costs £18, and we take it off the final invoice if you go ahead.",
  },
  {
    question: "Do you ship outside the UK?",
    answer:
      "Yes, tracked to Europe and North America. Prints travel flat between greyboard, and rolled posters go in a tube only if you ask for one.",
  },
]

const css = `
.stf {
  --stf-flood-in: 400ms;
  --stf-flood-out: 280ms;
  --stf-rule: 1px;
  --stf-ease-flood: cubic-bezier(0.76, 0, 0.24, 1);
  --stf-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --stf-gutter: clamp(16px, 4cqi, 64px);
  --p: var(--stf-paper-l);
  --k: var(--stf-ink-l);
  --o: var(--stf-on-l);
  position: relative;
  container-type: inline-size;
  width: 100%;
  box-sizing: border-box;
  background: var(--p);
  color: var(--k);
  font-family: var(--stf-text-font);
  -webkit-font-smoothing: antialiased;
  padding: clamp(56px, 8cqi, 120px) 0 clamp(48px, 6cqi, 96px);
}
:where(.dark) .stf[data-theme="auto"],
.stf[data-theme="dark"] {
  --p: var(--stf-paper-d);
  --k: var(--stf-ink-d);
  --o: var(--stf-on-d);
}
.stf *,
.stf *::before,
.stf *::after { box-sizing: border-box; }
.stf ::selection { background: var(--k); color: var(--o); }
.stf-wrap { padding: 0 var(--stf-gutter); }

.stf-title {
  margin: 0;
  font-family: var(--stf-display-font);
  font-weight: 900;
  font-size: clamp(44px, 14.6cqi, 172px);
  line-height: 0.84;
  letter-spacing: -0.045em;
  text-transform: uppercase;
  color: var(--k);
}
.stf-line {
  display: block;
  overflow: hidden;
  padding-top: 0.06em;
  margin-top: -0.06em;
}
.stf-title[data-slit="true"] { cursor: default; }
.stf-title { --stf-cut-k: 1; }
@container (max-width: 560px) {
  .stf-title { --stf-cut-k: 0.86; }
}
.stf-word { display: inline-block; white-space: nowrap; }
.stf-ch {
  display: inline-block;
  transform: translateY(calc(var(--stf-cut) * var(--stf-cut-k)));
  transition: transform 820ms var(--stf-ease-out);
  transition-delay: min(calc(var(--i) * 26ms), 420ms);
}
.stf[data-intro="pending"] .stf-ch {
  transform: translateY(104%);
  transition: none;
}
@media (hover: hover) and (pointer: fine) {
  .stf-title[data-slit="true"]:hover .stf-ch {
    transform: translateY(0);
    transition-duration: 420ms;
    transition-delay: min(calc(var(--i) * 14ms), 220ms);
  }
}

.stf-ticker {
  margin-top: clamp(28px, 3.4cqi, 48px);
  border-top: var(--stf-rule) solid var(--k);
  border-bottom: var(--stf-rule) solid var(--k);
  overflow: hidden;
  white-space: nowrap;
  font-size: clamp(15px, 1.7cqi, 24px);
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  padding: 0.55em 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.stf-ticker-mask {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}
.stf-ticker-toggle {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  appearance: none;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--k);
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease;
}
.stf-ticker-toggle svg { width: 14px; height: 14px; }
.stf-ticker-toggle:hover { background: var(--k); color: var(--o); }
.stf-ticker-toggle:focus-visible { outline: 2px solid var(--k); outline-offset: 2px; }
.stf-ticker-track { display: inline-flex; animation: stf-ticker 38s linear infinite; }
.stf-ticker:hover .stf-ticker-track,
.stf-ticker:focus-within .stf-ticker-track,
.stf-ticker[data-paused="true"] .stf-ticker-track { animation-play-state: paused; }
.stf-ticker-run { display: inline-flex; flex: none; }
.stf-ticker-run span { padding: 0 0.9em; }
.stf-ticker-run span::after { content: ""; display: inline-block; width: 0.38em; height: 0.38em; border-radius: 50%; background: var(--k); margin-left: 1.8em; vertical-align: 0.14em; }
@keyframes stf-ticker { to { transform: translateX(-50%); } }

.stf-meta {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 28px;
  margin: clamp(32px, 4.2cqi, 64px) 0 clamp(24px, 3cqi, 40px);
  align-items: end;
}
@container (min-width: 760px) {
  .stf-meta { grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 48px; }
}
.stf-intro {
  margin: 0;
  max-width: 34ch;
  font-size: clamp(17px, 1.45cqi, 21px);
  line-height: 1.45;
  font-weight: 500;
  letter-spacing: -0.01em;
}
.stf-search { position: relative; }
.stf-search label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 6px;
}
.stf-field { position: relative; display: flex; align-items: center; border-bottom: var(--stf-rule) solid var(--k); }
.stf-field svg { flex: none; width: 20px; height: 20px; margin-right: 10px; }
.stf-field input {
  flex: 1;
  min-width: 0;
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--k);
  font: inherit;
  font-size: clamp(18px, 1.6cqi, 22px);
  font-weight: 500;
  padding: 10px 0 12px;
  outline: none;
}
.stf-field input::placeholder { color: var(--k); opacity: 0.55; }
.stf-field input::-webkit-search-cancel-button { display: none; }
.stf-field:focus-within { box-shadow: 0 1px 0 var(--k); }
.stf-clear {
  flex: none;
  appearance: none;
  border: 0;
  background: none;
  color: var(--k);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  padding: 10px 0 10px 12px;
}
.stf-count { margin-top: 8px; font-size: 13px; font-weight: 500; font-variant-numeric: tabular-nums; min-height: 1.4em; }

.stf-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 clamp(20px, 2.4cqi, 32px); padding: 0; list-style: none; }
.stf-chip {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 1.5px solid var(--k);
  border-radius: 999px;
  background: transparent;
  color: var(--k);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 160ms ease, color 160ms ease, transform 120ms ease;
}
.stf-chip small { font-size: 12px; font-weight: 600; opacity: 0.75; font-variant-numeric: tabular-nums; }
.stf-chip[aria-pressed="true"] { background: var(--k); color: var(--o); }
.stf-chip:active { transform: scale(0.97); }
.stf-chip:focus-visible { outline: 2px solid var(--k); outline-offset: 3px; }

.stf-list { margin: 0; padding: 0; list-style: none; border-bottom: var(--stf-rule) solid var(--k); }
.stf-item { position: relative; border-top: var(--stf-rule) solid var(--k); }
.stf-fill {
  position: absolute;
  top: calc(var(--stf-rule) * -1);
  bottom: 0;
  left: calc(var(--stf-gutter) * -1);
  right: calc(var(--stf-gutter) * -1);
  background: var(--k);
  clip-path: inset(0 100% 0 0);
  pointer-events: none;
}
.stf-item[data-state="open"] .stf-fill { clip-path: inset(0 0 0 0); transition: clip-path var(--stf-flood-in) var(--stf-ease-flood); }
.stf-item[data-state="closing"] .stf-fill { clip-path: inset(0 0 0 100%); transition: clip-path var(--stf-flood-out) var(--stf-ease-flood); }

.stf-h { margin: 0; font: inherit; }
.stf-btn {
  position: relative;
  display: block;
  width: 100%;
  appearance: none;
  border: 0;
  margin: 0;
  padding: 0;
  background: none;
  color: var(--k);
  font: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.stf-btn:focus-visible { outline: none; }
.stf-btn::after {
  content: "";
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: calc(var(--stf-gutter) * -0.5);
  right: calc(var(--stf-gutter) * -0.5);
  box-shadow: inset 0 0 0 2px var(--k);
  opacity: 0;
  pointer-events: none;
}
.stf-item[data-state="open"] .stf-btn::after { box-shadow: inset 0 0 0 2px var(--o); }
.stf-btn:focus-visible::after { opacity: 1; }
.stf-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  min-height: 64px;
  padding: clamp(16px, 1.9cqi, 26px) 0;
  font-size: clamp(20px, 2.15cqi, 34px);
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.025em;
  text-wrap: balance;
}
.stf-btn:active .stf-plus { scale: 0.88; }
.stf-row--inv {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--stf-gutter) * -1);
  right: calc(var(--stf-gutter) * -1);
  padding-left: var(--stf-gutter);
  padding-right: var(--stf-gutter);
  color: var(--o);
  clip-path: inset(0 100% 0 0);
  pointer-events: none;
}
.stf-item[data-state="open"] .stf-row--inv { clip-path: inset(0 0 0 0); transition: clip-path var(--stf-flood-in) var(--stf-ease-flood); }
.stf-item[data-state="closing"] .stf-row--inv { clip-path: inset(0 0 0 100%); transition: clip-path var(--stf-flood-out) var(--stf-ease-flood); }
.stf-row--inv .stf-mark { background: var(--o); color: var(--k); }

.stf-label { display: block; transition: transform 240ms var(--stf-ease-out); }
.stf-snippet { display: block; margin-top: 8px; font-size: clamp(15px, 1.15cqi, 17px); font-weight: 500; line-height: 1.4; letter-spacing: -0.005em; opacity: 0.9; }
.stf-cell {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(44px, 3.9cqi, 56px);
  height: clamp(44px, 3.9cqi, 56px);
}
.stf-cell::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--k);
  clip-path: inset(0 100% 0 0);
  transition: clip-path 220ms var(--stf-ease-out);
}
.stf-row--inv .stf-cell::before { display: none; }
.stf-plus {
  position: relative;
  display: block;
  overflow: visible;
  width: clamp(22px, 2.2cqi, 32px);
  height: clamp(22px, 2.2cqi, 32px);
  transition: transform 280ms var(--stf-ease-out), scale 120ms ease;
}
.stf-item[data-state="open"] .stf-plus { transform: rotate(135deg); transition-duration: var(--stf-flood-in); }
@media (hover: hover) and (pointer: fine) {
  .stf-btn:hover .stf-label { transform: translateX(0.3em); }
  .stf-item[data-state="closed"] .stf-btn:hover .stf-cell::before { clip-path: inset(0 0 0 0); }
  .stf-item[data-state="closed"] .stf-btn:hover .stf-plus { color: var(--o); }
}
.stf-plus { transition: transform 280ms var(--stf-ease-out), scale 120ms ease, color 160ms ease; }
.stf-mark { background: var(--k); color: var(--o); border-radius: 0; }

.stf-panel {
  position: relative;
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 240ms var(--stf-ease-out);
}
.stf-item[data-state="open"] .stf-panel { grid-template-rows: 1fr; transition: grid-template-rows 360ms var(--stf-ease-out); }
.stf-panel-in { overflow: hidden; min-height: 0; }
.stf-item[data-state="closed"] .stf-panel-in { visibility: hidden; }
.stf-answer {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  padding: 0 0 clamp(24px, 2.8cqi, 40px);
  color: var(--o);
}
.stf-text {
  max-width: 58ch;
  font-size: clamp(17px, 1.45cqi, 21px);
  line-height: 1.5;
  font-weight: 500;
  letter-spacing: -0.005em;
}
.stf-text p { margin: 0 0 0.8em; text-wrap: pretty; }
.stf-text p:last-child { margin-bottom: 0; }
.stf-text a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
.stf-text .stf-mark { background: var(--o); color: var(--k); }
.stf-tools { display: flex; align-items: flex-start; gap: 16px; font-size: 14px; font-weight: 600; order: 1; }
.stf-tag { padding: 3px 10px; border: 1.5px solid var(--o); border-radius: 999px; font-size: 13px; }
.stf-copy {
  appearance: none;
  border: 0;
  background: none;
  padding: 9px 0;
  margin-top: -5px;
  color: var(--o);
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}
.stf-copy:focus-visible { outline: 2px solid var(--o); outline-offset: 3px; }
@container (min-width: 760px) {
  .stf-answer { grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); column-gap: 48px; row-gap: 20px; }
  .stf-text,
  .stf-tools { grid-column: 2; }
}

.stf-empty { padding: clamp(28px, 4cqi, 56px) 0; border-top: var(--stf-rule) solid var(--k); }
.stf-reset { color: var(--k); font-size: 16px; font-weight: 600; }
.stf-reset:focus-visible { outline-color: var(--k); }
.stf-empty p { margin: 0 0 14px; font-size: clamp(20px, 2.15cqi, 34px); font-weight: 700; letter-spacing: -0.025em; line-height: 1.15; }

.stf-contact {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px 32px;
  margin-top: clamp(36px, 5cqi, 72px);
}
.stf-contact p { margin: 0; font-size: clamp(22px, 2.6cqi, 40px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.05; }
.stf-cta {
  position: relative;
  display: inline-flex;
  min-height: 52px;
  border: 1.5px solid var(--k);
  border-radius: 999px;
  overflow: hidden;
  color: var(--k);
  text-decoration: none;
  font-size: clamp(16px, 1.35cqi, 19px);
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  transition: transform 140ms ease;
}
.stf-cta > span { display: inline-flex; align-items: center; gap: 12px; padding: 0 26px; }
.stf-cta > span + span {
  position: absolute;
  inset: 0;
  background: var(--k);
  color: var(--o);
  clip-path: inset(0 100% 0 0);
  transition: clip-path 360ms var(--stf-ease-flood);
}
.stf-cta svg { width: 18px; height: 18px; transition: transform 360ms var(--stf-ease-out); }
.stf-cta:hover > span + span,
.stf-cta:focus-visible > span + span { clip-path: inset(0 0 0 0); }
.stf-cta:hover svg,
.stf-cta:focus-visible svg { transform: translateX(4px); }
.stf-cta:active { transform: scale(0.98); }
.stf-cta:focus-visible { outline: 2px solid var(--k); outline-offset: 3px; }

.stf-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }

@media (prefers-reduced-motion: reduce) {
  .stf-ch,
  .stf[data-intro="pending"] .stf-ch { transform: translateY(calc(var(--stf-cut) * var(--stf-cut-k))); transition: none; }
  .stf-ticker-track { animation: none; }
  .stf-ticker-toggle { display: none; }
  .stf-fill,
  .stf-row--inv,
  .stf-panel,
  .stf-plus,
  .stf-label,
  .stf-cell::before,
  .stf-cta > span + span,
  .stf-cta svg,
  .stf-item[data-state] .stf-fill,
  .stf-item[data-state] .stf-row--inv,
  .stf-item[data-state] .stf-panel { transition: none !important; }
  .stf-btn:hover .stf-label { transform: none !important; }
  .stf-title[data-slit="true"]:hover .stf-ch { transition: none !important; }
}
`

function Headline({ text, id, slit }: { text: string; id: string; slit: boolean }) {
  let n = 0
  const lines = text.split("\n")
  return (
    <h2 className="stf-title" id={id} aria-label={lines.join(" ")} data-slit={slit ? "true" : "false"}>
      {lines.map((line, li) => (
        <span className="stf-line" key={li} aria-hidden="true">
          {line.split(" ").map((word, wi, words) => (
            <React.Fragment key={wi}>
              <span className="stf-word">
                {Array.from(word).map((ch, ci) => (
                  <span className="stf-ch" key={ci} style={{ ["--i" as string]: n++ } as React.CSSProperties}>
                    {ch}
                  </span>
                ))}
              </span>
              {wi < words.length - 1 ? " " : null}
            </React.Fragment>
          ))}
        </span>
      ))}
    </h2>
  )
}

export default function SlitTypeFaq({
  items = DEFAULT_ITEMS,
  headline = "Before you\nsend files",
  slit = 0.42,
  intro = "Riso is a stencil process with soy ink and real drums. Most surprises start with file setup, so here is what to know first.",
  preset = "signal",
  palette,
  darkPalette,
  theme = "auto",
  type = "single",
  defaultOpen = 0,
  open: openProp,
  idPrefix = "",
  search = true,
  searchLabel = "Search the answers",
  categories,
  ticker,
  contact = { prompt: "Still have a question?", label: "Email the press room", href: "mailto:hello@drumroom.press" },
  copyLinks = true,
  syncHash = false,
  minHeight = 0,
  displayFont = '"Inter Display", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", "Arial Black", Arial, sans-serif',
  textFont = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  onOpenChange,
  ariaLabel,
  className,
  style,
}: SlitTypeFaqProps) {
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const rootRef = React.useRef(null as HTMLElement | null)
  const btnRefs = React.useRef([] as (HTMLButtonElement | null)[])
  const timers = React.useRef({} as Record<string, number>)
  const single = type === "single"

  const ids = React.useMemo(
    () =>
      itemIds(
        items.map((it) => it.question),
        items.map((it) => it.id),
      ).map((id) => idPrefix + id),
    [items, idPrefix],
  )
  const answers = React.useMemo(() => items.map((it) => it.answerText ?? nodeText(it.answer)), [items])
  const texts = React.useMemo(() => items.map((it, i) => it.question + " " + answers[i]), [items, answers])

  const [openState, setOpenState] = React.useState(() => resolveOpen(defaultOpen, ids, single, idPrefix))
  const open = openProp ?? openState
  const openRef = React.useRef(open)
  openRef.current = open
  const controlledRef = React.useRef(false)
  controlledRef.current = openProp !== undefined
  const onChangeRef = React.useRef(onOpenChange)
  onChangeRef.current = onOpenChange
  const commit = React.useCallback((next: string[]) => {
    if (!controlledRef.current) setOpenState(next)
    onChangeRef.current?.(next)
  }, [])
  const [closing, setClosing] = React.useState([] as string[])
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState(null as string | null)
  const [copied, setCopied] = React.useState(null as string | null)
  const [tickerPaused, setTickerPaused] = React.useState(false)
  const [introState, setIntroState] = React.useState("pending" as "pending" | "done")

  const reduced = React.useCallback(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  )

  // The headline rises through its slit once, when the section first comes into view.
  React.useEffect(() => {
    const el = rootRef.current
    if (!el || reduced() || typeof IntersectionObserver === "undefined") {
      setIntroState("done")
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          requestAnimationFrame(() => setIntroState("done"))
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    const safety = window.setTimeout(() => setIntroState("done"), 2500)
    return () => {
      io.disconnect()
      window.clearTimeout(safety)
    }
  }, [reduced])

  // A #hash naming a question opens it and brings it into view.
  React.useEffect(() => {
    const fromHash = () => {
      const h = decodeURIComponent(location.hash.replace(/^#/, ""))
      if (!h || !ids.includes(h)) return
      const cur = openRef.current
      if (!cur.includes(h)) commit(single ? [h] : [...cur, h])
      const i = ids.indexOf(h)
      window.setTimeout(() => btnRefs.current[i]?.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" }), 60)
    }
    fromHash()
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  }, [ids, single, reduced, commit])

  React.useEffect(() => {
    const t = timers.current
    return () => Object.values(t).forEach((h) => window.clearTimeout(h))
  }, [])

  const beginClose = React.useCallback(
    (closeIds: string[]) => {
      if (!closeIds.length) return
      if (reduced()) return
      setClosing((cur) => [...cur.filter((c) => !closeIds.includes(c)), ...closeIds])
      for (const id of closeIds) {
        window.clearTimeout(timers.current[id])
        timers.current[id] = window.setTimeout(() => {
          setClosing((cur) => cur.filter((c) => c !== id))
        }, 300)
      }
    },
    [reduced],
  )

  // Whatever changes the open set (a click, a #hash, a controlled prop), a question that
  // closes wipes its ink out to the right before it is put away. Layout effect: the
  // closing state lands before paint, so the ink never blinks.
  const prevOpen = React.useRef(open)
  const openKey = open.join("|")
  useIsoLayoutEffect(() => {
    const prev = prevOpen.current
    const now = openRef.current
    prevOpen.current = now
    const added = now.filter((id) => !prev.includes(id))
    if (added.length) {
      for (const id of added) window.clearTimeout(timers.current[id])
      setClosing((cur) => cur.filter((c) => !added.includes(c)))
    }
    beginClose(prev.filter((id) => !now.includes(id)))
  }, [openKey, beginClose])

  const toggle = (id: string) => {
    const isOpen = open.includes(id)
    commit(isOpen ? open.filter((o) => o !== id) : single ? [id] : [...open, id])
    if (syncHash && typeof history !== "undefined") {
      // Closing clears the hash only if it names this question; a host page's own hash stays.
      const ownHash = decodeURIComponent(location.hash.replace(/^#/, "")) === id
      if (!isOpen || ownHash) history.replaceState(history.state, "", location.pathname + location.search + (isOpen ? "" : "#" + id))
    }
  }

  const copyLink = async (id: string) => {
    const url = location.origin + location.pathname + location.search + "#" + id
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = url
      ta.setAttribute("readonly", "")
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
      } catch {
        /* nothing else to try */
      }
      ta.remove()
    }
    setCopied(id)
    window.clearTimeout(timers.current["__copy"])
    timers.current["__copy"] = window.setTimeout(() => setCopied(null), 1800)
  }

  const counts = React.useMemo(() => {
    const out: Record<string, number> = {}
    items.forEach((it, i) => {
      if (it.category && matches(texts[i], query)) out[it.category] = (out[it.category] || 0) + 1
    })
    return out
  }, [items, texts, query])

  const allCount = texts.filter((t) => matches(t, query)).length

  const visible = items
    .map((it, i) => ({ it, i, id: ids[i] }))
    .filter(({ it, i }) => (!category || it.category === category) && matches(texts[i], query))

  const onKey = (e: React.KeyboardEvent, pos: number) => {
    const to = nextFocus(e.key, pos, visible.length)
    if (to < 0) return
    e.preventDefault()
    btnRefs.current[visible[to].i]?.focus()
  }

  const base = PRESETS[preset] ?? PRESETS.signal
  const light = { ...base.light, ...palette }
  const dark = { ...base.dark, ...darkPalette }
  const onLight = palette?.onInk ?? (palette?.ink || palette?.paper ? pickOnInk(light.ink, light.paper) : light.onInk)
  const onDark = darkPalette?.onInk ?? (darkPalette?.ink || darkPalette?.paper ? pickOnInk(dark.ink, dark.paper) : dark.onInk)

  // The slit sits on the baseline: each capital drops by a share of its cap height (about 0.72em).
  const cut = Math.min(0.5, Math.max(0, slit))
  const vars = {
    "--stf-cut": cut > 0 ? "calc(" + (cut * 0.72).toFixed(3) + "em + 0.05em)" : "0px",
    "--stf-paper-l": light.paper,
    "--stf-ink-l": light.ink,
    "--stf-on-l": onLight,
    "--stf-paper-d": dark.paper,
    "--stf-ink-d": dark.ink,
    "--stf-on-d": onDark,
    "--stf-display-font": displayFont,
    "--stf-text-font": textFont,
    minHeight: typeof minHeight === "number" ? minHeight + "px" : minHeight,
    ...style,
  } as React.CSSProperties

  const plainHeadline = headline.split("\n").join(" ")
  const filtering = query.trim() !== "" || category !== null

  return (
    <section
      ref={rootRef}
      className={"stf" + (className ? " " + className : "")}
      data-theme={theme}
      data-intro={introState}
      aria-label={ariaLabel ?? (headline ? undefined : "Frequently asked questions")}
      aria-labelledby={!ariaLabel && headline ? uid + "-h" : undefined}
      style={vars}
    >
      <style>{css}</style>
      <div className="stf-wrap">
        {headline ? <Headline text={headline} id={uid + "-h"} slit={cut > 0} /> : null}

        {ticker && ticker.length ? (
          <div className="stf-ticker" data-paused={tickerPaused ? "true" : "false"}>
            <p className="stf-sr">{ticker.join(". ")}</p>
            <div className="stf-ticker-mask" aria-hidden="true">
              <div className="stf-ticker-track">
                {[0, 1].map((copy) => (
                  <div className="stf-ticker-run" key={copy}>
                    {[...ticker, ...ticker].map((t, k) => (
                      <span key={k}>{t}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="stf-ticker-toggle"
              aria-label={tickerPaused ? "Play the moving line" : "Pause the moving line"}
              aria-pressed={tickerPaused}
              onClick={() => setTickerPaused((v) => !v)}
            >
              {tickerPaused ? (
                <svg viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3.5 2v10l8.5-5z" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 2h3v10H3zM8 2h3v10H8z" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>
        ) : null}

        {intro || search ? (
          <div className="stf-meta">
            {intro ? <p className="stf-intro">{intro}</p> : <span />}
            {search ? (
              <div className="stf-search" role="search">
                <label htmlFor={uid + "-q"}>{searchLabel}</label>
                <div className="stf-field">
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.6" />
                    <path d="m13 13 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  <input
                    id={uid + "-q"}
                    type="search"
                    autoComplete="off"
                    spellCheck={false}
                    value={query}
                    placeholder={"Try “" + (queryHint(items) || "shipping") + "”"}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && query) {
                        e.preventDefault()
                        setQuery("")
                      }
                      if (e.key === "ArrowDown" && visible.length) {
                        e.preventDefault()
                        btnRefs.current[visible[0].i]?.focus()
                      }
                    }}
                  />
                  {query ? (
                    <button type="button" className="stf-clear" onClick={() => setQuery("")}>
                      Clear
                    </button>
                  ) : null}
                </div>
                <div className="stf-count" aria-live="polite">
                  {filtering ? visible.length + " of " + items.length + " questions" : ""}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {categories && categories.length ? (
          <ul className="stf-chips" aria-label="Filter by topic">
            <li>
              <button type="button" className="stf-chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
                All <small>{allCount}</small>
              </button>
            </li>
            {categories.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  className="stf-chip"
                  aria-pressed={category === c}
                  onClick={() => setCategory(category === c ? null : c)}
                >
                  {c} <small>{counts[c] || 0}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {visible.length ? (
          <ul className="stf-list" aria-label={plainHeadline ? undefined : "Questions"}>
            {visible.map(({ it, i, id }, pos) => {
              const isOpen = open.includes(id)
              const state = isOpen ? "open" : closing.includes(id) ? "closing" : "closed"
              const btnId = uid + "-b-" + i
              const panelId = uid + "-p-" + i
              const excerpt = query.trim() && !isOpen ? snippet(answers[i], query) : ""
              const row = (inv: boolean) => (
                <span className={"stf-row" + (inv ? " stf-row--inv" : "")} aria-hidden={inv ? "true" : undefined}>
                  <span className="stf-label">
                    <Marked text={it.question} query={query} />
                    {excerpt ? (
                      <span className="stf-snippet">
                        <Marked text={excerpt} query={query} />
                      </span>
                    ) : null}
                  </span>
                  <PlusIcon />
                </span>
              )
              return (
                <li key={id} id={id} className="stf-item" data-state={state}>
                  <span className="stf-fill" aria-hidden="true" />
                  <h3 className="stf-h">
                    <button
                      ref={(el) => {
                        btnRefs.current[i] = el
                      }}
                      id={btnId}
                      type="button"
                      className="stf-btn"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggle(id)}
                      onKeyDown={(e) => onKey(e, pos)}
                    >
                      {row(false)}
                      {row(true)}
                    </button>
                  </h3>
                  <div
                    className="stf-panel"
                    id={panelId}
                    role="region"
                    aria-labelledby={btnId}
                  >
                    <div className="stf-panel-in">
                      <div className="stf-answer">
                        <div className="stf-text">
                          {typeof it.answer === "string" ? <p><Marked text={it.answer} query={query} /></p> : it.answer}
                        </div>
                        {copyLinks || it.category ? (
                          <div className="stf-tools">
                            {it.category ? <span className="stf-tag">{it.category}</span> : null}
                            {copyLinks ? (
                              <button type="button" className="stf-copy" onClick={() => copyLink(id)}>
                                {copied === id ? "Link copied" : "Copy link"}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="stf-empty" role="status">
            <p>Nothing here matches “{query.trim() || category}”.</p>
            <button
              type="button"
              className="stf-copy stf-reset"
              onClick={() => {
                setQuery("")
                setCategory(null)
              }}
            >
              Show every question
            </button>
          </div>
        )}

        {contact ? (
          <div className="stf-contact">
            <p>{contact.prompt}</p>
            <a className="stf-cta" href={contact.href}>
              <span>
                {contact.label} <Arrow />
              </span>
              <span aria-hidden="true">
                {contact.label} <Arrow />
              </span>
            </a>
          </div>
        ) : null}
        <span className="stf-sr" aria-live="polite">
          {copied ? "Link copied" : ""}
        </span>
      </div>
    </section>
  )
}

function Arrow() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 9h11M10 4.5 14.5 9 10 13.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** A word worth searching for, taken from the questions so the hint always finds something. */
function queryHint(items: FaqItem[]): string {
  const stop = new Set(["what", "which", "where", "when", "does", "should", "could", "would", "every", "there", "their", "about", "before", "after", "your", "from", "with", "have", "this", "that", "many", "much", "long", "take", "make", "copy", "look", "slightly", "different"])
  for (const it of items.slice(1)) {
    for (const w of it.question.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/)) {
      if (w.length > 4 && !stop.has(w)) return w
    }
  }
  return ""
}

// Declared after the JSX: the 21st CLI tokenizer hangs on generics before it.
export type SlitPaletteInput = Partial<SlitPalette>
