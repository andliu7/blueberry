/**
 * The coin balance's lettering: our own numerals, cut by hand and not set in a font.
 *
 * THE CUT. Every glyph is a filled outline on a 100-unit cap height, so each one has
 * its own weights: the 1's stem, the 7's arm and the 4's crossbar do not agree, and
 * they should not. Counters are pinched to slots, and they read as solid dark.
 *
 * THE LAYERS, back to front and a whole number at a time: one dark solid of each
 * glyph, swept down and to the right so the extrusion is part of the letter (a thin
 * line on the lit side, a thick wall on the shadow side), then a white face. The
 * faces come last so a neighbour's wall can never bite into a digit.
 *
 * THE BOUNCE. The whole number leans (LEAN), each digit carries its own tilt and
 * height (HAND), and each slot adds a small step (BOUNCE). All of it comes from the
 * character and the slot, never from a clock, so a settled number stands still.
 *
 * WIDTH. Every digit takes the same slot and fills it, the 1 included (it has a
 * foot), so the gaps are even and a rolling balance never pushes the header about.
 * coinCounter.test.ts measures the spacing.
 *
 * SIZE. 1em is the cap height, so the caller sets the digit's height directly and
 * can seat it in a rail by a stated ratio (--cc-cap in hud.css).
 */

interface Glyph {
  readonly w: number;
  /** The outside of the letter. */
  readonly d: string;
  /** Its counters, cut out of the face only: the dark solid behind shows through. */
  readonly c?: string;
  /** Degrees of tilt and units of lift, this digit's own. */
  readonly tilt: number;
  readonly dy: number;
}

const DIGIT_W = 66;

const GLYPHS: Readonly<Record<string, Glyph>> = {
  "0": {
    w: DIGIT_W,
    d: "M22 1L44 0Q63 1 65 23L65 76Q64 98 43 100L22 100Q2 98 1 78L1 24Q2 2 22 1Z",
    c: "M29 29Q27 29 27 32L27 67Q27 71 30 71L36 71Q39 71 39 68L39 32Q39 28 36 28Z",
    tilt: -1.2,
    dy: 0,
  },
  "1": {
    w: DIGIT_W,
    d: "M30 0L48 0L49 76L62 76Q65 76 65 80L65 96Q65 100 61 100L8 100Q4 100 4 96L4 80Q4 76 8 76L22 76L22 33L10 37Q6 38 5 34L3 20Q3 17 6 15L27 1Q28 0 30 0Z",
    tilt: 2.4,
    dy: -2,
  },
  "2": {
    w: DIGIT_W,
    d: "M3 30Q3 1 33 0Q64 0 64 28Q64 44 50 56L37 71L62 71Q66 71 66 75L65 97Q65 100 61 100L6 100Q2 100 2 96L2 82Q2 78 5 75L34 46Q40 40 40 31Q40 24 33 24Q27 24 26 33Q26 36 22 36L7 35Q3 35 3 30Z",
    tilt: -2,
    dy: 2,
  },
  "3": {
    w: DIGIT_W,
    d: "M4 12Q16 0 35 0Q63 0 63 26Q63 40 52 47Q65 54 65 71Q65 100 33 100Q13 100 2 88Q0 85 2 83L12 71Q14 68 17 71Q24 77 32 77Q41 77 41 70Q41 62 30 62L24 62Q21 62 21 59L21 44Q21 41 24 41L29 41Q39 41 39 31Q39 24 32 24Q25 24 19 29Q16 31 14 29L4 17Q2 14 4 12Z",
    tilt: 1.4,
    dy: -1,
  },
  "4": {
    w: DIGIT_W,
    d: "M38 0L56 0Q60 0 60 4L60 58L63 58Q66 58 66 62L66 78Q66 82 62 82L60 82L60 96Q60 100 56 100L40 100Q36 100 36 96L36 82L5 82Q1 82 1 78L1 66Q1 63 3 60L33 3Q34 0 38 0Z",
    c: "M37 34L26 58L37 58Z",
    tilt: -1,
    dy: 1.5,
  },
  "5": {
    w: DIGIT_W,
    d: "M12 0L59 1Q63 1 63 5L62 20Q62 24 58 24L31 24L30 34Q35 32 41 32Q65 33 65 65Q65 100 32 100Q13 100 3 89Q0 86 3 83L12 72Q15 69 18 72Q24 77 31 77Q41 77 41 66Q41 55 31 55Q25 55 21 59Q19 61 16 60L7 57Q4 56 4 52L8 4Q8 0 12 0Z",
    tilt: 1.8,
    dy: 0.5,
  },
  "6": {
    w: DIGIT_W,
    d: "M34 0Q48 0 57 6Q60 8 58 11L51 24Q49 27 46 25Q41 23 36 23Q27 23 26 35Q31 32 38 32Q65 33 65 65Q65 100 33 100Q2 100 1 57Q1 1 34 0Z",
    c: "M33 56Q27 56 27 66Q27 76 33 76Q39 76 39 66Q39 56 33 56Z",
    tilt: -1.6,
    dy: -1.5,
  },
  "7": {
    w: DIGIT_W,
    d: "M4 1L62 0Q66 0 66 4L65 18Q65 21 64 24L38 96Q37 100 33 100L14 100Q9 100 11 95L36 27L6 27Q2 27 2 23L1 5Q1 1 4 1Z",
    tilt: 2,
    dy: 2,
  },
  "8": {
    w: DIGIT_W,
    d: "M33 0Q62 0 62 26Q62 39 53 47Q65 55 65 71Q65 100 33 100Q1 100 1 71Q1 55 13 47Q4 39 4 26Q4 0 33 0Z",
    c: "M33 21Q28 21 28 28Q28 36 33 36Q38 36 38 28Q38 21 33 21ZM33 59Q27 59 27 69Q27 79 33 79Q39 79 39 69Q39 59 33 59Z",
    tilt: -0.8,
    dy: -1,
  },
  "9": {
    w: DIGIT_W,
    d: "M32 100Q18 100 9 94Q6 92 8 89L15 76Q17 73 20 75Q25 77 30 77Q39 77 40 65Q35 68 28 68Q1 67 1 35Q1 0 33 0Q64 0 65 43Q65 99 32 100Z",
    c: "M33 24Q27 24 27 34Q27 44 33 44Q39 44 39 34Q39 24 33 24Z",
    tilt: 1.2,
    dy: 1,
  },
  "+": { w: 58, d: "M21 20H37Q40 20 40 23V40H55Q58 40 58 43V57Q58 60 55 60H40V77Q40 80 37 80H21Q18 80 18 77V60H3Q0 60 0 57V43Q0 40 3 40H18V23Q18 20 21 20Z", tilt: 0, dy: 0 },
  "−": { w: 52, d: "M4 38H48Q52 38 52 42V58Q52 62 48 62H4Q0 62 0 58V42Q0 38 4 38Z", tilt: 0, dy: 0 },
};

