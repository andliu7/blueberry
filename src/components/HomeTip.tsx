import { useState } from "react";
import { nextLine } from "@/data/tips";

/**
 * One tip or quote on the home page, on the first arrival of a visit only (owner, 20 Oct:
 * tips and quotes "when they open the site"). HomePage decides the "first arrival" part with
 * the same per-tab mark the opening loader uses, and loads this file lazily, so neither it
 * nor the list of tips is in the first-load bundle.
 *
 * The line comes from the same daily walk as the page loader's (src/data/tips.ts), so the
 * home page never repeats the line the loader just showed.
 *
 * React pattern: `useState(() => nextLine())` is a lazy initial state. The function runs
 * once, on the first render, so the line is picked once and does not change if the page
 * re-renders.
 */
export function HomeTip() {
  const [line] = useState(() => nextLine());
  const label = line.kind === "quote" ? "A quote for today" : line.kind === "app" ? "A Blueberry tip" : "A study tip";

  return (
    // Small and quiet: muted ink on the page ground, no card, no button, nothing to press.
    <aside aria-label={label} className="mx-auto max-w-xl px-4 pb-10 pt-2 text-center text-sm leading-snug text-muted-foreground">
      {line.kind === "quote" ? (
        <figure>
          <blockquote>“{line.text}”</blockquote>
          <figcaption className="mt-1 text-xs">
            {line.author}, <cite className="not-italic">{line.source}</cite>
          </figcaption>
        </figure>
      ) : (
        <p>
          <span className="font-semibold">{line.kind === "app" ? "Tip: " : "Study tip: "}</span>
          {line.text}
        </p>
      )}
    </aside>
  );
}

export default HomeTip;
