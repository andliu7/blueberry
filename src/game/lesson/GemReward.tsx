/**
 * Gem and XP reward screens: one full-screen takeover per reward, one hero, one
 * headline, one reason line, one pill button pinned low. No scroll, no close icon.
 *
 * Round 2: every state shares one violet field with a ray burst, one white
 * pill button, the berry mascot (or the streak flame) at hero size, a thrown
 * burst of gems/coins/sparks, and a headline number that counts up and is the
 * largest thing on screen. Chest tiers tint the same field (rare blue, epic
 * violet). Everything shown is a prop: the caller passes the server receipt's
 * numbers, this file does no economy math and defines no price.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Press } from "../app/ui/Press";
import { DiamondMark } from "../app/ui/HudIcons";
import { CoinCounter, formatCoins } from "../app/ui/CoinCounter";
import { CoinGoalBar } from "../app/ui/CoinGoalBar";
import { CoinNumerals, layoutNumerals } from "../app/ui/CoinNumerals";
import { CoinShapes } from "../chest/ChestArt";
import { ChestFloor, ChestModel, ChestWorld, LID_CLOSED, LID_CRACKED, LID_OPEN, LID_SWING } from "../chest/ChestModel";
import { CHEST_POINTS } from "../chest/chestPaint";
import { type CoinGoal } from "../shop/coinGoal";
import { Berry } from "../mascot/Berry";
import "../chest/chestOpening.css";
import "./gem-reward.css";

/** Counts 0 to `to` on one rAF loop; reduced motion renders the end at once. */
function useCountUp(to: number, still: boolean, delay = 350, ms = 900): number {
  const [v, setV] = useState(still ? to : 0);
  useEffect(() => {
    if (still) {
      setV(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, still, delay, ms]);
  return v;
}

const BURST_N = 16;
/** Deterministic burst of gems, coins and sparks thrown from the hero and left settled. */
function Burst({ kind }: { readonly kind: "gem" | "xp" }) {
  return (
    <div className="gr-burst" aria-hidden>
      <span className="gr-rays" />
      {Array.from({ length: BURST_N }, (_, i) => {
        const a = (i / BURST_N) * Math.PI * 2 + (i % 2) * 0.17;
        const r = 38 + (i % 3) * 9;
        return (
          <span
            key={i}
            className={`gr-bit gr-bit--${i % 4 === 0 ? "coin" : i % 4 === 2 ? "star" : kind}`}
            style={{ "--dx": `${(Math.cos(a) * r).toFixed(1)}%`, "--dy": `${(Math.sin(a) * r * 0.8).toFixed(1)}%`, "--d": `${120 + (i % 5) * 60}ms`, "--sz": `${0.7 + (i % 3) * 0.3}rem` } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** The mascot on a pale glow disc, so the blue berry reads on the violet field. */
function Mascot({ px, still, mood = "excited" }: { readonly px: number; readonly still: boolean; readonly mood?: "excited" | "cheer" }) {
  return (
    <div className="gr-mascot" style={{ "--m": `${px}px` } as CSSProperties}>
      <span className="gr-glow" aria-hidden />
      <Berry mood={mood} behaviour={still ? "idle" : "celebrate"} behaviourKey={1} sparkleKey={1} reducedMotion={still} sizePx={px} />
    </div>
  );
}

export function GemMark({ className = "" }: { readonly className?: string }) {
  return <DiamondMark className={className} />;
}

function Bolt({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M13.5 1.5 4 13.5h6.2L9 22.5l11-13h-6.6z" fill="var(--gr-xp)" stroke="var(--gr-xp-edge)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** One chest coin placed in this box: `r` is its face radius, the drawing's own is 15. */
function HeapCoin({ x, y, r, tilt = 0 }: { readonly x: number; readonly y: number; readonly r: number; readonly tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${r / 15}) translate(-18 -18)`}>
      <CoinShapes />
    </g>
  );
}

/** Flat treasure chest, open, overflowing with coins. */
function Chest({ tier = "gem" }: { readonly tier?: "gem" | "rare" | "epic" }) {
  const inside = tier === "epic" ? "#4c1d95" : tier === "rare" ? "#075985" : "#5b3a1e";
  return (
    <svg viewBox="0 0 220 190" className="gr-chest" aria-hidden focusable="false">
      <ellipse cx="110" cy="176" rx="86" ry="9" fill="#000" fillOpacity={tier === "gem" ? 0.18 : 0.22} />
      <path d="M34 78h152v84a8 8 0 0 1-8 8H42a8 8 0 0 1-8-8z" fill="#9a5b2b" />
      <path d="M34 78h152v14H34z" fill={inside} />
      <path d="M34 120h152v10H34z" fill="#7c4620" />
      <rect x="28" y="72" width="16" height="104" rx="4" fill="#f6b73c" />
      <rect x="176" y="72" width="16" height="104" rx="4" fill="#f6b73c" />
      <rect x="94" y="112" width="32" height="34" rx="8" fill="#f6b73c" />
      <circle cx="110" cy="126" r="5" fill="#9a5b2b" />
      <path d="M110 126v12" stroke="#9a5b2b" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 66 56 30h108l26 36z" fill="#f6b73c" />
      <path d="M44 66 64 38h92l20 28z" fill="#e39a1f" />
      <path d="M44 66 52 44l8 22z" fill="#fff" fillOpacity="0.28" />
      <rect x="34" y="78" width="152" height="6" fill="#fff" fillOpacity="0.14" />
      <HeapCoin x={50} y={60} r={13} tilt={-16} />
      <HeapCoin x={172} y={58} r={12} tilt={14} />
      <HeapCoin x={76} y={58} r={23} tilt={-9} />
      <HeapCoin x={148} y={56} r={23} tilt={8} />
      <HeapCoin x={112} y={42} r={29} />
    </svg>
  );
}

function Sparkles({ epic }: { readonly epic: boolean }) {
  const pts: ReadonlyArray<readonly [number, number, number]> = [
    [12, 18, 1],
    [86, 10, 0.7],
    [92, 52, 1.1],
    [6, 58, 0.8],
    [20, 86, 0.6],
    [80, 88, 0.9],
  ];
  return (
    <>
      {pts.map(([x, y, s], i) => (
        <span
          key={i}
          className={`gr-spark${epic ? " gr-spark--star" : ""}`}
          style={{ left: `${x}%`, top: `${y}%`, "--s": s, animationDelay: `${i * 140}ms` } as CSSProperties}
          aria-hidden
        />
      ))}
    </>
  );
}

export type RewardKind = "gems" | "xp" | "streak" | "chest";

export interface GemRewardProps {
  readonly kind: RewardKind;
  readonly reducedMotion?: boolean;
  /** gems / streak: the amount, from the receipt. */
  readonly gems?: number;
  /** gems: the coin balance after the payout, from the store. The counter climbs to it from `balance - gems`. */
  readonly balance?: number;
  /** gems: plain-language reason. */
  readonly reason?: string;
  /** gems: what the coins move toward, from coinGoal.ts. Null or absent draws no bar. */
  readonly goal?: CoinGoal | null;
  /** xp: the tiles, from the receipt and the session tally. */
  readonly xp?: number;
  readonly accuracy?: number | null;
  readonly timeLabel?: string;
  /** streak: days, which weekdays (Mon first) are done, and today's index. */
  readonly streak?: number;
  readonly week?: readonly boolean[];
  readonly today?: number;
  /** chest: upgrade chances. */
  readonly chances?: number;
  /** chest: the tier it opens at. */
  readonly tier?: "rare" | "epic";
  readonly onContinue: () => void;
  readonly onShare?: () => void;
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function GemReward(p: GemRewardProps) {
  if (p.kind === "gems") return <GemsScreen {...p} />;
  if (p.kind === "xp") return <XpScreen {...p} />;
  if (p.kind === "streak") return <StreakScreen {...p} />;
  return <ChestReveal {...p} />;
}

/**
 * THE COIN PAYOUT, measured against Clash Royale's reward drops (reward gauntlet,
 * Nov). It starts SHUT: the student taps the chest, the box bursts open in a
 * flash, and the amount RISES OUT OF THE OPEN BOX to stand over it while the
 * coins stream from the box into the counter in the top bar.
 *
 * TWO READINGS, EACH THE SAME EVERYWHERE (round 4). The AMOUNT is the whole
 * payout from the moment the lid goes: the +N that pops out of the box and the
 * +N chip under the counter both read it, so neither ever shows +0. The BALANCE
 * is `shown`, what the counter has reached as each coin lands: the counter's
 * digits and the goal card's count and bar climb together and finish on the
 * same frame. The counter always shows a balance, never a gain.
 *
 * ONE LAYOUT, TOP TO BOTTOM: the bar, the amount, the chest, the goal card, the
 * line in words, the one button. The card stands BELOW the box, so the coins,
 * which fly up out of it, never cross the card, and they fly in their own layer
 * under the amount, so a coin never covers a word. The button slot holds the
 * hint while the box is shut and CONTINUE once the last coin is in.
 *
 * Reduced motion: the tap opens it at once, every reading is already the new
 * balance, and nothing flies or rises.
 */
type PayPhase = "closed" | "opening" | "paid";

function GemsScreen(p: GemRewardProps) {
  const still = p.reducedMotion === true;
  const gems = p.gems ?? 0;
  const after = p.balance ?? gems;
  const before = after - gems;
  const [phase, setPhase] = useState<PayPhase>("closed");
  const [lid, setLid] = useState(LID_CLOSED);
  const [drained, setDrained] = useState(false);
  const [shown, setShown] = useState(before);
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const rigRef = useRef<HTMLSpanElement>(null);
  const amountRef = useRef<HTMLHeadingElement>(null);
  const tapRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    tapRef.current?.focus();
    const ids = timers.current;
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);
  const mouth = useCallback(() => {
    const rig = rigRef.current?.getBoundingClientRect();
    if (rig === undefined) return null;
    return { x: rig.left + rig.width * CHEST_POINTS.mouth.x, y: rig.top + rig.height * CHEST_POINTS.mouth.y };
  }, []);
  const open = () => {
    if (phase !== "closed") return;
    if (still) {
      setLid(LID_OPEN);
      setDrained(true);
      setShown(after);
      setPhase("paid");
      return;
    }
    // How far the amount climbs: from the chest's mouth up to where it stands.
    const from = mouth();
    const amount = amountRef.current;
    const box = amount?.getBoundingClientRect();
    if (from !== null && amount !== null && box !== undefined) {
      amount.style.setProperty("--rise", `${Math.round(from.y - (box.top + box.height / 2))}px`);
    }
    setPhase("opening");
    const at: [number, () => void][] = [
      [0, () => setLid(LID_CRACKED)],
      ...LID_SWING.map((frame, i): [number, () => void] => [140 + i * 55, () => setLid(frame)]),
      [400, () => setLid(4)],
      [480, () => setLid(LID_OPEN)],
      [990, () => setDrained(true)],
    ];
    timers.current.push(...at.map(([ms, run]) => window.setTimeout(run, ms)));
  };
  const paid = phase === "paid";
  const shut = phase === "closed" ? "true" : undefined;
  const gained = Math.max(0, shown - before);
  const finalText = `+${gems}`;
  // The amount's cap height: as big as the width allows, and short enough to
  // stand between the bar and the open lid. Its width is the total's, so the
  // number never shifts as digits arrive.
  const viewW = typeof window === "undefined" ? 390 : window.innerWidth;
  const viewH = typeof window === "undefined" ? 844 : window.innerHeight;
  const finalEm = (layoutNumerals(finalText).boxW + 18) / 100;
  const capPx = Math.min(92, viewH * (viewW >= 768 ? 0.095 : 0.085), (Math.min(viewW, 560) - 150) / finalEm);
  const goal = p.goal ?? null;
  return (
    <main className="gr gr--pay" data-motion={still ? "still" : "live"} data-reward="gems" data-phase={phase} data-paid={paid ? "true" : "false"} aria-label="Coins earned">
      <div className="chest-open gr-pay-world" data-chest-phase={phase === "closed" ? "tapping" : paid ? "done" : "flying"} aria-hidden>
        <ChestWorld />
        <span className="gr-pay-sun">
          <i />
        </span>
        <span ref={rigRef} className="chest-open__rig" style={{ "--light": phase === "closed" ? 0.3 : paid ? 0.62 : 1 } as CSSProperties}>
          <ChestFloor />
          <span className="chest-open__pool" />
          <span className="chest-open__contact" />
          <span className="chest-open__chest gr-pay-chest">
            <span className="chest-open__beam" />
            <span className="chest-open__glow" />
            <span className="chest-open__rays">
              <i />
            </span>
            <ChestModel lid={lid} drained={drained} />
            <i className="chest-open__star chest-open__star--a" />
            <i className="chest-open__star chest-open__star--b" />
            <i className="chest-open__star chest-open__star--c" />
          </span>
        </span>
        <span className="chest-world__foot gr-pay-foot" />
        {still ? null : <span className="gr-pay-flash" />}
      </div>

      {/* The coins' own layer: over the bar they land in, under every word. */}
      <div ref={setLayer} className="gr-pay-coins" aria-hidden />

      <header className="gr-pay-bar">
        <span className="gr-pay-title">Lesson reward</span>
        <span className="gr-pay-counter" aria-label={`Coin balance ${formatCoins(paid ? after : before)}`}>
          {/* Remounted on the tap, so the stream leaves the box only once it is open. */}
          <CoinCounter
            key={phase === "closed" ? "shut" : "pay"}
            value={phase === "closed" ? before : after}
            reducedMotion={still}
            pile
            mark={<DiamondMark heavy className="hud-mark" />}
            payFrom={phase === "closed" || still ? undefined : before}
            payOrigin={mouth}
            payDelay={460}
            payLayer={layer}
            onStep={setShown}
            onPaid={() => {
              setShown(after);
              setPhase("paid");
            }}
          />
        </span>
      </header>

      <div className="gr-pay-top">
        {phase === "closed" ? (
          <p className="gr-pay-tease">
            Lesson complete!
            <span>Your chest is ready</span>
          </p>
        ) : null}
        <h1 ref={amountRef} className="gr-pay-amount" data-shut={shut} aria-label={`${gems} coins`}>
          <span className="gr-pay-num" style={{ fontSize: `${capPx}px`, width: `${finalEm}em` }} aria-hidden>
            {/* The whole payout from the burst on, never +0. Remounted per landing, so each coin in kicks it. */}
            <span key={gained} className="gr-pay-tick">
              <CoinNumerals text={finalText} />
            </span>
          </span>
          <span className="gr-pay-unit" aria-hidden>
            coins
          </span>
        </h1>
      </div>

      <div className="gr-pay-words">
        {goal === null ? null : (
          <div className="gr-pay-goal" data-shut={shut}>
            <CoinGoalBar goal={goal} shown={shown} className="gr-goal" />
          </div>
        )}
        <p className="gr-pay-reason" data-shut={shut}>
          {p.reason ?? "Lesson complete!"}
        </p>
        <div className="gr-foot gr-pay-cta">
          {phase === "closed" ? (
            <p className="gr-pay-hint" aria-hidden>
              Tap the chest
            </p>
          ) : (
            <Press variant="primary" size="lg" block onClick={p.onContinue} disabled={!paid} tabIndex={paid ? undefined : -1}>
              Continue
            </Press>
          )}
        </div>
      </div>
      {phase === "closed" ? <button ref={tapRef} type="button" className="gr-pay-tap" onClick={open} aria-label="Treasure chest. Tap to open it" /> : null}
    </main>
  );
}

function XpScreen(p: GemRewardProps) {
  const still = p.reducedMotion === true;
  const n = useCountUp(p.xp ?? 0, still);
  return (
    <main className="gr gr--field" data-motion={still ? "still" : "live"} data-reward="xp" aria-label="Lesson complete">
      <div className="gr-stage gr-stage--xp">
        <Burst kind="xp" />
        <div className="gr-hero gr-hero--mascot gr-pop">
          <Mascot px={176} still={still} mood="cheer" />
          <Bolt className="gr-bolt-badge" />
        </div>
      </div>
      <h1 className="gr-head gr-in" style={{ animationDelay: "160ms" }} aria-label={`${p.xp ?? 0} XP`}>
        <span className="gr-num gr-num--xp" aria-hidden>+{n}</span>
        <span className="gr-unit gr-unit--xp" aria-hidden>XP</span>
      </h1>
      <p className="gr-reason gr-in" style={{ animationDelay: "260ms" }}>
        Lesson complete. That is a real step forward.
      </p>
      <ul className="gr-tiles">
        <Tile tone="xp" label="Total XP" value={String(p.xp ?? 0)} icon={<Bolt className="gr-ti" />} delay={340} />
        <Tile
          tone="good"
          label="Great"
          value={p.accuracy == null ? "n/a" : `${p.accuracy}%`}
          icon={
            <svg viewBox="0 0 24 24" className="gr-ti" aria-hidden>
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" />
              <circle cx="12" cy="12" r="3.6" fill="currentColor" />
            </svg>
          }
          delay={440}
        />
        <Tile
          tone="time"
          label="Speedy"
          value={p.timeLabel ?? "2:49"}
          icon={
            <svg viewBox="0 0 24 24" className="gr-ti" aria-hidden>
              <circle cx="12" cy="13.5" r="8" fill="none" stroke="currentColor" strokeWidth="2.6" />
              <path d="M12 9v5l3 2M9.5 2.5h5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            </svg>
          }
          delay={540}
        />
      </ul>
      <div className="gr-foot">
        <Press variant="primary" size="lg" block onClick={p.onContinue}>
          Claim XP
        </Press>
      </div>
    </main>
  );
}

function StreakScreen(p: GemRewardProps) {
  const still = p.reducedMotion === true;
  const days = p.streak ?? 5;
  const n = useCountUp(days, still, 250, 700);
  const week = p.week ?? [true, true, true, true, false, false, false];
  const today = p.today ?? 4;
  return (
    <main className="gr gr--field" data-motion={still ? "still" : "live"} data-reward="streak" aria-label="Streak milestone">
      <div className="gr-stage gr-stage--streak">
        <Burst kind="xp" />
        <div className="gr-flame gr-pop" aria-hidden>
          <svg viewBox="0 0 120 140">
            <path d="M60 6c6 26 40 40 40 78a40 40 0 0 1-80 0c0-18 10-28 18-38 2 12 8 16 12 16C46 40 52 24 60 6z" fill="#ff9a1f" stroke="#c2570a" strokeWidth="3" strokeLinejoin="round" />
            <path d="M60 52c5 16 24 24 24 46a24 24 0 0 1-48 0c0-14 7-20 13-29 2 9 6 11 8 11-2-11 0-19 3-28z" fill="#ffd23f" />
            <path d="M36 82h20a5 5 0 0 1 5 5v2a7 7 0 0 1-7 7h-6a12 12 0 0 1-12-12zM64 82h20v2a12 12 0 0 1-12 12h-6a7 7 0 0 1-7-7v-2a5 5 0 0 1 5-5z" fill="#1f2230" />
            <path d="M56 85h8" stroke="#1f2230" strokeWidth="3" />
            <path d="M40 86l8-2M68 86l8-2" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
            <path d="M50 108q10 8 20 0" fill="none" stroke="#c2570a" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="gr-big gr-pop" style={{ animationDelay: "120ms" }} aria-label={`${days} day streak`}>
        <span aria-hidden>{n}</span>
      </div>
      <p className="gr-streak-label gr-in" style={{ animationDelay: "260ms" }} aria-hidden>
        day streak
      </p>
      <ol className="gr-week" aria-label="This week">
        {DAYS.map((d, i) => {
          const done = week[i] === true;
          const cls = i === today ? "gr-day gr-day--today" : done ? "gr-day gr-day--done" : "gr-day";
          return (
            <li key={d} className={cls}>
              <span className="gr-day-name">{d}</span>
              <span className="gr-day-dot" aria-hidden>
                {done || i === today ? "✓" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="gr-foot">
        <Press variant="primary" size="lg" block onClick={p.onShare ?? p.onContinue}>
          <GemMark className="gr-btn-icon" /> Share +{p.gems ?? 0} coins
        </Press>
        <button type="button" className="gr-quiet" onClick={p.onContinue}>
          Continue
        </button>
      </div>
    </main>
  );
}

function Tile(props: {
  readonly tone: "xp" | "good" | "time";
  readonly label: string;
  readonly value: string;
  readonly icon: ReactNode;
  readonly delay: number;
}) {
  return (
    <li className={`gr-tile gr-tile--${props.tone} gr-in`} style={{ animationDelay: `${props.delay}ms` }}>
      <span className="gr-tile-top">{props.label}</span>
      <span className="gr-tile-body">
        {props.icon}
        {props.value}
      </span>
    </li>
  );
}

function ChestReveal(p: GemRewardProps) {
  const start = Math.max(1, p.chances ?? 2);
  const initial = p.tier === "epic" ? Math.min(1, start) : start;
  const [left, setLeft] = useState(initial);
  const [tier, setTier] = useState<"rare" | "epic">(p.tier ?? "rare");
  // The upgrade outcome belongs to the caller's receipt in real use; this
  // screen plays the reveal only. A tap spends one chance and shows the next tier.
  const tap = () => {
    if (left <= 0) return;
    setLeft(left - 1);
    setTier("epic");
  };
  const caption = left === 0 ? "No chances left" : left === 1 ? "1 chance left!" : "Tap for a chance to upgrade!";
  return (
    <main className={`gr gr--field gr--${tier}`} data-motion={p.reducedMotion ? "still" : "live"} data-reward="chest" data-tier={tier} aria-label={`${tier} chest`}>
      <p className="gr-tier">{tier}</p>
      <button type="button" className="gr-chestbtn gr-pop" onClick={tap} aria-label="Tap the chest for a chance to upgrade">
        <span className="gr-chestwrap">
          <Burst kind="gem" />
          <Sparkles epic={tier === "epic"} />
          <Chest tier={tier} />
        </span>
      </button>
      <div className="gr-dots" aria-hidden>
        {Array.from({ length: start }, (_, i) => (
          <span key={i} className={i < left ? "gr-updot gr-updot--on" : "gr-updot"}>
            {i < left ? "↑" : ""}
          </span>
        ))}
      </div>
      <p className="gr-cap" aria-live="polite">
        {caption}
      </p>
      <div className="gr-foot">
        <Press variant="primary" size="lg" block onClick={p.onContinue}>
          Open chest
        </Press>
      </div>
    </main>
  );
}

export default GemReward;
