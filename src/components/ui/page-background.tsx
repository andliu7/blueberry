import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
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
  /**
   * `landscape` and `forest` are the only kinds `pickForHour` will draw. The
   * rest are catalogued in the same manifest but claimed by a specific place:
   * `folder` art belongs to a study-deck folder card, `intro-*` to the opening
   * screen, `diagram` to a lesson banner. Keeping them here rather than in a
   * second list means one script fills one manifest, and the picker excludes
   * them by asking for what it wants instead of listing what it does not.
   */
  kind: "landscape" | "forest" | "berry" | "folder" | "diagram" | "intro-light" | "intro-dark";
  label: string;
  w: number;
  h: number;
  /** A 20px blurred copy, inlined, so something paints on the first frame. */
  blur: string;
}

/** How many times a forest photograph is entered into the draw. */
const FOREST_WEIGHT = 3;

/**
 * The dashboard's own photograph, and only the dashboard's.
 *
 * Pinned rather than drawn, because the dashboard is a place you return to
 * many times in a sitting and a background that changed underneath you each
 * time would make the same panel feel like a different one. It is then
 * *withheld* from `pickForHour`, so no other page can show it: the point of
 * giving one room its own picture is lost the moment the picture turns up
 * elsewhere.
 */
export const DASHBOARD_SCENE = "forest-misty-forest.webp";

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
function scenePool(entries: BackgroundEntry[], hour: number): BackgroundEntry[] {
  const scenes = entries.filter(
    (e) => (e.kind === "landscape" || e.kind === "forest") && e.file !== DASHBOARD_SCENE,
  );
  if (scenes.length === 0) return [];

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

  return from.flatMap((e) =>
    e.kind === "forest" ? (Array(FOREST_WEIGHT).fill(e) as BackgroundEntry[]) : [e],
  );
}

/**
 * The rotation: which photographs, in what order, starting where.
 *
 * The hour still decides what you arrive to, exactly as before — that is the
 * whole value of `scenePool`'s time-of-day matching, and a rotation that
 * ignored it would show you a starfield at noon. What is new is that the hour
 * picks a *starting point* in an order rather than a single frame to sit on.
 *
 * **Consecutive duplicates are removed and this is not cosmetic.** The pool
 * repeats each forest entry three times to weight the draw, and a cross-fade
 * from a photograph to itself is a fade that plays for eight seconds and
 * appears to do nothing at all. Weighting survives where it matters, in which
 * frame comes up first; it is the sequence that has to be distinct.
 */
function sceneOrder(entries: BackgroundEntry[], hour: number): BackgroundEntry[] {
  const pool = scenePool(entries, hour);
  if (pool.length === 0) return [];

  const start = hour % pool.length;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];

  const seen = new Set<string>();
  const unique = rotated.filter((e) => {
    if (seen.has(e.file)) return false;
    seen.add(e.file);
    return true;
  });
  return unique;
}

/** How long a photograph holds before it begins handing over. */
const HOLD_MS = 40_000;
/**
 * How long the hand-over takes.
 *
 * Long enough that no single frame of it looks like a transition. This is a
 * site people sit in front of for an hour, and a background that visibly
 * changes is a background that keeps interrupting them.
 */
const FADE_MS = 8_000;

