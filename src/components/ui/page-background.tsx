import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useIsDark } from "@/lib/useIsDark";
import { SURFACE } from "@/lib/hubSurface";
import { cn } from "@/lib/utils";

/**
 * A photograph behind the page, treated until it is atmosphere — and alive.
 *
 * The rule this is built around: **an untreated photograph and a page of text
 * cannot both be the subject.** A landscape at full contrast behind
 * `blueberry.` would win, and the site would become a picture with some words
 * on it. So the image is toned and framed by bands and a vignette — but less
 * than it used to be. The first round of treatment was measured by eye and the
 * verdict was "make it clearer": the numbers below are the second round, and
 * every one of them moved toward the photograph.
 *
 * **The picture itself never moves.** There was a Ken Burns drift here for one
 * deploy, and it came straight back out: the sources are 2560px, so any scale
 * past 1:1 on a large monitor is interpolation — the drift was being paid for
 * in sharpness, which is the one currency this component is not allowed to
 * spend. The life comes from what moves *over* the picture instead: clouds
 * crossing, snow falling, water glinting, and the colour wash breathing. All
 * of it is transform-only and none of it touches the photograph's pixels.
 *
 * **One scene per screen.** The rotation through the whole library is gone —
 * "there are too many images" — and each screen keeps a theme instead. The
 * dashboard pins its misty forest (a tree, for the page that branches). Home
 * takes `HOME_SCENES`: one landscape per time of day, picked from the best
 * frames in the library, with a caption naming the place where the place is
 * genuinely known.
 *
 * **The blueberries are blended, not pasted.** The berry photographs are
 * photographs, not cut-outs: a berry frame is masked to a soft radial and
 * composited with `screen`, which keeps its highlights and discards its
 * background — the double-exposure trick.
 *
 * Nothing here is fetched from anywhere. The images live in `public/backgrounds`
 * and ship with the site: no key, no quota, no request that can fail.
 */

interface BackgroundEntry {
  file: string;
  /**
   * `landscape` and `forest` are the only kinds the hourly draw will take. The
   * rest are catalogued in the same manifest but claimed by a specific place:
   * `folder` art belongs to a study-deck folder card, `intro-*` to the opening
   * screen, `diagram` to a lesson banner.
   */
  kind: "landscape" | "forest" | "berry" | "folder" | "diagram" | "intro-light" | "intro-dark";
  label: string;
  w: number;
  h: number;
  /** A 20px blurred copy, inlined, so something paints on the first frame. */
  blur: string;
}

/**
 * A hand-picked scene: the file, what to call it, and what plays over it.
 *
 * `title` and `url` feed the "about this scene" chip. The rule for both comes
 * from the same place as the chemistry rule: **name only what is actually
 * known.** `landscape-yosemite-valley.webp` is Yosemite Valley — whoever named
 * the file knew — so it gets the name and the link. A generic lake at sunset
 * gets called a lake at sunset, and no link, because inventing a location for
 * a stock photograph is a small lie pinned to the bottom of every visit.
 */
export interface CuratedScene {
  file: string;
  title: string;
  /** Somewhere real to learn more. Omitted when the place is not known. */
  url?: string;
  /**
   * What kind of water is in frame, because they move differently: waves roll
   * in and pull back, a lake glints, a river runs one way and never returns.
   */
  water?: "waves" | "lake" | "river";
  /** First hour (0-23) this scene owns. Scenes must be sorted by this. */
  fromHour: number;
  /**
   * Extra brightness for photographs that are dark by nature. The treatment
   * assumes a daylit frame; a night sky under the same numbers and the page
   * veils reads as a background that failed to load. 1 is neutral.
   */
  lift?: number;
}

/**
 * What a non-curated scene has in it, read from its label.
 *
 * The pages without a hand-picked set still get the ambient layers — a river
 * photograph on the lessons page should run like one — and the label is the
 * only description those images carry. Same honesty rule as the captions:
 * this infers only from words a person already wrote into the filename.
 */
