import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Click-to-flip card with pointer-tracked tilt on the face that is showing.
 *
 * The upstream file shipped its own local `cn`; this uses the project's shared
 * one from `@/lib/utils` so class merging behaves the same as everywhere else.
 */

type FlipCardProps = {
  cardNumber?: number | string;
  backTitle?: string;
  backContent?: string;
  backImage?: string;
  backImageAlt?: string;
  /**
   * Added to the upstream component. Its built-in layout is logo-on-front,
   * image-on-back, which carries no text. Supplying either of these replaces
   * that face wholesale, so the same tilt behaviour can present a question and
   * an answer. The tilt and click-to-flip are untouched.
   */
  frontContent?: React.ReactNode;
  backFace?: React.ReactNode;
  logoSrc?: string;
  logoAlt?: string;
  logo?: React.ReactNode;
  canFlip?: boolean;
  isFlipped?: boolean;
  defaultFlipped?: boolean;
  onFlipChange?: (cardNumber: number | string, isFlipped: boolean) => void;
  className?: string;
};

function mapRange(value: number, minA: number, maxA: number, minB: number, maxB: number) {
  return minB + ((value - minA) * (maxB - minB)) / (maxA - minA);
}

function DefaultLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10" fill="none" aria-hidden="true">
      <path d="M24 4L42 14V34L24 44L6 34V14L24 4Z" className="fill-slate-800 dark:fill-stone-200" />
      <path d="M24 12L34 18V30L24 36L14 30V18L24 12Z" className="fill-white dark:fill-stone-900" />
    </svg>
  );
}

export function FlipCard({
  cardNumber = 1,
  backTitle = "Title",
  backContent = "Content",
  backImage = "",
  backImageAlt = "Card image",
  frontContent,
  backFace,
  logoSrc,
  logoAlt = "Logo",
  logo,
  canFlip = true,
  isFlipped,
  defaultFlipped = false,
  onFlipChange,
  className,
}: FlipCardProps) {
  const [internalFlipped, setInternalFlipped] = React.useState(defaultFlipped);

  const cardRef = React.useRef<HTMLDivElement>(null);
  const frontRef = React.useRef<HTMLDivElement>(null);
  const backRef = React.useRef<HTMLDivElement>(null);

  const pointerPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const isPointerInsideRef = React.useRef(false);

  const isControlled = typeof isFlipped === "boolean";
  const flipped = isControlled ? isFlipped : internalFlipped;

  const resetTilt = React.useCallback(() => {
    if (frontRef.current) frontRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
    if (backRef.current) backRef.current.style.transform = "rotateY(180deg)";
  }, []);

  const applyTilt = React.useCallback(
    (clientX: number, clientY: number, targetFlipped = flipped) => {
      const card = cardRef.current;
      const activeSide = targetFlipped ? backRef.current : frontRef.current;
      if (!card || !activeSide) return;

      const rect = card.getBoundingClientRect();
      const rotateY = mapRange(clientX - rect.left, 0, rect.width, -15, 15);
      const rotateX = mapRange(clientY - rect.top, 0, rect.height, 15, -15);

      activeSide.style.transform = targetFlipped
        ? `rotateY(180deg) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
        : `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    [flipped],
  );

  React.useEffect(() => {
    const pointerPosition = pointerPositionRef.current;
    if (!isPointerInsideRef.current || !pointerPosition) {
      resetTilt();
      return;
    }
    requestAnimationFrame(() => {
      applyTilt(pointerPosition.x, pointerPosition.y, flipped);
    });
  }, [flipped, applyTilt, resetTilt]);

  const updateFlipped = React.useCallback(
    (nextValue: boolean) => {
      if (!isControlled) setInternalFlipped(nextValue);
      onFlipChange?.(cardNumber, nextValue);
    },
    [cardNumber, isControlled, onFlipChange],
  );

  const toggleFlip = React.useCallback(() => {
    if (!canFlip) return;
    updateFlipped(!flipped);
  }, [canFlip, flipped, updateFlipped]);

  const track = (event: React.MouseEvent<HTMLDivElement>) => {
    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    isPointerInsideRef.current = true;
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={canFlip ? 0 : -1}
      aria-pressed={flipped}
      aria-disabled={!canFlip}
      onClick={(e) => {
        pointerPositionRef.current = { x: e.clientX, y: e.clientY };
        toggleFlip();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        toggleFlip();
      }}
      onMouseEnter={(e) => {
        track(e);
        applyTilt(e.clientX, e.clientY, flipped);
      }}
      onMouseMove={(e) => {
        track(e);
        applyTilt(e.clientX, e.clientY, flipped);
      }}
      onMouseLeave={() => {
        isPointerInsideRef.current = false;
        pointerPositionRef.current = null;
        resetTilt();
      }}
      className={cn(
        // Width is fluid rather than the upstream fixed 185/224px: this has to
        // sit in a grid cell and fill a carousel slide.
        "my-2 h-[300px] w-full cursor-pointer rounded-lg text-slate-900 outline-none transition-transform duration-500 ease-in-out [perspective:1000px] focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-stone-100",
        !canFlip && "cursor-not-allowed opacity-70",
        className,
      )}
    >
      <div
        className={cn(
          "relative h-full w-full rounded-lg transition-transform duration-500 ease-in-out [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div
          ref={frontRef}
          className="absolute flex h-full w-full flex-col items-center justify-center rounded-lg border border-slate-200 bg-white/80 shadow-[0_10px_20px_rgba(0,0,0,0.06)] transition-[transform,filter] duration-[250ms] ease-out [backface-visibility:hidden] dark:border-stone-800 dark:bg-stone-900/80"
        >
          {frontContent ? (
            <div className="h-full w-full">{frontContent}</div>
          ) : (
            <>
              <span className="absolute top-4 right-4 font-mono text-sm opacity-30">
                {cardNumber}
              </span>
              <span className="absolute bottom-4 left-4 font-mono text-sm opacity-30">
                {cardNumber}
              </span>

              <div className="flex w-10 items-center justify-center">
                {logo ? (
                  logo
                ) : logoSrc ? (
                  <img src={logoSrc} alt={logoAlt} className="h-full w-full" draggable={false} />
                ) : (
                  <DefaultLogo />
                )}
              </div>
            </>
          )}
        </div>

        <div
          ref={backRef}
          className="absolute flex h-full w-full flex-col items-center justify-start overflow-hidden rounded-lg border border-slate-200 bg-white/80 shadow-[0_10px_20px_rgba(0,0,0,0.06)] transition-[transform,filter] duration-[250ms] ease-out [backface-visibility:hidden] [transform:rotateY(180deg)] dark:border-stone-800 dark:bg-stone-900/80"
        >
          {backFace ? (
            // Replaces the whole face, not just the image slot: the title and
            // body below are part of the built-in layout and would otherwise
            // render as empty defaults underneath supplied content.
            <div className="h-full w-full">{backFace}</div>
          ) : (
            <>
              {backImage ? (
                <img
                  src={backImage}
                  alt={backImageAlt}
                  className="max-h-44 w-full border-b border-slate-200 bg-white object-contain dark:border-stone-800"
                  draggable={false}
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center border-b border-slate-200 bg-slate-50 text-xs text-slate-400 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-500">
                  No image
                </div>
              )}

              <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-balance">
                <span className="text-center font-mono text-sm font-medium">{backTitle}</span>
                <p className="mb-4 text-center text-xs leading-normal opacity-70">{backContent}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlipCard;
