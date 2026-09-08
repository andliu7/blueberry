import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * A button whose gradient moves under the cursor rather than cross-fading.
 *
 * The trick is `@property`. A CSS custom property is just a string to the
 * engine, so `transition: --pos-x 0.5s` normally does nothing: there is no way
 * to interpolate halfway between two strings. Declaring the property with a
 * `syntax` of `<percentage>` or `<color>` gives it a type, and a typed custom
 * property animates. That is what lets the gradient's focal point, spread and
 * five colour stops all travel at once instead of the whole background
 * swapping. The declarations live in `index.css`; this file only picks a class.
 *
 * The same technique is already used in this stylesheet for `--tile-spin`, so
 * the browser floor it implies was accepted here before this component arrived.
 *
 * **This is not the palette it shipped with.** The original was pink, magenta
 * and orange, which would fight the blue accent the rest of the site now uses.
 * The mechanism is the borrowed part; the colours come from `--color-brand-*`.
 *
 * **It renders a `button` and takes `asChild`.** The site's primary call to
 * action is an `<a href="#/enter">`, not a button, and a link that renders as a
 * button must stay a link: middle-click, copy address and open-in-new-tab all
 * come from the element, not from the styling. `asChild` hands the class to the
 * anchor instead of wrapping it, which is what `Slot` is for.
 *
 * Compose it with `bb-press` where the press contract applies. This component
 * owns the surface; `bb-press` owns the lip and the travel on pointer down, and
 * they do not overlap.
 */
const gradientButtonVariants = cva(
  [
    "gradient-button",
    "relative inline-flex cursor-pointer appearance-none items-center justify-center gap-2.5",
    "min-w-[132px] rounded-full px-9 py-4",
    "text-lg font-semibold text-white",
    "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        /** Deep navy resolving into the brand blue. The primary call to action. */
        default: "",
        /** The same movement pitched cooler, for a second action beside the first. */
        cool: "gradient-button-cool",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(gradientButtonVariants({ variant, className }))} ref={ref} {...props} />
    );
  },
);
GradientButton.displayName = "GradientButton";

export { GradientButton, gradientButtonVariants };