function ambientFor(label: string): { water?: CuratedScene["water"]; leaves: boolean } {
  const has = (...words: string[]) => words.some((w) => label.includes(w));
  const water = has("waterfall", "river", "stream", "dripping")
    ? ("river" as const)
    : has("beach", "waves", "shore")
      ? ("waves" as const)
      : has("lake", "waters", "boathouse")
        ? ("lake" as const)
        : undefined;
  return { water, leaves: has("tree", "forest", "rainforest", "autumn", "leaves") };
}

/**
 * Home's own set: four frames, one per time of day, chosen from the library by
 * hand. The hour decides which one you arrive to and it holds for the whole
 * sitting — the day moving on is the only thing that changes the picture.
 */
export const HOME_SCENES: CuratedScene[] = [
  { file: "landscape-beach-sunrise.webp", title: "Sunrise over the shore", water: "waves", fromHour: 5 },
  {
    file: "landscape-yosemite-valley.webp",
    title: "Yosemite Valley, California",
    url: "https://en.wikipedia.org/wiki/Yosemite_Valley",
    fromHour: 10,
  },
  { file: "landscape-sunset-on-lake.webp", title: "Sunset on the lake", water: "lake", fromHour: 17 },
  { file: "landscape-desert-milky-way.webp", title: "The Milky Way, from the desert", fromHour: 21, lift: 1.4 },
];

/** Which curated scene owns this hour. The set wraps: pre-dawn belongs to night. */
function sceneForHour(scenes: CuratedScene[], hour: number): CuratedScene | undefined {
  if (scenes.length === 0) return undefined;
  let current = scenes[scenes.length - 1]!;
  for (const s of scenes) if (hour >= s.fromHour) current = s;
  return current;
}

/** How many times a forest photograph is entered into the draw. */
const FOREST_WEIGHT = 3;

/**
 * The dashboard's own photograph, and only the dashboard's.
 *
 * Pinned rather than drawn, because the dashboard is a place you return to
 * many times in a sitting — and because it is the screen's theme: a tree, for
 * the page whose whole job is branching out to everywhere else. It is then
 * *withheld* from the hourly draw, so no other page can show it.
 */
export const DASHBOARD_SCENE = "forest-misty-forest.webp";

/**
 * Which photograph, decided by the clock — for the pages without a curated set.
 *
 * Weighting is done by **repeating entries in the pool** rather than by rolling
 * a random number. The choice has to stay stable within the hour or the
 * background changes every time React re-renders, so it has to be a pure
 * function of the hour.
 */
