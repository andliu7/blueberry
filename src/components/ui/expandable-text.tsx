import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Shows the opening sentence and hides the rest behind a quiet Show more.
 *
 * The size stays identical either way. A control that also changes the type
 * size makes the expansion feel like a different block of text rather than the
 * same one continuing, so the toggle is greyed instead, which keeps it clearly
 * secondary to the copy it belongs to.
 */

/**
 * Splits on the first sentence ending.
 *
 * The lookbehind avoids breaking on an abbreviation, which matters here because
 * the reference decks open with "Dr. Stocker's pKa sheet" and a naive split on
 * a full stop would cut that in half.
 */
function splitFirstSentence(text: string): [string, string] {
  const match = text.match(/^[\s\S]*?(?<!\bDr|\bMr|\bMs|\bSt|\be\.g|\bi\.e)[.!?](?=\s|$)/);
  if (!match) return [text, ""];
  const head = match[0].trim();
  const rest = text.slice(match[0].length).trim();
  return [head, rest];
}

export function ExpandableText({
  text,
  className,
  buttonClassName,
  onToggle,
}: {
  text: string;
  className?: string;
  buttonClassName?: string;
  /** Fired on each toggle, so a caller can restage whatever sits above it. */
  onToggle?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [head, rest] = useMemo(() => splitFirstSentence(text), [text]);

  // Nothing hidden means nothing to toggle.
  if (!rest) return <p className={className}>{text}</p>;

  return (
    <div className={className}>
      <p>
        {open ? text : head}{" "}
        <button
          onClick={() =>
            setOpen((o) => {
              onToggle?.(!o);
              return !o;
            })
          }
          aria-expanded={open}
          className={cn(
            "cursor-pointer font-medium text-slate-400 underline decoration-dotted underline-offset-4 transition-colors hover:text-slate-600 dark:text-stone-500 dark:hover:text-stone-300",
            buttonClassName,
          )}
        >
          {open ? "Show less" : "Show more"}
        </button>
      </p>
    </div>
  );
}

export default ExpandableText;