export function PageBackground({
  className,
  /** Name a file to pin it, instead of letting the hour choose. */
  scene: pinned,
}: {
  className?: string;
  scene?: string;
}) {
  const reduce = useReducedMotion();
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

  /**
   * The sequence, and whether there is one.
   *
   * A pinned scene does not rotate. The dashboard pins deliberately — it is a
   * room you come back to many times in a sitting, and a background that had
   * moved on while you were away would make the same panel feel like a
   * different one. It still drifts; it just never hands over.
   */
  const order = useMemo(() => {
    if (pinned) {
      // Falls through to the hourly order if the named file is not in the
      // manifest, so a rename shows the wrong photograph rather than none.
      const found = entries.find((e) => e.file === pinned);
      if (found) return [found];
    }
    return sceneOrder(entries, new Date().getHours());
  }, [entries, pinned]);

  const rotates = !reduce && order.length > 1;

  /**
   * Two layers, and the back one is always the *next* photograph.
   *
   * That is what removes the preloader. The incoming frame has been mounted,
   * fetched and decoded at `opacity: 0` for the whole forty seconds the
   * outgoing one was on screen, so the cross-fade is a change of opacity on
   * something already painted rather than a fade into a file that is still
   * arriving over the network. A background that fades to white for two
   * seconds on a slow connection is worse than one that never moved.
   */
  const [slots, setSlots] = useState<[BackgroundEntry | undefined, BackgroundEntry | undefined]>([
    undefined,
    undefined,
  ]);
  const [front, setFront] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    if (order.length === 0) return;
    stepRef.current = 0;
    setFront(0);
    setSlots([order[0], order[1] ?? order[0]]);
  }, [order]);

  useEffect(() => {
    if (!rotates) return;

    const id = window.setInterval(() => {
      const n = stepRef.current + 1;
      stepRef.current = n;
      setFront(n % 2);

      // The layer that just started fading *out* is the one to reload, and only
      // once it is off screen. Swapping its source during the fade would change
      // the picture the visitor is currently watching leave.
      window.setTimeout(() => {
        const back = (n + 1) % 2;
        setSlots((current) => {
          const next: [BackgroundEntry | undefined, BackgroundEntry | undefined] = [...current];
          next[back] = order[(n + 1) % order.length];
          return next;
        });
      }, FADE_MS + 600);
    }, HOLD_MS);

    return () => window.clearInterval(id);
  }, [rotates, order]);
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

      {slots.some(Boolean) && (
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
            //
            // Dark was then held back too far in the other direction: at 0.7
            // opacity and 0.95 brightness the berries and the trees were being
            // swallowed by the panel behind them, which is the opposite of the
            // problem the light numbers solve. Lifted to 0.88 and 1.06 with more
            // saturation, and contrast eased slightly, since pushing contrast on
            // an already dark photograph crushes the shadows rather than
            // separating anything.
            isDark
              ? "opacity-[0.88] saturate-[1.55] brightness-[1.06] contrast-[1.18]"
              : "opacity-[0.78] saturate-[1.25] brightness-[0.88] contrast-[1.22]",
          )}
        >
          {!ready && slots[front] && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slots[front]!.blur})` }}
            />
          )}

          {/* The two layers.

              Both are always mounted and both always carry a photograph; only
              opacity distinguishes them. The Ken Burns class is fixed per slot
              rather than per scene, so a layer keeps drifting through its own
              swap and a new picture arrives already in motion instead of
              starting from a dead stop. */}
          {([0, 1] as const).map((k) => {
            const entry = slots[k];
            if (!entry) return null;
            const isFront = front === k;
            return (
              <div
                key={k}
                className="absolute inset-0 overflow-hidden"
                style={{
                  // `ready` gates only the very first paint, so the opening
                  // frame fades up from the blurred placeholder rather than
                  // popping. After that it stays true and the front layer is
                  // simply the visible one.
                  opacity: isFront && ready ? 1 : 0,
                  transition: `opacity ${FADE_MS}ms ease-in-out`,
                }}
              >
                <img
                  // Keyed on the file so React swaps the element rather than
                  // mutating `src` on a live one, which would otherwise show the
                  // old picture until the new one had decoded.
                  key={entry.file}
                  src={base + entry.file}
                  alt=""
                  loading="eager"
                  decoding="async"
                  onLoad={() => setReady(true)}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover",
                    k === 0 ? "bb-ken-a" : "bb-ken-b",
                  )}
                />
              </div>
            );
          })}
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

      {/* The wash: two colour fields breathing over the picture.

          This is the part that makes a still photograph read as a place rather
          than as wallpaper. The intro has had it since the beginning, as the
          WebGL aurora; every page below the intro had nothing, so the site went
          from alive to frozen the moment you scrolled.

          Two `radial-gradient`s on transforms, not a second GL context. This
          runs behind every route on the site, including a page of flashcards
          somebody is mid-revision on, and two moving blobs do not justify a
          canvas and a render loop per page. `screen` on dark so it adds light,
          `multiply` on light so it tints instead — a wash that adds light to
          near-white paper is a wash nobody can see. */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden",
          isDark ? "mix-blend-screen opacity-[0.5]" : "mix-blend-multiply opacity-[0.34]",
        )}
      >
        <div
          className="bb-wash-a absolute -inset-[25%]"
          style={{
            background: isDark
              ? "radial-gradient(38% 42% at 32% 38%, rgba(99,102,241,0.55) 0%, transparent 70%)"
              : "radial-gradient(38% 42% at 32% 38%, rgba(99,102,241,0.38) 0%, transparent 70%)",
          }}
        />
        <div
          className="bb-wash-b absolute -inset-[25%]"
          style={{
            background: isDark
              ? "radial-gradient(40% 44% at 68% 64%, rgba(217,70,239,0.45) 0%, transparent 72%)"
              : "radial-gradient(40% 44% at 68% 64%, rgba(217,70,239,0.30) 0%, transparent 72%)",
          }}
        />
      </div>

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