const LINE = 3.5; // The thin line on the lit side.
const WALL_X = 5; // How far the extrusion runs, right and down.
const WALL_Y = 14;
/** Fine enough that the sweep's corners read as one solid, even zoomed. */
const WALL_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const LEAN = 5; // Degrees the whole number leans.
const GAP = 7; // Slot to slot, on top of the digit's width.
const SPACE = 24; // The thin space between thousands.
/** A small step per slot, so a run of one digit does not sit on a ruled line. */
const BOUNCE = [0, -1.5, 1, -0.5, 1.5, -1];
const LEAN_X = Math.tan((LEAN * Math.PI) / 180) * 100; // How far the top leads the foot.
const TOP = -LINE - 5;
const BOX_H = 100 + WALL_Y + LINE * 2 + 8;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Where each character of a written number goes, and the box it reserves. */
export function layoutNumerals(text: string): {
  readonly slots: readonly { readonly char: string; readonly glyph: Glyph; readonly x: number }[];
  readonly boxW: number;
} {
  const slots: { char: string; glyph: Glyph; x: number }[] = [];
  let x = 0;
  for (const char of text) {
    const glyph = GLYPHS[char];
    if (glyph === undefined) {
      x += SPACE;
      continue;
    }
    slots.push({ char, glyph, x });
    x += glyph.w + GAP;
  }
  return { slots, boxW: x };
}

/** Whether the set has this character: the digits, plus and minus. */
export const hasNumeral = (char: string): boolean => GLYPHS[char] !== undefined;

export function CoinNumerals({ text }: { readonly text: string }) {
  const { slots, boxW } = layoutNumerals(text);
  const left = -LINE - 2;
  const fullW = Math.max(boxW - GAP, 0) + LEAN_X + WALL_X + LINE * 2 + 4;
  const place = (slot: (typeof slots)[number], i: number) =>
    `translate(${slot.x} ${round1(slot.glyph.dy + (BOUNCE[i % BOUNCE.length] ?? 0))}) rotate(${slot.glyph.tilt} ${slot.glyph.w / 2} 50)`;
  return (
    <svg
      className="coin-numerals"
      viewBox={`${left} ${TOP} ${round1(fullW)} ${BOX_H}`}
      style={{ width: `${round1(fullW) / 100}em`, height: `${BOX_H / 100}em` }}
      aria-hidden
      focusable="false"
    >
      {/* The lean pivots on the baseline, so the foot stays where the slot put it. */}
      <g transform={`translate(${round1(LEAN_X)} 0) skewX(${-LEAN})`}>
        <g fill="var(--cc-digit-line)" stroke="var(--cc-digit-line)" strokeWidth={LINE * 2} strokeLinejoin="round">
          {WALL_STEPS.map((step) => (
            <g key={step} transform={`translate(${step * WALL_X} ${step * WALL_Y})`}>
              {slots.map((slot, i) => (
                <path key={i} d={slot.glyph.d} transform={place(slot, i)} />
              ))}
            </g>
          ))}
        </g>
        <g fill="var(--cc-digit)" fillRule="evenodd">
          {slots.map((slot, i) => (
            <path key={i} d={`${slot.glyph.d}${slot.glyph.c ?? ""}`} transform={place(slot, i)} />
          ))}
        </g>
      </g>
    </svg>
  );
}
