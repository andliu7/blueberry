import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The top of every content page: one title, one line under it, and room above.
 * Shell round 3, 2026-10-07.
 *
 * WHY ONE COMPONENT. The main routes drew their titles five different ways (a
 * card with a breadcrumb, a two-weight wordmark that scrambled in, a flush 30px
 * line with a status message under it, a title under a "Menu" button, a
 * full-screen hero), so every page looked like a different site. They all render
 * this now, and a change to the top of a page is made once, here.
 *
 * WHAT IT FIXES, so a page does not have to: the air above the title (32px on a
 * phone, 48px from 768px, measured from the header's hairline), one title size
 * per breakpoint in Nunito, and the line under it in the system face.
 *
 * WHERE IT SITS. Inside `SITE_CONTAINER` (site-nav.tsx), the page column the header
 * uses, so the title's left edge is the berry's (shell round 4).
 *
 * - `back` is the one link a page may put above its title, and only to go up a
 *   level ("Study decks" from a folder). Home is the header's berry, never this.
 * - `subtitle` is one sentence. It is a node rather than a string so a page can
 *   hand in text that expands ("Show more"), but it should still read as a line.
 * - `actions` sit at the right of the title row and wrap under it on a phone:
 *   page tools such as a staff button or the Me menu, never a filled primary.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  className?: string;
}) {
  return (
    // `page-header` is the hook for the shell's one 3px focus ring (site-shell.css).
    <header className={cn("page-header pt-8 pb-6 md:pt-12 md:pb-8", className)}>
      {back && (
        <a
          href={back.href}
          className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-[var(--site-quiet)] transition-colors duration-200 hover:text-foreground focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {back.label}
        </a>
      )}
      {/* Top-aligned (shell round 5): bottom-aligned, a tall action (Learn's 112px
          reading berry) pushed the title 27px lower than on every other page. */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="page-title text-4xl leading-[1.1] text-[var(--bb-deep)] md:text-5xl">{title}</h1>
          {subtitle && (
            <div className="mt-2 max-w-2xl font-sans text-base text-[var(--site-quiet)]">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
