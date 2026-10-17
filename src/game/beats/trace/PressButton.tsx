/**
 * The drawing beat's tool button: bond orders, element symbols, Undo, Clear.
 *
 * Since A2 (2026-10-16) it is drawn by the game's one 3D button system
 * (app/ui/press.css), so a tool chip presses exactly like every other key in
 * the app. The press itself paints through CSS `:active` on pointer down, the
 * same frame the finger lands and before `onPress` runs, which is the press
 * contract in CLAUDE.md.
 *
 * Labels keep their case (`btn3d--keepcase`): these are element symbols and
 * bond orders, and "Cl" shouted as "CL" is a different thing.
 */

import type { CSSProperties, ReactNode } from "react";
import { pressClassName } from "../../app/ui/Press";

export type PressTone = "primary" | "quiet" | "ghost";

export interface PressButtonProps {
  readonly onPress: () => void;
  readonly children: ReactNode;
  readonly tone?: PressTone;
  readonly disabled?: boolean;
  readonly selected?: boolean;
  readonly label?: string;
  readonly style?: CSSProperties;
}

const TONE_VARIANT = { primary: "primary", quiet: "secondary", ghost: "ghost" } as const;

export function PressButton({
  onPress,
  children,
  tone = "quiet",
  disabled = false,
  selected = false,
  label,
  style,
}: PressButtonProps) {
  const classes = [
    pressClassName({ variant: TONE_VARIANT[tone], size: "sm" }),
    "btn3d--keepcase",
    selected ? "btn3d--selected" : "",
  ].join(" ");

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      className={classes}
      onClick={() => {
        if (!disabled) onPress();
      }}
      style={style}
    >
      {children}
    </button>
  );
}
