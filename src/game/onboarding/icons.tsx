/**
 * The onboarding icon set: flat colour STICKERS, drawn as SVG.
 *
 * DESIGN-GOALS, owner finding 2026-09-02: "ICONS ARE SVG, NEVER RASTER, NEVER
 * EMOJI. Every in-product icon is a traced SVG that inherits currentColor."
 * That clause is about the FORMAT and it is honoured here: every mark below is
 * a path on a 24 unit grid and every OUTLINE is `currentColor`, so a glyph
 * follows the ink of whatever chip holds it and both themes work.
 *
 * WHAT CHANGED THIS ROUND, and it was the single most visible difference
 * between the built screen and blueberry_r9-onboard-question. The image draws
 * each chip icon as a full colour sticker: a purple erlenmeyer with a face, a
 * grey stethoscope, a red and white life ring, a black four point sparkle. The
 * previous pass drew monochrome line glyphs in the muted ink and recorded the
 * divergence as deliberate, on the reasoning that a coloured illustration
 * cannot take the picked state's colour with it. That reasoning was answered
 * by looking at the image again: the picked chip in the goal image keeps its
 * flask PURPLE and carries the pick in the outline, the edge and the check.
 * The icon was never what said "picked".
 *
 * So these are flat fills with a real outline, which is the sticker language
 * (docs/DESIGN-TOKENS.md and the sticker audit: flat fills, outlined shapes,
 * no gradient, no blur). EVERY FILLED SHAPE CARRIES AN OUTLINE, and that is a
 * measurement decision as well as a drawing one: contrast-audit.mjs collapses
 * a shape's fill and stroke to the better of the two, so a near white life
 * ring reads against the cream chip through its outline rather than needing to
 * be darkened into something that is no longer white.
 *
 * COLOUR COMES FROM TOKENS, never from a literal. The palette here is
 * --bb-primary-bright for the violet props, --bb-destructive for the red ones,
 * --bb-muted-foreground for the grey ones, --bb-foreground for the black ones, and
 * --ob-prop for the white ones, which onboarding.css derives from --bb-card and
 * --bb-primary-foreground so a white prop is still white at night.
 *
 * `aria-hidden` on all of them: the chip's own label is the accessible name,
 * and an icon that repeats it is one more thing a screen reader has to say.
 */

import type { ReactNode, SVGProps } from "react";

type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">;

/**
 * A line mark: no fill, the ink of its chip, 2 units of stroke. Kept for the
 * chrome marks (back, close, check) where a sticker would be wrong: those are
 * controls rather than illustrations.
 */
function Glyph({ children, ...rest }: GlyphProps & { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/**
 * A sticker: flat fills, an outline in the chip's own ink, round joins.
 *
 * The outline is 1.6 units rather than the line family's 2 so a filled shape
 * does not read as heavier than the label beside it, and `paint-order` puts
 * the stroke behind the fill so an outline never eats into the colour it is
 * drawn around.
 */
function Sticker({ children, ...rest }: GlyphProps & { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      paintOrder="stroke fill"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Orgo II exam prep. The purple erlenmeyer with a face, the image's own prop. */
export function FlaskIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M9.6 3.2v6.1L4.6 18a2.1 2.1 0 0 0 1.8 3.1h11.2A2.1 2.1 0 0 0 19.4 18l-5-8.7V3.2Z"
        fill="var(--bb-primary-bright)"
      />
      <path d="M8.2 3.2h7.6" fill="none" />
      {/* The face. Two eyes and a smile, small enough that the flask still
          reads as a flask at the 36px the chip gives it. */}
      <g fill="currentColor" stroke="none">
        <circle cx="10.3" cy="15.4" r="0.95" />
        <circle cx="13.9" cy="15.4" r="0.95" />
      </g>
      <path d="M10.6 17.7q1.5 1.3 3 0" fill="none" strokeWidth={1.3} />
    </Sticker>
  );
}

/** DAT and MCAT. The grey stethoscope. */
export function StethoscopeIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M6 3.2v4.6a4.1 4.1 0 0 0 8.2 0V3.2"
        fill="none"
        stroke="var(--bb-muted-foreground)"
        strokeWidth={2.1}
      />
      <path d="M4.4 3.2h3.2M12.6 3.2h3.2" fill="none" stroke="var(--bb-muted-foreground)" strokeWidth={2.1} />
      <path
        d="M10.1 12v2.1a5 5 0 0 0 5 5h.4"
        fill="none"
        stroke="var(--bb-muted-foreground)"
        strokeWidth={2.1}
      />
      <circle cx="18.4" cy="17.6" r="2.7" fill="var(--ob-prop)" stroke="var(--bb-muted-foreground)" strokeWidth={2.1} />
    </Sticker>
  );
}

