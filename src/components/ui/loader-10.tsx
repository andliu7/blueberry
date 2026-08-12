import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The gooey loader: two blobs sliding past each other under a threshold filter.
 *
 * Adapted from the supplied component rather than pasted, in three places:
 *
 * 1. **The colours default to this site's ramp**, not `hsl(var(--primary))`.
 *    Those are shadcn theme variables and this project does not define them, so
 *    the original would have rendered two invisible blobs against the page.
 * 2. **The keyframes live in `index.css`.** The original inlined a `<style>`
 *    block in the component body, which re-inserts the same rules into the
 *    document on every render and puts eight lines of animation somewhere no
 *    one would think to look for them.
 * 3. **The filter id is per-instance.** A hardcoded id means two loaders on one
 *    page both point at whichever `<defs>` mounted first, and unmounting that
 *    one takes the filter away from the other.
 *
 * The trick itself is worth understanding: `feGaussianBlur` smears the two
 * circles into each other, then `feColorMatrix` multiplies the alpha channel by
 * 48 and subtracts 7, which pushes every partly-transparent pixel to either
 * fully opaque or fully clear. Blur plus a hard alpha threshold is what makes
 * two separate shapes appear to stretch and merge like liquid.
 */
export interface GooeyLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The leading blob. Defaults to the indigo the site uses on links. */
  primaryColor?: string;
  /** The trailing blob. Defaults to the fuchsia end of the same ramp. */
  secondaryColor?: string;
  /** The line the blobs run along. */
  borderColor?: string;
}

const GooeyLoader = React.forwardRef<HTMLDivElement, GooeyLoaderProps>(
  ({ className, primaryColor, secondaryColor, borderColor, ...props }, ref) => {
    // Unique per instance, so two loaders cannot fight over one filter.
    const filterId = `gooey-${React.useId().replace(/:/g, "")}`;

    const style = {
      "--gooey-primary-color": primaryColor ?? "#6366f1",
      "--gooey-secondary-color": secondaryColor ?? "#d946ef",
      "--gooey-border-color": borderColor ?? "rgba(148, 163, 184, 0.35)",
      "--gooey-filter": `url(#${filterId})`,
    } as React.CSSProperties;

    return (
      <div
        ref={ref}
        className={cn("relative flex items-center justify-center text-sm", className)}
        style={style}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <svg className="absolute h-0 w-0" aria-hidden focusable="false">
          <defs>
            <filter id={filterId}>
              <feGaussianBlur in="SourceGraphic" stdDeviation={12} result="blur" />
              {/* Alpha x48 - 7: everything soft becomes either solid or gone. */}
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -7"
                result="goo"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>

        <div className="gooey-loader" />
      </div>
    );
  },
);
GooeyLoader.displayName = "GooeyLoader";

export { GooeyLoader };
export default GooeyLoader;
