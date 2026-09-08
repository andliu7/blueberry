/**
 * A button that acknowledges the press on pointer down, before anything else.
 *
 * CLAUDE.md makes this a contract rather than a nicety: "Every button has a
 * pressed state that renders on pointer down, not on completion", and pointer
 * down to visible acknowledgement is inside the same under 100 ms budget as
 * everything else. This component exists so that contract is one visible piece
 * of code rather than a habit every surface has to remember.
 *
 * WHY IT IS STATE AND NOT `:active`. `:active` would do the job in CSS, but
 * this piece owns no stylesheet (theme.css and tokens.css belong to the shell)
 * and, more usefully, a reader can see the rule here: `onPointerDown` sets
 * `pressed`, the transform renders from it, and `onClick` runs afterwards. If
 * the click ever grows an await, the acknowledgement has already happened.
 *
 * `useState` in a component this small is the boring choice on purpose. It
 * re-renders one button.
 */

import { useState, type CSSProperties, type ReactNode } from "react";

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

const TONE_STYLE: Record<PressTone, CSSProperties> = {
  primary: {
    background: "var(--bb-primary)",
    color: "var(--bb-primary-foreground)",
    border: "1px solid var(--bb-primary)",
  },
  quiet: {
    background: "var(--bb-card)",
    color: "var(--bb-card-foreground)",
    border: "1px solid var(--bb-border)",
  },
  ghost: {
    background: "transparent",
    color: "var(--bb-muted-foreground)",
    border: "1px solid transparent",
  },
};

export function PressButton({
  onPress,
  children,
  tone = "quiet",
  disabled = false,
  selected = false,
  label,
  style,
}: PressButtonProps) {
  const [pressed, setPressed] = useState(false);

  const release = () => setPressed(false);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      // The acknowledgement. Synchronous, first thing, before onPress can run.
      onPointerDown={() => setPressed(true)}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onClick={() => {
        if (!disabled) onPress();
      }}
      style={{
        // 44 by 44 is the minimum hit target in CLAUDE.md's budget table.
        minHeight: 44,
        minWidth: 44,
        padding: "10px 16px",
        borderRadius: "var(--radius-button, 12px)",
        font: "inherit",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transform: pressed ? "translateY(2px) scale(0.98)" : "none",
        transition: "transform 90ms var(--ease-out, ease-out)",
        touchAction: "manipulation",
        ...TONE_STYLE[tone],
        ...(selected
          ? { background: "var(--bb-primary-soft, var(--bb-muted))", borderColor: "var(--bb-primary)", color: "var(--bb-primary-ink)" }
          : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}