function pickForHour(entries: BackgroundEntry[], hour: number): BackgroundEntry | undefined {
  const scenes = entries.filter(
    (e) => (e.kind === "landscape" || e.kind === "forest") && e.file !== DASHBOARD_SCENE,
  );
  if (scenes.length === 0) return undefined;

  const wants = (...words: string[]) =>
    scenes.filter((e) => words.some((w) => e.label.includes(w)));

  const matched =
    hour < 5 || hour >= 21
      ? wants("stars", "milky", "constellations", "aurora", "purple")
      : hour < 9
        ? wants("morning", "sunrise", "misty", "cloudy", "clouds", "dripping", "river")
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

/**
 * Snow, until the seasonal gate exists.
 *
 * The approved plan gives weather to the background picker via Open-Meteo, at
 * which point this constant becomes "is it actually snowing in College Park".
 * Until then it is on, explicitly, because the effect was asked for and an
 * effect gated on a month nobody is in is an effect nobody can judge. Flip to
 * `false` to rest it; wire the forecast to retire it.
 */
const SNOW_FOR_NOW = true;

export function PageBackground({
  className,
  /** Name a file to pin it, instead of letting the hour choose. */
  scene: pinned,
  /** A curated set; overrides the hourly draw. Home passes `HOME_SCENES`. */
  scenes,
  /** Clouds, snow and water move over the picture. Home turns this on. */
  weather = false,
  /** Show the "about this scene" chip. Only meaningful with `scenes`. */
  info = false,
}: {
  className?: string;
  scene?: string;
  scenes?: CuratedScene[];
  weather?: boolean;
  info?: boolean;
}) {
  const reduce = useReducedMotion();
  const isDark = useIsDark();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const [entries, setEntries] = useState<BackgroundEntry[]>([]);
  /** The real file has decoded; the placeholder can go. */
  const [ready, setReady] = useState(false);

  /**
   * The hour, as state rather than read inline.
   *
   * Inline reads inside memos froze the choice at mount: the memo deps were
   * module constants, so a tab opened at 3am was still showing the Milky Way
   * at 2pm - which, under the dark veils, reads as the background not having
   * loaded at all. That was the bug report, verbatim. Re-read when the tab
   * becomes visible again and on a slow interval; within one sitting nothing
   * moves, and a return in a different hour is a new arrival.
   */
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    const iv = window.setInterval(update, 15 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(iv);
    };
  }, []);

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

  /** The curated pick, when there is a set. Carries the caption and the water flag. */
  const curated = useMemo(
    () => (scenes ? sceneForHour(scenes, hour) : undefined),
    [scenes, hour],
  );

  const entry = useMemo(() => {
    const wanted = curated?.file ?? pinned;
    if (wanted) {
      // Falls through to the hourly pick if the named file is not in the
      // manifest, so a rename shows the wrong photograph rather than none.
      const found = entries.find((e) => e.file === wanted);
      if (found) return found;
    }
    return pickForHour(entries, hour);
  }, [entries, curated, pinned, hour]);

  const berry = useMemo(() => {
    const berries = entries.filter((e) => e.kind === "berry");
    if (berries.length === 0) return undefined;
    return berries[hour % berries.length];
  }, [entries, hour]);

  const base = `${import.meta.env.BASE_URL}backgrounds/`;

  /**
   * What moves over this particular picture.
   *
   * The ambient layers — water and leaves — belong to the *scene*, not to the
   * `weather` prop: a river runs on whatever page it hangs behind. The sky
   * layers (clouds, snow) stay behind the prop, because falling snow over a
   * page of flashcards is an interruption and over the front door is a mood.
   */
  const ambient = useMemo(() => {
    if (curated) return { water: curated.water, leaves: false };
    return entry ? ambientFor(entry.label) : { water: undefined, leaves: false };
  }, [curated, entry]);
  const water = !reduce ? ambient.water : undefined;
  const leaves = !reduce && ambient.leaves;

  return (
    <>
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10", className)}>
      {/* The page's own colour underneath everything, so the treated photo has
          something to sit on and the surface still shows through it. */}
      <div className="absolute inset-0" style={{ backgroundColor: surface.base }} />

      {entry && (
        /**
         * The treatment lives on the wrapper, not on the photograph.
         *
         * Second-round numbers, and the direction of every change is the same:
         * toward the picture. Opacity up, the light-mode darkening eased, and
         * contrast backed off — the first round was tuned under two extra
         * washes on the intro that no longer exist, so what read as "held
         * back" there read as mud once they were gone. Light and dark still
         * take opposite corrections: on near-black the photo is the brightest
         * thing on screen; on near-white it competes with brighter paper and
         * needs body, not dimming.
         */
        <div
          className={cn(
            "absolute inset-0",
            isDark
              ? "opacity-[0.95] saturate-[1.45] brightness-[1.08] contrast-[1.12]"
              : "opacity-[0.9] saturate-[1.3] brightness-[0.94] contrast-[1.12]",
          )}
          // Inline `filter` replaces the class chain entirely, so the lifted
          // night variant restates saturation and contrast around its own
          // brightness instead of multiplying on top of them.
          style={
            curated?.lift
              ? {
                  filter: isDark
                    ? `saturate(1.45) brightness(${curated.lift}) contrast(1.05)`
                    : `saturate(1.3) brightness(${Math.max(1, curated.lift - 0.25)}) contrast(1.05)`,
                }
              : undefined
          }
        >
          {!ready && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${entry.blur})` }}
            />
          )}
          <img
            // Keyed on the file so React swaps the element rather than
            // mutating `src` on a live one, which would show the old picture
            // until the new one had decoded.
            key={entry.file}
            src={base + entry.file}
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

      {/* The water. Three kinds, because they move three ways.

          None of this is simulated flow — that would need a per-image mask of
          where the water actually is, which nobody has. Each variant instead
          moves the thing the eye actually tracks on that kind of water:
          rolling crests on waves, drifting glints on a lake, one-way streaks
          on a river. All masked to the lower part of the frame and blended
          `overlay`, so they catch the picture's own bright water pixels far
          more than the shore around them. */}
      {water === "lake" && (
        <div
          className="absolute inset-x-0 bottom-0 h-[42%] overflow-hidden"
          style={{
            maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
          }}
        >
          <div
            className="bb-water-a absolute inset-y-0 -left-full w-[300%] mix-blend-overlay"
            style={{
              background:
                "repeating-linear-gradient(100deg, transparent 0px, transparent 34px, rgba(255,255,255,0.16) 42px, transparent 52px, transparent 90px)",
            }}
          />
          <div
            className="bb-water-b absolute inset-y-0 -left-full w-[300%] mix-blend-overlay"
            style={{
              background:
                "repeating-linear-gradient(96deg, transparent 0px, transparent 55px, rgba(255,255,255,0.1) 64px, transparent 76px, transparent 130px)",
            }}
          />
        </div>
      )}

      {water === "waves" && (
        <div
          className="absolute inset-x-0 bottom-0 h-[38%] overflow-hidden"
          style={{
            maskImage: "linear-gradient(to top, black 45%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 45%, transparent 100%)",
          }}
        >
          {/* Two swells at different beats. Horizontal crest lines that drift
              sideways while they bob — the roll of surf seen from the beach.
              `alternate` in the keyframes, so like every loop back here there
              is no seam to catch. */}
          <div
            className="bb-wave-a absolute inset-y-0 -left-[4%] w-[108%] mix-blend-overlay"
            style={{
              background:
                "repeating-linear-gradient(to top, transparent 0px, transparent 26px, rgba(255,255,255,0.18) 30px, transparent 36px, transparent 58px)",
            }}
          />
          <div
            className="bb-wave-b absolute inset-y-0 -left-[4%] w-[108%] mix-blend-overlay"
            style={{
              background:
                "repeating-linear-gradient(to top, transparent 0px, transparent 40px, rgba(255,255,255,0.12) 46px, transparent 54px, transparent 86px)",
            }}
          />
        </div>
      )}

      {water === "river" && (
        <div
          className="absolute inset-x-0 bottom-0 h-[46%] overflow-hidden"
          style={{
            maskImage: "linear-gradient(to top, black 50%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to top, black 50%, transparent 100%)",
          }}
        >
          {/* One direction, downstream, forever — a river never comes back.
              The loop is seamless because the travel per cycle (480px) is an
              exact multiple of the pattern period (120px): the last frame is
              the first frame. The skew leans the streaks so they read as
              current rather than as venetian blinds. */}
          <div
            className="bb-river absolute inset-y-0 -left-[10%] w-[120%] mix-blend-overlay"
            style={{
              transform: "skewX(-16deg)",
              background:
                "repeating-linear-gradient(90deg, transparent 0px, transparent 88px, rgba(255,255,255,0.14) 100px, transparent 112px, transparent 120px)",
            }}
          />
        </div>
      )}

      {/* Leaves, for scenes that are mostly trees. Same canvas approach as the
          snow: a handful of shapes tumbling down and across. */}
      {leaves && <LeafDrift isDark={isDark} />}

      {/* The clouds: three soft bodies crossing the sky on long loops.

          Pre-blurred radial gradients on transforms — no `filter: blur`, which
          would repaint a viewport-sized layer every frame. Negative delays
          start them mid-crossing, so the sky is never conspicuously empty on
          arrival and never conspicuously synchronised after. */}
      {weather && !reduce && (
        <div className="absolute inset-x-0 top-0 h-[55%] overflow-hidden">
          {(
            [
              ["bb-cloud-a", "8%", "58vw", "26vh", 0.5],
              ["bb-cloud-b", "22%", "44vw", "20vh", 0.36],
              ["bb-cloud-c", "2%", "70vw", "30vh", 0.28],
            ] as const
          ).map(([anim, top, w, h, o]) => (
            <div
              key={anim}
              className={cn(anim, "absolute")}
              style={{
                top,
                width: w,
                height: h,
                opacity: o,
                background: isDark
                  ? "radial-gradient(50% 50% at 50% 50%, rgba(226,232,255,0.32) 0%, rgba(226,232,255,0.1) 55%, transparent 100%)"
                  : "radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 55%, transparent 100%)",
              }}
            />
          ))}
        </div>
      )}

      {/* The snow. A single canvas, ~120 flakes, one draw call each. */}
      {weather && !reduce && SNOW_FOR_NOW && <Snowfall isDark={isDark} />}

      {/* The berry, blended rather than pasted. `screen` keeps the lit fruit and
          drops the dark ground it was photographed against; the radial mask
          feathers the frame's edges so there is no rectangle. */}
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

      {/* The wash: two colour fields breathing over the picture. CSS radial
          gradients on transforms, not a second GL context — this runs behind
          every route, including a page of flashcards mid-revision. `screen` on
          dark so it adds light, `multiply` on light so it tints. Quieter than
          it launched: it is a mood, and it was competing with the picture. */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden",
          isDark ? "mix-blend-screen opacity-[0.4]" : "mix-blend-multiply opacity-[0.26]",
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
          field. Lighter than it was: grain sells print, but over a photograph
          that is now allowed to be sharp it was reading as sensor noise. */}
      <div
        className="absolute inset-0 opacity-[0.09] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Legibility, spent where it is needed rather than everywhere: the top
          band under the bar, the bottom band under the cue. Eased in the
          middle stops, because the veil above and these were double-charging
          the same picture for the same service. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${surface.base} 0%, transparent 16%, transparent 78%, ${surface.base} 100%)`,
          opacity: isDark ? 0.78 : 0.6,
        }}
      />

      {/* A soft vignette, pulling the eye to the middle. Backed off with the
          rest of the treatment. */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(78% 62% at 50% 45%, transparent 38%, rgba(8,6,16,0.4) 100%)"
            : "radial-gradient(82% 66% at 50% 45%, transparent 48%, rgba(250,249,255,0.3) 100%)",
        }}
      />
    </div>

    {/* The caption: what you are looking at, and — when the place is real —
        where to learn about it.

        Outside the background container, which is `-z-10` and
        `pointer-events-none`: a link buried under the whole page can never be
        clicked. Bottom-left, because the corner dock owns bottom-right on
        every page. Rendered only when the scene actually carries a title, so
        the generic pages never grow a mystery chip. */}
    {info && curated && (
      <div className="pointer-events-none fixed bottom-5 left-5 z-20 hidden sm:block">
        {curated.url ? (
          <a
            href={curated.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[0.68rem] tracking-wide backdrop-blur transition-colors",
              isDark
                ? "border-white/15 bg-black/30 text-white/70 hover:bg-black/50 hover:text-white"
                : "border-slate-900/10 bg-white/55 text-slate-600 hover:bg-white/80 hover:text-slate-900",
            )}
          >
            {curated.title}
            <ArrowUpRight className="size-3" />
          </a>
        ) : (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 font-mono text-[0.68rem] tracking-wide backdrop-blur",
              isDark
                ? "border-white/10 bg-black/25 text-white/55"
                : "border-slate-900/10 bg-white/45 text-slate-500",
            )}
          >
            {curated.title}
          </span>
        )}
      </div>
    )}
    </>
  );
}

