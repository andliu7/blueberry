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
  { id: "auto", label: "Per question", detail: "Curved on resonance, dashed on reactions" },
  { id: "curved", label: "Curved arrow", detail: "Drag draws the arrow" },
  { id: "dashed", label: "Straight dashed", detail: "Drag draws the bond" },
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
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-bb-border bg-bb-card px-4 py-3" data-arrow-style-setting>
      <span className="min-w-0">
        <span className="block text-scale-base font-semibold text-bb-foreground">Arrow drawing</span>
        <span className="block text-scale-xs text-bb-muted-foreground">
          How a push looks while you drag it. Grading is the same in every style.
        </span>
      </span>
      <div className="flex flex-col gap-2" role="group" aria-label="Arrow drawing">
        {OPTIONS.map((option) => {
          const on = style === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={on}
              data-arrow-style={option.id}
              onPointerDown={() => arrowStyleSetting.set(option.id)}
              onClick={() => arrowStyleSetting.set(option.id)}
              className={`press flex min-h-11 items-center gap-3 rounded-xl border-2 px-3 py-2 text-left ${
                on
                  ? "border-[color:var(--bb-primary-ink)] bg-[color:var(--tab-active)] text-bb-primary-ink"
                  : "border-bb-border bg-bb-card text-bb-muted-foreground"
              }`}
            >
              <Sketch id={option.id} />
              <span className="min-w-0 flex-1">
                <span className="block text-scale-sm font-semibold">{option.label}</span>
                <span className="block text-scale-xs">{option.detail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
