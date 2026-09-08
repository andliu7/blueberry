/**
 * The one button. Every control in the shell is this or is styled like it.
 *
 * The press contract in CLAUDE.md: the pressed state renders on pointer down,
 * before any work happens. The `.press` class in theme.css does that through
 * `:active`, which the browser paints the same frame the pointer lands, with
 * no JavaScript in the path. `busy` continues the acknowledgement as a loading
 * affordance when the action takes time, so nothing ever waits silently.
 *
 * The minimum size is 44 by 44, the hit target floor in the Budgets table.
 *
 * EVERY VARIANT CARRIES A REAL OUTLINE AND NO SHADOW, and that is the lavender
 * turn arriving at button scale.
 *
 * On a cream card sitting on a lavender ground the card edge measures 1.96:1,
 * under the 3:1 a boundary needs, so the card carries a border. A control is the
 * same shape one level down: it is a sticker pressed onto the sheet, and what
 * makes a flat fill read as a cut-out is the cut, not a shadow under it.
 * Sticker rule 3 says the same thing from the other direction ("outlined buttons
 * are first-class, never a fallback") and rule 3's shadow ban applies to chrome
 * outright. So `shadow-sm` is gone from all four variants and a 2px outline is
 * on all four, INCLUDING ghost: a transparent border would satisfy a
 * border-width check and satisfy nothing a reader can see, which is the sort of
 * fix this repo does not make.
 *
 * The radius is 1rem rather than 9px. The sticker language's floor is 12px and
 * the audit was reporting 9 on this exact element, 28 rows of it.
 *
 * The reward variant WAS a two-stop gradient. Rule 2 forbids gradients outright
 * and the audit was right to say so; it is a flat fill of --accent-from now,
 * which carries white at 7.18:1.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "reward";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "border-2 border-[color:var(--bb-primary-edge)] bg-bb-primary text-bb-primary-foreground",
  secondary: "border-2 border-bb-border bg-bb-card text-bb-foreground",
  ghost: "border-2 border-bb-border bg-transparent text-bb-foreground",
  reward: "border-2 border-[color:var(--bb-primary-edge)] bg-[color:var(--accent-from)] text-white",
};

export interface PressProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant;
  /** The action is running. The button stays pressed-looking and says so. */
  readonly busy?: boolean;
  readonly children: ReactNode;
}

export function Press({
  variant = "primary",
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
      className={`press inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-2xl px-5 text-scale-base font-semibold disabled:opacity-60 ${VARIANT_CLASS[variant]} ${busy ? "is-busy" : ""} ${className}`}
    >
      {busy ? <span className="busy-dot" aria-hidden /> : null}
      {children}
    </button>
  );
}
