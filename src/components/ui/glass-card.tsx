import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The hub's deck card: a dark glass panel that tips into 3D on hover, with the
 * deck's own motif rising out of a stack of translucent discs.
 *
 * Adapted from the upstream `glass-card` in three ways it needed to survive
 * contact with this app:
 *
 * 1. **Fluid, not fixed.** The original was a hard 290x290. The hub is a
 *    responsive two-column grid, so this fills its cell and keeps the artwork
 *    square through `aspect-square` on the disc stack instead.
 * 2. **Deck-coloured.** The original hardcoded zinc-900 to black. The gradient
 *    now comes from the deck, which is what keeps seven cards distinguishable.
 * 3. **A link, not a div.** The whole card is an anchor so it is reachable by
 *    keyboard and the browser shows the destination on hover.
 *
 * The dark panel is deliberately dark in both themes: it is artwork rather than
 * a surface, and it reads as a set of cards on a desk either way.
 */

export interface GlassCardProps {
  title: string;
  description: string;
  /** Small pill in the corner, e.g. "43 cards". */
  meta: string;
  cta: string;
  href: string;
  from: string;
  to: string;
  /** Pre-rendered SVG markup for the deck motif. */
  motifMarkup: string;
  motifViewBox: string;
  className?: string;
  style?: React.CSSProperties;
}

const DISCS = [
  { size: "62%", pos: "3%", z: "20px", delay: "0s" },
  { size: "50%", pos: "5%", z: "40px", delay: "0.12s" },
  { size: "38%", pos: "9%", z: "60px", delay: "0.24s" },
  { size: "27%", pos: "13%", z: "80px", delay: "0.36s" },
];

export const GlassCard = React.forwardRef<HTMLAnchorElement, GlassCardProps>(
  (
    { title, description, meta, cta, href, from, to, motifMarkup, motifViewBox, className, style },
    ref,
  ) => {
    return (
      <a
        ref={ref}
        href={href}
        style={style}
        className={cn(
          "group block h-full [perspective:1000px] outline-none",
          className,
        )}
      >
        <div
          style={{ backgroundImage: `linear-gradient(to bottom right, ${from}, ${to})` }}
          className="relative h-full min-h-[19rem] rounded-[2rem] shadow-2xl transition-all duration-500 ease-in-out [transform-style:preserve-3d] group-hover:[box-shadow:rgba(0,0,0,0.3)_30px_50px_25px_-40px,rgba(0,0,0,0.1)_0px_25px_30px_0px] group-hover:[transform:rotate3d(1,1,0,20deg)] group-focus-visible:[transform:rotate3d(1,1,0,20deg)] motion-reduce:group-hover:[transform:none]"
        >
          {/* The glass inset. Slightly inside the panel so its lit edges read as
              a second sheet floating above the gradient. */}
          <div className="absolute inset-2 rounded-[1.75rem] border-b border-l border-white/20 bg-gradient-to-b from-white/25 to-white/5 backdrop-blur-sm [transform-style:preserve-3d] [transform:translate3d(0,0,25px)]" />

          {/* Disc stack and motif, top right. */}
          <div
            aria-hidden
            className="absolute top-0 right-0 w-[58%] [transform-style:preserve-3d]"
          >
            {DISCS.map((disc, i) => (
              <div
                key={i}
                className="absolute aspect-square rounded-full bg-white/10 shadow-[rgba(100,100,111,0.2)_-10px_10px_20px_0px] transition-all duration-500 ease-in-out"
                style={{
                  width: disc.size,
                  top: disc.pos,
                  right: disc.pos,
                  transform: `translate3d(0, 0, ${disc.z})`,
                  transitionDelay: disc.delay,
                }}
              />
            ))}
            {/* The motif rides the top disc directly. It used to sit inside an
                opaque white bubble, which read as a sticker pasted over the
                artwork rather than part of it. */}
            <div
              className="absolute grid aspect-square w-[26%] place-content-center transition-all duration-500 ease-in-out [transform:translate3d(0,0,100px)] [transition-delay:0.48s] group-hover:[transform:translate3d(0,0,120px)]"
              style={{ top: "15%", right: "15%" }}
            >
              {/* Both axes sized explicitly. `w-auto` collapsed to zero here:
                  a grid item has no width to derive from an intrinsic SVG, so
                  the drawing rendered at 0x0. The viewBox letterboxes itself. */}
              <svg
                viewBox={motifViewBox}
                className="h-full w-full text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                dangerouslySetInnerHTML={{ __html: motifMarkup }}
              />
            </div>
          </div>

          {/* Copy. Sits above the glass sheet on the z axis so it stays crisp
              while the panel tilts. */}
          <div className="absolute inset-x-0 top-0 [transform:translate3d(0,0,26px)]">
            <div className="px-6 pt-6">
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-1 font-mono text-[0.7rem] font-semibold text-white backdrop-blur-sm">
                {meta}
              </span>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 [transform:translate3d(0,0,26px)]">
            <div className="px-6 pb-6">
              <h2 className="text-lg leading-tight font-black text-white">{title}</h2>
              <p className="mt-2 line-clamp-3 text-[0.82rem] leading-relaxed text-white/75">
                {description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white transition-transform duration-200 ease-in-out group-hover:[transform:translate3d(0,0,10px)]">
                {cta}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </a>
    );
  },
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
