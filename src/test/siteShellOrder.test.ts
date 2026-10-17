import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Shell round 5, 2026-10-07: the Tab order on a phone, and the site's own Reduce motion
 * switch reaching the shell.
 *
 * The site suite runs in node with no DOM (vitest.config.ts), so the shell is rendered to
 * HTML with `renderToStaticMarkup`. The parts of `SiteChrome` that need a browser or a
 * session (the timer, search, the assistant, the account menu, the hash, the About
 * sheet's portal) are swapped for
 * stand-ins; the header, the phone bar and the footer are the real ones.
 */

vi.mock("@/lib/useHashRoute", () => ({ useHashRoute: () => "study-decks" }));
vi.mock("@/lib/useFocusTimer", () => ({ useFocusTimer: () => ({}) }));
vi.mock("@/components/FocusTimer", () => ({ FocusPill: () => null, FocusTimer: () => null }));
vi.mock("@/components/GlobalSearch", () => ({ GlobalSearch: () => null }));
vi.mock("@/components/ui/blueberry-bot", () => ({ BlueberryBot: () => null }));
// The About sheet is a portal into document.body, which a node render does not have.
vi.mock("@/components/AboutOverlay", () => ({ AboutOverlay: () => null }));
vi.mock("@/components/ui/profile-dropdown", () => ({
  ProfileDropdown: () => createElement("a", { href: "#/signin" }, "Sign in"),
}));

const { SiteChrome } = await import("@/components/SiteChrome");
const { SiteFooter } = await import("@/components/ui/site-footer");
const { skipToContent } = await import("@/components/ui/site-nav-events");

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** A stand-in <html> for the render: only what the shell reads from it. */
function fakeDocument(motion: string | null) {
  vi.stubGlobal("document", {
    documentElement: {
      getAttribute: (name: string) => (name === "data-motion" ? motion : null),
      classList: { contains: () => false },
    },
  });
}
afterEach(() => vi.unstubAllGlobals());

/**
 * The focusable elements in document order, as a phone sees them: the header's five
 * links sit in a `hidden md:flex` nav, which is display:none below 768px, so they are
 * dropped. Each entry is its text and where it starts in the markup.
 */
function phoneFocusables(html: string) {
  const desktopNav = /<nav aria-label="Site" class="hidden [^"]*md:flex[^"]*">[\s\S]*?<\/nav>/.exec(html);
  const hidden = desktopNav ? [desktopNav.index, desktopNav.index + desktopNav[0].length] : [-1, -1];
  return [...html.matchAll(/<(a|button|input|select|textarea)\b([^>]*)>([\s\S]*?)(?=<\/\1>|$)/g)]
    .filter((m) => !(m.index! > hidden[0] && m.index! < hidden[1]))
    .filter(([, tag, attrs]) => tag !== "a" || /href=/.test(attrs))
    .map((m) => ({ at: m.index!, text: m[3].replace(/<[^>]+>/g, "").trim(), attrs: m[2] }));
}

describe("the Tab order on a phone (shell round 5)", () => {
  fakeDocument(null);
  const page = createElement("main", null, createElement("a", { href: "#/deck/grignard" }, "Open the deck"));
  const html = renderToStaticMarkup(createElement(SiteChrome, null, page));
  vi.unstubAllGlobals();
  const stops = phoneFocusables(html);
  const mainAt = html.indexOf("<main");
  const barAt = html.indexOf('aria-label="Site, bottom bar"');

  it("starts with a skip link", () => {
    expect(stops[0].text).toBe("Skip to content");
  });

  it("puts the page before the phone bar, so the five tabs come after the page's own stops", () => {
    expect(mainAt).toBeGreaterThan(0);
    expect(barAt).toBeGreaterThan(html.indexOf("</main>"));
    // Between the skip link and the page: only the header row (berry, search, account),
    // never a tab-bar link. Round 4 had all five tabs here too: the page's button was stop 9.
    const beforeMain = stops.slice(1).filter((s) => s.at < mainAt);
    expect(beforeMain.map((s) => s.text)).toEqual(["Blueberry", "", "Sign in"]);
  });

  it("lands inside main on the first stop after the skip link has moved focus to the page", () => {
    // The skip link focuses <main> (see skipToContent in site-nav.tsx); the next Tab stop
    // after that point in the document must be the page's own control.
    // Moved from site-nav.tsx to site-nav-events.ts in round 6 (lint: component files
    // export only components); the same check, on the file the function now lives in.
    const nav = read("components/ui/site-nav-events.ts");
    expect(nav).toMatch(/document\.querySelector<HTMLElement>\("main"\)/);
    const next = stops.find((s) => s.at > mainAt);
    expect(next?.text).toBe("Open the deck");
    expect(next!.at).toBeLessThan(html.indexOf("</main>"));
  });

  it("shows the focused skip link below the header row, not on the wordmark (round 6)", () => {
    const skip = /<a [^>]*class="([^"]*)"[^>]*>Skip to content<\/a>/.exec(html)?.[1] ?? "";
    const header = /<header class="site-header [^"]*"><div class="[^"]*h-\[(\d+)px\]/.exec(html);
    const top = Number(/(?:^| )top-\[(\d+)px\]/.exec(skip)?.[1]);
    expect(header).not.toBeNull();
    // Round 5 parked it at top-2, over the berry and the wordmark.
    expect(top).toBeGreaterThan(Number(header![1]));
    // Hidden above the window until focused: the lift is more than its top plus its height.
    expect(skip).toMatch(/(?:^| )-translate-y-40(?: |$)/);
    expect(skip).toMatch(/(?:^| )focus:translate-y-0(?: |$)/);
  });

  it("moves focus to the start of main, not to a control inside it (round 6)", () => {
    // A stand-in page: main holds a search box, the control the critic saw focus land on.
    const focused: string[] = [];
    const attrs: Record<string, string> = {};
    const input = { focus: () => focused.push("input") };
    const main = {
      hasAttribute: (k: string) => k in attrs,
      setAttribute: (k: string, v: string) => (attrs[k] = v),
      focus: () => focused.push("main"),
      querySelector: () => input,
    };
    vi.stubGlobal("document", { querySelector: (sel: string) => (sel === "main" ? main : null) });
    let prevented = false;
    skipToContent({ preventDefault: () => (prevented = true) } as never);
    expect(focused).toEqual(["main"]);
    expect(attrs.tabindex).toBe("-1");
    expect(prevented).toBe(true);
    // ...and the start of main is scrolled clear of the 60px sticky header, not under it.
    const shell = read("components/ui/site-shell.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(/html:has\(\.site-header\)\s*\{([^}]*)\}/.exec(shell)?.[1]).toMatch(/scroll-padding-top:\s*61px/);
  });

  it("uses no positive tabindex anywhere in the shell", () => {
    expect(html).not.toMatch(/tabindex="[1-9]/i);
  });
});

describe("Reduce motion reaches the shell (shell round 5)", () => {
  // Round 6 changed the requirement: the footer does not animate in at all, with motion on
  // or off (critic, round 5: chrome should be there when you arrive). Round 5 checked that
  // the blur-in stopped under reduced motion and still ran without it.
  it("draws the footer with no blur-in and no motion component, with motion on or off", () => {
    for (const motion of ["reduced", null]) {
      fakeDocument(motion);
      const html = renderToStaticMarkup(createElement(SiteFooter));
      expect(html, String(motion)).not.toMatch(/blur\(|opacity:\s*0/);
      expect(html, String(motion)).toMatch(/Find me/);
    }
    expect(read("components/ui/site-footer.tsx")).not.toMatch(/from "motion\/react"/);
  });

  it("reads the site's attribute, not only the OS setting, in the shell", () => {
    const chrome = read("components/SiteChrome.tsx");
    expect(chrome).toMatch(/const reduced = useReducedMotionPref\(\)/);
    expect(chrome).toMatch(/<MotionConfig reducedMotion=\{motionMode\}>/);
    expect(chrome).toMatch(/reduced \? "always" : "never"/);
  });
});
