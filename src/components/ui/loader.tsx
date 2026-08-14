"use client";

import { cn } from "@/lib/utils";

/**
 * Twelve loaders, one import. Keyframes live in `index.css`.
 *
 * Three changes from the version this came from.
 *
 * Every element is a `span`, never a `div`. A loader's whole job is to sit
 * next to something — inside a sentence, inside a button, inside a status
 * line — and a `div` in any of those is invalid markup that React warns about
 * and the browser silently reshuffles. This bit immediately: the first status
 * line built with one threw a hydration error.
 *
 * Every loader carries `data-loader`, which the reduced-motion rule in the
 * stylesheet hooks onto — a spinner that stops dead reads as a hang, so those
 * slow to a crawl rather than freezing.
 *
 * And the bare `sr-only` "Loading" is now a live region carrying the real
 * message, because "Loading" announced with no idea of what or when it ended is
 * barely better than silence.
 */

export type LoaderVariant =
  | "circular"
  | "classic"
  | "pulse"
  | "pulse-dot"
  | "dots"
  | "typing"
  | "wave"
  | "bars"
  | "terminal"
  | "text-blink"
  | "text-shimmer"
  | "loading-dots";

export type LoaderSize = "sm" | "md" | "lg";

export interface LoaderProps {
  variant?: LoaderVariant;
  size?: LoaderSize;
  /** Shown by the text variants, and announced by all of them. */
  text?: string;
  className?: string;
}

/** Announced politely — never interrupts what is already being read. */
function Announce({ text = "Loading" }: { text?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {text}
    </span>
  );
}

const BOX: Record<LoaderSize, string> = { sm: "size-4", md: "size-5", lg: "size-6" };
const TEXT: Record<LoaderSize, string> = { sm: "text-xs", md: "text-sm", lg: "text-base" };
const TRACK: Record<LoaderSize, string> = { sm: "h-4", md: "h-5", lg: "h-6" };

export function CircularLoader({ className, size = "md", text }: LoaderProps) {
  return (
    <span
      data-loader
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-primary border-t-transparent",
        BOX[size],
        className,
      )}
    >
      <Announce text={text} />
    </span>
  );
}

export function ClassicLoader({ className, size = "md", text }: LoaderProps) {
  const bar = {
    sm: { height: "6px", width: "1.5px", offset: "-0.75px", origin: "0.75px 10px" },
    md: { height: "8px", width: "2px", offset: "-1px", origin: "1px 12px" },
    lg: { height: "10px", width: "2.5px", offset: "-1.25px", origin: "1.25px 14px" },
  }[size];

  return (
    <span data-loader className={cn("relative inline-block", BOX[size], className)}>
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="absolute block rounded-full bg-primary [animation:spinner-fade_1.2s_linear_infinite]"
          style={{
            top: 0,
            left: "50%",
            marginLeft: bar.offset,
            transformOrigin: bar.origin,
            transform: `rotate(${i * 30}deg)`,
            opacity: 0,
            animationDelay: `${i * 0.1}s`,
            height: bar.height,
            width: bar.width,
          }}
        />
      ))}
      <Announce text={text} />
    </span>
  );
}

export function PulseLoader({ className, size = "md", text }: LoaderProps) {
  return (
    <span data-loader className={cn("relative inline-block", BOX[size], className)}>
      <span className="absolute inset-0 rounded-full border-2 border-primary [animation:thin-pulse_1.5s_ease-in-out_infinite]" />
      <Announce text={text} />
    </span>
  );
}

export function PulseDotLoader({ className, size = "md", text }: LoaderProps) {
  const dot = { sm: "size-1", md: "size-2", lg: "size-3" }[size];
  return (
    <span
      data-loader
      className={cn(
        "inline-block rounded-full bg-primary [animation:pulse-dot_1.2s_ease-in-out_infinite]",
        dot,
        className,
      )}
    >
      <Announce text={text} />
    </span>
  );
}

export function DotsLoader({ className, size = "md", text }: LoaderProps) {
  const dot = { sm: "size-1.5", md: "size-2", lg: "size-2.5" }[size];
  return (
    <span data-loader className={cn("inline-flex items-center gap-1", TRACK[size], className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "block rounded-full bg-primary [animation:bounce-dots_1.4s_ease-in-out_infinite]",
            dot,
          )}
          style={{ animationDelay: `${i * 160}ms` }}
        />
      ))}
      <Announce text={text} />
    </span>
  );
}

export function TypingLoader({ className, size = "md", text }: LoaderProps) {
  const dot = { sm: "size-1", md: "size-1.5", lg: "size-2" }[size];
  return (
    <span data-loader className={cn("inline-flex items-center gap-1", TRACK[size], className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("block rounded-full bg-primary [animation:typing_1s_infinite]", dot)}
          style={{ animationDelay: `${i * 250}ms` }}
        />
      ))}
      <Announce text={text} />
    </span>
  );
}

