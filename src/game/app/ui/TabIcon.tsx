/**
 * One inline icon per tab id. Inline SVG rather than an icon package so the
 * shell's entry chunk carries a handful of glyphs and not a font.
 *
 * THE FIVE BAR ICONS ARE STICKERS, THE FIVE OFF-BAR ONES ARE GLYPHS, and that
 * is a deliberate split rather than an unfinished job.
 *
 * The bar's icons are the only ones a student sees at 32px on a phone with
 * nothing else beside them, and a 2px hairline outline at that size reads as a
 * settings menu. The reference bar draws its five as flat, chunky, CENTRE-FILLED
 * cut-outs, each in its own colour, and it keeps that colour whether or not the
 * item is the active one. Round one of this piece wrote that intent into this
 * comment ("a flat shape in the tab's own colour") and then drew every layer in
 * `currentColor`, so the shipped bar was four hairlines in one grey. The colour
 * is real now and lives in theme.css as `--tab-hue-*`.
 *
 * THREE KINDS OF LAYER, which is the whole construction:
 *
 *   line   a thick round-capped stroke in the hue, or in the tint when it is
 *          the highlight laid back over one. The track, the arrow shaft
 *   body   a flat fill in the hue's 22 percent tint, outlined in the hue. This
 *          is what makes a shape read as a cut-out pressed onto the page, per
 *          sticker rule 3, and the tint under the outline is what stops it
 *          reading as a solid blob
 *   ink    a flat fill in the hue at full strength, no outline. Used where one
 *          shape sits ON another and has to occlude it: the head over the
 *          shoulders, the arrowhead over the shaft, the card behind the card
 *          in front
 *
 * Layers paint in order, so occlusion is the order and there is no knockout
 * colour to keep in sync with the ground any more. That is why the old `paper`
 * layer is gone: an opaque tint occludes what is behind it by itself, and a
 * knockout that had to guess whether the bar was white or near-black was one
 * more thing to get wrong in a theme nobody screenshotted.
 *
 * The five off-bar ids stay single stroke paths in `currentColor` on purpose.
 * They are drawn in a header tool button, in a list row on the Me tab and
 * beside a course name, all at 20px next to text, where a filled sticker would
 * out-shout the label it is labelling. Same family, different job.
 *
 * No shadow on any of them. Depth here is the outline and the occlusion, per
 * sticker rule 3, and a drop shadow is the thing that language forbids.
 */

import type { TabId } from "../routes";

type LayerKind = "line" | "body" | "ink";

interface Layer {
  readonly d: string;
  readonly as: LayerKind;
  /** Stroke width, `line` layers only. Bodies are always the 1.9 outline. */
  readonly w?: number;
  /** A `line` drawn in the tint rather than the hue: a highlight over a shaft. */
  readonly tint?: boolean;
}

interface Sticker {
  /** The token holding this tab's hue. Its 22 percent tint is the same name with `tint`. */
  readonly hue: string;
  readonly layers: readonly Layer[];
}

