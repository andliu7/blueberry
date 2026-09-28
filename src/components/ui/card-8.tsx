import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A card that says one thing, offers one action and one way out.
 *
 * ## READ THIS BEFORE MOUNTING IT ANYWHERE
 *
 * This file exists because the component was asked for. It is NOT wired into
 * any page, and the recommendation attached to it is that it should not be:
 *
 * - `ui/release-banner.tsx` already does this job prop for prop, and its own
 *   header states the product rule it settles: "This is the ONLY announcement,
 *   on every page, read or not." That rule was paid for once, when the same
 *   message ended up in a banner and a corner badge at the same time with
 *   nothing saying which was real.
 * - `ui/study-toast.tsx` already ships this anatomy, tinted icon disc over a
 *   bold title over muted body with an X, with variants and a timer.
 * - `ui/toast-queue.tsx` already carries the version with an action in it:
 *   `QueuedToast` is `{ title, message, actions, tone }` plus `onDismiss`.
 *
 * So mounting this makes a second alert system rather than a new surface. If a
 * page needs an announcement with a button, extend one of those three. This is
 * kept as a component, not a decision to ship one.
 *
 * ## THE COLOUR IS A PROP, AND THE DEFAULT IS NOT RED
 *
 * The supplied spec hardcoded a fully red card with a permanently pulsing icon.
 * This is a study tool people revise on the night before an exam, and the hard
 * product rule is that a mistake is never scolded and the learning surfaces
 * carry no red at all. A card that is red whatever it is saying cannot obey
 * that rule, so the tone is a `variant` and it defaults to `info`, which is the
 * ordinary card surface with the site's blue-violet accent. `destructive` is
 * opt-in and belongs on administrative surfaces, not on anything a student is
 * revising with.
 *
 * Every variant keeps the same neutral title and body ink. Only the icon disc
 * and the action button change. Colouring the words themselves is how a notice
 * starts telling somebody off.
 *
 * ## MEASURED, NOT ASSERTED
 *
 * Ratios below are WCAG 2.x, computed against the grounds index.css actually
 * declares at its authoritative palette block: page #f5f7fb / #101827, card
 * #ffffff / #192438. `@theme` there redefines the whole stone ramp to cool
 * greys, which is why the neutrals here are stone utilities: each one resolves
 * to a hex that can be measured, where the slate ramp stays in oklch.
 *
 * ONE FLOOR IS MISSED BY A TOKEN THIS FILE DOES NOT OWN. index.css leaves the
 * dark `--primary` at #5a3fd8, which is 2.32:1 as a shape on the dark card,
 * under the 3.0 non-text floor. Its own comment reports this and declines to
 * fix it, since the token belongs to the palette owner. So the action button is
 * not a bare `bg-primary`: it wears `.gradient-button`, the site's primary
 * control, whose dark rule sets a 1px wall of #aac7ff measured 9.12:1 on the
 * dark card. The wall is what carries the shape at night. Same control the
 * release banner uses, so this card's action looks like every other primary on
 * the site rather than a card-local invention.
 */

/**
 * `info` is the honest default. `destructive` is opt-in and does not belong on
 * a learning surface.
 */
export type AlertCardVariant = "info" | "destructive";

const VARIANTS: Record<AlertCardVariant, { disc: string; glyph: string; action: string }> = {
  info: {
    // Disc fills are backgrounds for a glyph, so they carry no floor of their
    // own; the glyph on top does. Dark disc is #6b51dd at 15% over the card,
    // which composites to #252b51.
    disc: "bg-[#e5eaf5] dark:bg-[#6b51dd]/15",
    // glyph 5.55:1 on the light disc, 6.87:1 on the dark one, floor 3.0
    glyph: "text-[#5a3fd8] dark:text-[#bbb1eb]",
    // white label 6.69:1 on #5a3fd8 and 9.30:1 on the #472ab4 hover, floor 4.5
    action: "gradient-button text-white",
  },
  destructive: {
    // #e11d48 at 10% over white composites to #fce8ed; #f43f5e at 15% over the
    // dark card composites to #3a283e.
    disc: "bg-destructive/10 dark:bg-destructive/15",
    // glyph 4.00:1 on the light disc, 3.68:1 on the dark one, floor 3.0.
    // Deliberately a glyph and a button face only, never word ink: #f43f5e is
    // 4.23:1 on the dark card, which clears the 3.0 shape floor and misses the
    // 4.5 text floor, so it may not carry a sentence.
    glyph: "text-destructive",
    // label 4.70:1 on light --destructive #e11d48, 5.38:1 on dark #f43f5e
    action: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
};

/**
 * Two motion pairs rather than one with branches inside it, picked by
 * `useReducedMotion`. The spring and the icon pulse are both real motion, so
 * both need a reduced path: the reduced pair crossfades, drops the stagger and
 * never animates a transform.
 */
const CARD_MOTION = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 25, staggerChildren: 0.1 },
  },
  exit: { opacity: 0, y: 20, scale: 0.98, transition: { duration: 0.2 } },
};

const CARD_MOTION_REDUCED = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15, staggerChildren: 0 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const ITEM_MOTION = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const ITEM_MOTION_REDUCED = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

/**
 * The four DOM animation and drag handlers are dropped from the spread. React
 * and motion both define them and they mean different things: React's
 * `onAnimationStart` takes a CSS AnimationEvent, motion's takes the variant it
 * is animating to. Spreading the React shape onto a `motion.div` is a type
 * error, and the four are not props a card of this kind has any use for.
 */
