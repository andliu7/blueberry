/**
 * Shop illustrations, drawn in SVG so they stay light. Each item is its own
 * object standing in its frame: a deck is a card stack whose top card shows
 * the structure that deck teaches, a unit set is an open chest with the
 * unit's signature structure on the front card, the boosts are a crystal or
 * a cell on a cushion. Structures come from RDKit (shopMolecules.generated.ts,
 * made by scripts/gen_shop_art.py), never drawn by hand. Flat fills only.
 */

import { useId, type ReactNode } from "react";
import { SHOP_MOLECULES, type ShopMolecule } from "./shopMolecules.generated";

export const DECK_HUES = [
  { a: "#7C5CFF", b: "#4A2FC4", c: "#CFC2FF" },
  { a: "#FF9F43", b: "#E06A12", c: "#FFD9AE" },
  { a: "#2EC4A6", b: "#12907A", c: "#B5F0E3" },
  { a: "#FF6B9A", b: "#D93B72", c: "#FFC6DA" },
  { a: "#3D8BFF", b: "#1F63C9", c: "#BFD8FF" },
  { a: "#E9B308", b: "#A87A00", c: "#FFE9A3" },
] as const;

export function IceCrystal({ className = "", glow = true }: { readonly className?: string; readonly glow?: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9FAFF" />
          <stop offset="1" stopColor="#5CCBF5" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FE0FF" />
          <stop offset="1" stopColor="#1C9BD8" />
        </linearGradient>
      </defs>
      {glow ? <circle cx="60" cy="62" r="50" fill="#5CCBF5" opacity="0.18" /> : null}
      <path d="M60 8 86 34 78 78 60 108 42 78 34 34Z" fill={`url(#${id}b)`} />
      <path d="M60 8 86 34 60 46 34 34Z" fill={`url(#${id}a)`} />
      <path d="M34 34 60 46 42 78Z" fill="#B7EDFF" opacity="0.85" />
      <path d="M86 34 60 46 78 78Z" fill="#2AA9E6" />
      <path d="M42 78 60 46 78 78 60 108Z" fill="#43BDF0" opacity="0.9" />
      <path d="M44 28 58 20" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d="M100 22v14M93 29h14M16 70v10M11 75h10" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M100 22v14M93 29h14M16 70v10M11 75h10" stroke="#5CCBF5" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- staging -- */

/**
 * What every item stands on, after the cushion under a Clash Royale chest: a
 * pale spotlight disc on the frame's own colour, a floor shadow, and (for the
 * bigger things) a blue cushion with gold tassels. Flat fills only.
 */
function Stage({
  cushion = true,
  small = false,
  rays = 0,
  children,
}: {
  readonly cushion?: boolean;
  /** A smaller cushion, for the smallest thing on a shelf. */
  readonly small?: boolean;
  /** Light bursting from behind: 1 for a big item, 2 (gold) for the biggest. */
  readonly rays?: 0 | 1 | 2;
  readonly children: ReactNode;
}) {
  const beams = rays === 0 ? 0 : rays === 1 ? 8 : 12;
  return (
    <>
      {Array.from({ length: beams }, (_, i) => (
        <path key={i} d="M60 56 53 -40h14Z" transform={`rotate(${(360 / beams) * i + 8} 60 56)`} fill={rays === 2 ? "#ffe27a" : "#fff"} opacity={rays === 2 ? 0.4 : 0.18} />
      ))}
      <circle cx="60" cy="56" r="50" fill="#fff" opacity="0.13" />
      <circle cx="60" cy="56" r="36" fill="#fff" opacity="0.1" />
      {cushion ? (
        <g transform={small ? "translate(15 14) scale(0.75)" : undefined}>
          <ellipse cx="60" cy="112" rx="46" ry="5" fill="#000" opacity="0.25" />
          <path d="M12 104c4-9 20-13 48-13s44 4 48 13c-4 6-20 9-48 9s-44-3-48-9Z" fill="#2c47a8" />
          <path d="M16 101c6-6 20-8 44-8s38 2 44 8c-8 3-22 4-44 4s-36-1-44-4Z" fill="#4a6ad6" />
          <path d="M13 104c10 5 26 7 47 7s37-2 47-7" fill="none" stroke="#f2c230" strokeWidth="2.2" />
          <path d="M11 103l-5 7M109 103l5 7" stroke="#f2c230" strokeWidth="3" strokeLinecap="round" />
          <circle cx="6" cy="111" r="2.6" fill="#f2c230" />
          <circle cx="114" cy="111" r="2.6" fill="#f2c230" />
        </g>
      ) : (
        <ellipse cx="60" cy="112" rx="38" ry="5" fill="#000" opacity="0.24" />
      )}
      {children}
    </>
  );
}

/* --------------------------------------------------------------- molecules -- */

/**
 * A skeletal structure RDKit drew (scripts/gen_shop_art.py), fitted into a box
 * of the parent SVG. Bond weight is set in the parent's units so a large
 * molecule squeezed into a small box keeps a visible line, but it never gets
 * thick enough to close the gap of a double bond.
 */
function Molecule({ mol, x, y, w, h, weight = 1.7 }: { readonly mol: ShopMolecule; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly weight?: number }) {
  const scale = Math.min(w / mol.w, h / mol.h);
  const sw = Math.min(3.4, weight / scale);
  return (
    <svg x={x} y={y} width={w} height={h} viewBox={`0 0 ${mol.w} ${mol.h}`} preserveAspectRatio="xMidYMid meet" overflow="visible">
      <path d={mol.stroke} fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      {mol.fill === "" ? null : <path d={mol.fill} fill="currentColor" stroke="currentColor" strokeWidth={sw * 0.3} strokeLinejoin="round" />}
    </svg>
  );
}

function hueOf(hue: number) {
  return DECK_HUES[((hue % DECK_HUES.length) + DECK_HUES.length) % DECK_HUES.length];
}

/** A white flashcard with a coloured band and the structure on its face. */
function MoleculeCard({
  x,
  y,
  w,
  h,
  hue,
  tag,
  mol,
  band = 16,
}: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly hue: number;
  readonly tag: string;
  readonly mol: ShopMolecule | undefined;
  readonly band?: number;
}) {
  const c = hueOf(hue);
  const pad = Math.max(3, w * 0.07);
  return (
    <g>
      <rect x={x + 1.5} y={y + 3} width={w} height={h} rx="8" fill="#000" opacity="0.22" />
      <rect x={x} y={y} width={w} height={h} rx="8" fill="#fff" stroke={c.b} strokeWidth="2.4" />
      <path d={`M${x + 8} ${y}h${w - 16}a8 8 0 0 1 8 8v${band - 8}h${-w}v${-(band - 8)}a8 8 0 0 1 8-8Z`} fill={c.a} />
      <text x={x + w / 2} y={y + band * 0.74} textAnchor="middle" fill="#fff" fontSize={band * 0.7} fontWeight="900" fontFamily="inherit" letterSpacing="0.3">
        {tag}
      </text>
      {mol === undefined ? null : (
        <g color="#1d1a3a">
          <Molecule mol={mol} x={x + pad} y={y + band + pad * 0.8} w={w - pad * 2} h={h - band - pad * 1.8} />
        </g>
      )}
    </g>
  );
}

/**
 * One section deck: a stack whose thickness is the card count, the top card
 * showing the structure that deck is about, so two decks never look alike.
 */
export function DeckArt({
  className = "",
  hue = 0,
  tag,
  molKey,
  cards,
  shine = false,
}: {
  readonly className?: string;
  readonly hue?: number;
  readonly tag: string;
  readonly molKey: string;
  readonly cards: number;
  /** Light behind the stack, for the shelf's best value. */
  readonly shine?: boolean;
}) {
  const c = hueOf(hue);
  const under = Math.max(1, Math.min(4, Math.round(cards / 5)));
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <Stage cushion={false} rays={shine ? 1 : 0}>
        <g transform="rotate(-4 60 60)">
          {Array.from({ length: under }, (_, i) => {
            const k = under - i;
            return <rect key={i} x={16 + k * 2.6} y={8 + k * 2.6} width="84" height="96" rx="8" fill={i % 2 === 0 ? c.b : c.a} stroke="#fff" strokeWidth="1.6" />;
          })}
          <MoleculeCard x={16} y={6} w={84} h={96} hue={hue} tag={tag} mol={SHOP_MOLECULES[molKey]} band={19} />
          <path d="M86 9h10L64 99H52Z" fill="#fff" opacity="0.14" />
        </g>
      </Stage>
    </svg>
  );
}

