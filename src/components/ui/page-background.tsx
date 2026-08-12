import { useEffect, useMemo, useState } from "react";
import { useIsDark } from "@/lib/useIsDark";
import { SURFACE } from "@/lib/hubSurface";
import { cn } from "@/lib/utils";

/**
 * A photograph behind the page, treated until it is atmosphere.
 *
 * The rule this is built around: **an untreated photograph and a page of text
 * cannot both be the subject.** A landscape at full contrast behind
 * `blueberry.` would win, and the site would become a picture with some words
 * on it. So every image is desaturated, darkened and blurred before it is shown
 * — enough that it reads as weather rather than as a view, and the type sits on
 * it without a scrim fighting for the same job.
 *
 * **The blueberries are blended, not pasted.** The berry photographs are
 * photographs, not cut-outs: dropping one on a landscape gives you a rectangle
 * of someone else's kitchen table. Instead a berry frame is masked to a soft
 * radial and composited with `screen`, which keeps its highlights and discards
 * its background — the double-exposure trick, and the one compositing move that
 * survives having no alpha channel to work with. Small and low, because a berry
 * the size of a mountain is a poster, not a background.
 *
 * **No blur.** There was one, on the theory that softening the picture would
 * protect the type. At 4K it was throwing away exactly the detail the
 * resolution was bought for, and the legibility it bought could be had instead
 * from the bands and the vignette below, which cost the middle of the frame
 * nothing. The photograph is sharp; the contrast work happens around it.
 *
 * Nothing here is fetched from anywhere. The images live in `public/backgrounds`
 * and ship with the site: no key, no quota, no request that can fail.
 */

interface BackgroundEntry {
  file: string;
  /**
   * `forest` is a landscape that happens to be trees, water or mist. It is a
   * separate kind only so the picker can favour it: those photographs sit
   * closest to what a blueberry actually grows in, and a site named after the
   * fruit looks more like itself behind them than behind a castle.
   */
  kind: "landscape" | "forest" | "berry";
  label: string;
  w: number;
  h: number;
  /** A 20px blurred copy, inlined, so something paints on the first frame. */
  blur: string;
}

/** How many times a forest photograph is entered into the draw. */
const FOREST_WEIGHT = 3;

/**
 * Which photograph, decided by the clock.
 *
 * A stand-in for the weather lookup, and deliberately the same shape: one
 * function from the world to a filename, so swapping "what time is it" for
 * "what is it doing outside" later is a change in one place rather than a new
 * system. See the note in the README on Open-Meteo, one fetch and no key.
 *
 * Weighting is done by **repeating entries in the pool** rather than by sorting
 * or by rolling a random number. The choice has to stay stable within the hour
 * or the background changes every time React re-renders, so it has to be a pure
 * function of the hour; putting a forest in three times and indexing by the hour
 * is the whole of the trick.
 */
function pickForHour(entries: BackgroundEntry[], hour: number): BackgroundEntry | undefined {
  const scenes = entries.filter((e) => e.kind === "landscape" || e.kind === "forest");
  if (scenes.length === 0) return undefined;

  const wants = (...words: string[]) =>
    scenes.filter((e) => words.some((w) => e.label.includes(w)));

  const matched =
    hour < 5 || hour >= 21
      ? wants("stars", "milky", "constellations", "aurora", "purple")
      : hour < 9
        ? // Mist and low cloud belong to the early hours, so the new forest
          // frames carry most of this bucket rather than sitting out the morning.
          wants("morning", "sunrise", "misty", "cloudy", "clouds", "dripping", "river")
        : hour < 17
          ? wants(
              "meadow",
              "field",
              "valley",
              "mountains",
              "beach",
              "waves",
              "tree",
              "forest",
              "nature",
              "rainforest",
              "waterfall",
            )
          : wants("sunset", "autumn", "dusk", "purple", "grassy");

  const from = matched.length > 0 ? matched : scenes;

  const pool = from.flatMap((e) =>
    e.kind === "forest" ? (Array(FOREST_WEIGHT).fill(e) as BackgroundEntry[]) : [e],
  );

  return pool[hour % pool.length];
}

