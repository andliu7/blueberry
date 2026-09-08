/**
 * The four drawn marks in the header HUD: the XP ring, the diamond, the streak
 * flame, and the charge cell. Bloom is the imported mascot, never redrawn
 * (CLAUDE.md, and docs/INHERITED-DECISIONS.md D4), and since the S3 design pass
 * he is no longer one of the header's marks: see ChargeMark below.
 *
 * Every one is inline SVG with token fills. No sprite sheet, no icon font, no
 * emoji: an emoji flame is a different drawing on every platform and a font is
 * bytes the game route pays for on a budget that already counts them.
 *
 * WHY THEY ARE CHUNKY. The bar's header marks are solid shapes with one lighter
 * facet and no outline, read at about 24px on a phone. A hairline stroke icon
 * at that size reads as a settings row rather than as a score, which is the
 * whole difference between a game HUD and an admin panel. So each mark here is
 * a filled silhouette plus exactly one lighter facet for volume, and nothing
 * else. The facet is a white or black wash at low alpha ON the mark, so it
 * never has to clear a contrast floor against the page: the silhouette does
 * that, in a token measured for it.
 *
 * The one place a stroke is right is the ring, because a ring IS a stroke: the
 * arc's length is the number.
 */

/**
 * The daily goal ring. The full circle is the goal, so the ring carries the
 * goal tier by construction: a Casual student's circle closes at 10 XP and an
 * Exam mode student's at 60, and both read "how much of today is done".
 *
 * The arc is drawn with stroke-dasharray on a circle rotated a quarter turn, so
 * it starts at twelve o'clock. dashoffset is transitioned in hud.css, which is
 * why XP landing mid session animates the arc rather than jumping it.
 */
export function XpRing({ fraction, met, className = "" }: { readonly fraction: number; readonly met: boolean; readonly className?: string }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 32 32" className={`-rotate-90 ${className}`} aria-hidden focusable="false">
      <circle cx="16" cy="16" r={radius} fill="none" stroke="var(--hud-track)" strokeWidth="4.5" />
      <circle
        className="hud-ring-arc"
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke={met ? "var(--good)" : "var(--bb-primary)"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
      />
    </svg>
  );
}

/**
 * The diamond. A brilliant cut seen from above: a table facet across the top,
 * the crown falling away to a point. The table is the lighter facet; the right
 * pavilion takes a dark wash so the stone has a lit side and a shaded side.
 */
export function DiamondMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M6.2 2.5h11.6L23 9.1 12 22 1 9.1z" fill="var(--diamond)" />
      <path d="M6.2 2.5h11.6L23 9.1H1z" fill="#ffffff" fillOpacity="0.34" />
      <path d="M12 22 23 9.1h-6.4z" fill="#000000" fillOpacity="0.16" />
      <path d="M9 4.6h6l1.4 4.5H7.6z" fill="#ffffff" fillOpacity="0.22" />
    </svg>
  );
}

/**
 * The streak flame. Two shapes: the body, and the inner tongue.
 *
 * BOTH SHAPES SURVIVE WHEN IT IS OUT, and that is a correction of the first
 * draft rather than a preference. Round one drew the unlit flame as the
 * silhouette alone, and in the capture it read as a raindrop: what identifies
 * fire at 22px is the two tone core, not the outline. So an unlit flame keeps
 * its tongue at 0.42 alpha of the same grey, which is a lighter core on a grey
 * body, and hud.css leans the whole thing slowly from the base so it reads as
 * guttering rather than as disabled.
 *
 * The silhouette itself is asymmetric on purpose: the tip leans, and the right
 * shoulder carries the small fold a flame makes as it curls. A symmetric
 * teardrop is a drop of water, whatever colour it is filled with.
 *
 * ECONOMY.md's whole mitigation set argues against rendering an unmet day as a
 * loss, so the unlit flame is still a flame and there is no red anywhere near
 * it.
 */
export function FlameMark({ lit, className = "" }: { readonly lit: boolean; readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        className="hud-flame-body"
        d="M12.6 1.2c-.4 2.9-2 4.3-3.4 5.6C7.2 8.6 4.8 11 4.8 15.2 4.8 19.1 8 22.2 12 22.2s7.2-3.1 7.2-7c0-2.8-1.2-4.7-2.6-6.2-.2 1.5-1 2.6-2.1 3 1-3.6-.6-8.2-1.9-10.8z"
        fill={lit ? "var(--streak)" : "var(--hud-out)"}
      />
      <path
        className="hud-flame-core"
        d="M12 10.4c1.9 1.9 3 3.4 3 5.1a3 3 0 0 1-6 0c0-1.6 1.1-3.2 3-5.1z"
        // Lighter than the body in BOTH states, because that is what a hot core
        // is. A first pass drew the unlit core in --hud-out at 0.42, which is
        // the body's own colour over the body: opaque grey on opaque grey, so
        // the flame lost its structure and the capture showed a raindrop. A
        // white wash lightens either theme's mid grey.
        fill={lit ? "var(--streak-core)" : "#ffffff"}
        fillOpacity={lit ? 1 : 0.42}
      />
    </svg>
  );
}

/**
 * The charge cell, and it is here because Bloom used to be.
 *
 * WHAT IT REPLACED AND WHY. The charge chip drew Bloom at 26px with his halo
 * set to the charge fraction. That was a nice idea and it cost more than it
 * paid, on two counts a measurement caught and a judge had already said in
 * words. The sticker audit's rule 10 counts mascot instances on one screen and
 * was reporting two on ten routes, three on seven and four on the charge ones,
 * unchanged across four rounds; P3's own round two judge wrote "the same
 * blueberry face appears four times on one screen, so the number that matters
 * fights five other glyphs". And inside the chip itself the fraction was drawn
 * TWICE, once as the halo's thickness at 26px where it is barely legible and
 * once as the meter under the word, where it is legible.
 *
 * So the chip keeps the meter, which is the reading, and takes a mark, which is
 * the identity. Bloom keeps the coach mark at 76px, where the halo really does
 * read as a meter gaining and losing weight, and keeps every full screen moment
 * he already owned. He appears once per screen now instead of two to four
 * times, which is what makes him a character rather than clip art.
 *
 * Drawn the same way as the diamond and the flame: a filled silhouette in the
 * family's own token, one lighter facet for volume, and the bolt cut out in the
 * card's colour so the shape is one component in both themes.
 */
export function ChargeMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <rect x="2.5" y="1.5" width="19" height="21" rx="6.5" fill="var(--good)" />
      <path d="M9 1.5h6a6.5 6.5 0 0 1 6.5 6.5v2.5h-19V8A6.5 6.5 0 0 1 9 1.5z" fill="#ffffff" fillOpacity="0.24" />
      <path d="M13.6 4.2 7.3 13h3.4l-.7 6.8 6.5-9.1h-3.6z" fill="var(--bb-card)" />
    </svg>
  );
}
