/**
 * The study timer as a page and a sheet: the game header's Tools menu opens it,
 * and "#/app/focus" is its route. Since 3 Nov it hosts the same card as the
 * site's header button and the game's corner button (components/FocusTimer.tsx),
 * full size, reading the one shared clock (lib/useFocusTimer.ts), so closing this
 * sheet never stops the timer.
 *
 * Bloom stays on top and reacts to the phase (curious when idle, focused while
 * you work, happy on a break, calm during an eye rest), in the mood vocabulary of
 * lib/berryMood.ts.
 */
import { BlueberryMark } from "../../mascot/BlueberryMark";
import type { BerryMood } from "@/lib/berryMood";
import type { TimerPhase } from "@/lib/useFocusTimer";
import { FocusCard } from "@/components/FocusTimer";
import { useFocus } from "./FocusProvider";
import "../../app/ui/press.css";
import "./focus.css";

const PHASE_MOOD: Record<TimerPhase, BerryMood> = {
  idle: "curious",
  focus: "focused",
  break: "happy",
  eyeRest: "calm",
};

export default function FocusTab() {
  const t = useFocus();
  return (
    <div className="focus-tab" data-focus-tab data-phase={t.phase}>
      <span className="focus-tab__bloom" aria-hidden>
        <BlueberryMark eyes mood={PHASE_MOOD[t.phase]} className="h-full w-full" />
      </span>
      <FocusCard look="game" />
    </div>
  );
}