/**
 * Snow on a single canvas.
 *
 * Every flake falls the same way — down and to the right, one wind — because
 * snow in weather does not sway back and forth on its own axis, it goes where
 * the air goes. The cursor bends that air: moving the mouse leans the whole
 * field toward or away from it, eased through a lerp so the wind changes like
 * wind and not like a switch.
 *
 * The flakes are tumbling ellipses rather than circles. A circle at three
 * pixels is a dot; a squashed ellipse whose rotation slowly rolls catches the
 * light differently across its fall, which is most of what real flakes do.
 * Size doubles as depth: big ones fall fast and near, small ones drift far.
 *
 * `requestAnimationFrame` stops on hidden tabs by itself, and the delta clamp
 * keeps a background return from teleporting every flake.
 */
function Snowfall({ isDark }: { isDark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let w = 0;
    let h = 0;
    /** The wind the cursor is asking for, and the wind the field has. */
    let windTarget = 0;
    let wind = 0;

    interface Flake {
      x: number;
      y: number;
      r: number;
      vy: number;
      vx: number;
      tilt: number;
      spin: number;
      alpha: number;
    }
    let flakes: Flake[] = [];

    const seed = () => {
      const count = Math.round(Math.min(130, Math.max(60, (w * h) / 20_000)));
      flakes = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1 + depth * 2.6,
          vy: 16 + depth * 42,
          // The base wind: rightward, about ten degrees off vertical.
          vx: 4 + depth * 9,
          tilt: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 1.6,
          alpha: 0.35 + depth * 0.5,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    /**
     * The cursor's horizontal position, mapped to ±40px/s of extra wind.
     * Listened on the window because this canvas is `pointer-events-none`
     * behind the whole page and will never hear a pointer of its own.
     */
    const onPointer = (e: PointerEvent) => {
      windTarget = ((e.clientX / Math.max(1, window.innerWidth)) * 2 - 1) * 40;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      // The air changes slowly. A direct assignment would snap every flake
      // sideways the moment the mouse moved.
      wind += (windTarget - wind) * Math.min(1, dt * 1.2);

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = isDark ? "rgba(240,244,255,1)" : "rgba(203,213,225,1)";

      for (const f of flakes) {
        f.y += f.vy * dt;
        f.x += (f.vx + wind * (f.r / 3.6)) * dt;
        f.tilt += f.spin * dt;

        if (f.y - f.r > h) {
          f.y = -f.r;
          f.x = Math.random() * w;
        }
        if (f.x < -6) f.x = w + 6;
        if (f.x > w + 6) f.x = -6;

        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, f.r, f.r * 0.55, f.tilt, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      last = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [isDark]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}

/**
 * Leaves, for the scenes that are mostly trees.
 *
 * A dozen shapes, not a hundred: leaves fall occasionally, snow falls
 * everywhere. Each is a pointed oval — two quadratic arcs — that rocks as it
 * falls and slides sideways, which is the pendulum settle of a real leaf.
 * Colours sit in the amber-to-moss range, dimmer in dark mode so they read as
 * silhouettes against the lit forest rather than confetti in front of it.
 */
function LeafDrift({ isDark }: { isDark: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let w = 0;
    let h = 0;

    const PALETTE = isDark
      ? ["rgba(180,130,60,0.5)", "rgba(140,150,70,0.45)", "rgba(160,100,50,0.5)"]
      : ["rgba(190,120,40,0.55)", "rgba(130,150,60,0.5)", "rgba(170,90,40,0.55)"];

    interface Leaf {
      x: number;
      y: number;
      size: number;
      vy: number;
      sway: number;
      phase: number;
      rot: number;
      rotV: number;
      color: string;
    }
    let items: Leaf[] = [];

    const seed = () => {
      const count = Math.round(Math.min(16, Math.max(8, w / 140)));
      items = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 6 + Math.random() * 7,
        vy: 22 + Math.random() * 26,
        sway: 24 + Math.random() * 22,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 2.4,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)]!,
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const drawLeaf = (leaf: Leaf) => {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rot);
      ctx.fillStyle = leaf.color;
      const s = leaf.size;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.7, 0, 0, s);
      ctx.quadraticCurveTo(-s * 0.7, 0, 0, -s);
      ctx.fill();
      ctx.restore();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (last === 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      ctx.clearRect(0, 0, w, h);
      for (const leaf of items) {
        leaf.phase += dt * 1.4;
        leaf.y += leaf.vy * dt;
        leaf.x += Math.sin(leaf.phase) * leaf.sway * dt + 6 * dt;
        // The rock follows the sway: a leaf tips into the direction it is
        // sliding, so the rotation is driven by the same phase.
        leaf.rot += leaf.rotV * dt + Math.cos(leaf.phase) * 0.6 * dt;

        if (leaf.y - leaf.size > h) {
          leaf.y = -leaf.size;
          leaf.x = Math.random() * w;
        }
        if (leaf.x > w + 10) leaf.x = -10;
        if (leaf.x < -10) leaf.x = w + 10;

        drawLeaf(leaf);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      last = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // PALETTE is derived from isDark alone, so the theme is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}

export default PageBackground;
