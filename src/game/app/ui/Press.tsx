/**
 * The one button. Every text button in the game is this, or is a link
 * wearing the same classes through `pressClassName`.
 *
 * THE LOOK (A2, 2026-10-16): a chunky 3D key. A flat face over a solid
 * darker lip; pressing drops the face onto the lip. All of it is CSS in
 * press.css, painted through `:active` on pointer down, so the press is
 * acknowledged the same frame the finger lands, before any work runs (the
 * press contract in CLAUDE.md). `busy` holds the key down with a pulsing dot
 * while a slow action runs, so nothing ever waits silently.
 *
 * Variants:
 *   primary    brand violet face, white label. The one main action on a screen
 *   secondary  white face, soft violet rim and lip. Every other action
 *   danger     red face, white label. Destructive acts only (delete, reset)
 *   ghost      flat text button. Back, skip, cancel
 *   success    green face, dark label. CHECK in a lesson, and the key on a
 *              right-answer tray (beats/AnswerTray.tsx)
 *
 * A wrong-answer tray uses `danger` (A2 round 4, green right and red wrong);
 * the amber `warn` key it used to wear is gone.
 *
 * Sizes: sm (44px tall), md (48px, default), lg (52px). `block` fills the row.
 * The minimum hit target is 44 by 44 at every size.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./press.css";

export type PressVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
export type PressSize = "sm" | "md" | "lg";

export interface PressStyle {
  readonly variant?: PressVariant;
  readonly size?: PressSize;
  readonly block?: boolean;
}

/**
 * The class string for a 3D button. Exported so an `<a>` that navigates can
 * look exactly like a Press without pretending to be a <button>.
 */
export function pressClassName({ variant = "primary", size = "md", block = false }: PressStyle = {}): string {
  const parts = ["btn3d", `btn3d--${variant}`];
  if (size !== "md") parts.push(`btn3d--${size}`);
  if (block) parts.push("btn3d--block");
  return parts.join(" ");
}

export interface PressProps extends ButtonHTMLAttributes<HTMLButtonElement>, PressStyle {
  /** The action is running. The button stays pressed-looking and says so. */
  readonly busy?: boolean;
  readonly children: ReactNode;
}

export function Press({
  variant = "primary",
  size = "md",
  block = false,
  busy = false,
  className = "",
  children,
  disabled,
  ...rest
}: PressProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`${pressClassName({ variant, size, block })} ${busy ? "is-busy" : ""} ${className}`}
    >
      {busy ? <span className="busy-dot" aria-hidden /> : null}
      {children}
    </button>
  );
}