/** A small card flung out of a full chest, lying on the floor beside it. */
function SpilledCard({ x, y, angle, fill }: { readonly x: number; readonly y: number; readonly angle: number; readonly fill: string }) {
  return (
    <g transform={`rotate(${angle} ${x + 10} ${y + 13})`}>
      <rect x={x} y={y} width="20" height="26" rx="3.5" fill={fill} stroke="#fff" strokeWidth="1.8" />
      <path d={`M${x + 5} ${y + 7}h10M${x + 5} ${y + 12}h7`} stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Twinkle({ x, y, s }: { readonly x: number; readonly y: number; readonly s: number }) {
  return (
    <path
      d={`M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`}
      fill="#fff"
    />
  );
}

/**
 * How grand a unit set's art is, from how many decks it holds, the way Clash
 * Royale goes pouch, bucket, wagon: one deck stands alone, two or three ride
 * in a crate, four or five fill an open gold-trimmed chest, six or more
 * overflow it onto the floor under a burst of light.
 */
export function setTier(decks: number): 0 | 1 | 2 | 3 {
  return decks >= 6 ? 3 : decks >= 4 ? 2 : decks >= 2 ? 1 : 0;
}

/** A whole unit, drawn at its tier (setTier), the unit's signature structure on the front card. */
export function UnitChestArt({
  className = "",
  hue = 0,
  decks,
  tag,
  molKey,
}: {
  readonly className?: string;
  readonly hue?: number;
  readonly decks: number;
  readonly tag: string;
  readonly molKey: string;
}) {
  const c = hueOf(hue);
  const tier = setTier(decks);
  const mol = SHOP_MOLECULES[molKey];

  if (tier === 0) {
    // One deck: a single stack on a small cushion, like the pouch.
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
        <Stage cushion small>
          <g transform="rotate(-5 60 60)">
            <rect x="36" y="24" width="56" height="70" rx="7" fill={c.b} stroke="#fff" strokeWidth="1.8" />
            <rect x="33" y="21" width="56" height="70" rx="7" fill={c.a} stroke="#fff" strokeWidth="1.8" />
            <MoleculeCard x={30} y={17} w={56} h={70} hue={hue} tag={tag} mol={mol} band={13} />
          </g>
        </Stage>
      </svg>
    );
  }

  if (tier === 1) {
    // Two or three decks: a crate, the other decks standing up behind the front card.
    const angles = decks === 2 ? [20] : [-22, 22];
    return (
      <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
        <Stage cushion>
          {angles.map((angle, i) => (
            <g key={i} transform={`rotate(${angle} 60 92)`}>
              <rect x="42" y="16" width="36" height="54" rx="5" fill={i % 2 === 0 ? c.b : c.a} stroke="#fff" strokeWidth="2" />
              <path d="M50 28h20M50 35h13" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            </g>
          ))}
          <MoleculeCard x={26} y={8} w={68} h={68} hue={hue} tag={tag} mol={mol} band={14} />
          <path d="M18 70h84l-4 31H22Z" fill="#9a5a26" />
          <path d="M18 70h84v6H18Z" fill="#b8733a" />
          <path d="M22 83h76M23 92h74" stroke="#6b3a17" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 70h84M22 101h76" stroke="#a9b4c8" strokeWidth="3.4" />
          <path d="M30 70v31M90 70v31" stroke="#a9b4c8" strokeWidth="5" />
          <path d="M30 72v28M90 72v28" stroke="#6f7a90" strokeWidth="1.4" strokeDasharray="1.4 6" strokeLinecap="round" />
        </Stage>
      </svg>
    );
  }

  // Four or more: the open gold chest. Six or more: gems, cards spilling out, a gold burst behind.
  const behind = Math.max(0, Math.min(6, decks - 1));
  const grand = tier === 3;
  const trim = "#f2c230";
  const trimDark = "#b8860b";
  const angles = Array.from({ length: behind }, (_, i) => -42 + (84 / Math.max(1, behind - 1)) * i);
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <Stage cushion rays={grand ? 2 : 1}>
        {/* the lid, thrown open behind */}
        <path d="M10 72 18 30h84l8 42Z" fill="#5a3214" />
        <path d="M18 30h84l2 8H16Z" fill={trim} />
        <path d="M21 38h78l6 32H15Z" fill="#3a1f0b" />
        {grand ? <path d="M60 30v40" stroke={trim} strokeWidth="5" /> : null}
        {angles.map((angle, i) => (
          <g key={i} transform={`rotate(${angle} 60 88)`}>
            <rect x="43" y="10" width="34" height="52" rx="5" fill={i % 2 === 0 ? c.a : c.b} stroke="#fff" strokeWidth="2" />
            <path d="M51 22h18M51 29h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
          </g>
        ))}
        <MoleculeCard x={23} y={5} w={74} h={70} hue={hue} tag={tag} mol={mol} band={14} />
        <g transform="translate(0 6)">
          <path d="M8 64h104l-3 34H11Z" fill="#8a4f22" />
          <path d="M9 64h102v7H9Z" fill="#a8652e" />
          <path d="M14 81h92M13 90h94" stroke="#6b3a17" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 64h104" stroke={trim} strokeWidth="5" />
          <path d="M11 97h98" stroke={trim} strokeWidth="5" />
          <path d="M26 64v34M94 64v34" stroke={trim} strokeWidth="7" />
          <path d="M26 66v30M94 66v30" stroke={trimDark} strokeWidth="1.6" strokeDasharray="1.6 7" strokeLinecap="round" />
          <path d="M50 66h20v14l-10 8-10-8Z" fill={trim} stroke={trimDark} strokeWidth="1.6" />
          <circle cx="60" cy="75" r="4" fill={c.a} stroke="#fff" strokeWidth="1.3" />
          {grand ? (
            <>
              <circle cx="15" cy="68" r="4" fill="#ff5c8a" stroke="#fff" strokeWidth="1.3" />
              <circle cx="105" cy="68" r="4" fill="#3ec7ff" stroke="#fff" strokeWidth="1.3" />
              <circle cx="40" cy="90" r="3" fill="#2fd47a" stroke="#fff" strokeWidth="1.1" />
              <circle cx="80" cy="90" r="3" fill="#ffc83d" stroke="#fff" strokeWidth="1.1" />
            </>
          ) : null}
        </g>
        {grand ? (
          <>
            <SpilledCard x={-4} y={88} angle={-28} fill={c.b} />
            <SpilledCard x={102} y={86} angle={24} fill={c.a} />
            <Twinkle x={10} y={18} s={6} />
            <Twinkle x={110} y={26} s={5} />
            <Twinkle x={104} y={6} s={3.5} />
          </>
        ) : null}
      </Stage>
    </svg>
  );
}

