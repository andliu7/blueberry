import type { HTMLAttributes, ReactNode } from "react";

/**
 * The house card: warm cream on the lavender ground, 16px radius, 2px border.
 *
 * THE BORDER IS ARITHMETIC, NOT DECORATION. Cream #fbf3e6 on lavender #a3aee2
 * measures 1.96:1, under the 3:1 a boundary needs to be seen at all, so without
 * an outline this card has no edge. --bb-border is derived against both surfaces
 * for exactly that: 6.11:1 on the card, 3.11:1 on the ground.
 *
 * `shadow-sm` is gone with it. Sticker rule 3 allows a shadow only where
 * stacking is the meaning, and a container is chrome; the audit counted 24 rows
 * of this one class. Depth here comes from the cut edge.
 */
export function Card({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement> & { readonly children: ReactNode }) {
  return (
    <div
      {...rest}
      className={`rounded-2xl border-2 border-bb-border bg-bb-card p-5 text-bb-card-foreground ${className}`}
    >
      {children}
    </div>
  );
}

/** A small pill of text. Used for difficulty, course, and answer kind labels. */
export function Pill({ children, tone = "muted" }: { readonly children: ReactNode; readonly tone?: "muted" | "primary" | "good" }) {
  const toneClass =
    tone === "primary"
      // primary-ink, not primary: --bb-primary is a surface colour with white on
      // it, and as ink on a card it measured 3.63:1 in dark against a 4.5
      // floor. The split into --bb-primary and --bb-primary-ink exists for exactly
      // this, and DESIGN-TOKENS.md records why.
      // THE HUE IS THE BORDER AND THE TINT, NOT THE WORD. A pill's label is
      // 12px, and sticker rule 7 holds body-sized text to a neutral so the
      // colour can lead from a surface instead. The tint plus the outline is
      // that surface, and it says the same thing the coloured word said.
      ? "border border-[color:var(--bb-primary-ink)] bg-bb-primary/10 text-bb-foreground"
      : tone === "good"
        ? "border border-[color:var(--good)] bg-[color:var(--good-soft)] text-bb-foreground"
        : "border border-bb-border bg-bb-muted text-bb-muted-foreground";
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-scale-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}
