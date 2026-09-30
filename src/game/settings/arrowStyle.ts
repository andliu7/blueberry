/**
 * How a push is DRAWN while the finger is down, chosen by the student.
 *
 * WHY THIS IS A SETTING AT ALL. question.ts derives the drawing from the
 * question's kind (curved arrows on resonance, the arrowless dashed guide on
 * everything else), and that stays the default. The owner asked on
 * 2026-09-29 for a way to pick it: "make it so you can adjust the arrow in the
 * settings. like dragging curved arrow, or dragging a straight-dashed bond."
 * Some students think in curved arrows because their exam asks for them; some
 * find the straight guide easier to aim on a phone.
 *
 * THE INTEGRITY LINE. This is presentation and nothing else. The grader reads
 * the committed arrows (grade.ts `gradeDrawing(step, arrows)`) and never this
 * store, so the same pushes earn the same verdict under every style.
 * arrowStyle.test.ts and pilotArrowStyleWiring.test.ts pin that.
 *
 * WHAT EACH OPTION MEANS, as two answers: the DRAG (what follows the finger)
 * and the RECORD (what a committed push rests as).
 *
 *   auto     both follow the question's kind, exactly as before this file
 *   curved   the curved arrow follows the finger and stays as the tapered
 *            arrow, on every kind of question
 *   dashed   the straight dashed guide follows the finger; the record still
 *            follows the kind, so a push becomes the ARROW on a resonance
 *            find (where the arrow is the answer) and the FORMING BOND on a
 *            reaction, which is the owner's sentence read literally
 *
 * Same store shape as settings/pka.ts: a plain object with subscribe and
 * getSnapshot, so a component reads it with useSyncExternalStore and every
 * reader re-renders together when it changes.
 */

import { browserStorage, type SettingsStorage } from "./pka";

export type ArrowStyle = "auto" | "curved" | "dashed";

export const ARROW_STYLES: readonly ArrowStyle[] = Object.freeze(["auto", "curved", "dashed"]);

export const DEFAULT_ARROW_STYLE: ArrowStyle = "auto";

export const ARROW_STYLE_KEY = "blueberry.arrowStyle.v1";

/** What the canvas is told: how the drag looks, and what a committed push rests as. */
export interface ArrowPresentation {
  readonly drag: "curved" | "dashed";
  readonly curvedRecord: boolean;
}

/**
 * The whole rule. `kindIsCurved` is question.ts's `curvedArrowsFor(kind)`,
 * passed in so this file never learns what a question kind is.
 */
export function arrowPresentation(style: ArrowStyle, kindIsCurved: boolean): ArrowPresentation {
  if (style === "curved") return { drag: "curved", curvedRecord: true };
  if (style === "dashed") return { drag: "dashed", curvedRecord: kindIsCurved };
  return { drag: kindIsCurved ? "curved" : "dashed", curvedRecord: kindIsCurved };
}

function isArrowStyle(value: unknown): value is ArrowStyle {
  return typeof value === "string" && (ARROW_STYLES as readonly string[]).includes(value);
}

function load(storage: SettingsStorage): ArrowStyle {
  try {
    const raw = storage.getItem(ARROW_STYLE_KEY);
    if (raw === null) return DEFAULT_ARROW_STYLE;
    const parsed = JSON.parse(raw) as { style?: unknown };
    // An unknown value (a style removed in a later build, a hand edit) reads
    // as the default rather than as a broken canvas.
    return isArrowStyle(parsed.style) ? parsed.style : DEFAULT_ARROW_STYLE;
  } catch {
    return DEFAULT_ARROW_STYLE;
  }
}

export interface ArrowStyleSource {
  getSnapshot(): ArrowStyle;
  subscribe(listener: () => void): () => void;
  set(style: ArrowStyle): void;
}

export function createArrowStyle(storage: SettingsStorage = browserStorage()): ArrowStyleSource {
  let snapshot = load(storage);
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(style) {
      // Idempotent, for the same reason pka.ts's setPreset is: the control
      // fires on pointer down AND on click so the keyboard works.
      if (!isArrowStyle(style) || style === snapshot) return;
      snapshot = style;
      storage.setItem(ARROW_STYLE_KEY, JSON.stringify({ style }));
      for (const listener of listeners) listener();
    },
  };
}

/** One instance for the app, module scope like `pkaSettings`. */
export const arrowStyleSetting: ArrowStyleSource = createArrowStyle();
