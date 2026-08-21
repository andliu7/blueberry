import * as React from "react";
import {
  type HTMLMotionProps,
  type MotionValue,
  type Variants,
  motion,
  useMotionTemplate,
  useScroll,
  useTransform,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Scroll-driven reveal primitives.
 *
 * As supplied, minus `HeroVideo` and `HeroButton`. There is no video here, and
 * the button hardcoded a lime glow that belongs to whatever site it came from.
 *
 * `motion` is already a dependency, so nothing new is installed. The upstream
 * note to install `motion` is only relevant to a project that lacks it.
 */

interface ContainerScrollContextValue {
  scrollYProgress: MotionValue<number>;
}

interface ContainerInsetProps extends HTMLMotionProps<"div"> {
  insetYRange?: [number, number];
  insetXRange?: [number, number];
  roundednessRange?: [number, number];
}

const SPRING_TRANSITION_CONFIG = {
  type: "spring" as const,
  stiffness: 100,
  damping: 16,
  mass: 0.75,
  restDelta: 0.005,
};

const variants: Variants = {
  hidden: { filter: "blur(10px)", opacity: 0 },
  visible: { filter: "blur(0px)", opacity: 1 },
};

const ContainerScrollContext = React.createContext<ContainerScrollContextValue | undefined>(
  undefined,
);

function useContainerScrollContext() {
  const context = React.useContext(ContainerScrollContext);
  if (!context) {
    throw new Error("useContainerScrollContext must be used within a ContainerScroll");
  }
  return context;
}

export const ContainerScroll: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  return (
    <ContainerScrollContext.Provider value={{ scrollYProgress }}>
      <div ref={scrollRef} className={cn("relative min-h-svh w-full", className)} {...props}>
        {children}
      </div>
    </ContainerScrollContext.Provider>
  );
};
ContainerScroll.displayName = "ContainerScroll";

interface ContainerAnimatedProps extends HTMLMotionProps<"div"> {
  inputRange?: number[];
  outputRange?: number[];
}

export const ContainerAnimated = React.forwardRef<HTMLDivElement, ContainerAnimatedProps>(
  (
    { className, transition, style, inputRange = [0.2, 0.8], outputRange = [80, 0], ...props },
    ref,
  ) => {
    const { scrollYProgress } = useContainerScrollContext();
    const y = useTransform(scrollYProgress, inputRange, outputRange);
    return (
      <motion.div
        ref={ref}
        className={cn("", className)}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        style={{ y, ...style }}
        transition={{ ...SPRING_TRANSITION_CONFIG, ...transition }}
        {...props}
      />
    );
  },
);
ContainerAnimated.displayName = "ContainerAnimated";

interface ContainerFadeProps extends HTMLMotionProps<"div"> {
  inputRange?: number[];
  outputRange?: number[];
}

/**
 * Scroll-driven opacity, sibling to ContainerAnimated's scroll-driven y.
 *
 * Built for the hero window's interior: at rest the shader art was the
 * loudest object on the screen and a blind panel scored it as decoration
 * out-shouting the action, but killing it outright throws away the scroll
 * gesture the window exists for. So the art starts almost extinguished and
 * blooms as the visitor opens the window - the quiet first paint and the
 * reveal both survive.
 */
export const ContainerFade = React.forwardRef<HTMLDivElement, ContainerFadeProps>(
  ({ className, style, inputRange = [0, 0.5], outputRange = [0.12, 1], ...props }, ref) => {
    const { scrollYProgress } = useContainerScrollContext();
    const opacity = useTransform(scrollYProgress, inputRange, outputRange);
    return <motion.div ref={ref} className={className} style={{ opacity, ...style }} {...props} />;
  },
);
ContainerFade.displayName = "ContainerFade";

export const ContainerSticky = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("sticky top-0 left-0 min-h-svh w-full", className)} {...props} />
  ),
);
ContainerSticky.displayName = "ContainerSticky";

/** Opens a clipped window outward as you scroll, from a rounded slot to full bleed. */
export const ContainerInset = React.forwardRef<HTMLDivElement, ContainerInsetProps>(
  (
    {
      className,
      style,
      insetYRange = [45, 0],
      insetXRange = [45, 0],
      roundednessRange = [1000, 16],
      ...props
    },
    ref,
  ) => {
    const { scrollYProgress } = useContainerScrollContext();
    const insetY = useTransform(scrollYProgress, [0, 0.8], insetYRange);
    const insetX = useTransform(scrollYProgress, [0, 0.8], insetXRange);
    const roundedness = useTransform(scrollYProgress, [0, 1], roundednessRange);
    const clipPath = useMotionTemplate`inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${roundedness}px)`;

    return (
      <motion.div
        ref={ref}
        // Upstream spelled this "relateive", which silently did nothing.
        className={cn("pointer-events-none relative overflow-hidden", className)}
        style={{ clipPath, ...style }}
        {...props}
      />
    );
  },
);
ContainerInset.displayName = "ContainerInset";

/** The 0 to 1 scroll progress of the nearest ContainerScroll. */
export function useScrollProgress() {
  return useContainerScrollContext().scrollYProgress;
}
