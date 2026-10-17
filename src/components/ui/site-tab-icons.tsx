import { useId, type CSSProperties, type ReactNode } from "react";
import type { Destination } from "@/lib/siteNav";

/**
 * The five tab glyphs: Learn, Practice, Review, Schedule, Me. Drawn in shell round 4,
 * three-tone stickers in round 5, redrawn in shell round 6, outline removed in round 7,
 * drawn bigger and simpler in round 8, 2026-10-07.
 *
 * WHY REDRAWN AGAIN. The owner asked on 30 Sep for tab icons that are cartoonish, cute,
 * clean and 3D-looking. Round 5's blind critic gave them to Duolingo for three reasons:
 * the same white slash was stamped top left on all five (a template tell), Schedule's
 * dots and circle read as a radio, and Me was a lime with a face. Round 6 keeps the three
 * tones and fixes all three: each shape has its own highlight on its own form, Schedule
 * is a calendar page (binder rings, a grid, today marked), and Me is a person.
 *
 * THE RECIPE (`Sticker` below), for every silhouette:
 * 1. the face, one bright colour, the same in both themes;
 * 2. the shade. The whole silhouette is painted in the shade tone, then the face is
 *    painted again shifted up and left (`lift`), toward the light. What stays dark is a
 *    band along the bottom and right edge that follows that shape's own outline: the
 *    curve under a ball, the V under a book, the thickness of a card. That band is the 3D,
 *    and it is the edge that carries WCAG's 3:1 for a UI shape, so the face can stay
 *    bright;
 * 3. a white highlight drawn per glyph, on that glyph's lit edge: along the book's page
 *    edge, round the flask's bulb, in a card's corner, on the binder rings, on the hair.
 *
 * NO OUTLINE (round 7). Round 5 ringed every glyph in a 2px stroke of its shade tone;
 * round 6's critic found it made them heavier and smaller than Duolingo's. Measured on
 * Duolingo's own bar (the shell round 7 log has the table): none of its glyphs has an
 * outline; each steps from the bar straight to its face, and the darker second tone (the
 * camera's lens, the chest's wood, the person's hair) is what clears 3:1. Same here.
 *
 * TWO DRAWINGS EACH. `simple` is the desktop header's variant. At 28px the phone glyph's
 * small parts (the book's text lines, the bubbles, the binder rings' shine, the cheeks)
 * smeared into noise (critic, round 5), so the desktop variant drops them and draws the
 * remaining lines heavier.
 *
 * HOW THE COLOURS WORK. No colour is written here. Every shape reads a `--site-tab-*`
 * token from src/tokens.css: `--site-tab-<id>` (face), `-shade`, `-2` and `-3` (details),
 * `--site-tab-shine` and `--site-tab-eye`; Me's hair is `--site-tab-me-4`.
 * src/test/siteNavPress.test.ts checks every shade is 3:1 against the header, the bar and
 * the current chip in both themes, and that each glyph paints its shade silhouette first.
 *
 * WHY `useId`. The shading is clipped to the silhouette with an SVG `<clipPath>`, which
 * is found by id, and the same glyph is on the page twice (header and phone bar). React's
 * `useId` hook gives each drawn copy its own id so the two copies never share a clip.
 *
 * Drawn on a 36 by 36 grid, out to its edges (round 8). The art is our own: an open book, a
 * round-bottomed flask, a deck of flashcards with a benzene ring, a calendar page, and a
 * person (head and shoulders).
 */

