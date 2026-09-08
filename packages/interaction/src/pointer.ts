/**
 * Pointer input, in the only vocabulary this package understands.
 *
 * Nothing here is a DOM type. A `PointerEvent` in a browser and a
 * `GestureResponderEvent` in React Native are both adapted, at the shell
 * boundary, into the plain data below. That is the whole reason this package can
 * be tested with an object literal and no browser.
 *
 * THREE POINTER TYPES, NOT TWO.
 *
 * `pen` is its own kind, never folded into `touch`. D11 in
 * docs/INHERITED-DECISIONS.md names iPad Safari with an Apple Pencil as a
 * target, and the two behave differently in ways the state machine acts on:
 * a pen preempts a touch that is already drawing, a pen carries pressure, and a
 * pen tip is an order of magnitude more precise than a fingertip, which is a
 * number the hit tester needs.
 *
 * PRESSURE NEVER GATES A TRANSITION.
 *
 * Pressure is metadata. It is passed through for renderers that want to vary
 * stroke weight, and it is never read to decide whether something happened. The
 * reason is concrete: a stylus with no pressure support, and some hardware at
 * the instant of contact, report 0. Any rule of the form "pressure above X means
 * the pen is down" makes those devices unable to draw at all. Contact is decided
 * by pointerDown and pointerUp, which every platform reports honestly.
 */

export type PointerKind = "mouse" | "touch" | "pen";

/**
 * A point in canvas coordinates, whatever the shell decided those are.
 *
 * Not screen pixels, not molecular angstroms. The shell converts its native
 * coordinates once, on the way in, and the geometry package works in the same
 * space. chem-core's `Point3` is a different thing entirely: that is chemistry
 * geometry in angstroms and it never appears in this package.
 */
export interface Point2 {
  readonly x: number;
  readonly y: number;
}

export function distance2(a: Point2, b: Point2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * One raw pointer report from a shell.
 *
 * `timestampMs` is recorded and never used to decide anything. See machine.ts:
 * this package owns no timers, so there is no window a fast tap can fall outside
 * of.
 */
export interface PointerInput {
  readonly pointerId: number;
  readonly pointerType: PointerKind;
  readonly point: Point2;
  readonly timestampMs: number;
  /** Absent means the device did not report pressure. See readPressure. */
  readonly pressure?: number;
  /**
   * Mouse only. Absent means primary. A right or middle button opens a context
   * menu or scrolls; it must never draw an arrow.
   */
  readonly buttonIsPrimary?: boolean;
}

/**
 * What we believe about pressure, kept separate from whether we can believe it.
 *
 * `supported: false` tells a renderer "do not modulate anything by this number,
 * it is a stand in".
 */
export interface PressureReading {
  readonly supported: boolean;
  /** Always finite, always within 0 and 1 inclusive. */
  readonly value: number;
}

/**
 * What a pen with no pressure support is treated as.
 *
 * Browsers report 0.5 for a pointer that is down and cannot measure force, so
 * matching that number keeps a supporting and a non supporting pen visually
 * identical rather than making one of them thin.
 */
export const PEN_PRESSURE_WHEN_UNSUPPORTED = 0.5;

/** A mouse click and a fingertip are treated as full contact. */
export const PRESSURE_WHEN_NOT_A_PEN = 1;

export function readPressure(input: PointerInput): PressureReading {
  if (input.pointerType !== "pen") {
    return { supported: false, value: PRESSURE_WHEN_NOT_A_PEN };
  }
  const raw = input.pressure;
  if (raw === undefined || !Number.isFinite(raw)) {
    return { supported: false, value: PEN_PRESSURE_WHEN_UNSUPPORTED };
  }
  // A pen that reports a constant 0.5 forever is indistinguishable from a pen
  // genuinely held at half pressure without keeping a history, and keeping a
  // history to guess would be a heuristic that is wrong sometimes and silent
  // about it. We report what the device said and let the renderer decide.
  return { supported: true, value: Math.min(1, Math.max(0, raw)) };
}

/** Absent `buttonIsPrimary` means primary, because touch and pen have no buttons. */
export function isPrimaryButton(input: PointerInput): boolean {
  return input.buttonIsPrimary ?? true;
}
