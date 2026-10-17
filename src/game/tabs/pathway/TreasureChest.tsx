/**
 * THE TREASURE CHEST at the end of a section (pathwaySections.ts).
 *
 * Owner, 2026-10-17: "treasure boxes should be treasure boxes." So it is drawn
 * as a chest, its own object rather than a lesson chip with a chest glyph: a
 * domed lid, gold corner bands, a gold lock plate, planks on the box.
 *
 * ON THE ROAD, round 3 of P1. It used to sit off to one side and both blind
 * judges read it as floating beside the route; it is a stop now, centred, and
 * the road runs through it (data-road-stop), like the bar's chest.
 *
 * THREE STATES, and the colour says which (round 3: locked was full colour,
 * so earned and unearned differed only by a small badge):
 *   locked  closed and GREY, with a padlock badge. Pressing says what opens it.
 *   ready   the section's checkpoint is cleared. It bobs and wears an OPEN
 *           tag; pressing it pops the lid and banks the reward.
 *   open    the lid stands open over the gold. Pressing says it is opened.
 *
 * THE REWARD is its own journal event, chest_opened (progress.openChest),
 * which pays DIAMONDS_CHEST once per chest and moves no XP and no mastery.
 * Round 2 journalled it as a lesson clear, so it set off whatever rank award
 * was waiting (+135 on one profile, +10 on another) and fed the daily goal.
 * The journal is also what remembers the chest is open.
 */
import { useEffect, useRef, useState } from "react";

import { progress } from "../../app/progress";

export type ChestState = "locked" | "ready" | "open";

/**
 * The chest's two coats. Gold is the reward colour; grey is the same chest
 * "not yours yet", authored as values rather than a CSS filter (pathway.css,
 * the S2 floor: the contrast audit reads real colours). The grey's darkest
 * tone, #5b6377, is 5.3:1 on the light page and its face #aeb5c6 is 8.6:1 on
 * the night page, so the shape reads in both themes.
 */
/** One colour per part of the drawing. */
interface ChestCoat {
  readonly boxLip: string;
  readonly box: string;
  readonly plank: string;
  readonly band: string;
  readonly bandShade: string;
  readonly lid: string;
  readonly lidHi: string;
  readonly plate: string;
  readonly keyhole: string;
}

const GOLD: ChestCoat = {
  boxLip: "#8a420c",
  box: "#c8661a",
  plank: "#a5520f",
  band: "#f5b82e",
  bandShade: "#d9960f",
  lid: "#e0812c",
  lidHi: "#f3a55a",
  plate: "#ffd23f",
  keyhole: "#5a2d00",
};
const GREY: ChestCoat = {
  boxLip: "#5b6377",
  box: "#8e96aa",
  plank: "#79819a",
  band: "#c9cfdc",
  bandShade: "#a7aebf",
  lid: "#aeb5c6",
  lidHi: "#cdd3e0",
  plate: "#dde1ea",
  keyhole: "#4a5165",
};