type Id = Destination["id"];
type Lift = [number, number];
const v = (name: string) => `var(--site-tab-${name})`;
const fill = (name: string): CSSProperties => ({ fill: v(name) });
const stroke = (name: string, width: number): CSSProperties => ({
  fill: "none",
  stroke: v(name),
  strokeWidth: width,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

/** A rounded rectangle as path data, so it can be clipped and outlined like any silhouette. */
function rr(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}z`;
}

/** A white highlight stroke. Each glyph places its own on its own lit edge. */
function Gloss({ d, width = 2 }: { d: string; width?: number }) {
  return <path d={d} style={stroke("shine", width)} />;
}

/**
 * One silhouette in its tones. `lift` is how far the lit face is
 * shifted toward the light (up and left), which sets how wide the shaded band is. `inner`
 * is drawn inside the silhouette after the shading (the flask's liquid); it gets
 * the clip id and the lift so it can shade itself the same way. `children` sit on top.
 */
function Sticker({
  clip,
  id,
  d,
  face = id,
  shade = `${id}-shade`,
  lift = [-1.2, -3.6],
  transform,
  inner,
  children,
}: {
  clip: string;
  id: Id;
  d: string;
  face?: string;
  shade?: string;
  lift?: Lift;
  transform?: string;
  inner?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <g transform={transform}>
      <clipPath id={clip}>
        <path d={d} />
      </clipPath>
      {/* The whole silhouette in the shade tone, painted first: this is the shape's edge
          wherever the face does not cover it, and it is the mark the contrast audit
          measures against the bar (the first thing painted in the svg). */}
      <path d={d} style={fill(shade)} />
      {/* The face, shifted toward the light and clipped to the silhouette, so the shade
          stays only as a band along the lower and right edge. */}
      <g clipPath={`url(#${clip})`}>
        <path d={d} transform={`translate(${lift[0]} ${lift[1]})`} style={fill(face)} />
        {inner}
      </g>
      {children}
    </g>
  );
}

/**
 * Two tones for something inside a silhouette (the liquid in the flask): the dark tone
 * everywhere, the light tone only where the shifted silhouette covers it, so its shaded
 * band lines up with the glass around it. The clip is the silhouette's own, applied in a
 * group moved by `lift`.
 */
function Shaded({ clip, d, light, dark, lift }: { clip: string; d: string; light: string; dark: string; lift: Lift }) {
  return (
    <>
      <path d={d} style={fill(dark)} />
      <g transform={`translate(${lift[0]} ${lift[1]})`}>
        <g clipPath={`url(#${clip})`}>
          <path d={d} transform={`translate(${-lift[0]} ${-lift[1]})`} style={fill(light)} />
        </g>
      </g>
    </>
  );
}

// Shell round 8: every glyph is drawn out to the 36-unit grid's edge (2 to 34) and the svg is
// 40px, so each one paints at least 32px on its longer side and 650 px2 of ink, as
// Duolingo's bar does (685 to 880). src/test/siteTabInk.test.ts measures that floor.
// The flask's bulb is wider (radius 12.6, was 10.5) on a shorter neck.
const FLASK =
  "M14.2 9.9V7.3h-.3A1.6 1.6 0 0 1 12.3 5.7V3.6A1.6 1.6 0 0 1 13.9 2h8.2a1.6 1.6 0 0 1 1.6 1.6v2.1a1.6 1.6 0 0 1-1.6 1.6h-.3v2.6A12.6 12.6 0 1 1 14.2 9.9z";
const LIQUID = "M2 20.6q4-1.8 8 0t8 0 8 0 8 0V36H2z";
const FLASK_LIFT: Lift = [-1.4, -3];
// Person: a dome of shoulders, a round head just above them, and a hair cap that sits
// over the top of the head and down to the ears, with a fringe across the forehead.
const SHOULDERS = "M5 35a2 2 0 0 1-2-2c0-5.6 6.6-9.4 15-9.4s15 3.8 15 9.4a2 2 0 0 1-2 2z";
const HEAD = "M8.2 14.8a9.8 9.8 0 1 1 19.6 0a9.8 9.8 0 1 1-19.6 0z";
const HAIR =
  "M7.3 16.4C6.7 9 11.6 3.9 18 3.9S29.3 9 28.7 16.4C27.7 16.4 26.9 15.8 26.7 14.8L26 11.2C22.7 12.9 16.5 13.6 11.1 11.6L10.4 14.8C10.2 15.8 9.4 16.4 8.4 16.4z";

const ART: Record<Id, (clip: string, simple: boolean) => ReactNode> = {
  // An open book: the page block's thickness shows as the shaded V along the bottom,
  // the spine down the middle, two lines of text on the right page (phone only), and the
  // highlight runs along the left page's top edge. Round 8: taller pages (26 units, was 23).
  learn: (c, simple) => (
    <Sticker
      clip={c}
      id="learn"
      d="M2 9.5c0-1.6 1.4-2.7 3-2.4L18 9.8l13-2.7c1.6-.3 3 .8 3 2.4v18.2c0 1.2-.8 2.2-2 2.4L18 33 4 30.1c-1.2-.2-2-1.2-2-2.4z"
      lift={[-0.8, -3.4]}
    >
      <path d="M18 11.4v19.8" style={stroke("learn-shade", simple ? 2.2 : 1.8)} />
      {!simple && <path d="M22 15.2l7.6-1.5M22 19.8l7.6-1.5" style={stroke("learn-2", 2.2)} />}
      <Gloss d="M6.4 11.6l5.4 1.1" width={simple ? 2.6 : 2.2} />
    </Sticker>
  ),
  // A round-bottomed flask: the bulb is shaded like a ball, the green liquid is shaded
  // the same way, and the highlight curves round the bulb's lit side.
  practice: (c, simple) => (
    <Sticker
      clip={c}
      id="practice"
      d={FLASK}
      lift={FLASK_LIFT}
      inner={<Shaded clip={c} d={LIQUID} light="practice-2" dark="practice-3" lift={FLASK_LIFT} />}
    >
      {!simple && (
        <>
          <circle cx="20" cy="26.6" r="1.6" style={fill("shine")} />
          <circle cx="24.4" cy="24" r="1" style={fill("shine")} />
        </>
      )}
      <Gloss d="M8.9 20.3A9.2 9.2 0 0 1 13.4 13.9" width={simple ? 2.6 : 2.2} />
    </Sticker>
  ),
  // A deck of flashcards, seen from the front: two cards peek out above the front one, all
  // three square to the cell, so the deck has one outline centred in the chip (round 7's
  // two tilted cards read as two loose parts leaning to the top right). The front card
  // carries one bold benzene ring; round 7's inner circle was a 3px detail and is gone.
  review: (c, simple) => (
    <>
      <Sticker clip={`${c}b`} id="review" face="review-2" d={rr(7, 4, 22, 22, 3.5)} lift={[-1, -2.4]} />
      <Sticker clip={`${c}m`} id="review" face="review-2" d={rr(5.5, 7, 25, 24, 4)} lift={[-1, -2.4]} />
      <Sticker clip={c} id="review" d={rr(4, 10.5, 28, 23.5, 4.5)} lift={[-1, -3]}>
        <path d="M18 17l4.33 2.5v5L18 27l-4.33-2.5v-5z" style={stroke("review-shade", simple ? 2.8 : 2.4)} />
        <Gloss d="M7.4 17.4v-1.6a2.2 2.2 0 0 1 2.2-2.2h1.6" width={simple ? 2.6 : 2.2} />
      </Sticker>
    </>
  ),
  // A calendar page: two binder rings, the coloured header strip, a pale page with four
  // days and today marked dark. Round 8: four cells on the phone as well (round 7 drew six,
  // 3 to 4px each at 1x, which read as texture).
  schedule: (c, simple) => {
    const cells = [[8.5, 16.4, 8.4, 5.6], [19.1, 16.4, 8.4, 5.6], [8.5, 23.8, 8.4, 5.6], [19.1, 23.8, 8.4, 5.6]];
    return (
      <>
        <Sticker clip={c} id="schedule" d={rr(3, 7, 30, 27, 5)} lift={[-1, -3]}>
          <path d={rr(6.2, 13.8, 23.6, 17.4, 3)} style={fill("schedule-2")} />
          {cells.map(([x, y, w, h], i) => (
            <path key={i} d={rr(x, y, w, h, 1.4)} style={fill(i === 3 ? "schedule-shade" : "schedule")} />
          ))}
          <Gloss d="M15.6 10.4h4.8" width={simple ? 2.6 : 2.2} />
        </Sticker>
        <path d={rr(9.4, 2, 4.4, 9.6, 2.2)} style={fill("schedule-shade")} />
        <path d={rr(22.2, 2, 4.4, 9.6, 2.2)} style={fill("schedule-shade")} />
        {!simple && <path d="M11.6 4.4v1.8M24.4 4.4v1.8" style={stroke("shine", 1.4)} />}
      </>
    );
  },
  // Me: a person, head and shoulders, smiling. Round 6 ringed the head in the shirt's pink,
  // which fused with the shoulders into a hood (critic, round 6). Now the head has no ring:
  // its top edge is a separate hair cap in its own brown (`-4`, 3:1 on every ground, as
  // Duolingo's profile glyph does with its hair), the face is skin shaded in its own tone,
  // and the shoulders are the pink shirt. Highlights on the hair and the left shoulder.
  me: (c, simple) => (
    <>
      <Sticker clip={`${c}s`} id="me" d={SHOULDERS} lift={[-1, -1.6]}>
        <Gloss d="M7.8 30.4c.9-2.2 2.7-3.8 5.2-4.6" width={simple ? 2.6 : 2.2} />
      </Sticker>
      <Sticker clip={c} id="me" face="me-2" shade="me-3" d={HEAD} lift={[-1, -1.8]}>
        <ellipse cx="14.5" cy="16.8" rx={simple ? 1.7 : 1.45} ry={simple ? 2.1 : 1.9} style={fill("eye")} />
        <ellipse cx="21.5" cy="16.8" rx={simple ? 1.7 : 1.45} ry={simple ? 2.1 : 1.9} style={fill("eye")} />
        <path d="M14.9 19.9h6.2a3.1 3.1 0 0 1-6.2 0z" style={fill("eye")} />
        {!simple && (
          <>
            <circle cx="11.8" cy="20" r="1.3" style={fill("me")} />
            <circle cx="24.2" cy="20" r="1.3" style={fill("me")} />
          </>
        )}
      </Sticker>
      <path d={HAIR} style={fill("me-4")} />
      <Gloss d="M11.8 9a8.2 8.2 0 0 1 4.2-2.9" width={simple ? 2.2 : 1.8} />
    </>
  ),
};

/**
 * One glyph. Decorative: the tab's words name it, so it is hidden from screen readers.
 * `simple` draws the desktop header's variant (see the note at the top).
 */
export function SiteTabIcon({ id, simple = false, className }: { id: Id; simple?: boolean; className?: string }) {
  // useId gives ":r1:"-style ids; the colons are stripped so `url(#...)` parses.
  const clip = `tab-${id}-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 36 36" aria-hidden focusable="false" data-tab-icon={id} className={className}>
      {ART[id](clip, simple)}
    </svg>
  );
}
