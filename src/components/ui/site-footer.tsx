import { useState } from "react";
import { Mail } from "lucide-react";
import { GithubMark, LinkedinMark } from "@/components/ui/brand-marks";
import { BlueberryMark } from "@/components/ui/blueberry-mark";
import { AboutOverlay } from "@/components/AboutOverlay";
import { EMAIL, GITHUB_URL, LINKEDIN_URL, REPO_URL, SITE_NAME } from "@/data/site";
import { SITE_CONTAINER } from "@/components/ui/site-nav";
import { isReducedMotion } from "@/lib/motionPref";
import { cn } from "@/lib/utils";

/**
 * The foot of the page.
 *
 * Adapted from the supplied footer rather than pasted. The original shipped
 * four columns of links to pages that do not exist here (Pricing, Changelog,
 * Brand, a Facebook account) and a placeholder copyright for a company called
 * Asme. A footer full of dead links is worse than no footer.
 *
 * Shell round 6: the staggered blur-up on scroll is gone too. Chrome should be
 * there when you arrive; a footer still smeared 500ms after you reach it reads as
 * loading (critic, shell round 5).
 *
 * Drawn once for every site page by `SiteChrome`. Shell round 4: it no longer
 * repeats the five destinations (the header and the phone bar already show them,
 * 60px below on a phone), and it holds what the header gave up instead: About,
 * Contact, Terms, the source, and the two site settings, theme and motion.
 */

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

const SITE_LINKS: FooterLink[] = [
  { title: "Contact", href: "#/contact" },
  { title: "FAQ", href: "#/faq" },
  { title: "Terms", href: "#/terms" },
  { title: "Source", href: REPO_URL, external: true },
];

const FIND_ME: FooterLink[] = [
  { title: "GitHub", href: GITHUB_URL, icon: GithubMark, external: true },
  { title: "LinkedIn", href: LINKEDIN_URL, icon: LinkedinMark, external: true },
  { title: "Email", href: `mailto:${EMAIL}`, icon: Mail, external: true },
];

// 44 by 44 at least: `min-w-11` because "Terms" alone measured 41px wide (shell round 7).
const LINK = "inline-flex min-h-11 min-w-11 items-center gap-1.5 text-foreground transition-colors duration-200 hover:text-[var(--site-nav-ink)]";
const HEAD = "page-title text-base text-[var(--bb-deep)]";

export function SiteFooter({ className }: { className?: string }) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <footer className={cn("site-footer border-t-2 border-[var(--site-hairline)]", className)}>
      <div className={cn(SITE_CONTAINER, "grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_2fr]")}>
        <div className="space-y-3">
          {/* 44 by 44, the skill's target floor (it was 36). */}
          <a
            href="#/home"
            aria-label={`${SITE_NAME}, home`}
            className="-ml-1 inline-flex size-11 items-center justify-center rounded-full"
          >
            <BlueberryMark eyes className="size-9" />
          </a>
          <p className="max-w-xs text-sm leading-relaxed text-[var(--site-quiet)]">
            Organic chemistry for CHEM 241 and 242 at Maryland. Built while taking it.
          </p>
          <p className="text-xs text-[var(--site-quiet)]">© {new Date().getFullYear()} Andrew Liu</p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <h3 className={HEAD}>The site</h3>
            <ul className="mt-2 text-sm">
              <li>
                {/* The About card, which used to open from every page header. */}
                <button type="button" onClick={() => setAboutOpen(true)} className={cn(LINK, "cursor-pointer")}>
                  About
                </button>
              </li>
              {SITE_LINKS.map((link) => (
                <FooterItem key={link.title} link={link} />
              ))}
            </ul>
          </div>
          <div>
            <h3 className={HEAD}>Settings</h3>
            <ul className="mt-2 text-sm">
              <li>
                <ThemeSwitch />
              </li>
              <li>
                <MotionSwitch />
              </li>
            </ul>
          </div>
          <div>
            <h3 className={HEAD}>Find me</h3>
            <ul className="mt-2 text-sm">
              {FIND_ME.map((link) => (
                <FooterItem key={link.title} link={link} />
              ))}
            </ul>
          </div>
        </div>
      </div>

      <AboutOverlay open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </footer>
  );
}

function FooterItem({ link }: { link: FooterLink }) {
  return (
    <li>
      <a href={link.href} {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})} className={LINK}>
        {link.icon && <link.icon className="size-3.5" />}
        {link.title}
      </a>
    </li>
  );
}

/**
 * A plain on/off switch: the words, then a small track. `role="switch"` with
 * `aria-checked` is what a screen reader announces as "on" or "off".
 */
function Switch({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} className={cn(LINK, "cursor-pointer gap-2.5")}>
      {label}
      <span
        aria-hidden
        className={cn(
          "flex h-5 w-9 items-center rounded-full border-2 bg-[var(--bb-wash)] p-0.5 transition-colors duration-200",
          // On is tinted, not filled: a filled violet here was a second primary on
          // every page whose footer was in view (Learn round 4). Wash track, violet
          // edge, knob in the violet ink (6.95:1 on the wash light, 7.85:1 night).
          on ? "justify-end border-primary" : "justify-start border-[var(--site-border)]",
        )}
      >
        <span className={cn("size-3 rounded-full", on ? "bg-[var(--site-nav-ink)]" : "bg-card")} />
      </span>
    </button>
  );
}

/**
 * Dark theme on or off. The same three steps as the theme toggler on the deck
 * pages: crossfade every surface for the swap, flip the `dark` class, and save the
 * choice so index.html's pre-paint script restores it on the next load.
 */
function ThemeSwitch() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );
  const toggle = () => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 260);
    const next = root.classList.toggle("dark");
    setDark(next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* private mode: the choice lasts until reload */
    }
  };
  return <Switch label="Dark theme" on={dark} onToggle={toggle} />;
}

/**
 * Reduce motion on or off. Motion is one attribute, `html[data-motion="reduced"]`
 * (src/lib/motionPref.ts). Saved as "reduced" or "full", so index.html can honour
 * the choice before first paint even when it disagrees with the OS setting.
 */
function MotionSwitch() {
  const [reduced, setReduced] = useState(() => typeof document !== "undefined" && isReducedMotion());
  const toggle = () => {
    const next = !reduced;
    if (next) document.documentElement.setAttribute("data-motion", "reduced");
    else document.documentElement.removeAttribute("data-motion");
    setReduced(next);
    try {
      localStorage.setItem("motion", next ? "reduced" : "full");
    } catch {
      /* private mode: the choice lasts until reload */
    }
  };
  return <Switch label="Reduce motion" on={reduced} onToggle={toggle} />;
}

export default SiteFooter;