/**
 * Surviving my course. THE LIFE RING, and this one is a motif fix rather than
 * a rendering one.
 *
 * The previous glyph was a thin outer circle, a small concentric inner circle
 * and four short radial ticks, which at 36px reads as a target or a crosshair.
 * blueberry_r9-onboard-question draws the real prop: a white torus with FOUR
 * RED SEGMENTS around it at the diagonals and small rope lugs outside the rim.
 * Drawn here as a thick white annulus (a stroked circle, so the ring has real
 * body) with four red arcs stroked over it at the same radius.
 */
export function LifeRingIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      {/* The lugs, behind the ring so they read as rope loops peeking out. */}
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        <path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4" />
      </g>
      {/* The white body of the ring: a stroke, not a fill, so the hole is real. */}
      <circle cx="12" cy="12" r="7.1" fill="none" stroke="var(--ob-prop)" strokeWidth={4.6} />
      {/* The four red segments, on the diagonals, as the prop draws them. */}
      <g fill="none" stroke="var(--bb-destructive)" strokeWidth={4.6} strokeLinecap="butt">
        <path d="M12 4.9a7.1 7.1 0 0 1 5 2.1" />
        <path d="M19.1 12a7.1 7.1 0 0 1-2.1 5" />
        <path d="M12 19.1a7.1 7.1 0 0 1-5-2.1" />
        <path d="M4.9 12a7.1 7.1 0 0 1 2.1-5" />
      </g>
      {/* The two outlines, drawn last so the ring keeps a clean edge. */}
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        <circle cx="12" cy="12" r="9.4" />
        <circle cx="12" cy="12" r="4.8" />
      </g>
    </Sticker>
  );
}

/** Curiosity. The black four point sparkle, with its small companion. */
export function SparkleIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M14 2.6c0 4 2.7 6.7 6.7 6.7-4 0-6.7 2.7-6.7 6.7 0-4-2.7-6.7-6.7-6.7 4 0 6.7-2.7 6.7-6.7Z"
        fill="var(--bb-foreground)"
        strokeWidth={1.2}
      />
      <path
        d="M6.4 14.6c0 2.1 1.2 3.3 3.3 3.3-2.1 0-3.3 1.2-3.3 3.3 0-2.1-1.2-3.3-3.3-3.3 2.1 0 3.3-1.2 3.3-3.3Z"
        fill="var(--bb-foreground)"
        strokeWidth={1.2}
      />
    </Sticker>
  );
}

/** A friend or classmate. Two berry-violet figures. */
export function FriendsIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <circle cx="16.2" cy="8.4" r="3" fill="var(--bb-muted-foreground)" />
      <path d="M10.4 20.4a5.8 5.8 0 0 1 11.6 0Z" fill="var(--bb-muted-foreground)" />
      <circle cx="8.6" cy="7.6" r="3.6" fill="var(--bb-primary-bright)" />
      <path d="M2 20.4a6.6 6.6 0 0 1 13.2 0Z" fill="var(--bb-primary-bright)" />
    </Sticker>
  );
}

/** Social media. A violet speech bubble with a spark in it. */
export function SocialIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M20.6 12.2c0 4-3.9 7.1-8.6 7.1a10.6 10.6 0 0 1-2.6-.3L4.4 21l1.1-3.5a6.7 6.7 0 0 1-2.1-5.3c0-4 3.9-7.2 8.6-7.2s8.6 3.2 8.6 7.2Z"
        fill="var(--bb-primary-bright)"
      />
      <path
        d="M12 8.2c0 1.7 1.1 2.8 2.8 2.8-1.7 0-2.8 1.1-2.8 2.8 0-1.7-1.1-2.8-2.8-2.8 1.7 0 2.8-1.1 2.8-2.8Z"
        fill="var(--ob-prop)"
        strokeWidth={1.1}
      />
    </Sticker>
  );
}