/** The drawing. viewBox 120 by 104; the lid is its own group so CSS can lift it. */
function ChestArt({ open, locked }: { readonly open: boolean; readonly locked: boolean }) {
  const c = locked ? GREY : GOLD;
  return (
    <svg viewBox="0 0 120 104" className="path-chest__art" aria-hidden>
      {/* The ground shadow, a flat pill. */}
      <ellipse cx="60" cy="98" rx="46" ry="5" className="path-chest__shadow" />
      {/* Inside the box, seen when the lid is up: dark wood and a heap of gold. */}
      {open ? (
        <g>
          <rect x="14" y="38" width="92" height="14" rx="4" fill="#4a2208" />
          <circle cx="38" cy="42" r="7" fill="#ffd23f" />
          <circle cx="52" cy="38" r="8" fill="#ffc21a" />
          <circle cx="68" cy="40" r="8" fill="#ffd23f" />
          <circle cx="82" cy="43" r="6.5" fill="#ffc21a" />
          <path d="M60 22l3 7 7 1-5 5 1.5 7-6.5-3.5-6.5 3.5 1.5-7-5-5 7-1z" fill="#fff4b8" className="path-chest__sparkle" />
        </g>
      ) : null}
      {/* The box: its lip first, then the face, then planks and bands. */}
      <rect x="10" y="50" width="100" height="44" rx="9" fill={c.boxLip} />
      <rect x="10" y="44" width="100" height="44" rx="9" fill={c.box} />
      <path d="M12 60h96M12 74h96" stroke={c.plank} strokeWidth="3" />
      <rect x="22" y="44" width="11" height="44" fill={c.band} />
      <rect x="87" y="44" width="11" height="44" fill={c.band} />
      <rect x="22" y="80" width="11" height="8" fill={c.bandShade} />
      <rect x="87" y="80" width="11" height="8" fill={c.bandShade} />
      {/* The lid. Closed it sits on the box; open it is lifted back by CSS. */}
      <g className="path-chest__lid">
        <path d="M10 46V32a22 22 0 0 1 22-22h56a22 22 0 0 1 22 22v14z" fill={c.lid} />
        <path d="M18 24a16 16 0 0 1 14-8h56" fill="none" stroke={c.lidHi} strokeWidth="4" strokeLinecap="round" />
        <rect x="22" y="12" width="11" height="34" fill={c.band} />
        <rect x="87" y="12" width="11" height="34" fill={c.band} />
        <rect x="10" y="40" width="100" height="8" rx="3" fill={c.band} />
        <rect x="10" y="45" width="100" height="3" fill={c.bandShade} />
      </g>
      {/* The lock plate and keyhole, on the seam. Hidden once open. */}
      {open ? null : (
        <g>
          <rect x="47" y="36" width="26" height="28" rx="6" fill={c.bandShade} />
          <rect x="47" y="33" width="26" height="28" rx="6" fill={c.plate} />
          <circle cx="60" cy="44" r="4.2" fill={c.keyhole} />
          <path d="M58 46h4l1.4 8h-6.8z" fill={c.keyhole} />
        </g>
      )}
    </svg>
  );
}

export function TreasureChest({
  chestId,
  state,
  checkpointTitle,
  reducedMotion,
}: {
  readonly chestId: string;
  readonly state: ChestState;
  /** The checkpoint that earns it, named in the locked sentence. */
  readonly checkpointTitle: string;
  readonly reducedMotion: boolean;
}) {
  // What the last press said, shown in a bubble beside the chest and read out (aria-live).
  const [said, setSaid] = useState<string | null>(null);
  // The pop plays once, on the press that opened it; a chest that loads open just sits open.
  const [popping, setPopping] = useState(false);
  const claimed = useRef(false);

  useEffect(() => {
    if (said === null) return;
    const timer = window.setTimeout(() => setSaid(null), 2600);
    return () => window.clearTimeout(timer);
  }, [said]);

  const press = () => {
    if (state === "locked") {
      setSaid(`Clear ${checkpointTitle} to open this chest.`);
      return;
    }
    if (state === "open") {
      // Never the amount again: a second "+15" reads as a second payout (round 4 critic).
      setSaid("You already opened this chest.");
      return;
    }
    // A ref, not state: two quick taps in one frame must not bank twice.
    if (claimed.current) return;
    claimed.current = true;
    const diamonds = progress.openChest(chestId);
    setPopping(!reducedMotion);
    setSaid(diamonds > 0 ? `+${diamonds} diamonds!` : "Chest opened!");
  };

  const label =
    state === "locked"
      ? `Treasure chest, locked. Clear ${checkpointTitle} to open it.`
      : state === "ready"
        ? "Treasure chest, ready. Press to open it."
        : "Treasure chest, opened.";

  return (
    <div className={`path-chest path-chest--${state}${popping ? " path-chest--pop" : ""}`}>
      {state === "ready" ? (
        <span className="path-chest__tag" aria-hidden>
          OPEN
        </span>
      ) : null}
      {/* data-road-stop: the road runs through the chest's centre (RoadLine). */}
      <button type="button" className="path-chest__button" aria-label={label} onClick={press} data-road-stop>
        <ChestArt open={state === "open"} locked={state === "locked"} />
        {state === "locked" ? (
          <span className="path-chest__padlock" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor" />
              <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
            </svg>
          </span>
        ) : null}
      </button>
      <p className="path-chest__said" aria-live="polite">
        {said === null ? null : <span className="path-chest__bubble">{said}</span>}
      </p>
    </div>
  );
}
