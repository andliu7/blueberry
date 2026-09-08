/**
 * The header course chip's mark: a cute rounded erlenmeyer with violet liquid.
 *
 * WHAT LOCKS IT. docs/DESIGN-GOALS.md, "Header and tabs": "Left: a cartoonish
 * flask course chip (cute rounded erlenmeyer, violet liquid, sticker style)
 * beside the course name". The committed frames are
 * docs/reference/design-goals/units/unit02-path.jpg and unit07-path.jpg, which
 * draw exactly this object in exactly this place: pale violet glass, a darker
 * violet rim, violet liquid filling the lower half, and a small face on the
 * liquid. Nothing here is invented; the text inside those images is model
 * gibberish and the object is not.
 *
 * WHY IT IS ITS OWN FILE. CourseChip.tsx is a dialog, a scroll container and a
 * course list, and this is a picture. The split is the same one FeedIcon.tsx
 * makes and for a related reason: a glyph the header paints on the first frame
 * of every route should not be reachable only through a module that carries
 * behaviour.
 *
 * THE COLOURS ARE ILLUSTRATION LITERALS, and they are the app's existing ones
 * rather than new ones. tabs/feed/FeedTab.tsx already draws a quest flask and
 * names its three colours GLASS_TINT, LIQUID and LIQUID_DEEP; those exact
 * values are repeated here so the product has ONE flask palette and not two
 * that drift. docs/DESIGN-TOKENS.md allows this category by name: a picture of
 * an object is drawn in the object's own colours, sampled from the committed
 * image, rather than derived from a theme token, and every fill carries a
 * darker outline of its own family so the contrast audit's "a shape is one
 * component" rule holds without lightening or darkening the image's own ink.
 *
 * IT IS THE SAME IN BOTH THEMES ON PURPOSE. A sticker is an object lying on the
 * page, not a piece of chrome that inverts with it, which is the same call the
 * mascot's frozen palette and the Feed's quest motifs already make.
 *
 * ICONS ARE SVG, NEVER RASTER, NEVER EMOJI. Owner finding 2026-09-02, quoted in
 * DESIGN-GOALS: a PNG tile cannot theme, blurs on Retina at 3x, and bakes a
 * background that stops matching the moment the ground changes.
 */

/** Pale violet glass. Identical to FeedTab.tsx's GLASS_TINT. */
const GLASS = "#efe9ff";
/** The liquid. Identical to FeedTab.tsx's LIQUID. */
const LIQUID = "#9f75f5";
/** The rim and the outline. Identical to FeedTab.tsx's LIQUID_DEEP. */
const DEEP = "#6d43cf";
/**
 * The face. Deep enough on the liquid to be a face rather than a smudge: the
 * eyes and the mouth are the only marks on this object that have to READ at
 * 28px, and DEEP on LIQUID is 2.0:1, which is a shadow and not a feature.
 */
const FACE = "#2f1b63";

/**
 * The silhouette. One path, used three times: as the glass fill, as the clip
 * the liquid is cut to, and as the outline drawn last so it sits over both.
 * Three uses of one path is why the liquid can never leak past the glass by a
 * subpixel; there is no second shape to keep aligned with the first.
 */
const FLASK = "M9.4 3.4h5.2v5.1l4.8 9.2a2.5 2.5 0 0 1-2.2 3.7H6.8a2.5 2.5 0 0 1-2.2-3.7l4.8-9.2z";

export function CourseFlask({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <defs>
        {/* A fixed id, not useId(). This glyph is drawn once per screen at the
            single site the header gives it, and the clip is scoped to this
            document fragment either way. A generated id here would change
            between renders and defeat SVG caching for no gain. */}
        <clipPath id="course-flask-clip">
          <path d={FLASK} />
        </clipPath>
      </defs>

      {/* The glass */}
      <path d={FLASK} fill={GLASS} />

      {/* The liquid, cut to the glass. It fills the wide part only, which is
          where liquid in a conical flask actually sits, so the level reads as a
          level and not as a fill percentage of a triangle. */}
      <rect x="0" y="13.1" width="24" height="11" fill={LIQUID} clipPath="url(#course-flask-clip)" />

      {/* The face, on the liquid. Two eyes and a smile, the same three marks the
          reference frames draw and no more: at 28px a fourth mark closes up. */}
      <circle cx="10.1" cy="16.1" r="1.05" fill={FACE} />
      <circle cx="13.9" cy="16.1" r="1.05" fill={FACE} />
      <path
        d="M10.6 18.1a1.9 1.9 0 0 0 2.8 0"
        fill="none"
        stroke={FACE}
        strokeWidth="1.15"
        strokeLinecap="round"
      />

      {/* The outline, over everything, so the liquid's top edge is the only
          horizontal in the object and the glass keeps one continuous rim. */}
      <path d={FLASK} fill="none" stroke={DEEP} strokeWidth="1.5" strokeLinejoin="round" />

      {/* The neck's lip. A rounded bar rather than two ticks: at 28px two ticks
          are two pixels and read as damage. */}
      <path
        d="M8.5 3.4h7"
        fill="none"
        stroke={DEEP}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}
