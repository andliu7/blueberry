import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Resolves a paragraph out of noise, left to right, without the text moving.
 *
 * Built to replace `TextScramble` for long copy, which it is not suited to for
 * two reasons that only show up past a few words:
 *
 * 1. **The line breaks moved.** Substituting a random character per character
 *    changes the width of every word, so the browser re-wraps the paragraph on
 *    every tick and words hop between lines while you are trying to read them.
 *    Here each word is its own inline-block sized by an invisible copy of its
 *    *final* text, so wrapping is decided once by the settled paragraph and the
 *    scrambling copy is painted inside a box that never changes size.
 * 2. **Everything moved at once.** A whole paragraph of characters re-rolling
 *    every tick is noise rather than decoding. Only a short window ahead of the
 *    frontier keeps re-rolling; past that each character holds one stable
 *    stand-in, chosen once, so the eye has somewhere quiet to rest.
 */

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** How many characters ahead of the frontier keep churning. */
const WINDOW = 14;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]!;
}

export function ScrambleReveal({
  text,
  /** Seconds for the whole paragraph. */
  duration = 5.5,
  /** Seconds between ticks. Larger is calmer and steppier. */
  tick = 0.055,
  className,
  onDone,
}: {
  text: string;
  duration?: number;
  tick?: number;
  className?: string;
  onDone?: () => void;
}) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(reduce ? text.length : 0);
  // Bumped every tick purely to re-roll the window. Kept apart from `revealed`
  // so the frontier advances on its own clock rather than once per character.
  const [, setPulse] = useState(0);

  /**
   * One stable stand-in per character, chosen once.
   *
   * This is what stops the far end of the paragraph boiling. Recomputed only
   * when the text changes, never on a tick.
   */
  const placeholders = useMemo(
    () => Array.from(text, (ch) => (/\s/.test(ch) ? ch : randomChar())),
    [text],
  );

  useEffect(() => {
    if (reduce) {
      setRevealed(text.length);
      return;
    }
    setRevealed(0);
    const steps = Math.max(1, Math.round(duration / tick));
    const perStep = text.length / steps;
    let step = 0;

    const id = setInterval(() => {
      step += 1;
      setPulse((p) => p + 1);
      const next = Math.min(text.length, Math.round(step * perStep));
      setRevealed(next);
      if (step >= steps) {
        clearInterval(id);
        setRevealed(text.length);
        onDone?.();
      }
    }, tick * 1000);

    return () => clearInterval(id);
    // onDone is deliberately excluded: an inline arrow from the parent would
    // otherwise restart the reveal on every render of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, duration, tick, reduce]);

  /**
   * Split so each word can be its own box, keeping the spaces as their own
   * entries. Joining words back with a plain space would collapse the runs the
   * source text actually has.
   */
  const words = useMemo(() => {
    const out: { text: string; start: number }[] = [];
    let i = 0;
    for (const part of text.split(/(\s+)/)) {
      if (part !== "") out.push({ text: part, start: i });
      i += part.length;
    }
    return out;
  }, [text]);

  if (reduce || revealed >= text.length) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {words.map((word) => {
        if (/^\s+$/.test(word.text)) return word.text;
        return (
          // `overflow-hidden` is load-bearing. A random glyph is usually wider
          // than the letter it stands in for, so the absolutely positioned layer
          // spills past the box the sizer reserved and lands on top of the next
          // word. Only noise is ever clipped: once a character resolves it is
          // the real one, which fits the box the real word measured.
          <span key={word.start} className="relative inline-block overflow-hidden align-baseline">
            {/* Holds the box at the settled width, so the line breaks are the
                ones the finished paragraph will have. */}
            <span className="invisible" aria-hidden>
              {word.text}
            </span>
            <span className="absolute inset-0 whitespace-pre">
              {Array.from(word.text, (ch, k) => {
                const at = word.start + k;
                if (at < revealed) return ch;
                const churning = at < revealed + WINDOW;
                return (
                  <span
                    key={k}
                    className={cn(!churning && "opacity-45")}
                    // Screen readers get the finished sentence from the
                    // `revealed >= length` branch; mid-flight noise is not
                    // something anyone needs read out.
                    aria-hidden
                  >
                    {churning ? randomChar() : placeholders[at]}
                  </span>
                );
              })}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default ScrambleReveal;