/** Search. The magnifier, glass and grip. */
export function SearchIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <circle cx="10.4" cy="10.4" r="6.6" fill="var(--ob-prop)" />
      <path d="m15.2 15.2 4.9 4.9" fill="none" stroke="var(--bb-muted-foreground)" strokeWidth={3.2} />
      <path d="m15.2 15.2 4.9 4.9" fill="none" strokeWidth={1.2} />
    </Sticker>
  );
}

/** My professor or TA. The mortarboard. */
export function ProfessorIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path d="M6.6 10.6v4.8c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.8Z" fill="var(--ob-prop)" />
      <path d="m2.4 8.8 9.6-4.5 9.6 4.5-9.6 4.6Z" fill="var(--bb-foreground)" strokeWidth={1.2} />
      <path d="M21.6 8.8v5.4" fill="none" />
    </Sticker>
  );
}

/** The App Store. A phone. */
export function PhoneIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <rect x="6" y="2.4" width="12" height="19.2" rx="3" fill="var(--bb-muted-foreground)" />
      <rect x="7.9" y="6" width="8.2" height="11.4" rx="1.4" fill="var(--ob-prop)" strokeWidth={1.2} />
      <path d="M10.6 19.5h2.8" fill="none" strokeWidth={1.2} stroke="var(--ob-prop)" />
    </Sticker>
  );
}

/** Somewhere else. Three dots, the honest "none of the above". */
export function EllipsisIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <g fill="var(--bb-muted-foreground)" strokeWidth={1.2}>
        <circle cx="5.2" cy="12" r="2.2" />
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="18.8" cy="12" r="2.2" />
      </g>
    </Sticker>
  );
}

/**
 * The daily goal tiers, as a rising three: one, two and three filled bars.
 *
 * `filled` is passed by the goal step from the tier's own position in
 * ONBOARDING_GOAL_TIERS, so a fourth tier arriving would draw a fourth bar
 * rather than needing a fourth glyph.
 */
export function GoalBarsIcon({ filled, ...rest }: GlyphProps & { readonly filled: number }) {
  const bars = [
    { x: 4.5, top: 15 },
    { x: 11, top: 10.5 },
    { x: 17.5, top: 6 },
  ];
  return (
    <Sticker {...rest}>
      {bars.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x - 2}
          y={bar.top}
          width={4}
          height={20 - bar.top}
          rx={1.6}
          strokeWidth={1.3}
          fill={index < filled ? "var(--bb-primary-bright)" : "var(--ob-prop)"}
        />
      ))}
    </Sticker>
  );
}

/** Choose your start: carry on from where the placement put you. */
export function ResumeIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path d="M4.2 6.4 13.6 12 4.2 17.6Z" fill="var(--bb-primary-bright)" strokeWidth={1.3} />
      <path d="M17 5.2h3v13.6h-3Z" fill="var(--bb-primary-bright)" strokeWidth={1.3} />
    </Sticker>
  );
}

/** Choose your start: back to the very beginning. */
export function RewindIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path d="M19.8 6.4 10.4 12l9.4 5.6Z" fill="var(--bb-muted-foreground)" strokeWidth={1.3} />
      <path d="M4 5.2h3v13.6H4Z" fill="var(--bb-muted-foreground)" strokeWidth={1.3} />
    </Sticker>
  );
}

/** The picked mark. The question image draws it as a bare check, no disc. */
export function CheckIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={3} {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Glyph>
  );
}

/** Back. The header chevron. */
export function BackIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2.5} {...props}>
      <path d="m14.5 5-7 7 7 7" />
    </Glyph>
  );
}

/**
 * Leave the quiz. blueberry_r9-onboard-placement draws an X at the head of the
 * placement, not the chevron every other step uses, and the difference is a
 * real one: a chevron says "one question back" and an X says "out of this".
 * The placement is the only step inside the flow that a student may want to
 * leave as a whole, so it is the only step that draws this.
 */
