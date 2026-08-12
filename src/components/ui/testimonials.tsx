import { useMemo, useState } from "react";
import SocialCards from "@/components/ui/card-fan-carousel";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";
import { testimonials, testimonialArt } from "@/data/testimonials";
import { cn } from "@/lib/utils";

/**
 * The quote fan, lifted out of the deck view.
 *
 * It used to sit at the foot of every deck, under the cards. That was the wrong
 * room for it: a deck is somewhere you are working, and a carousel of people
 * saying nice things about the site is an advertisement placed at the exact
 * moment someone is mid-revision. The home page is where a visitor is deciding
 * whether this is worth their time, which is the only place that argument is
 * of any use.
 *
 * Extracted rather than copied — the deck view no longer renders it, so there
 * is one of these and it lives here.
 */
/**
 * The quote card tilts in both themes. Only the glare changes: white reads as a
 * sheen on a dark card but washes out a pale one, so light mode gets an indigo
 * tint instead.
 *
 * Moved here with the section it wraps; nothing else used it.
 */
function QuoteSurface({ children }: { children: React.ReactNode }) {
  const isDark = useIsDark();
  return (
    <TiltCard
      max={6}
      glareColor={isDark ? "rgba(255,255,255,0.9)" : "rgba(99,102,241,0.7)"}
      className="rounded-2xl"
    >
      {children}
    </TiltCard>
  );
}

export function Testimonials({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const active = testimonials[index];

  // Stable identity: a fresh array here would restart the fan's entry animation
  // on every render of the page around it.
  const cards = useMemo(
    () =>
      testimonials.map((t) => ({
        imgUrl: testimonialArt(t),
        alt: `${t.name} — ${t.role}`,
        title: t.name,
        subtitle: t.role,
      })),
    [],
  );

  return (
    <section aria-label="What people say" className={cn("mx-auto max-w-5xl px-6", className)}>
      <h2 className="playful-face mb-4 text-center text-2xl font-bold text-slate-800 dark:text-stone-200">
        What Orgo Students Are Saying
      </h2>

      <SocialCards
        cards={cards}
        activeIndex={index}
        onActiveIndexChange={setIndex}
        spread={0.65}
        autoPlayInterval={4500}
      />

      {active && (
        <div className="relative mx-auto mt-8 max-w-xl">
          <QuoteSurface>
            <figure className="relative rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <blockquote className="text-center text-base leading-relaxed text-slate-700 dark:text-stone-300">
                {active.quote}
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-center gap-3 border-t border-slate-100 pt-4 dark:border-stone-800">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${active.from}, ${active.to})` }}
                >
                  {active.initials}
                </span>
                <span className="text-left">
                  <span className="block text-sm leading-tight font-bold text-slate-900 dark:text-stone-100">
                    {active.name}
                  </span>
                  <span className="block font-mono text-xs leading-tight text-slate-400 dark:text-stone-500">
                    {active.role}
                  </span>
                </span>
              </figcaption>
            </figure>
          </QuoteSurface>

          {/* Sibling of the tilt wrapper, not a child: that wrapper clips with
              overflow-hidden, so anything hanging over the top edge would be cut
              off.

              The offset is deliberately not -50%. A quote mark's ink sits high
              in its line box (measured: rows 7 to 26 of a 72px box), so centring
              the box left the whole glyph floating a good 19px clear of the
              card. 0.23em is where the ink itself straddles the border, which is
              what makes it read as popping out of the edge. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-7 z-20 -translate-y-[0.23em] font-serif text-7xl leading-none text-indigo-300 select-none dark:text-indigo-400/60"
          >
            &ldquo;
          </span>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-slate-400 dark:text-stone-500">
        (these are fake testimonials)
      </p>
    </section>
  );
}

export default Testimonials;
