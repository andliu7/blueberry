/**
 * How long since the student last touched anything, as a stage the berry can
 * react to: thinking after 15s mid-item, bored after 20s on an ambient screen.
 *
 * The rule is the pure `idleStage` below and the hook is only the clock, so the
 * thresholds are tested without a DOM. One timeout is scheduled for the next
 * threshold rather than a polling interval, so an idle page costs nothing.
 *
 * "Input" is a press, a key, a wheel or a touch. Pointer moves are not input:
 * a student reading a problem moves the mouse without doing anything.
 *
 * The stage HOLDS until input arrives, which is what makes the bored sigh fire
 * once per idle spell: the caller plays it when the stage becomes "bored", and
 * the stage does not change again until the student is back.
 */

import { useEffect, useState } from "react";
import { IDLE } from "./bloomMotion";

/** Where the berry is standing. `off` never goes idle. */
export type IdleContext = "midItem" | "ambient" | "off";
export type IdleStage = "active" | "thinking" | "bored";

/**
 * The stage after `msSinceInput` of quiet. Thinking belongs only to an
 * unanswered item (a quiet ambient screen is not a stuck student) and bored
 * only to an ambient screen (sighing at somebody mid-problem is pressure).
 */
export function idleStage(msSinceInput: number, context: IdleContext): IdleStage {
  if (context === "midItem" && msSinceInput >= IDLE.thinkingAfterMs) return "thinking";
  if (context === "ambient" && msSinceInput >= IDLE.boredAfterMs) return "bored";
  return "active";
}

/** Ms until `idleStage` would next change with no input, or null if it never will. */
export function msUntilNextStage(msSinceInput: number, context: IdleContext): number | null {
  const threshold =
    context === "midItem" ? IDLE.thinkingAfterMs : context === "ambient" ? IDLE.boredAfterMs : null;
  if (threshold === null || msSinceInput >= threshold) return null;
  return threshold - msSinceInput;
}

const INPUT_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * `resetKey` restarts the quiet clock when it changes, e.g. the item id, so a
 * new question starts fresh even if the student has not touched anything.
 */
export function useIdleInput(context: IdleContext, resetKey?: unknown): IdleStage {
  const [stage, setStage] = useState<IdleStage>("active");

  useEffect(() => {
    let lastInput = performance.now();
    let timer: number | undefined;
    const check = () => {
      const since = performance.now() - lastInput;
      // Setting the same value is free: React skips the render when it has not changed.
      setStage(idleStage(since, context));
      window.clearTimeout(timer);
      const wait = msUntilNextStage(since, context);
      if (wait !== null) timer = window.setTimeout(check, wait);
    };
    const onInput = () => {
      lastInput = performance.now();
      check();
    };
    check();
    if (context === "off") return undefined;
    for (const name of INPUT_EVENTS) window.addEventListener(name, onInput, { capture: true, passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const name of INPUT_EVENTS) window.removeEventListener(name, onInput, { capture: true });
    };
  }, [context, resetKey]);

  return stage;
}