export function CloseIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2.5} {...props}>
      <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
    </Glyph>
  );
}

/**
 * THE WELCOME BEAT'S BACKGROUND WORLD: two overlapping white mounds filling
 * the lower third, a classic Erlenmeyer standing on the rise, and two clouds.
 *
 * REDRAWN AGAINST blueberry_r9-onboard-welcome AFTER A PIXEL COMPARISON, and
 * every number below is that comparison rather than a taste. The previous pass
 * drew a thin arc entering only from the RIGHT at 82 percent of screen height,
 * with no mass at all on the left half and the white fill almost entirely
 * below GET STARTED, so the composition the backdrop rework was written to
 * deliver never reached the screen. The image draws an opaque mound whose
 * crest is at 67 percent of screen height, unbroken across BOTH edges, with a
 * second overlapping mound in front of it, and the button resting on it.
 *
 * WHERE 67 PERCENT LANDS IN THIS viewBox, since it is the one piece of
 * arithmetic here. `.ob-welcome__horizon` is 116 percent of a 390px frame at
 * this viewBox's own ratio, so it renders 394 css tall against a 844 css
 * screen and is anchored to the bottom. 67 percent of 844 from the top is 278
 * css up from the bottom, which is y = 100 in these units. That is where the
 * main crest sits and it is why the flask's base is at y = 104.
 *
 * THE FLASK IS AN ERLENMEYER AND THE LAST ONE WAS NOT. The image draws a wide
 * triangular body on a flat base with a short lipped neck, about 61 by 74 css,
 * fully visible and standing ON the rise. The previous pass drew a tall
 * near-parallel-sided tube with a long neck and a barely flared foot, half
 * hidden behind GET STARTED, which read as a chimney. Different silhouette,
 * not a smaller version of the same one.
 *
 * EVERY EDGE IS `--ob-prop-edge`, which onboarding.css now resolves to the
 * warm tan the image ghosts these props in rather than the cool neutral grey
 * that made wallpaper read as foreground objects. See the token's comment
 * there for the measured luminance delta and the argument about what
 * decoration owes.
 */
export function WelcomeHorizon(props: Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">) {
  return (
    <svg
      viewBox="0 0 390 340"
      fill="none"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
      {...props}
    >
      {/* The two clouds, above the horizon, the right one running off the
          screen edge as the image draws it. */}
      <path
        d="M26 62a30 30 0 0 1 57-10 24 24 0 0 1 40 17 17 17 0 0 1-4 34H40a22 22 0 0 1-14-41Z"
        fill="var(--ob-prop)"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
      />
      <path
        d="M262 34a26 26 0 0 1 49-9 21 21 0 0 1 35 15 15 15 0 0 1-4 30h-78a19 19 0 0 1-2-36Z"
        fill="var(--ob-prop)"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
      />

      {/* THE RISE. Fill and top curve are separate paths on purpose: one
          closed path stroked all the way round draws its own left, right and
          bottom edges too, and the hill then arrives as a rectangle with a
          wavy top. */}
      <path
        d="M-20 340V196c60-66 120-100 180-100s140 32 250 12v232Z"
        fill="var(--ob-prop)"
      />
      <path
        d="M-20 196c60-66 120-100 180-100s140 32 250 12"
        fill="none"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />

      {/* The Erlenmeyer, standing on the crest: a wide triangular body on a
          flat base, a short neck, and a lip across its mouth. */}
      <path
        d="M183 40v16l-16 48h56l-16-48V40Z"
        fill="var(--ob-prop)"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <path d="M177 40h36" stroke="var(--ob-prop-edge)" strokeWidth={2.4} strokeLinecap="round" />

      {/* The second mound, overlapping the first from the left and in front of
          it, which is what gives the lower third its depth in the image. */}
      <path
        d="M-20 340V236c48-46 112-60 166-50 38 7 60 24 78 50v104Z"
        fill="var(--ob-prop)"
      />
      <path
        d="M-20 236c48-46 112-60 166-50 38 7 60 24 78 50"
        fill="none"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  );
}
