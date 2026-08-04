"use client";

import type { ReactNode } from "react";
import { MOTIF_VIEWBOX, motifMarkup, type ArtMotif } from "@/data/testimonialArt";
import { cn } from "@/lib/utils";

/**
 * A soft-shadowed card that introduces a person.
 *
 * Adapted from the supplied component. What changed and why:
 *
 * 1. **It is not called `info-card`.** That name is already taken by the folder
 *    cards on the hub, and dropping this in under the supplied filename would
 *    have replaced them.
 * 2. **The demo wrapper is gone**, along with its `<style jsx>` block. That is
 *    Next.js syntax; in a plain React and Vite project it renders the CSS as
 *    visible text on the page. The animated grid backdrop went with it, since
 *    this card sits on a page that already has a background.
 * 3. **No remote avatar.** The original pointed at an image on imagekit.io. Every
 *    illustration on this site is a hand-written SVG held as a string precisely
 *    so nothing can 404, and the flask mascot already exists, so the avatar is
 *    drawn from `testimonialArt` by default.
 * 4. **The social furniture is gone.** An online dot, a verified star and a
 *    follower count are for a network with accounts in it. What is left is the
 *    part that was actually wanted: a face, a name, a role, tags, and room for
 *    something to read.
 * 5. Blue and gray became the site's indigo and stone, so the card belongs to
 *    the same page as everything around it.
 *
 * The neumorphic shadows are the reason to use this at all, and they are kept
 * exactly: paired light and dark offsets that deepen on hover while the card
 * lifts.
 */

export interface ProfileCardProps {
  name: string;
  role: string;
  /** Defaults to the site's flask mascot. */
  motif?: ArtMotif;
  /** A photograph, if there ever is one. Takes precedence over the motif. */
  avatarSrc?: string;
  tags?: string[];
  /** The body of the card. */
  children?: ReactNode;
  /** Buttons or links along the bottom edge. */
  actions?: ReactNode;
  className?: string;
}

export function ProfileCard({
  name,
  role,
  motif = "mascot",
  avatarSrc,
  tags = [],
  children,
  actions,
  className,
}: ProfileCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-white p-7 transition-all duration-500",
        "shadow-[12px_12px_24px_rgba(79,70,229,0.10),-12px_-12px_24px_rgba(255,255,255,0.9)]",
        "hover:-translate-y-2 hover:shadow-[20px_20px_40px_rgba(79,70,229,0.16),-20px_-20px_40px_rgba(255,255,255,1)]",
        "dark:bg-stone-900",
        "dark:shadow-[12px_12px_24px_rgba(0,0,0,0.45),-12px_-12px_24px_rgba(255,255,255,0.04)]",
        "dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.6),-20px_-20px_40px_rgba(255,255,255,0.07)]",
        className,
      )}
    >
      <div className="mb-5 flex justify-center">
        <div className="relative">
          <div
            className={cn(
              "h-28 w-28 overflow-hidden rounded-full bg-white p-3 transition-all duration-500 group-hover:scale-110",
              "shadow-[inset_6px_6px_12px_rgba(79,70,229,0.10),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]",
              "dark:bg-stone-800",
              "dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.5),inset_-6px_-6px_12px_rgba(255,255,255,0.05)]",
            )}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={name}
                className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <svg
                aria-hidden
                viewBox={MOTIF_VIEWBOX}
                className="h-full w-full text-indigo-500 transition-transform duration-500 group-hover:scale-105 dark:text-amber-200/80"
                dangerouslySetInnerHTML={{ __html: motifMarkup(motif) }}
              />
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-indigo-400/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:border-amber-200/50"
          />
        </div>
      </div>

      <div className="text-center transition-transform duration-300 group-hover:-translate-y-1">
        <h3 className="title-face text-2xl text-slate-900 transition-colors duration-300 group-hover:text-indigo-600 dark:text-stone-100 dark:group-hover:text-amber-200">
          {name}
        </h3>
        <p className="mt-1 font-mono text-xs tracking-wider text-slate-400 uppercase dark:text-stone-500">
          {role}
        </p>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-600 transition-all duration-300 group-hover:scale-105",
                "shadow-[2px_2px_4px_rgba(79,70,229,0.10),-2px_-2px_4px_rgba(255,255,255,0.9)]",
                "dark:bg-stone-800 dark:text-amber-200",
                "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.05)]",
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {children && (
        <div className="playful-face mt-6 space-y-4 text-base leading-relaxed text-slate-600 dark:text-stone-300">
          {children}
        </div>
      )}

      {actions && <div className="mt-7 flex justify-center gap-3">{actions}</div>}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl border border-indigo-200 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:border-amber-200/25"
      />
    </div>
  );
}

export default ProfileCard;