export function WaveLoader({ className, size = "md", text }: LoaderProps) {
  const width = size === "lg" ? "w-1" : "w-0.5";
  const heights = {
    sm: ["6px", "9px", "12px", "9px", "6px"],
    md: ["8px", "12px", "16px", "12px", "8px"],
    lg: ["10px", "15px", "20px", "15px", "10px"],
  }[size];

  return (
    <span data-loader className={cn("inline-flex items-center gap-0.5", TRACK[size], className)}>
      {heights.map((height, i) => (
        <span
          key={i}
          className={cn("block rounded-full bg-primary [animation:wave_1s_ease-in-out_infinite]", width)}
          style={{ animationDelay: `${i * 100}ms`, height }}
        />
      ))}
      <Announce text={text} />
    </span>
  );
}

export function BarsLoader({ className, size = "md", text }: LoaderProps) {
  const width = { sm: "w-1", md: "w-1.5", lg: "w-2" }[size];
  const box = { sm: "h-4 gap-1", md: "h-5 gap-1.5", lg: "h-6 gap-2" }[size];
  return (
    <span data-loader className={cn("inline-flex", box, className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("block h-full bg-primary [animation:wave-bars_1.2s_ease-in-out_infinite]", width)}
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
      <Announce text={text} />
    </span>
  );
}

export function TerminalLoader({ className, size = "md", text }: LoaderProps) {
  const cursor = { sm: "h-3 w-1.5", md: "h-4 w-2", lg: "h-5 w-2.5" }[size];
  return (
    <span data-loader className={cn("inline-flex items-center gap-1", TRACK[size], className)}>
      <span className={cn("font-mono text-primary", TEXT[size])}>{">"}</span>
      <span className={cn("block bg-primary [animation:blink_1s_step-end_infinite]", cursor)} />
      <Announce text={text} />
    </span>
  );
}

export function TextBlinkLoader({ text = "Thinking", className, size = "md" }: LoaderProps) {
  return (
    <span
      data-loader
      className={cn(
        "inline-block font-medium [animation:text-blink_2s_ease-in-out_infinite]",
        TEXT[size],
        className,
      )}
    >
      {text}
      <Announce text={text} />
    </span>
  );
}

export function TextShimmerLoader({ text = "Thinking", className, size = "md" }: LoaderProps) {
  return (
    <span
      data-loader
      className={cn(
        "inline-block bg-[linear-gradient(to_right,var(--muted-foreground)_40%,var(--foreground)_60%,var(--muted-foreground)_80%)]",
        // `[background-size:…]` rather than a `bg-size-*` utility: the arbitrary
        // property form is unambiguous and does not depend on which Tailwind
        // minor introduced the shorthand.
        "bg-clip-text font-medium text-transparent [background-size:200%_auto]",
        "[animation:shimmer_4s_infinite_linear]",
        TEXT[size],
        className,
      )}
    >
      {text}
      <Announce text={text} />
    </span>
  );
}

export function TextDotsLoader({ text = "Thinking", className, size = "md" }: LoaderProps) {
  return (
    <span data-loader className={cn("inline-flex items-center", className)}>
      <span className={cn("font-medium text-primary", TEXT[size])}>{text}</span>
      <span aria-hidden className={cn("inline-flex text-primary", TEXT[size])}>
        {[0.2, 0.4, 0.6].map((delay) => (
          <span key={delay} style={{ animation: `loading-dots 1.4s infinite ${delay}s` }}>
            .
          </span>
        ))}
      </span>
      <Announce text={text} />
    </span>
  );
}

export function Loader({ variant = "circular", ...rest }: LoaderProps) {
  switch (variant) {
    case "classic":
      return <ClassicLoader {...rest} />;
    case "pulse":
      return <PulseLoader {...rest} />;
    case "pulse-dot":
      return <PulseDotLoader {...rest} />;
    case "dots":
      return <DotsLoader {...rest} />;
    case "typing":
      return <TypingLoader {...rest} />;
    case "wave":
      return <WaveLoader {...rest} />;
    case "bars":
      return <BarsLoader {...rest} />;
    case "terminal":
      return <TerminalLoader {...rest} />;
    case "text-blink":
      return <TextBlinkLoader {...rest} />;
    case "text-shimmer":
      return <TextShimmerLoader {...rest} />;
    case "loading-dots":
      return <TextDotsLoader {...rest} />;
    default:
      return <CircularLoader {...rest} />;
  }
}

export default Loader;
