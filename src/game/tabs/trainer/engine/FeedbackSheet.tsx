/**
 * The answer sheet: the verdict, rising from the bottom edge of the screen.
 *
 * THE MOTION IS DUOLINGO'S, MEASURED. Recorded on 2026-09-15 from the live
 * web app (session scratchpad phase4/bar/BAR.md): the sheet enters from
 * translateY(100%) to 0 over 200 ms on cubic-bezier(0.35, 1.8, 0.35, 0.83),
 * a spring that overshoots about 11 percent at 80 ms and lands at 200 ms. It
 * has no exit animation; it is simply gone when the student moves on. The
 * primary button never moves: the sheet slides up BEHIND it, which is why
 * TrainerScreen draws the button rows above this layer and passes their
 * height in as `bottomInset`.
 *
 * WHY THE WEB ANIMATIONS API. `element.animate` is the browser's own one-shot
 * animation call. It keeps the curve beside the comment that explains it,
 * with no keyframes added to the shared stylesheet, and the effect's cleanup
 * cancels it, which also stops StrictMode's double-invoked effect stacking a
 * second identical animation.
 * jsdom has no `animate`, so the call is guarded and tests see the sheet at
 * rest, which is also what reduced motion gets.
 *
 * ONE STEP AT A TIME. The sheet opens on its headline. Each tap on the layer
 * button reveals the next layer, whose name the button carries, so the whole
 * explanation never arrives at once. The newest layer is scrolled into view;
 * the text area is capped so the sheet never buries the canvas.
 */

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { SheetContent, SheetTone } from "./sheetCopy";

export const RISE_MS = 200;
const RISE_EASING = "cubic-bezier(0.35, 1.8, 0.35, 0.83)";

// The tint is laid over the page's own opaque ground: the soft tints are
// translucent in dark theme, and the sheet sits over the canvas, so without
// the ground the molecule would show through the text.
const TONE: Readonly<Record<SheetTone, { readonly tint: string; readonly ink: string }>> = {
  good: { tint: "var(--good-soft)", ink: "var(--good-ink)" },
  wrong: { tint: "var(--bb-card)", ink: "var(--bb-foreground)" },
  nearMiss: { tint: "var(--not-requested-soft)", ink: "var(--not-requested)" },
  partial: { tint: "var(--bb-muted)", ink: "var(--bb-foreground)" },
};

export interface FeedbackSheetProps {
  readonly content: SheetContent;
  /** Height of the button rows the sheet slides up behind, in px. */
  readonly bottomInset: number;
  readonly reducedMotion: boolean;
  /** Extra hooks the fork tests read (data-branch-verdict). */
  readonly dataAttributes?: Readonly<Record<string, string>>;
  /**
   * The mascot, reacting. It rides on the sheet, at the end of the layer
   * row, because the sheet covers the canvas corner it normally sits in and
   * a mascot floated above the sheet would land on the molecule.
   */
  readonly companion?: ReactNode;
}

