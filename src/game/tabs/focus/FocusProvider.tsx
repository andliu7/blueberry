/**
 * The study timer in the game.
 *
 * ONE CLOCK, SHARED WITH THE SITE (3 Nov). The clock no longer lives here: it is
 * held in lib/useFocusTimer.ts's module, so the site header's button, this
 * provider's corner button, the Tools sheet and #/app/focus all read the same
 * state and a session started on the site carries on in the game. What this file
 * still does:
 *  - mounts the timer's corner button (components/FocusTimer.tsx, placement
 *    "game") above every screen. It shows only while a session runs or its card
 *    is open, and reopens itself on the three moments worth interrupting for: an
 *    eye rest starting, the last minute of a phase, and a phase ending;
 *  - keeps `useFocus()`, which the Tools sheet, #/app/focus and the Settings row read.
 *
 * Moved out (and kept): the end-of-focus chime is lib/ambience.ts's "When focus
 * ends" setting (soft chime, gold coins, none); the tab-hidden title flash and the
 * system notification are in lib/useFocusTimer.ts, so the site has them too.
 * Changed on purpose: the 20-20-20 rest no longer asks "Rest your eyes?" with a
 * check and an X. It starts on its own, as in the second-brain timer the owner
 * asked this to match, and "Back to it" ends it early.
 */
import type { ReactNode } from "react";
import { FocusTimer } from "@/components/FocusTimer";
import { formatClock, useFocusTimer } from "@/lib/useFocusTimer";
import "../../app/ui/press.css";
import "./focus.css";

type Timer = ReturnType<typeof useFocusTimer>;

export type FocusApi = Timer;

/** The timer. It reads the one shared clock, so it works with or without the provider. */
export const useFocus: () => FocusApi = useFocusTimer;

export function FocusProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <FocusTimer placement="game" />
    </>
  );
}

export { formatClock };
