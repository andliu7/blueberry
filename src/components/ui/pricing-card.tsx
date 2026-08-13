import React from "react";
import { cn } from "@/lib/utils";

/**
 * Pricing card primitives.
 *
 * Adapted, not pasted. The original is written against shadcn's CSS variables
 * (`bg-card`, `bg-muted`, `text-muted-foreground`, `border-border`), and this
 * project defines none of them, so every one of those classes resolves to
 * nothing and the card arrives as a stack of unstyled boxes. The palette below
 * is the slate/stone pair the rest of the site already uses.
 *
 * The parts are separate components rather than one component with fifteen
 * props because a pricing card is mostly layout: the tiers differ in which
 * pieces they show, not in a flag on each piece.
 */

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border p-1.5",
        "border-slate-200 bg-white/70 shadow-sm backdrop-blur-xl",
        "dark:border-stone-700 dark:bg-stone-900/50",
        className,
      )}
      {...props}
    />
  );
}

function Header({
  className,
  children,
  glassEffect = true,
  ...props
}: React.ComponentProps<"div"> & { glassEffect?: boolean }) {
  return (
    <div
      className={cn(
        "relative mb-3 rounded-xl border p-4",
        "border-slate-200 bg-slate-50/80",
        "dark:border-stone-700 dark:bg-stone-900/40",
        className,
      )}
      {...props}
    >
      {/*
        Light and dark need opposite corrections here, not one value flipped.
        A white gradient over a near-white panel is invisible, so light mode
        gets a faint dark wash and dark mode gets the original white one.
      */}
      {glassEffect && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-48 rounded-[inherit] dark:hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.05) 0%, rgba(15,23,42,0.02) 40%, rgba(0,0,0,0) 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 hidden h-48 rounded-[inherit] dark:block"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 40%, rgba(0,0,0,0) 100%)",
            }}
          />
        </>
      )}
      {children}
    </div>
  );
}

function Plan({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("mb-6 flex items-center justify-between gap-2", className)} {...props} />
  );
}

function Description({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs text-slate-500 dark:text-stone-400", className)}
      {...props}
    />
  );
}

function PlanName({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-stone-400",
        "[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
        "border-slate-300 text-slate-600",
        "dark:border-stone-600 dark:text-stone-300",
        className,
      )}
      {...props}
    />
  );
}

function Price({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-3 flex items-end gap-1", className)} {...props} />;
}

function MainPrice({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "title-face text-3xl tracking-tight text-slate-900 dark:text-stone-100",
        className,
      )}
      {...props}
    />
  );
}

function Period({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("pb-1 text-sm text-slate-600 dark:text-stone-300", className)}
      {...props}
    />
  );
}

function OriginalPrice({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "mr-1 ml-auto text-lg text-slate-400 line-through dark:text-stone-500",
        className,
      )}
      {...props}
    />
  );
}

function Body({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-5 p-3", className)} {...props} />;
}

function List({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("space-y-2.5", className)} {...props} />;
}

function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 text-sm text-slate-500 dark:text-stone-400",
        className,
      )}
      {...props}
    />
  );
}

function Separator({
  children = "Upgrade to access",
  className,
  ...props
}: React.ComponentProps<"div"> & { children?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-xs text-slate-400 dark:text-stone-500",
        className,
      )}
      {...props}
    >
      <span className="h-px flex-1 bg-slate-200 dark:bg-stone-700" />
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-stone-700" />
    </div>
  );
}

export {
  Card,
  Header,
  Description,
  Plan,
  PlanName,
  Badge,
  Price,
  MainPrice,
  Period,
  OriginalPrice,
  Body,
  List,
  ListItem,
  Separator,
};