/** The five that appear in the bar, drawn as cut-outs in their own colour. */
const STICKERS: Record<"pathway" | "trainer" | "cards" | "feed" | "me", Sticker> = {
  /* Two nodes on a winding track, the small one behind and the big one ahead
     with a filled centre. The pathway tab draws exactly this, so the icon is a
     small picture of the screen it opens rather than a generic signpost, and
     the size difference between the two discs is what makes the line between
     them read as a direction rather than as a dumbbell. */
  pathway: {
    hue: "path",
    layers: [
      { d: "M6.8 18.2C6.8 12.4 17.2 13.8 17.2 6.4", as: "line", w: 3.2 },
      { d: "M6.8 14.7a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z", as: "body" },
      { d: "M17.2 1.9a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z", as: "body" },
      { d: "M17.2 4.7a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z", as: "ink" },
    ],
  },
  /* THE FLASK AND THE DUMBBELL, owner 2026-09-03: "keep train the flask and
     dumbbell, makes more sense", and the committed designs draw exactly that.

     What was here before was a curved electron arrow, which is a fine picture
     of the Mechanism Trainer and the wrong picture of this TAB. The tab is not
     the mechanism trainer; it is the gym, holding Puzzle Sprint, four practice
     modes and the daily mechanism, and an arrow says none of that. Flask plus
     dumbbell says chemistry plus reps in one glance, which is the job.

     Drawn as a conical flask on the left with a filled body, and a compact
     dumbbell on the right: two bells and a bar. The bar is a `line` rather
     than a rectangle so it survives being 20px next to a label, where a thin
     filled bar closes up into a smudge. */
  trainer: {
    hue: "train",
    layers: [
      // The flask: neck, shoulders, and a body that holds the level.
      { d: "M9.1 2.4h4.2", as: "line", w: 1.9 },
      { d: "M10.3 2.9v4.4L6.1 17.6a2.2 2.2 0 0 0 2 3.1h4.6a2.2 2.2 0 0 0 2-3.1l-4.2-10.3V2.9z", as: "body" },
      // The level inside it: the wide part only, so it reads as liquid.
      { d: "M7.3 14.8h6.9l1.5 3.4a1.6 1.6 0 0 1-1.5 2.5H7.3a1.6 1.6 0 0 1-1.5-2.5z", as: "ink" },
      // The dumbbell: bar first, then a bell each end.
      { d: "M16.4 12.6h4.6", as: "line", w: 2.1 },
      { d: "M15.5 10.2a1.5 1.5 0 0 1 1.5 1.5v1.8a1.5 1.5 0 0 1-3 0v-1.8a1.5 1.5 0 0 1 1.5-1.5z", as: "ink" },
      { d: "M21.9 10.2a1.5 1.5 0 0 1 1.5 1.5v1.8a1.5 1.5 0 0 1-3 0v-1.8a1.5 1.5 0 0 1 1.5-1.5z", as: "ink" },
    ],
  },
  /* A FANNED CARD STACK, per the committed designs, not two squares stacked
     square. What was here was two rounded rectangles offset on the diagonal,
     which at label size reads as two windows rather than as cards. The
     references fan them: the back card leans, the front one sits upright, and
     the lean is the whole tell. Three layers so the middle one gives the fan
     somewhere to happen; the back is ink, the middle tint, the front body, so
     each edge is legible against the one behind it. */
  cards: {
    hue: "cards",
    layers: [
      { d: "M14.6 2.2 19 3.6a2.6 2.6 0 0 1 1.7 3.3l-3 9.2a2.6 2.6 0 0 1-3.3 1.7l-4.4-1.5a2.6 2.6 0 0 1-1.7-3.3l3-9.1a2.6 2.6 0 0 1 3.3-1.7z", as: "ink" },
      { d: "M9.8 4.4h4.6a2.6 2.6 0 0 1 2.6 2.6v9.6a2.6 2.6 0 0 1-2.6 2.6H9.8a2.6 2.6 0 0 1-2.6-2.6V7a2.6 2.6 0 0 1 2.6-2.6z", as: "body" },
      { d: "M5.2 6.6h4.6a2.6 2.6 0 0 1 2.6 2.6v9.6a2.6 2.6 0 0 1-2.6 2.6H5.2a2.6 2.6 0 0 1-2.6-2.6V9.2a2.6 2.6 0 0 1 2.6-2.6z", as: "body" },
    ],
  },
  /* THE BLUE NEWSPAPER, docs/DESIGN-GOALS.md, "Header and tabs": "Feed is the
     blue NEWSPAPER". Drawn here in the same three-layer construction as its
     four neighbours rather than reusing FeedIcon.tsx's NewspaperMark, and the
     reason is that the bar draws its icons in the tab's OWN hue while
     NewspaperMark inherits `currentColor` and knocks its print out in
     `var(--bb-card)`. In the bar that would be a grey silhouette beside four
     coloured cut-outs at rest, and on the active chip its knockouts would be
     card-coloured on a lavender ground. NewspaperMark stays exactly where it
     is and keeps its job: it is the cheap glyph a non-bar surface imports
     without pulling the Feed chunk into the entry payload.

     The folded back page is the shape that says "newspaper" rather than
     "document" at 32px, so it is an `ink` slab BEHIND the sheet: an opaque
     fill occludes nothing it should not and needs no knockout colour. The
     print is three marks, not six: a masthead bar, one headline block and two
     column rules. Round one of this glyph drew six and they closed into a
     smudge at bar size. */
  feed: {
    hue: "feed",
    layers: [
      { d: "M15.4 6.3h3.9a1.7 1.7 0 0 1 1.7 1.7v9.4a2.7 2.7 0 0 1-2.7 2.7h-2.9z", as: "ink" },
      { d: "M4.5 3.3h10.3a2 2 0 0 1 2 2v13a2.4 2.4 0 0 1-2.4 2.4H4.9a2.4 2.4 0 0 1-2.4-2.4V5.3a2 2 0 0 1 2-2z", as: "body" },
      { d: "M4.9 6.2h9.2v1.9H4.9z", as: "ink" },
      { d: "M4.9 10.1h4v4.6h-4z", as: "ink" },
      { d: "M9.9 10.1h4.2v1.6H9.9zM9.9 13.1h4.2v1.6H9.9z", as: "ink" },
    ],
  },
  /* The avatar: a head and shoulders, the shoulders solid so the head reads as
     sitting in front of them rather than floating. */
  me: {
    hue: "me",
    layers: [
      { d: "M3.2 21.6a8.8 8.8 0 0 1 17.6 0z", as: "body" },
      { d: "M12 2.8a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2z", as: "ink" },
    ],
  },
};

/** The five off-bar glyphs. Stroke only, in currentColor; see the header. */
const GLYPHS: Record<Exclude<TabId, keyof typeof STICKERS>, string> = {
  periodic: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  search: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM14.5 14.5 20 20",
  courses: "M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z",
  leaderboards: "M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z",
  chat: "M4 5h16v10H9l-5 4z",
  messages: "M3 6h18v12H3zM3 6l9 7 9-7",
};

function isSticker(tab: TabId): tab is keyof typeof STICKERS {
  return tab in STICKERS;
}

export function TabIcon({ tab, className = "" }: { readonly tab: TabId; readonly className?: string }) {
  if (!isSticker(tab)) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={GLYPHS[tab]} />
      </svg>
    );
  }

  const sticker = STICKERS[tab];
  const hue = `var(--tab-hue-${sticker.hue})`;
  const tint = `var(--tab-tint-${sticker.hue})`;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {sticker.layers.map((layer, index) => {
        // Index as the key is safe here and only here: the list is a frozen
        // literal above, so nothing is ever inserted, removed or reordered.
        if (layer.as === "line") {
          return <path key={index} d={layer.d} stroke={layer.tint === true ? tint : hue} strokeWidth={layer.w ?? 3} />;
        }
        if (layer.as === "ink") {
          return <path key={index} d={layer.d} fill={hue} />;
        }
        return <path key={index} d={layer.d} fill={tint} stroke={hue} strokeWidth={1.9} />;
      })}
    </svg>
  );
}
