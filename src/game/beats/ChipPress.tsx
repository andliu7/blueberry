/**
 * The lesson's action key (CHECK, CONTINUE, KEEP GOING, UNDO).
 *
 * A2 round 2 (2026-10-16): this is now the shared 3D key from app/ui/press.css
 * and nothing else. The lesson used to draw its own chip with its own rim,
 * size and disabled look, which is why CHECK read as a different object from
 * START and every other button. Now every lesson button is the same full-width
 * key with the same lip, and only its COLOUR changes with the state:
 *
 *   check  green "go" key (Check, Continue, Start). A2 round 4: the lesson's
 *          commit key is green, not the brand violet, so the answer moment
 *          has its own colour: flat grey slab while nothing is picked, green
 *          once it is live, then the tray's own green or red
 *   claim  green, the collect action
 *   won    green, the key on a right-answer tray
 *   near   red, the key on a wrong-answer tray (owner direction 2026-10-15:
 *          green right, red wrong; it used to be amber)
 *   quiet  the white secondary key (Undo, Adjust, Skip)
 *
 * The `chip-press` and `chip-press--<variant>` classes stay on the element as
 * plain markers: tests and a few stylesheets find the lesson's buttons by
 * them. They carry no look of their own any more.
 *
 * `block` (default true) makes the key fill its row, the way the main action
 * sits docked at the bottom of a lesson. Pass block={false} for a key that
 * shares a row with another one.
 */

import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { pressClassName, type PressVariant } from "../app/ui/Press";
import "../app/ui/press.css";
import "./beat-chrome.css";

export type ChipVariant = "check" | "claim" | "quiet" | "won" | "near";

const PRESS_VARIANT: Record<ChipVariant, PressVariant> = {
  check: "success",
  claim: "success",
  won: "success",
  near: "danger",
  quiet: "secondary",
};

export interface ChipPressProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ChipVariant;
  readonly block?: boolean;
  readonly children: ReactNode;
  /** React 19 passes `ref` as an ordinary prop, so it rides in `rest` onto the button. */
  readonly ref?: Ref<HTMLButtonElement>;
}

export function ChipPress({ variant = "check", block = true, className = "", children, ...rest }: ChipPressProps) {
  const look = pressClassName({ variant: PRESS_VARIANT[variant], size: "lg", block });
  return (
    <button type="button" {...rest} className={`${look} chip-press chip-press--${variant} ${className}`}>
      {children}
    </button>
  );
}
