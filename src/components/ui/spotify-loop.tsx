import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";

/**
 * A Spotify playlist, looped.
 *
 * I told you earlier that a Spotify embed could not be looped. That was right
 * about the bare `<iframe>` you pasted and wrong about what Spotify offers:
 * there is an official **IFrame API** that hands back a controller with
 * `play`, `resume`, `seek` and an `onPlaybackUpdate` event carrying position and
 * duration. With that, looping is a matter of watching for the end and seeking
 * back to zero.
 *
 * Two things it still cannot do, both worth knowing before relying on it:
 *
 * - **The seam is not seamless.** Seeking to zero takes a moment to buffer, so
 *   there is a short gap at the loop point. The API gives no way to crossfade,
 *   because the audio never passes through our code. The synthesised beds in
 *   `useAmbience` remain the ones with no seam at all, by construction.
 * - **Playback depends on the listener's account.** Spotify serves full tracks
 *   to signed-in Premium users and roughly thirty-second previews to everyone
 *   else. A preview will loop happily; it will just be a short loop.
 *
 * It also loads a script from Spotify, which is the first third-party request on
 * this site. That is a real cost and the reason this is opt-in and lazy: the
 * script is only fetched once someone actually chooses this option.
 */

const API_SRC = "https://open.spotify.com/embed/iframe-api/v1";

/** Loop a little before the true end: seeking exactly at zero remaining races the player's own stop. */
const LOOP_LEAD_MS = 900;

interface SpotifyController {
  play: () => void;
  resume: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
  addListener: (name: string, cb: (e: { data: PlaybackData }) => void) => void;
}

interface PlaybackData {
  position: number;
  duration: number;
  isPaused: boolean;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: {
      createController: (
        el: HTMLElement,
        opts: { uri: string; width: string | number; height: string | number },
        cb: (c: SpotifyController) => void,
      ) => void;
    }) => void;
  }
}

/** Loaded once for the page, however many players ask for it. */
let apiPromise: Promise<Parameters<NonNullable<Window["onSpotifyIframeApiReady"]>>[0]> | null = null;

function loadApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const tag = document.createElement("script");
    tag.src = API_SRC;
    tag.async = true;
    tag.onerror = () => reject(new Error("Spotify's player script did not load"));
    document.body.appendChild(tag);
  });
  return apiPromise;
}

export function SpotifyLoop({ uri, playing }: { uri: string; playing: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!playing) return;
    let cancelled = false;

    void loadApi()
      .then((api) => {
        if (cancelled || !hostRef.current) return;
        api.createController(
          hostRef.current,
          { uri, width: "100%", height: 152 },
          (controller) => {
            if (cancelled) {
              controller.destroy();
              return;
            }
            controllerRef.current = controller;
            setReady(true);

            controller.addListener("playback_update", (e) => {
              const { position, duration, isPaused } = e.data;
              if (!duration || isPaused) return;
              // The loop itself. Seek rather than replay, so the queue does not
              // advance past the playlist's last track and stop.
              if (duration - position <= LOOP_LEAD_MS) controller.seek(0);
            });

            controller.play();
          },
        );
      })
      .catch((e: Error) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      setReady(false);
    };
  }, [playing, uri]);

  if (!playing) return null;

  return (
    <div className="px-3 pb-3">
      {error ? (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {error}. The synthesised beds still work.
        </p>
      ) : (
        <>
          {/* Spotify replaces this node with its own iframe. */}
          <div ref={hostRef} className="overflow-hidden rounded-xl" />
          {!ready && (
            <p className="py-3 text-center text-xs text-slate-500 dark:text-stone-400">
              Loading Spotify…
            </p>
          )}
          <p className="mt-1.5 text-[0.65rem] leading-4 text-slate-500 dark:text-stone-400">
            Loops back to the start. Sign in to Spotify for full tracks; without it you get
            previews.
          </p>
        </>
      )}
    </div>
  );
}

export default SpotifyLoop;
