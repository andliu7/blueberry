"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A lesson section as a photograph you click into.
 *
 * The sidebar is a good index and a poor front door: twelve words in a column
 * tell you the course has twelve sections and nothing about any of them. A wall
 * of banners gives each one a face, which is what makes a course feel like
 * somewhere to arrive rather than a list to work through.
 *
 * The photograph is decoration, so it carries `alt=""` and `aria-hidden`. The
 * accessible name comes from the heading, and describing a misty forest to
 * somebody who cannot see it adds noise to a link whose actual meaning is
 * "Alcohols and ethers".
 */

export interface TopicBannerProps {
  id: string;
  label: string;
  blurb: string;
  /** Path under BASE_URL, e.g. "backgrounds/forest-misty-forest.webp". */
  image?: string;
  /** How many reactions sit under this section. */
  count?: number;
  onSelect: (id: string) => void;
  className?: string;
}

export function TopicBanner({
  id,
  label,
  blurb,
  image,
  count,
  onSelect,
  className,
}: TopicBannerProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "group relative flex min-h-40 w-full flex-col justify-end overflow-hidden rounded-2xl text-left",
        "border border-slate-200 dark:border-stone-800",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        // Transform only, so hovering never reflows the grid around it.
        "transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {image ? (
        <img
          src={import.meta.env.BASE_URL + image}
          alt=""
          aria-hidden
          loading="lazy"
          /* Dimensions declared so the grid does not jump as each one decodes.
             The box is fixed by the layout; these only give it an aspect to
             reserve. */
          width={640}
          height={360}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-fuchsia-600" />
      )}

      {/* A scrim, not a tint. White text over an arbitrary photograph is a
          contrast bet you lose on the bright ones, and a gradient that is
          strongest exactly where the words sit costs nothing in the clear
          part of the image. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-950/10"
      />

      <div className="relative p-4">
        <h3 className="flex items-center gap-1.5 text-lg font-semibold leading-tight text-white">
          {label}
          <ArrowRight className="size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:opacity-100" />
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-snug text-white/80">{blurb}</p>
        {count !== undefined && count > 0 && (
          <p className="mt-2 font-mono text-xs text-white/60">
            {count} {count === 1 ? "reaction" : "reactions"}
          </p>
        )}
      </div>
    </button>
  );
}

export default TopicBanner;
