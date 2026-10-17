/**
 * The wordmark: "Blue" stacked over "Berry", left aligned, two tones (owner's
 * pick C, 2026-10-17: "I like the left align and the lavender on blue").
 *
 * It flips like andliu.dev's FlipHeading (andliu-portfolio
 * components/site/flip-heading.tsx, same owner): every letter is a cell one
 * line tall holding two faces, and on hover or keyboard focus each cell rolls
 * up to its second face, 18 ms after the letter before it, on
 * cubic-bezier(.76,0,.24,1) over 500 ms. The second face carries the OTHER
 * line's colour, so the two tones trade places as it rolls. CSS in tabs.css
 * (.brand-mark); reduced motion swaps the colours with no roll.
 *
 * aria-hidden: the link around it carries the name.
 */

import type { CSSProperties } from "react";

const LINES = ["Blue", "Berry"] as const;

export function BrandMark() {
  let i = 0;
  return (
    <span className="brand-mark" aria-hidden="true">
      {LINES.map((line, l) => (
        <span key={line} className={`brand-mark__line brand-mark__line--${l === 0 ? "top" : "bottom"}`}>
          {Array.from(line).map((char, c) => {
            const cell = (
              // --i staggers each letter's roll in CSS.
              <span key={c} className="brand-mark__cell" style={{ "--i": i } as CSSProperties}>
                <span className="brand-mark__roll">
                  <span className="brand-mark__face brand-mark__face--a">{char}</span>
                  <span className="brand-mark__face brand-mark__face--b">{char}</span>
                </span>
              </span>
            );
            i += 1;
            return cell;
          })}
        </span>
      ))}
    </span>
  );
}
