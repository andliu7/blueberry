"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

/**
 * Radix tooltip, repalletted onto this site's tokens.
 *
 * The animation classes are the site's own keyframes from `index.css`, not
 * `tailwindcss-animate`'s `animate-in` / `zoom-in-95` — those names are not
 * defined here and would resolve to nothing, which for Radix means the exit is
 * not merely un-animated but instant, since it keeps a closing element mounted
 * only while a real CSS animation runs. Same reasoning as `dialog.tsx`.
 *
 * A tooltip is a hint, never the only label. Every icon button that uses one
 * also carries an `aria-label`, because a tooltip does not exist for a screen
 * reader on a touch device that has no hover at all.
 */

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    showArrow?: boolean;
  }
>(({ className, sideOffset = 6, showArrow = false, children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "relative z-[140] max-w-[280px] rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md",
        "data-[state=delayed-open]:[animation:ui-menu-in_120ms_ease-out]",
        "data-[state=closed]:[animation:ui-menu-out_100ms_ease-in]",
        className,
      )}
      {...props}
    >
      {children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
