/**
 * The drag style control: three options, each with a small drawing of what
 * the student will see under their finger. The rule behind the options lives
 * in settings/arrowStyle.ts; this only renders it.
 *
 * A segment rather than a toggle for the reason MeTab's ThemeSegment gives: a
 * segment says what you have. The drawings are there because "Curved arrow"
 * and "Straight dashed" are words a student has to translate into a picture,
 * and the picture is cheaper to show than to describe.
 *
 * REACT PATTERN, named: `useSyncExternalStore` subscribes to the module scope
 * store in arrowStyle.ts, so the trainer screen and this control read one
 * value and re-render together.
 */

import { useSyncExternalStore } from "react";
import { arrowStyleSetting, type ArrowStyle } from "./arrowStyle";

const OPTIONS: readonly { readonly id: ArrowStyle; readonly label: string; readonly detail: string }[] = [
  // One short word each, so three fit side by side on a 390px phone without
  // wrapping; the sketch above the word carries the rest.
  { id: "auto", label: "Auto", detail: "Curved on resonance, dashed on reactions" },
  { id: "curved", label: "Curved", detail: "Your drag draws a curved arrow" },
  { id: "dashed", label: "Dashed", detail: "Your drag draws a straight dashed line" },
];

/** A 40 by 24 sketch of the drag: electrons on the left, the finger on the right. */
function Sketch({ id }: { readonly id: ArrowStyle }) {
  const stroke = "currentColor";
  return (
    <svg viewBox="0 0 40 24" width={40} height={24} aria-hidden className="shrink-0">
      <circle cx={6} cy={17} r={2} fill={stroke} />
      <circle cx={10} cy={17} r={2} fill={stroke} />
      {id === "dashed" ? (
        <line x1={9} y1={15} x2={33} y2={9} stroke={stroke} strokeWidth={2.2} strokeDasharray="4 3" strokeLinecap="round" />
      ) : id === "curved" ? (
        <path d="M 9 14 Q 20 -2 33 10" fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" />
      ) : (
        <>
          <path d="M 9 14 Q 18 2 26 7" fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
          <line x1={9} y1={17} x2={30} y2={17} stroke={stroke} strokeWidth={2} strokeDasharray="3 3" strokeLinecap="round" opacity={0.9} />
        </>
      )}
      <circle cx={34} cy={id === "auto" ? 12 : 9} r={3.4} fill="none" stroke={stroke} strokeWidth={1.6} />
    </svg>
  );
}

export function ArrowStyleSetting() {
  const style = useSyncExternalStore(arrowStyleSetting.subscribe, arrowStyleSetting.getSnapshot, arrowStyleSetting.getSnapshot);
  const chosen = OPTIONS.find((option) => option.id === style) ?? OPTIONS[0];
  // Drawn as a row of the Me tab's grouped settings list; the .me-* classes
  // live in tabs/me/me.css, which the Me tab loads.
  return (
    <div data-arrow-style-setting>
      <div className="me-row me-row-static">
        <span className="me-row-text">
          <span className="me-row-title">Arrow drawing</span>
          <span className="me-row-detail">{chosen?.detail}</span>
        </span>
      </div>
      <div className="me-seg-wrap">
        <div className="me-seg me-seg--stack" role="group" aria-label="Arrow drawing">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={style === option.id}
              data-arrow-style={option.id}
              // onClick fires for a mouse, a tap, Enter and Space alike.
              onClick={() => arrowStyleSetting.set(option.id)}
            >
              <Sketch id={option.id} />
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
