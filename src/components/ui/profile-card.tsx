"use client";

import type { ReactNode } from "react";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { PulseIconButton } from "@/components/ui/pulse-icon-button";
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
  /** A photograph, if there ever is one. Otherwise the logo, pulsing. */
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
        // Padding pulled in a little: at p-7 the copy sat a long way off the
        // card's edges and the whole thing read as roomier than it needed to be.
        "group/card relative rounded-3xl bg-white p-5 transition-all duration-500",
        "shadow-[12px_12px_24px_rgba(79,70,229,0.10),-12px_-12px_24px_rgba(255,255,255,0.9)]",
        "hover:shadow-[20px_20px_40px_rgba(79,70,229,0.16),-20px_-20px_40px_rgba(255,255,255,1)]",
        "dark:bg-[#1b1630]",
        "dark:shadow-[12px_12px_24px_rgba(0,0,0,0.45),-12px_-12px_24px_rgba(255,255,255,0.04)]",
        "dark:hover:shadow-[20px_20px_40px_rgba(0,0,0,0.6),-20px_-20px_40px_rgba(255,255,255,0.07)]",
        // The lift is the tilt's job when tilting; doing both reads as a wobble.
        !tilt && "hover:-translate-y-2",
        className,
      )}
    >
      <div className="mb-5 flex justify-center">
        {avatarSrc ? (
          <div
            className={cn(
              "h-24 w-24 overflow-hidden rounded-full bg-white p-3 transition-all duration-500 group-hover/card:scale-110",
              "shadow-[inset_6px_6px_12px_rgba(79,70,229,0.10),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]",
              "dark:bg-[#231c3c]",
              "dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.5),inset_-6px_-6px_12px_rgba(255,255,255,0.05)]",
            )}
          >
            <img
              src={avatarSrc}
              alt={name}
              className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
          </div>
        ) : (
          /* The logo, with rings pulsing off it, spinning when you point at it.
             Decoration rather than a control: `interactive={false}` keeps it out
             of the accessibility tree instead of announcing a button that does
             nothing. The near-black shell the component ships with would be a
             hole in the middle of a white card, so it wears the card's own
             recessed well instead, and the rings are tinted indigo because white
             rings on white paper are invisible. */
          <PulseIconButton
            icon={<BlueberryMark />}
            size="md"
            interactive={false}
            animateOn="group-hover"
            className={cn(
              "border-transparent bg-none shadow-none",
              "bg-white dark:bg-[#231c3c]",
              "shadow-[inset_6px_6px_12px_rgba(79,70,229,0.10),inset_-6px_-6px_12px_rgba(255,255,255,0.9)]",
              "dark:shadow-[inset_6px_6px_12px_rgba(0,0,0,0.5),inset_-6px_-6px_12px_rgba(255,255,255,0.05)]",
            )}
            ringClassName="border-indigo-400/45 dark:border-violet-400/40"
          />
        )}
      </div>

      <div className="text-center transition-transform duration-300 group-hover/card:-translate-y-1">
        <h3 className="title-face text-xl text-slate-900 transition-colors duration-300 group-hover/card:text-indigo-600 dark:text-stone-100 dark:group-hover/card:text-violet-300">
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
                "inline-block rounded-full bg-white px-3 py-1 text-[0.7rem] font-semibold text-indigo-600",
                "transition-all duration-300 group-hover/card:scale-105",
                // Its own hover, on top of the card's. Pointing at a tag lifts
                // that one out of the row rather than moving the pair together,
                // so each reads as a thing in its own right.
                "hover:!scale-115 hover:-translate-y-0.5 hover:px-4",
                "shadow-[2px_2px_4px_rgba(79,70,229,0.10),-2px_-2px_4px_rgba(255,255,255,0.9)]",
                "hover:shadow-[4px_4px_10px_rgba(79,70,229,0.18),-4px_-4px_10px_rgba(255,255,255,1)]",
                "dark:bg-[#231c3c] dark:text-violet-300",
                "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.05)]",
                "dark:hover:shadow-[4px_4px_10px_rgba(0,0,0,0.55),-4px_-4px_10px_rgba(255,255,255,0.08)]",
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
        className="pointer-events-none absolute inset-0 rounded-3xl border border-indigo-200 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 dark:border-violet-400/30"
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
