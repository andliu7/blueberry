/**
 * The Feed tab's icon, on its own so the tab bar can import it cheaply.
 *
 * WHY IT IS NOT IN FeedTab.tsx ANY MORE, and it is a bundling bug rather than
 * a tidiness preference. Shell.tsx loads every tab through `React.lazy`, so
 * FeedTab.tsx and everything it pulls (feedModel, the economy engine,
 * feed.css) live in their own chunk. The tab BAR, however, draws all five
 * icons on the first paint of every route. An `import { NewspaperMark } from
 * "../tabs/feed/FeedTab"` in the bar would be a static import of the lazy
 * module, and a bundler resolves that by moving the whole chunk into the
 * initial payload: the lazy boundary stays in the source and stops existing in
 * the build. One glyph in its own file is the whole fix, and it keeps the
 * game route's 400 KB budget honest.
 *
 * THE MOTIF IS THE OWNER'S. docs/DESIGN-GOALS.md, Header and tabs: "Feed is
 * the blue NEWSPAPER", and "ICONS ARE SVG, NEVER RASTER, NEVER EMOJI", drawn
 * to inherit currentColor so one component is right in both themes.
 */

/**
 * The newspaper: a filled silhouette with its cut-outs punched in the card's
 * own colour, the same construction HudIcons.tsx uses. The folded back page is
 * the shape that says "newspaper" rather than "document" at 24 px, so it is
 * drawn as part of the same path instead of as a second, thinner element that
 * would disappear first at tab-bar size.
 */
export function NewspaperMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M4 4.5A1.5 1.5 0 0 1 5.5 3h11A1.5 1.5 0 0 1 18 4.5V19a2 2 0 0 0 2-2V7.5h1A1 1 0 0 1 22 8.5V18a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V4.5z"
        fill="currentColor"
      />
      <path d="M6 6h6v4H6zM14 6h2v1.6h-2zM14 8.4h2V10h-2zM6 12h10v1.6H6zM6 15h10v1.6H6z" fill="var(--bb-card)" />
    </svg>
  );
}
