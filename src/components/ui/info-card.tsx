import {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import React from "react";

/**
 * Hoverable card whose stacked media fans out on hover. Used on the hub as a
 * folder: the stack is the decks inside it.
 *
 * Four changes from the upstream component, all necessary here:
 *
 * 1. **A real bug.** `InfoCardMedia` passed an object to `cn`:
 *    `cn("relative", media.length > 0 ? { height: shrinkHeight } : "h-auto")`.
 *    clsx reads object keys as class names gated on truthiness, so that emitted
 *    a literal `height` class and set no height at all. Moved to `style`.
 * 2. `NodeJS.Timeout` → `ReturnType<typeof setTimeout>`. Browser timers are
 *    numbers, and the app's tsconfig does not pull in Node types.
 * 3. Hardcoded `bg-white` and the `to-white` scrim broke dark mode. Both now
 *    carry `dark:` variants, as `GlassCard` and `HoverDeck` already do.
 * 4. `text-muted-foreground` is a shadcn CSS-variable token this project never
 *    defines, so it resolved to nothing. Swapped for the slate/stone pairs used
 *    everywhere else.
 */

interface InfoCardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface InfoCardDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const InfoCardTitle = React.memo(({ children, className, ...props }: InfoCardTitleProps) => {
  return (
    <div
      className={cn("mb-1 font-semibold text-slate-900 dark:text-stone-100", className)}
      {...props}
    >
      {children}
    </div>
  );
});
InfoCardTitle.displayName = "InfoCardTitle";

const InfoCardDescription = React.memo(
  ({ children, className, ...props }: InfoCardDescriptionProps) => {
    return (
      <div
        className={cn("leading-4 text-slate-500 dark:text-stone-400", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
InfoCardDescription.displayName = "InfoCardDescription";

interface CommonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface InfoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  storageKey?: string;
  dismissType?: "once" | "forever";
}

type InfoCardContentProps = CommonCardProps;
type InfoCardFooterProps = CommonCardProps;
type InfoCardDismissProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  onDismiss?: () => void;
};
type InfoCardActionProps = CommonCardProps;

const InfoCardContent = React.memo(({ children, className, ...props }: InfoCardContentProps) => {
  return (
    <div className={cn("flex flex-col gap-1 text-xs", className)} {...props}>
      {children}
    </div>
  );
});
InfoCardContent.displayName = "InfoCardContent";

interface MediaItem {
  type?: "image" | "video";
  src: string;
  alt?: string;
  className?: string;
  [key: string]: unknown;
}

interface InfoCardMediaProps extends React.HTMLAttributes<HTMLDivElement> {
  media: MediaItem[];
  loading?: "eager" | "lazy";
  shrinkHeight?: number;
  expandHeight?: number;
}

const InfoCardImageContext = createContext<{
  handleMediaLoad: (mediaSrc: string) => void;
  setAllImagesLoaded: (loaded: boolean) => void;
}>({
  handleMediaLoad: () => {},
  setAllImagesLoaded: () => {},
});

const InfoCardContext = createContext<{
  isHovered: boolean;
  onDismiss: () => void;
}>({
  isHovered: false,
  onDismiss: () => {},
});

function InfoCard({ children, className, storageKey, dismissType = "once" }: InfoCardProps) {
  if (dismissType === "forever" && !storageKey) {
    throw new Error('A storageKey must be provided when using dismissType="forever"');
  }

  const [isHovered, setIsHovered] = useState(false);
  const [allImagesLoaded, setAllImagesLoaded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window === "undefined" || dismissType === "once") return false;
    return dismissType === "forever" ? localStorage.getItem(storageKey!) === "dismissed" : false;
  });

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    if (dismissType === "forever") {
      localStorage.setItem(storageKey!, "dismissed");
    }
  }, [storageKey, dismissType]);

  const imageContextValue = useMemo(
    () => ({
      handleMediaLoad: () => {},
      setAllImagesLoaded,
    }),
    [setAllImagesLoaded],
  );

  const cardContextValue = useMemo(
    () => ({
      isHovered,
      onDismiss: handleDismiss,
    }),
    [isHovered, handleDismiss],
  );

  return (
    <InfoCardContext.Provider value={cardContextValue}>
      <InfoCardImageContext.Provider value={imageContextValue}>
        <AnimatePresence>
          {!isDismissed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: allImagesLoaded ? 1 : 0,
                y: allImagesLoaded ? 0 : 10,
              }}
              exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, delay: 0 }}
              className={cn(
                "group rounded-lg border border-slate-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900",
                className,
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </InfoCardImageContext.Provider>
    </InfoCardContext.Provider>
  );
}

