import { useEffect, useRef, useState } from "react";
import { CircleHelp, Mail } from "lucide-react";
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
 *
 * Owner, 20 Oct: "the footer should come up similarly to my website andliu.dev".
 * Three things came over from andliu-portfolio's components/site/footer.tsx:
 * - It is REVEALED, not reached. The footer sits one layer under the page, stuck
 *   to the bottom of the window, and the page slides up off it at the end of the
 *   scroll. The layering is CSS (site-shell.css, "The footer comes up"); this file
 *   only measures whether it fits the window (`fits`) and draws the seam, the
 *   page's bottom edge with its shadow and violet line, just above it.
 * - Find me is three icon chips (GitHub, LinkedIn, email) whose word grows out on
 *   hover or keyboard focus, and always shows on a touch screen.
 * - A dark ground, here the deep violet --site-foot, the same in both themes.
 * And FAQ, which he likes, is now its own lavender card rather than a line in a list.
 */

interface FooterLink {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  external?: boolean;
}

// FAQ is not in this list: it has its own card (FaqCard below).
const SITE_LINKS: FooterLink[] = [
  { title: "Contact", href: "#/contact" },
  { title: "Terms", href: "#/terms" },
  { title: "Source", href: REPO_URL, external: true },
];

const FIND_ME: FooterLink[] = [
  { title: "GitHub", href: GITHUB_URL, icon: GithubMark, external: true },
  { title: "LinkedIn", href: LINKEDIN_URL, icon: LinkedinMark, external: true },
  { title: "Email", href: `mailto:${EMAIL}`, icon: Mail, external: true },
];

// 44 by 44 at least: `min-w-11` because "Terms" alone measured 41px wide (shell round 7).
// The colours are the footer's own (--site-foot-*, src/tokens.css): it is dark in both themes.
const LINK = "inline-flex min-h-11 min-w-11 items-center gap-1.5 text-[var(--site-foot-ink)] transition-colors duration-200 hover:text-[var(--site-foot-head)]";
const HEAD = "page-title text-base text-[var(--site-foot-head)]";

export function SiteFooter({ className }: { className?: string }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const footRef = useRef<HTMLElement>(null);
  const [fits, setFits] = useState(false);

  // Does the whole footer fit in the window, above the phone bar? Only then is it stuck
  // under the page (site-shell.css): a footer taller than the room would keep its top
  // hidden under the page. Re-measured when the window or the footer resizes (a
  // ResizeObserver fires when the element's own box changes, such as a font swap).
  // React pattern: an effect with [] runs once after the first paint, and the function it
  // returns stops the watchers when the footer unmounts.
  useEffect(() => {
    const foot = footRef.current;
    if (!foot) return;
    const measure = () => {
      // The phone bar is display:none from 768px, so its height reads 0 there.
      const bar = document.querySelector<HTMLElement>(".site-bar")?.offsetHeight ?? 0;
      setFits(foot.offsetHeight <= window.innerHeight - bar);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(foot);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // While the footer is stuck under the page, Tab can land on a link that is covered.
  // So when focus comes into it, scroll to the very end, where it is uncovered. React's
  // onFocus bubbles (it is the DOM's focusin), so one handler covers every link inside.
  const reveal = () => {
    if (!fits || isReducedMotion()) return;
    const end = document.documentElement.scrollHeight - window.innerHeight;
    if (window.scrollY < end - 2) window.scrollTo({ top: end });
  };

  return (
    // A fragment: the seam and the footer are two siblings after the page.
    <>
      <div className="site-seam" aria-hidden>
        <span className="site-seam-line" />
      </div>
      <footer
        ref={footRef}
        className={cn("site-footer border-t-2 border-[var(--site-foot-line)]", className)}
        data-fits={fits ? "" : undefined}
        onFocus={reveal}
      >
        <div className={cn(SITE_CONTAINER, "grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_2fr]")}>
          <div className="space-y-4">
            {/* 44 by 44, the skill's target floor (it was 36). On a lavender disc, because
                the navy berry all but vanished on the dark footer. */}
            <a
              href="#/home"
              aria-label={`${SITE_NAME}, home`}
              className="-ml-1 inline-flex size-11 items-center justify-center rounded-full bg-[var(--site-foot-faq)]"
            >
              <BlueberryMark eyes className="size-9" />
            </a>
            <p className="max-w-xs text-sm leading-relaxed text-[var(--site-foot-quiet)]">
              Organic chemistry for CHEM 241 and 242 at Maryland. Built while taking it.
            </p>
            <FaqCard />
            <p className="text-xs text-[var(--site-foot-quiet)]">© {new Date().getFullYear()} Andrew Liu</p>
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
            {/* Full width under the other two on a phone, so the three chips sit in one row. */}
            <div className="col-span-2 sm:col-span-1">
              <h3 className={HEAD}>Find me</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {FIND_ME.map((link) => (
                  <FindMeItem key={link.title} link={link} />
                ))}
              </ul>
            </div>
          </div>
        </div>

        <AboutOverlay open={aboutOpen} onClose={() => setAboutOpen(false)} />
      </footer>
    </>
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
 * An icon chip whose word slides out on hover or keyboard focus (`.site-find` in
 * site-shell.css). The word is in the page the whole time, only clipped to zero width,
 * so it is also the link's name for a screen reader.
 */
function FindMeItem({ link }: { link: FooterLink }) {
  const Icon = link.icon ?? Mail;
  return (
    <li>
      <a href={link.href} {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})} className="site-find">
        <Icon className="size-[18px] shrink-0" />
        <span className="site-find-label">{link.title}</span>
      </a>
    </li>
  );
}

/** The FAQ as a card of its own (`.site-foot-faq`), so it is the footer's one loud thing. */
function FaqCard() {
  return (
    <a href="#/faq" className="site-foot-faq max-w-xs">
      <CircleHelp aria-hidden className="size-7 shrink-0" />
      <span>
        <span className="block font-sans text-sm">Got a question?</span>
        <span className="page-title block text-lg">Read the FAQ</span>
      </span>
    </a>
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
          "flex h-5 w-9 items-center rounded-full border-2 bg-[var(--site-foot-chip)] p-0.5 transition-colors duration-200",
          // On is tinted, not filled: a filled violet here was a second primary on
          // every page whose footer was in view (Learn round 4). On the dark footer
          // the edge and knob are the footer's ring colour when on (10.28:1 on the
          // ground) and its quiet ink when off (8.18:1).
          on ? "justify-end border-[var(--site-foot-ring)]" : "justify-start border-[var(--site-foot-quiet)]",
        )}
      >
        <span className={cn("size-3 rounded-full", on ? "bg-[var(--site-foot-ring)]" : "bg-[var(--site-foot-quiet)]")} />
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
