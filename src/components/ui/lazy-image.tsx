import * as React from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * An image that holds its own space, fades in when it arrives, and can wait
 * until it is scrolled to before it is fetched at all.
 *
 * WHY THE BOX COMES FIRST. The ratio is applied to the wrapper, so the layout
 * is settled before a single byte of the picture is in. Without that, every
 * image on a page is a reflow waiting to happen, and on the deck and folder
 * pages that is a whole grid jumping under the reader's cursor.
 *
 * TWO ADAPTATIONS FROM THE SOURCE THIS CAME FROM, both to avoid installing
 * something this repo already has an answer for:
 *
 *   `useInView` is imported from `motion/react`, not `framer-motion`. They are
 *   the same library after the rename, `motion` v12 is already a dependency,
 *   and FolderPage and StudyDecksPage already import this exact hook from it.
 *   Adding framer-motion beside it would ship the library twice.
 *
 *   The ratio is the CSS `aspect-ratio` property rather than Radix's
 *   AspectRatio component. Radix's version exists because it predates broad
 *   support for the property; the property is now the whole feature in one
 *   line, and the bundle is already over budget.
 *
 * `inView` is OFF by default on purpose. Deferring a fetch is only a win below
 * the fold: doing it to the image someone is already looking at just delays it
 * by a frame and a network round trip.
 */
export interface LazyImageProps {
  alt: string;
  src: string;
  className?: string;
  /** Classes for the ratio box itself, not the picture inside it. */
  boxClassName?: string;
  /** Swapped in when `src` fails. Without one, a failure leaves the box empty. */
  fallback?: string;
  /** Width over height. `16 / 9`, not `"16:9"`. */
  ratio: number;
  /** Wait until it is scrolled to before fetching. Default false. */
  inView?: boolean;
}

export function LazyImage({
  alt,
  src,
  ratio,
  fallback,
  inView = false,
  className,
  boxClassName,
}: LazyImageProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once: true });

  const [isLoading, setIsLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);

  /* DERIVED, NOT STORED, and deliberately so. An earlier shape kept the current
     src in state and pushed it there from an effect watching `isInView`, which
     is a render scheduled purely to catch up with something already knowable
     during render. Both answers fall out of the props: whether we are allowed
     to fetch yet, and whether the real src has already failed. `useInView` is
     latched with `once`, so this only ever moves forwards. */
  const mayFetch = !inView || isInView;
  const imgSrc = !mayFetch ? undefined : failed && fallback !== undefined ? fallback : src;

  const handleLoad = () => setIsLoading(false);
  const handleError = () => {
    /* Only the first failure is worth reacting to: if the fallback fails too,
       setting it again would swap a broken src for the same broken src. */
    if (fallback !== undefined && !failed) setFailed(true);
    else setIsLoading(false);
  };

  /* A cached image can already be `complete` by the time React attaches, and
     then `onLoad` never fires and the picture sits at opacity 0 for good.
     The check rides a CALLBACK REF rather than an effect: it runs exactly when
     the node attaches, which is the moment the answer becomes knowable, and it
     does not schedule the extra render an effect would. The `key` below is what
     makes it correct across a src change, since React would otherwise reuse the
     same <img> node and never call this again. */
  const attachImg = React.useCallback((node: HTMLImageElement | null) => {
    if (node?.complete === true) setIsLoading(false);
  }, []);

  return (
    <div
      ref={ref}
      style={{ aspectRatio: ratio }}
      className={cn("relative w-full overflow-hidden rounded-lg border border-bb-border", boxClassName)}
    >
      {/* The placeholder, which is also the failure state: if nothing ever
          loads, this is what stays, and an empty tinted box reads as "not here
          yet" rather than as a broken page. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-lg bg-bb-muted/40 transition-opacity motion-safe:animate-pulse",
          !isLoading && "opacity-0",
        )}
      />

      {imgSrc !== undefined && (
        <img
          key={imgSrc}
          ref={attachImg}
          alt={alt}
          src={imgSrc}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          /* High only for a picture already on screen. Telling the browser that
             everything is urgent is the same as telling it nothing is. */
          fetchPriority={inView ? "low" : "high"}
          className={cn(
            "absolute inset-0 h-full w-full rounded-lg object-cover opacity-0 transition-opacity duration-700 motion-reduce:transition-none",
            !isLoading && "opacity-100",
            className,
          )}
        />
      )}
    </div>
  );
}

export default LazyImage;