/** An energy cell, full, on its cushion: the refill. */
export function EnergyCell({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <Stage>
        <g transform="translate(13 2) scale(0.78)">
          <rect x="50" y="8" width="20" height="12" rx="4" fill="#0b4d2a" />
          <rect x="32" y="16" width="56" height="102" rx="14" fill="#0b4d2a" />
          <rect x="39" y="23" width="42" height="88" rx="9" fill="#2fd47a" />
          <rect x="39" y="70" width="42" height="41" rx="9" fill="#1fb865" />
          <rect x="43" y="27" width="9" height="78" rx="4.5" fill="#b9f7d3" opacity="0.85" />
          <path d="M66 36 46 70h14l-6 30 22-40H62Z" fill="#fff" stroke="#0b4d2a" strokeWidth="3.4" strokeLinejoin="round" />
        </g>
        <path d="M98 22v12M92 28h12M22 40v8M18 44h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </Stage>
    </svg>
  );
}

/** The streak freeze on its cushion. */
export function FreezeArt({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <Stage>
        <g transform="translate(15 -1) scale(0.75)">
          <IceShape />
        </g>
        <path d="M98 22v12M92 28h12M22 52v8M18 56h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </Stage>
    </svg>
  );
}

/** Two crystals side by side on one cushion: the pair of freezes. */
export function FreezePair({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable="false">
      <Stage>
        <g transform="translate(-2 20) scale(0.62)">
          <IceShape />
        </g>
        <g transform="translate(40 5) scale(0.72)">
          <IceShape />
        </g>
        <path d="M100 20v12M94 26h12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </Stage>
    </svg>
  );
}