const InfoCardFooter = ({ children, className }: InfoCardFooterProps) => {
  const { isHovered } = useContext(InfoCardContext);

  return (
    <motion.div
      className={cn(
        "flex justify-between text-xs text-slate-500 dark:text-stone-400",
        className,
      )}
      initial={{ opacity: 0, height: "0px" }}
      animate={{
        opacity: isHovered ? 1 : 0,
        height: isHovered ? "auto" : "0px",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

const InfoCardDismiss = React.memo(
  ({ children, className, onDismiss, ...props }: InfoCardDismissProps) => {
    const { onDismiss: contextDismiss } = useContext(InfoCardContext);

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      onDismiss?.();
      contextDismiss();
    };

    return (
      <div className={cn("cursor-pointer", className)} onClick={handleClick} {...props}>
        {children}
      </div>
    );
  },
);
InfoCardDismiss.displayName = "InfoCardDismiss";

const InfoCardAction = React.memo(({ children, className, ...props }: InfoCardActionProps) => {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
});
InfoCardAction.displayName = "InfoCardAction";

const InfoCardMedia = ({
  media = [],
  className,
  loading = undefined,
  shrinkHeight = 75,
  expandHeight = 150,
}: InfoCardMediaProps) => {
  const { isHovered } = useContext(InfoCardContext);
  const { setAllImagesLoaded } = useContext(InfoCardImageContext);
  const [isOverflowVisible, setIsOverflowVisible] = useState(false);
  const loadedMedia = useRef(new Set<string>());

  const handleMediaLoad = (mediaSrc: string) => {
    loadedMedia.current.add(mediaSrc);
    if (loadedMedia.current.size === Math.min(3, media.slice(0, 3).length)) {
      setAllImagesLoaded(true);
    }
  };

  const processedMedia = useMemo(
    () => media.map((item) => ({ ...item, type: item.type || "image" })),
    [media],
  );

  const displayMedia = useMemo(() => processedMedia.slice(0, 3), [processedMedia]);

  useEffect(() => {
    if (media.length > 0) {
      setAllImagesLoaded(false);
      loadedMedia.current.clear();
    } else {
      setAllImagesLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.length]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (isHovered) {
      timeoutId = setTimeout(() => setIsOverflowVisible(true), 100);
    } else {
      setIsOverflowVisible(false);
    }
    return () => clearTimeout(timeoutId);
  }, [isHovered]);

  const mediaCount = displayMedia.length;

  const getRotation = (index: number) => {
    if (!isHovered || mediaCount === 1) return 0;
    return (index - (mediaCount === 2 ? 0.5 : 1)) * 5;
  };

  const getTranslateX = (index: number) => {
    if (!isHovered || mediaCount === 1) return 0;
    return (index - (mediaCount === 2 ? 0.5 : 1)) * 20;
  };

  const getTranslateY = (index: number) => {
    if (!isHovered) return 0;
    if (mediaCount === 1) return -5;
    return index === 0 ? -10 : index === 1 ? -5 : 0;
  };

  const getScale = (index: number) => {
    if (!isHovered) return 1;
    return mediaCount === 1 ? 1 : 0.95 + index * 0.02;
  };

  return (
    <InfoCardImageContext.Provider value={{ handleMediaLoad, setAllImagesLoaded }}>
      <motion.div
        className={cn("relative mt-2 rounded-md", className)}
        animate={{
          height: media.length > 0 ? (isHovered ? expandHeight : shrinkHeight) : "auto",
        }}
        style={{ overflow: isOverflowVisible ? "visible" : "hidden" }}
        transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.3 }}
      >
        {/* Height belongs in `style`. Upstream passed `{ height: shrinkHeight }`
            to `cn`, where clsx turns object keys into class names and this
            became a bare `height` class that does nothing. */}
        <div className="relative" style={media.length > 0 ? { height: shrinkHeight } : undefined}>
          {displayMedia.map((item, index) => {
            const { type, src, alt, className: itemClassName, ...mediaProps } = item;

            return (
              <motion.div
                key={src}
                className="absolute w-full"
                animate={{
                  rotateZ: getRotation(index),
                  x: getTranslateX(index),
                  y: getTranslateY(index),
                  scale: getScale(index),
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                {type === "video" ? (
                  <video
                    src={src}
                    className={cn(
                      "w-full rounded-md border border-slate-200 object-cover shadow-lg dark:border-stone-700",
                      itemClassName,
                    )}
                    onLoadedData={() => handleMediaLoad(src)}
                    preload="metadata"
                    muted
                    playsInline
                    {...mediaProps}
                  />
                ) : (
                  <img
                    src={src}
                    alt={alt}
                    className={cn(
                      "w-full rounded-md border border-slate-200 object-cover shadow-lg dark:border-stone-700",
                      itemClassName,
                    )}
                    onLoad={() => handleMediaLoad(src)}
                    loading={loading}
                    {...mediaProps}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Scrim fading the stack into the card. Needs the dark variant or it
            paints a white band across the bottom of a dark card. */}
        <motion.div
          className="pointer-events-none absolute right-0 bottom-0 left-0 h-10 bg-gradient-to-b from-transparent to-white dark:to-stone-900"
          animate={{ opacity: isHovered ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, duration: 0.3 }}
        />
      </motion.div>
    </InfoCardImageContext.Provider>
  );
};

export {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardContent,
  InfoCardMedia,
  InfoCardFooter,
  InfoCardDismiss,
  InfoCardAction,
};
