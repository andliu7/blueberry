"use client";

import { useCallback, useState, type ReactNode } from "react";
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
  /**
   * A plain string is a label. Give it an `href` and it becomes a link out, and
   * an `icon` and that sits alongside the text.
   */
  tags?: (string | { label: string; href?: string; icon?: ReactNode })[];
  /** The body of the card. */
  children?: ReactNode;
  /** Buttons or links along the bottom edge. */
  actions?: ReactNode;
  /** Tracks the pointer and leans toward it, like the deck and folder cards. */
  tilt?: boolean;
  /** A violet halo that follows the cursor across the card. */
  glow?: boolean;
  /**
   * Makes the name a way in to somewhere, with nothing about it saying so.
   *
   * No underline, no cursor change, no hover colour beyond the one the whole
   * card already does. That is the point: it leads to a staff sign-in, and a
   * visible affordance would invite every visitor to try a door that is going to
   * refuse them.
   */
  nameHref?: string;
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
  glow = true,
  nameHref,
  className,
}: ProfileCardProps) {
  const isDark = useIsDark();

  /**
   * The halo, as a background layer rather than an overlay.
   *
   * An absolutely positioned glow would paint on top of the card's contents,
   * because positioned elements outrank static ones no matter the DOM order, and
   * fixing that means wrapping every child in its own stacking context. A
   * background image always paints above the background colour and below the
   * content, which is exactly where a glow belongs, and it costs no extra DOM.
   *
   * Null when the pointer is away, so a card nobody is pointing at carries no
   * gradient at all. The radial falloff means it fades in from nothing at
   * whichever edge the cursor crosses, which is why this needs no transition:
   * background-image is not an interpolatable property anyway.
   */
  const [halo, setHalo] = useState<string | undefined>(undefined);

  const trackGlow = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!glow) return;
      const box = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      // Violet in both themes, lifted and slightly stronger on dark where the
      // card it sits on is much closer to the halo's own value.
      const tint = isDark ? "rgba(167,139,250,0.20)" : "rgba(139,92,246,0.16)";
      setHalo(`radial-gradient(240px circle at ${x}px ${y}px, ${tint}, transparent 72%)`);
    },
    [glow, isDark],
  );

  const card = (
    <div
      onPointerMove={trackGlow}
      onPointerLeave={() => setHalo(undefined)}
      style={{ backgroundImage: halo }}
      className={cn(
        // Padding pulled in a little: at p-7 the copy sat a long way off the
        // card's edges and the whole thing read as roomier than it needed to be.
        //
        // `shine-border` is the contact form's travelling rim, reused here so
        // the two cards behave the same way when you point at them.
        "group/card shine-border relative rounded-3xl bg-white p-5 transition-all duration-500",
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
            // The glow follows the berry's silhouette rather than boxing it,
            // which a box-shadow on an SVG would.
            icon={
              <BlueberryMark className="blueberry-glow-art h-full w-full transition-[filter] duration-300" />
            }
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
          {nameHref ? (
            // `cursor-text` rather than the default pointer, and no focus ring:
            // this is meant to look like the heading it replaced. Still reachable
            // by keyboard, which is what keeps it an anchor rather than a click
            // handler on the h3.
            <a href={nameHref} className="cursor-text outline-none">
              {name}
            </a>
          ) : (
            name
          )}
        </h3>
        <p className="mt-1 font-mono text-[0.68rem] tracking-wider text-slate-400 uppercase dark:text-stone-500">
          {role}
        </p>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {tags.map((raw) => {
            const tag = typeof raw === "string" ? { label: raw } : raw;
            const className = cn(
              "blueberry-glow inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1",
              "text-[0.7rem] font-semibold text-indigo-600 outline-none",
              "transition-all duration-300 group-hover/card:scale-105",
              // Its own hover, on top of the card's, so pointing at one lifts it
              // out of the row rather than moving the pair together.
              "hover:!scale-110 hover:-translate-y-0.5",
              "shadow-[2px_2px_4px_rgba(79,70,229,0.10),-2px_-2px_4px_rgba(255,255,255,0.9)]",
              "dark:bg-[#231c3c] dark:text-violet-300",
              "dark:shadow-[2px_2px_4px_rgba(0,0,0,0.4),-2px_-2px_4px_rgba(255,255,255,0.05)]",
            );

            /**
             * With an icon the tag runs the other way to the profile pills:
             * the word is what you see at rest and it collapses into the mark
             * when you point at it, rather than a mark widening into a word.
             *
             * The two are stacked in a grid cell rather than swapped, so the
             * pill never reflows mid-transition and there is nothing to catch
             * the eye but the crossfade itself.
             */
            const inner = tag.icon ? (
              <span className="grid place-items-center [&>*]:col-start-1 [&>*]:row-start-1">
                <span className="transition-all duration-300 group-hover/cs:scale-75 group-hover/cs:opacity-0">
                  {tag.label}
                </span>
                <span className="scale-50 opacity-0 transition-all duration-300 group-hover/cs:scale-100 group-hover/cs:opacity-100">
                  {tag.icon}
                </span>
              </span>
            ) : (
              tag.label
            );

            return tag.href ? (
              <a
                key={tag.label}
                href={tag.href}
                target="_blank"
                rel="noreferrer"
                className={cn(className, "group/cs")}
              >
                {inner}
              </a>
            ) : (
              <span key={tag.label} className={className}>
                {inner}
              </span>
            );
          })}
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
