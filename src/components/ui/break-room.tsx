import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CloudRain, Gamepad2, Music, Volume2, VolumeX, Waves, X } from "lucide-react";
import { Tetris } from "@/components/ui/tetris";
import {
  SCENE_LABEL,
  SPOTIFY_PLAYLISTS,
  playlistUri,
  type AmbienceScene,
} from "@/lib/useAmbience";
import { SpotifyLoop } from "@/components/ui/spotify-loop";
import { cn } from "@/lib/utils";

/**
 * What there is to do on a break.
 *
 * Sound and a game, and both are here rather than in the focus panel on
 * purpose: a study timer that offers you Tetris while the focus clock is running
 * is not a study timer. The game appears when the break starts and goes away
 * when it ends, which is the only enforcement that actually works, since any
 * button you leave on screen will eventually get pressed.
 *
 * The sound is the exception to the gating. Ambient noise is a study aid rather
 * than a distraction, so it can be turned on during focus too, and it keeps
 * playing across the phase change instead of stopping and starting every
 * twenty-five minutes.
 */
const SCENE_ICON = {
  white: Waves,
  rain: CloudRain,
  spotify: Music,
} as const;

export function BreakRoom({
  scene,
  volume,
  setVolume,
  onScene,
  showGame,
}: {
  scene: AmbienceScene;
  volume: number;
  setVolume: (v: number) => void;
  onScene: (s: AmbienceScene) => void;
  /** False during focus: sound stays, the game does not. */
  showGame: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  /**
   * Which playlist, remembered for the session.
   *
   * Not persisted: the volume beside it is not either, and a sound bed is
   * a choice you make for the sitting you are in rather than a setting.
   */
  const [playlist, setPlaylist] = useState(SPOTIFY_PLAYLISTS[0].id);

  return (
    <div className="border-t border-slate-100 dark:border-stone-900">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <button
          type="button"
          onClick={() => onScene("off")}
          aria-pressed={scene === "off"}
          aria-label="Sound off"
          className={cn(
            "cursor-pointer rounded-lg p-1.5 transition-colors",
            scene === "off"
              ? "bg-slate-100 text-slate-700 dark:bg-stone-900 dark:text-stone-200"
              : "text-slate-400 hover:text-slate-700 dark:hover:text-stone-200",
          )}
        >
          {scene === "off" ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>

        {/* One dropdown rather than a pill each.

            Three options is where a row of pills stops working: they wrap onto
            a second line inside a 22rem card, and adding a fourth would push the
            game button off the end. A menu shows the current choice in the space
            of one pill and has room for however many beds get added. */}
        <SceneMenu scene={scene} onScene={onScene} />

        {showGame && (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
            aria-label={playing ? "Hide Tetris" : "Play Tetris"}
            className={cn(
              "ml-auto cursor-pointer rounded-lg p-1.5 transition-colors",
              playing
                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-stone-200",
            )}
          >
            <Gamepad2 className="size-4" />
          </button>
        )}
      </div>

      {/* Spotify has its own volume, on its own player, and this slider cannot
          reach inside their iframe to move it. Showing a control that does
          nothing is worse than not showing one. */}
      {scene !== "off" && scene !== "spotify" && (
        <div className="px-3 pb-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Sound volume"
            className="h-1 w-full cursor-pointer accent-indigo-500"
          />
        </div>
      )}

      {/* Spotify draws its own player, so unlike the synthesised beds this
          option has something to show. Mounted only when chosen: it pulls a
          script from Spotify, the one third-party request on the site. */}
      {scene === "spotify" && (
        <div className="mt-3">
          {/* Which playlist, when there is more than one.

              A row of small buttons rather than a second dropdown: there are
              three, they all fit, and the menu above is already how you get to
              Spotify at all. Nesting a picker inside the thing the picker
              chose reads as two decisions for one choice. */}
          <div className="flex flex-wrap gap-1.5">
            {SPOTIFY_PLAYLISTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlaylist(p.id)}
                aria-pressed={playlist === p.id}
                className={cn(
                  "min-h-9 cursor-pointer rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                  playlist === p.id
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200"
                    : "border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 dark:border-stone-700 dark:text-stone-300 dark:hover:border-indigo-600",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Keyed on the playlist so switching rebuilds the controller. The
          Spotify controller is created once for a uri and has no way to be
          pointed at another one, so reusing it would leave the previous
          playlist playing under a new label. */}
      <SpotifyLoop
        key={playlist}
        uri={playlistUri(playlist)}
        playing={scene === "spotify"}
      />

      {showGame && playing && (
        <TetrisScreen onClose={() => setPlaying(false)} />
      )}
    </div>
  );
}

/**
 * Which bed is playing, as a menu.
 *
 * Closes on Escape and on any click outside itself. The check mark rather than
 * a highlight marks the current one, because "off" is a real choice here and a
 * highlighted "off" reads as an error state.
 */
function SceneMenu({
  scene,
  onScene,
}: {
  scene: AmbienceScene;
  onScene: (s: AmbienceScene) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // Deferred a frame, or the press that opened it closes it again.
    const id = setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const Icon = scene === "off" ? VolumeX : SCENE_ICON[scene];

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors",
          scene === "off"
            ? "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-stone-800 dark:text-stone-300"
            : "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-400/50 dark:bg-indigo-500/15 dark:text-indigo-200",
        )}
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">
          {scene === "off" ? "Sound off" : SCENE_LABEL[scene]}
        </span>
        <ChevronDown
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            // Upward: the card is anchored to the bottom of the screen, so a
            // menu dropping down would open off the edge of it.
            className="absolute bottom-full left-0 z-10 mb-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-stone-800 dark:bg-stone-950"
          >
            {(["off", "white", "rain", "spotify"] as const).map((s) => {
              const RowIcon = s === "off" ? VolumeX : SCENE_ICON[s];
              return (
                <li key={s}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onScene(s);
                      setOpen(false);
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-50 dark:hover:bg-stone-900"
                  >
                    <RowIcon className="size-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate">
                      {s === "off" ? "Sound off" : SCENE_LABEL[s]}
                    </span>
                    {scene === s && <Check className="size-3 shrink-0 text-indigo-500" />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The game, given the middle of the screen.
 *
 * It began life inside the timer card, which made a 10x18 board about two
 * centimetres wide: technically the game, practically unplayable. A break is the
 * one moment when taking over the screen is the right thing to do, so it does.
 *
 * Portalled to `<body>` because the card it is launched from is a scrolling,
 * `overflow-hidden` panel in the corner. A child of that can never escape it,
 * whatever its position or z-index.
 */
function TetrisScreen({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // The arrow keys drive the game while this is open, so the page behind it
    // must not scroll out from under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[200] grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Tetris"
      >
        <motion.div
          initial={{ scale: 0.94, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          // Stop a click inside the card from reaching the scrim behind it and
          // closing the game mid-drop.
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[min(26rem,calc(100vh-8rem)*0.62)] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
        >
          <div className="mb-2 flex items-center gap-2">
            <Gamepad2 className="size-4 text-indigo-600 dark:text-indigo-300" />
            <span className="flex-1 text-sm font-semibold">Break</span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the game"
              className="cursor-pointer rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-stone-900 dark:hover:text-stone-200"
            >
              <X className="size-4" />
            </button>
          </div>
          <Tetris />
          <p className="mt-2 text-center font-mono text-[0.65rem] text-slate-400 dark:text-stone-500">
            arrows to move, up to rotate, space to drop
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default BreakRoom;
