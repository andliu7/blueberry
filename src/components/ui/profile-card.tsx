"use client";

import type { ReactNode } from "react";
import { MOTIF_VIEWBOX, motifMarkup, type ArtMotif } from "@/data/testimonialArt";
import { TiltCard } from "@/components/ui/be-ui-tilt-card";
import { useIsDark } from "@/lib/useIsDark";
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
 *    so nothing can 404, so the avatar is drawn from `testimonialArt` by default.
 * 4. **The social furniture is gone.** An online dot, a verified star and a
 *    follower count are for a network with accounts in it. What is left is the
 *    part that was actually wanted: a face, a name, a role, tags, and room for
 *    something to read.
 * 5. Blue and gray became the site's indigo and stone, so the card belongs to
 *    the same page as everything around it.
 * 6. **The hover group is named.** Upstream used a bare `group` on the card, and
 *    Tailwind's `group-hover:` matches *any* ancestor carrying that class. The
 *    expanding pills in `actions` have their own `group`, so hovering anywhere on
 *    the card was firing their labels while leaving the pills themselves the
 *    width of a circle, since the width is a plain `hover:` on the button. A
 *    named `group/card` scopes the card's own hover to the card's own effects.
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
  /** Tracks the pointer and leans toward it, like the deck and folder cards. */
  tilt?: boolean;
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
  tilt = false,
  className,
}: ProfileCardProps) {
  const isDark = useIsDark();

  const card = (
    <div
      className={cn(
        "group/card relative rounded-3xl bg-white p-7 transition-all duration-500",
        "shadow-[12px_12px_24px_rgba(79,70,229,0.10),-12px_-12px_24px_rgba(255,255,255,0.9)]",
        "hover:shadow-[20px_20px_40px_rgba(79,70,229,0.16),-20px_-20px_40px_rgba(255,255,255,1)]",
        "dark:bg-stone-900",
        "dark:shadow-[12px_12px_24px_rgba(0,0,0,0.45),-12px_-12px_24px_rgba(255,255,255,0.04)]",
        "dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.6),-20px_-20px_40px_rgba(255,255,255,0.07)]",
        // The lift is the tilt's job when tilting; doing both reads as a wobble.
        !tilt && "hover:-translate-y-2",
        className,
      )}
    >
      <div className="mb-5 flex justify-center">
        <div className="relative">
          <div
            className={cn(
              "h-24 w-24 overflow-hidden rounded-full bg-white p-3 transition-all duration-500 group-hover/card:scale-110",
              "shadow-[inset_6px_6px_12px_rgba(79,70,229,0.10),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]",
              "dark:bg-stone-800",
              "dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.5),inset_-6px_-6px_12px_rgba(255,255,255,0.05)]",
            )}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={name}
                className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover/card:scale-105"
              />
            ) : (
              <svg
                aria-hidden
                viewBox={MOTIF_VIEWBOX}
                className="h-full w-full text-indigo-500 transition-transform duration-500 group-hover/card:scale-105 dark:text-amber-200/80"
                dangerouslySetInnerHTML={{ __html: motifMarkup(motif) }}
              />
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-indigo-400/70 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 dark:border-amber-200/50"
          />
        </div>
      </div>

      <div className="text-center transition-transform duration-300 group-hover/card:-translate-y-1">
        <h3 className="title-face text-xl text-slate-900 transition-colors duration-300 group-hover/card:text-indigo-600 dark:text-stone-100 dark:group-hover/card:text-amber-200">
          {name}
        </h3>
        <p className="mt-1 font-mono text-[0.68rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
          {role}
        </p>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-block rounded-full bg-white px-3 py-1 text-[0.7rem] font-semibold text-indigo-600 transition-all duration-300 group-hover/card:scale-105",
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

      {/* The site's sans at a small size rather than the handwritten face. This
          is the paragraph that introduces the person, and it is read once by
          people who do not know them. */}
      {children && (
        <div className="mt-6 space-y-3 text-[0.83rem] leading-relaxed text-slate-600 dark:text-stone-300">
          {children}
        </div>
      )}

      {actions && <div className="mt-6 flex justify-center gap-3">{actions}</div>}

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl border border-indigo-200 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 dark:border-amber-200/25"
      />
    </div>
  );

  if (!tilt) return card;

  // `!overflow-visible`: TiltCard clips by default, and this card's whole look is
  // a pair of shadows thrown well outside its own box.
  return (
    <TiltCard
      max={7}
      glareColor={isDark ? "rgba(255,255,255,0.55)" : "rgba(99,102,241,0.45)"}
      className="rounded-3xl !overflow-visible"
    >
      {card}
    </TiltCard>
  );
}

export default ProfileCard;
