/**
 * The band under a graded answer: one colour for the moment, Bloom inside
 * it reacting, the headline, the explanation, and the Continue.
 *
 * Why the character moves INTO the strip. Before this the berry sat beside
 * the prompt and the feedback card appeared two elements below it, so the
 * face and the colour that meant the same thing were 300 px apart and read as
 * two events. The bar draws the outcome as one band with the icon in it. Here
 * the icon is the character, so the strip owns the berry while a result is on
 * screen and the prompt owns it while the student is working. React remounts
 * the berry on that move, which is fine: the reaction starts on grading, and
 * a freshly mounted berry blends from rest into the squash on its first frame.
 *
 * The tone is data on the element (`data-reaction`) and the colours are
 * custom properties set in theme.css, so the strip has one markup for the
 * three moments and the contrast audit sees three composed pairs.
 */

import type { ReactNode } from "react";
import { ChipPress } from "../beats/ChipPress";
import { Berry, type BerryProps } from "../mascot/Berry";
import type { ReactionOutcome } from "../mascot/berryReaction";

export interface ReactionStripProps {
  readonly outcome: ReactionOutcome;
  readonly headline: string;
  /** A one line caption under the headline: the charred beat's comic line, for instance. */
  readonly caption?: string | null;
  readonly berry: Omit<BerryProps, "sizePx" | "className">;
  readonly continueLabel: string;
  readonly onContinue: () => void;
  readonly children?: ReactNode;
}

/** 80 px, above the 72 floor the spec sets so the face reads. */
export const STRIP_BERRY_PX = 80;

export function ReactionStrip({ outcome, headline, caption = null, berry, continueLabel, onContinue, children }: ReactionStripProps) {
  return (
    <section
      /* A DRAWER, not a band welded to the card's bottom edge. It was square at
         the top and outlined on one side, which the sticker audit reads as a
         card with no cut edge and no radius (rules 3, 4 and 5). Rounded on all
         four and outlined on all four, it reads as the object it is: a panel
         that rises out of the card when an answer lands. */
      className="reaction-strip -mx-5 -mb-5 mt-1 flex flex-col gap-3 rounded-2xl border-2 p-4 md:p-5"
      style={{ background: "var(--strip-bg)", borderColor: "var(--strip-rule)" }}
      data-reaction={outcome}
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <Berry {...berry} sizePx={STRIP_BERRY_PX} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-scale-lg font-semibold leading-tight" style={{ color: "var(--bb-foreground)" }}>
            {headline}
          </h3>
          {caption !== null ? <p className="mt-1 text-scale-sm text-bb-muted-foreground">{caption}</p> : null}
        </div>
        <div className="hidden md:block">
          <ChipPress onPointerDown={onContinue}>{continueLabel}</ChipPress>
        </div>
      </div>
      {children}
      <div className="md:hidden">
        <ChipPress className="w-full" onPointerDown={onContinue}>
          {continueLabel}
        </ChipPress>
      </div>
    </section>
  );
}
