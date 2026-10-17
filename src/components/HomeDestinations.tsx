import { useEffect, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { SiteTabIcon } from "@/components/ui/site-tab-icons";
import { homeCardCounts } from "@/data/taxonomy";
import { clearPageTint, tintPage } from "@/lib/cardGlow";
import { DEMO_TABS, type DemoTabId } from "@/lib/homeDemo";
import "./home-destinations.css";

/**
 * The four destinations, as one list of rows beside the phone demo (S2 round 5).
 *
 * WHY ROWS, AND WHY THEY ARE THE TABS. Until round 4 the four places were shown twice: a tab
 * strip over the phone with its own caption, and four picture cards beside it with the same
 * caption and the same drawings the phone played (critic, rounds 3 and 4). Now these rows are
 * the only way the four places are named. The row the phone is showing is lit in its own
 * colour with a thin clock along its foot, so the rows do the tabs' job and nothing repeats.
 * The pictures went too: the phone is the one picture, and each row carries the same icon the
 * header gives that place, so a stranger learns one icon per place.
 *
 * Each row is a plain link to its page. Pointing at one (or focusing it) also switches the
 * phone to it (`onPreview`) and tints the page ground toward its colour (owner 15 Oct,
 * option C; `tintPage` in src/lib/cardGlow.ts).
 *
 * The counts come from `homeCardCounts()` in src/data/taxonomy.ts and none is typed
 * (src/test/taxonomy.test.ts scans this file). Schedule has no count, because its dates live
 * in the database, so its chip says what the page does instead.
 */
export function HomeDestinations({
  active,
  onPreview,
  onClockEnd,
}: {
  /** The place the phone is showing, lit here. */
  active?: DemoTabId;
  onPreview?: (id: DemoTabId) => void;
  /** Called when the lit row's clock runs out, so the phone moves on to the next place. */
  onClockEnd?: () => void;
}) {
  const chips: Record<DemoTabId, string> = { ...homeCardCounts(), schedule: "Office hours you can book" };

  // Leaving home with the mouse still on a card fires no pointerleave, so clear the tint
  // when this unmounts. (A useEffect cleanup: the returned function runs on unmount.)
  // Scrolling clears it too: a card that scrolls under a resting mouse is not a choice, so
  // the tint waits for the mouse to actually move on a card (onPointerMove below).
  useEffect(() => {
    window.addEventListener("scroll", clearPageTint, { passive: true });
    return () => {
      window.removeEventListener("scroll", clearPageTint);
      clearPageTint();
    };
  }, []);

  return (
    <ul className="home-dest__grid" aria-label="The four parts of the site">
      {DEMO_TABS.map((tab) => {
        const lit = tab.id === active;
        return (
          <li key={tab.id}>
            <a
              href={tab.href}
              className="home-card"
              data-lit={lit ? "" : undefined}
              style={{ "--glow": `var(--site-tab-${tab.id})`, "--tone": `var(--site-tab-${tab.id})` } as CSSProperties}
              onPointerEnter={(e) => e.pointerType === "mouse" && onPreview?.(tab.id)}
              onFocus={() => onPreview?.(tab.id)}
              onPointerMove={(e) => tintPage(e, `var(--site-tint-${tab.id})`)}
              onPointerLeave={clearPageTint}
            >
              <span className="home-card__icon" aria-hidden>
                <SiteTabIcon id={tab.id} className="size-full" />
              </span>
              <span className="home-card__text">
                <span className="home-card__title">{tab.label}</span>
                <span className="home-card__line">{tab.caption}</span>
                <span className="home-card__count">{chips[tab.id]}</span>
              </span>
              <ArrowRight aria-hidden className="home-card__go size-5" />
              {/* The auto-advance clock, on the lit row only. `key` restarts it whenever the
                  lit row changes; when its CSS animation ends, the phone moves on. */}
              {lit && onClockEnd && <span key={tab.id} aria-hidden className="home-card__clock" onAnimationEnd={onClockEnd} />}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default HomeDestinations;
