import type { ComponentProps, ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Mail } from "lucide-react";
import { GithubMark, LinkedinMark } from "@/components/ui/brand-marks";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { EMAIL, GITHUB_URL, LINKEDIN_URL, REPO_URL, SITE_NAME, TRAINER_URL } from "@/data/site";
import { cn } from "@/lib/utils";

/**
 * The foot of the page.
 *
 * Adapted from the supplied footer rather than pasted. The original shipped
 * four columns of links to pages that do not exist here — Pricing, Changelog,
 * Brand, a Facebook account — and a placeholder copyright for a company called
 * Asme. A footer full of dead links is worse than no footer: it is a map of a
 * building that was never built.
 *
 * What is kept is the good part: the staggered blur-up on scroll, which is why
 * the file was worth starting from at all.
 *
 * Every link here goes somewhere real, and the sections are the ones this site
 * actually has.
 */

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

const SECTIONS: { label: string; links: FooterLink[] }[] = [
  {
    label: "Study",
    links: [
      { title: "Study Decks", href: "#/study-decks" },
      { title: "Lessons", href: "#/lessons" },
      { title: "Concepts", href: TRAINER_URL, external: true },
    ],
  },
  {
    label: "The site",
    links: [
      { title: "Home", href: "#/home" },
      { title: "Contact", href: "#/contact" },
      { title: "Source", href: REPO_URL, external: true },
    ],
  },
  {
    label: "Elsewhere",
    links: [
      { title: "GitHub", href: GITHUB_URL, icon: GithubMark, external: true },
      { title: "LinkedIn", href: LINKEDIN_URL, icon: LinkedinMark, external: true },
      { title: "Email", href: `mailto:${EMAIL}`, icon: Mail, external: true },
    ],
  },
];

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "relative mx-auto w-full max-w-5xl border-t border-slate-200 px-6 py-12 dark:border-stone-800",
        className,
      )}
    >
      {/* The seam catches a little light in the middle, the way the supplied one
          did. It is the only decoration here and it costs one div. */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent blur-[1px]"
      />

      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_2fr]">
        <Rise className="space-y-4">
          <a
            href="#/home"
            aria-label={`${SITE_NAME}, home`}
            className="inline-block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <BlueberryMark eyes className="size-9" />
          </a>
          <p className="max-w-xs text-sm leading-relaxed text-slate-500 dark:text-stone-400">
            Organic chemistry for CHEM 241 and 242 at Maryland. Built while taking it.
          </p>
          <p className="font-mono text-xs text-slate-400 dark:text-stone-500">
            © {new Date().getFullYear()} Andrew Liu
          </p>
        </Rise>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {SECTIONS.map((section, i) => (
            <Rise key={section.label} delay={0.08 + i * 0.08}>
              <h3 className="font-mono text-[0.65rem] tracking-widest text-slate-400 uppercase dark:text-stone-500">
                {section.label}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {section.links.map((link) => (
                  <li key={link.title}>
                    <a
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                      className="inline-flex items-center gap-1.5 text-slate-500 transition-colors hover:text-indigo-600 dark:text-stone-400 dark:hover:text-indigo-300"
                    >
                      {link.icon && <link.icon className="size-3.5" />}
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Rise>
          ))}
        </div>
      </div>
    </footer>
  );
}

/**
 * Blur-up on first sight, staggered by column.
 *
 * `once` because a footer that re-animates every time it scrolls back into view
 * is a footer that fidgets. Reduced motion gets the children unwrapped
 * entirely, rather than an animation with a zero duration, so there is no
 * motion component in the tree at all.
 */
function Rise({
  className,
  delay = 0.1,
  children,
}: {
  className?: ComponentProps<typeof motion.div>["className"];
  delay?: number;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className as string}>{children}</div>;

  return (
    <motion.div
      initial={{ filter: "blur(4px)", y: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.7 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default SiteFooter;
