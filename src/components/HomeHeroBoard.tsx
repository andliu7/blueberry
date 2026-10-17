import { MechanismBoard } from "@/components/ui/mechanism-board";
import "./home-hero-board.css";

/**
 * The hero's stage, beside Bloom (home round 2). The critic's note: the slot
 * held one ball in empty space, and Brilliant puts its product working there. So this is the
 * product working: the same `MechanismBoard` the entry gate and the demo's Practice screen
 * show, cyanide adding to a ketone, the arrows pushed and the step named. An existing figure,
 * nothing chemical drawn anew here.
 *
 * Lazy, so neither this file, its CSS nor the board is in the entry. Shown at every width
 * since S2 round 2 (under the headline on a phone, the right column from 1024 px). Decorative for a screen reader: the hero already says what the site is,
 * and the phone demo below carries the same board with its own caption, so this is hidden
 * rather than read twice.
 */
export default function HomeHeroBoard() {
  return (
    <div className="home-board" aria-hidden>
      <span className="home-board__eyebrow">Practice</span>
      <MechanismBoard className="w-full" />
    </div>
  );
}