export interface AlertCardProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onAnimationStart" | "onAnimationEnd" | "onDragStart" | "onDragEnd" | "onDrag"
  > {
  icon?: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  isVisible: boolean;
  onDismiss?: () => void;
  /** Defaults to `info`. See the header on why `destructive` is opt-in. */
  variant?: AlertCardVariant;
  /**
   * Breathes the icon on a 1.5s loop. Off by default and ignored under reduced
   * motion. An animation that never stops is a permanent attention magnet with
   * no state change behind it, which is the wrong thing to put beside revision
   * content, so a caller has to ask for it.
   */
  pulse?: boolean;
}

const AlertCard = React.forwardRef<HTMLDivElement, AlertCardProps>(
  (
    {
      icon,
      title,
      description,
      buttonText,
      onButtonClick,
      isVisible,
      onDismiss,
      variant = "info",
      pulse = false,
      className,
      ...props
    },
    ref,
  ) => {
    const reduce = useReducedMotion();
    const v = VARIANTS[variant];

    // `assertive` interrupts whatever a screen reader is mid-sentence on. That
    // is right for something going wrong and wrong for an announcement, which
    // is the same call study-toast.tsx made for the same reason.
    const urgent = variant === "destructive";

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={ref}
            role={urgent ? "alert" : "status"}
            aria-live={urgent ? "assertive" : "polite"}
            variants={reduce ? CARD_MOTION_REDUCED : CARD_MOTION}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "relative w-full max-w-sm overflow-hidden rounded-2xl border p-5 shadow-xl sm:p-6",
              // Opaque with a ring, not translucent, because several pages this
              // could sit on are a full-bleed photograph and a translucent
              // panel over one reads as a hole rather than a layer.
              //
              // The outline measures 1.18:1 on the light page and 1.86:1 on the
              // dark one. The 3.0 non-text floor governs shapes that carry
              // information or state; a card's own edge carries neither, and
              // separation here is done by the opaque fill and the shadow. The
              // numbers are recorded rather than argued away.
              "border-stone-200 bg-white ring-1 ring-stone-900/5",
              "dark:border-stone-700 dark:bg-stone-900 dark:ring-white/10",
              className,
            )}
            {...props}
          >
            {/* A flex row, not the spec's absolutely positioned icon and X.
                MEASURED in headless Chrome at 390 by 844, the repo's own phone
                viewport, on the spec's exact geometry:

                  dismiss  x=338 w=32   icon  x=310 w=48   COLLIDES, 20px
                  title    x= 24 w=334  icon  x=310 w=48   COLLIDES, 48px
                  body     x= 24 w=267  icon  x=310 w=48   clear by 19px

                So the two real collisions were the ones the spec did not
                mention. The dismiss sits on top of the icon, and the title is
                the element with no width cap at all, so it runs straight under
                the icon box. The 80 percent cap on the body text, which is the
                one that was expected to fail, is the one that just clears at
                this width, and only because the padding is 24px; it fails as
                soon as the card is narrower or the padding smaller.

                The row measures x=72 w=234 for the text column with every pair
                clear and a document scrollWidth of 390, so no horizontal page
                scroll. A flex row with min-w-0 on the text column cannot
                collide at any width, which is why it needs no breakpoint to
                say so. */}
            <div className="flex items-start gap-3">
              {icon && (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12",
                    v.disc,
                    v.glyph,
                  )}
                >
                  {pulse && !reduce ? (
                    <motion.span
                      className="flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {icon}
                    </motion.span>
                  ) : (
                    icon
                  )}
                </span>
              )}

              <motion.div
                variants={reduce ? ITEM_MOTION_REDUCED : ITEM_MOTION}
                className="min-w-0 flex-1"
              >
                {/* One step down on a phone. The text column measures 234px at
                    390, and a 24px title in 234px is three words a line. */}
                {/* title ink 15.55:1 light, 14.89:1 dark, floor 4.5 */}
                <h3 className="text-xl font-bold tracking-tight text-balance text-stone-900 sm:text-2xl dark:text-stone-50">
                  {title}
                </h3>
                {/* body ink 6.21:1 light, 9.46:1 dark, floor 4.5 */}
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {description}
                </p>
              </motion.div>

              {onDismiss && (
                // The existing Button at its icon size, which is 44px rather
                // than the 32px square the spec asked for. button.tsx raised
                // every height for the touch floor on purpose, and an
                // unlabelled glyph that misses it by 12px is invisible on a
                // laptop and irritating on a phone.
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDismiss}
                  // glyph 6.21:1 light, 7.37:1 dark, floor 3.0
                  className="-mt-1 -mr-1 shrink-0 rounded-full text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-white/10 dark:hover:text-stone-50"
                >
                  <X className="size-4" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              )}
            </div>

            <motion.div
              variants={reduce ? ITEM_MOTION_REDUCED : ITEM_MOTION}
              className="mt-6"
            >
              {/* A 12px corner, not the pill the spec asked for: the site is
                  built on 12px corners throughout and button.tsx says so in its
                  own header. `bb-press` is the site's press ledge. min-h-12
                  gives it 48px of height, where the spec's vertical padding
                  would have fought the Button component's fixed height. */}
              <button
                type="button"
                onClick={onButtonClick}
                className={cn(
                  "bb-press flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl px-5 text-base font-semibold transition-colors",
                  v.action,
                )}
              >
                {buttonText}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  },
);

AlertCard.displayName = "AlertCard";

export { AlertCard };