function IceShape() {
  return (
    <>
      <path d="M60 8 86 34 78 78 60 108 42 78 34 34Z" fill="#1C9BD8" />
      <path d="M60 8 86 34 60 46 34 34Z" fill="#E9FAFF" />
      <path d="M34 34 60 46 42 78Z" fill="#B7EDFF" />
      <path d="M86 34 60 46 78 78Z" fill="#2AA9E6" />
      <path d="M42 78 60 46 78 78 60 108Z" fill="#43BDF0" />
      <path d="M44 28 58 20" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}

export function Confetti() {
  const cols = ["#FFC83D", "#FF6B9A", "#2EC4A6", "#7C5CFF", "#5CCBF5", "#FF9F43"];
  const bits = Array.from({ length: 22 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    delay: `${(i % 7) * 70}ms`,
    dx: `${((i * 53) % 90) - 45}px`,
    rot: `${(i * 67) % 360}deg`,
    c: cols[i % cols.length],
    w: 6 + (i % 3) * 3,
  }));
  return (
    <span className="shop-confetti" aria-hidden>
      {bits.map((b, i) => (
        <i key={i} style={{ left: b.left, animationDelay: b.delay, background: b.c, width: b.w, height: b.w * 1.6, ["--dx" as string]: b.dx, ["--rot" as string]: b.rot }} />
      ))}
    </span>
  );
}

export function Sparkles() {
  const bits = [
    { x: "8%", y: "18%", s: 14, d: "0ms" },
    { x: "86%", y: "12%", s: 18, d: "120ms" },
    { x: "18%", y: "70%", s: 10, d: "240ms" },
    { x: "80%", y: "66%", s: 14, d: "60ms" },
    { x: "50%", y: "4%", s: 10, d: "180ms" },
  ];
  return (
    <span className="shop-sparkles" aria-hidden>
      {bits.map((b, i) => (
        <svg key={i} viewBox="0 0 24 24" style={{ left: b.x, top: b.y, width: b.s, height: b.s, animationDelay: b.d }}>
          <path d="M12 1c1 6 5 10 11 11-6 1-10 5-11 11-1-6-5-10-11-11 6-1 10-5 11-11Z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}
