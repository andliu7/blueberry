import type { ReactNode } from "react";
import "./glitch-text.css";

/**
 * The text with a brief glitch burst every few seconds (glitch-text.css).
 *
 * Inspired by the owner's pasted Canvas UI "Glitch", which renders the whole page
 * through WebGL. That one needs the experimental HTML-in-canvas browser feature, so
 * in every other browser it shows no effect at all; this CSS version works
 * everywhere, costs under 1 KB, and only touches the few characters it wraps.
 * `text` must be the same string as the children, because the copies read it from
 * the data attribute.
 */
export function GlitchText({
  text,
  as: Tag = "span",
  className = "",
  children,
}: {
  readonly text: string;
  readonly as?: "span" | "div" | "h1" | "h2" | "h3" | "p";
  readonly className?: string;
  readonly children?: ReactNode;
}) {
  return (
    <Tag className={`glitch-text ${className}`} data-text={text}>
      {children ?? text}
    </Tag>
  );
}

export default GlitchText;
