import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createPortal } from "react-dom";
import { CloudRain, Gamepad2, Volume2, VolumeX, Waves, X } from "lucide-react";
import { Tetris } from "@/components/ui/tetris";
import { SCENE_LABEL, type AmbienceScene } from "@/lib/useAmbience";
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

        {(["white", "rain"] as const).map((s) => {
          // An icon each, so the two are told apart at a glance rather than by
          // reading. Waves for the broadband hiss, rain for the forest.
          const Icon = s === "white" ? Waves : CloudRain;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onScene(scene === s ? "off" : s)}
              aria-pressed={scene === s}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors",
                scene === s
                  ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-400/50 dark:bg-indigo-500/15 dark:text-indigo-200"
                  : "border-slate-200 text-slate-600 hover:border-indigo-300 dark:border-stone-800 dark:text-stone-300",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {SCENE_LABEL[s]}
            </button>
          );
        })}

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

      {scene !== "off" && (
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

      {showGame && playing && (
        <TetrisScreen onClose={() => setPlaying(false)} />
      )}
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