export function FeedbackSheet({ content, bottomInset, reducedMotion, dataAttributes, companion }: FeedbackSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const layersRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(0);

  // The rise, once per mount. TrainerScreen keys the sheet on the verdict, so
  // a new verdict is a new mount and rises again. The animation starts one
  // frame AFTER the commit: the verdict's mount frame is expensive, and an
  // animation started inside it gets its start time back-dated, so the launch
  // (98 percent of the travel in the first 50 ms) was never painted. Until
  // that frame the sheet holds off-screen via an inline transform the
  // animation then replaces.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (sheet === null || reducedMotion || typeof sheet.animate !== "function") return;
    sheet.style.transform = "translateY(100%)";
    let rise: Animation | undefined;
    const frame = requestAnimationFrame(() => {
      sheet.style.transform = "";
      rise = sheet.animate([{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: RISE_MS, easing: RISE_EASING });
    });
    return () => {
      cancelAnimationFrame(frame);
      rise?.cancel();
      sheet.style.transform = "";
    };
  }, [reducedMotion]);

  // Bring the layer just opened into view inside the capped text area, its
  // label clear of the top edge, and keep a fade at that edge whenever text
  // is scrolled out above so nothing disappears without a cue.
  const [scrolledPast, setScrolledPast] = useState(false);
  useLayoutEffect(() => {
    const box = layersRef.current;
    if (box === null || opened === 0) return;
    const newest = box.lastElementChild;
    if (newest instanceof HTMLElement) box.scrollTop = Math.max(0, newest.offsetTop - box.offsetTop - 24);
    setScrolledPast(box.scrollTop > 1);
  }, [opened]);

  const tone = TONE[content.tone];
  const next = content.layers[opened];
  const shown = content.layers.slice(0, opened);

  return (
    <section
      ref={sheetRef}
      // The sheet hangs 40 px past the screen edge (the class less the
      // parent's own padding), which is the overshoot skirt: the
      // spring lifts the sheet 11.1 percent past rest, which on the tallest
      // sheet (~280 px on a miss) is 31 px, so a 28 px skirt still let a
      // 2 px line of page show; 40 covers sheets to ~360 px (the bar paints
      // its band past the screen bottom for the same reason).
      className="absolute -bottom-[60px] -left-4 -right-4 z-[5] flex flex-col gap-2 border-t-2 border-bb-border px-4 pt-4"
      style={{ paddingBottom: bottomInset + 32 + 40, background: `linear-gradient(${tone.tint}, ${tone.tint}), var(--bb-background)` }}
      aria-live="polite"
      data-answer-sheet={content.tone}
      {...dataAttributes}
    >
      <p className="text-scale-lg font-bold leading-snug" style={{ color: tone.ink }} data-sheet-headline>
        {content.headline}
      </p>
      {content.caption !== undefined ? (
        <p className="text-scale-sm font-semibold leading-snug text-bb-foreground" data-sheet-caption>
          {content.caption}
        </p>
      ) : null}
      {shown.length > 0 ? (
        <div
          ref={layersRef}
          // The cap budgets from the room that is actually left, not a
          // constant: a miss carries one more button row than a win, so its
          // bottomInset is a full row taller, and a flat 200 px cap left a
          // 45 px canvas strip at 375x667 while the copy said to look at
          // the molecule. The 418 px term is the header, prompt, the
          // sheet's own chrome and the workbench a student must still be
          // able to see: measured, it leaves ~120 px of canvas on a fully
          // open miss at 375x667, where 380 left 82. It only bites on the
          // tall-inset miss at short heights, where it trades layer box for
          // canvas, and the layers scroll. The top fade appears once anything has
          // scrolled out above.
          className="flex flex-col gap-2 overflow-y-auto"
          style={{
            // The 96 px floor keeps the box readable on heights the budget
            // cannot serve; below that, scrolling beats vanishing.
            maxHeight: `min(34vh, 200px, max(96px, calc(100dvh - ${bottomInset + 418}px)))`,
            ...(scrolledPast ? { maskImage: "linear-gradient(to bottom, transparent 0, black 16px)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0, black 16px)" } : {}),
          }}
          onScroll={(event) => setScrolledPast(event.currentTarget.scrollTop > 1)}
          data-sheet-layers
        >
          {shown.map((layer) => (
            <div key={layer.label} className="fade-in">
              <p className="text-scale-xs font-bold uppercase tracking-wide" style={{ color: tone.ink }}>
                {layer.label.replace(/\?$/, "")}
              </p>
              <p className="text-scale-sm leading-snug text-bb-foreground">{layer.text}</p>
            </div>
          ))}
        </div>
      ) : null}
      {next !== undefined || opened > 0 || companion !== undefined ? (
        <div className="flex items-end justify-between gap-3">
          {next !== undefined || opened > 0 ? (
          <button
            type="button"
            className="press rounded-full border-2 border-bb-border bg-bb-card px-4 py-1.5 text-scale-sm font-semibold text-bb-foreground"
            onClick={() => setOpened(next !== undefined ? opened + 1 : 0)}
            data-sheet-next={next !== undefined ? next.label : "hide"}
          >
            {next !== undefined ? next.label : "Hide"}
          </button>
          ) : <span />}
          {companion !== undefined ? <div className="pointer-events-none -mb-1 shrink-0">{companion}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