export function PageBackground({ className }: { className?: string }) {
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const [entries, setEntries] = useState<BackgroundEntry[]>([]);
  /** The real file has decoded; the placeholder can go. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`${import.meta.env.BASE_URL}backgrounds/manifest.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: BackgroundEntry[]) => {
        if (!cancelled && Array.isArray(data)) setEntries(data);
      })
      // A background is decoration: if the manifest is missing, the page keeps
      // its plain surface and nobody is told about it.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const scene = useMemo(() => pickForHour(entries, new Date().getHours()), [entries]);
  const berry = useMemo(() => {
    const berries = entries.filter((e) => e.kind === "berry");
    if (berries.length === 0) return undefined;
    return berries[new Date().getHours() % berries.length];
  }, [entries]);

  const base = `${import.meta.env.BASE_URL}backgrounds/`;

  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10", className)}>
      {/* The page's own colour underneath everything, so the treated photo has
          something to sit on and the surface still shows through it. */}
      <div className="absolute inset-0" style={{ backgroundColor: surface.base }} />

      {scene && (
        /**
         * The treatment lives on the wrapper, not on the photograph.
         *
         * It was on the `img`, which meant the 55% transparent full-size image
         * was composited over a fully opaque 20px thumbnail — so most of what
         * you saw was the thumbnail, and the background looked like a smear
         * whatever the real picture was. The placeholder is now underneath a
         * shared filter and is removed the moment the real file decodes, so
         * exactly one image is ever visible.
         *
         * Saturation sits above 1 because this is seen through a scrim, and a
         * scrim eats colour: the image has to start louder than it ends. One
         * pixel of blur keeps fine detail from competing with type without
         * erasing the features in the frame.
         */
        <div
          className={cn(
            "absolute inset-0",
            // Light mode needs the opposite correction to dark mode, which is
            // why these are not the same numbers with one value flipped. On
            // near-black, a photograph is the brightest thing on screen and has
            // to be held back. On near-white it is competing with a page that
            // is already brighter than it, so lifting opacity is not enough —
            // it has to be *darkened* and pushed on contrast, or it dissolves
            // into the paper. Measured: at brightness 1.02 the image was
            // effectively invisible in light mode.
            isDark
              ? "opacity-[0.7] saturate-[1.3] brightness-[0.95] contrast-[1.25]"
              : "opacity-[0.78] saturate-[1.25] brightness-[0.88] contrast-[1.22]",
          )}
        >
          {!ready && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${scene.blur})` }}
            />
          )}
          <img
            src={base + scene.file}
            alt=""
            loading="eager"
            decoding="async"
            onLoad={() => setReady(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-700",
              ready ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      )}

      {/* The berry, blended rather than pasted. `screen` keeps the lit fruit and
          drops the dark ground it was photographed against; the radial mask
          feathers the frame's edges so there is no rectangle. Small, low, and
          off to one side — it is a note in the corner of the picture. */}
      {berry && (
        <img
          src={base + berry.file}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute bottom-[-6%] left-[-4%] h-[42vh] w-[42vh] object-cover opacity-40 mix-blend-screen saturate-150"
          style={{
            maskImage: "radial-gradient(closest-side, black 35%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(closest-side, black 35%, transparent 78%)",
          }}
        />
      )}

      {/* Grain over everything, so the photograph and the page share one noise
          field. Without it the type looks pasted onto the picture rather than
          printed on the same paper. An inline SVG turbulence: no image request,
          and it tiles for free. */}
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Legibility, spent where it is needed rather than everywhere.
 
          A flat sheet of surface colour over the whole image was what made the
          photograph disappear: it protected the type by hiding the picture.
          These two bands darken only the top and the bottom — where the bar and
          the button sit — and leave the middle of the frame, which is the part
          worth looking at, almost untouched. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${surface.base} 0%, transparent 18%, transparent 76%, ${surface.base} 100%)`,
          opacity: isDark ? 0.9 : 0.72,
        }}
      />

      {/* A soft vignette, which does the rest of the work a flat scrim was
          doing: it pulls the eye to the middle and takes the edge off the
          corners without flattening anything. */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(78% 62% at 50% 45%, transparent 30%, rgba(8,6,16,0.55) 100%)"
            : "radial-gradient(82% 66% at 50% 45%, transparent 40%, rgba(250,249,255,0.42) 100%)",
        }}
      />
    </div>
  );
}

export default PageBackground;
