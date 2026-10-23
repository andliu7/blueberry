import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * The footer, owner 20 Oct: "the footer should come up similarly to my website andliu.dev.
 * The Find Me should have just the logos of GitHub, LinkedIn, and email, and upon hover,
 * they would expand into the words. FAQ would be more obvious."
 *
 * The site suite runs in node with no DOM, so the footer is rendered to HTML and the CSS
 * rules that carry the behaviour are read as text, as siteNavPress.test.ts does.
 */

// The About sheet is a portal into document.body, which a node render does not have.
vi.mock("@/components/AboutOverlay", () => ({ AboutOverlay: () => null }));

const { SiteFooter } = await import("@/components/ui/site-footer");
const { FIND_ME_EMAIL, GITHUB_URL, LINKEDIN_URL } = await import("@/data/site");

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("components/ui/site-shell.css");
const html = renderToStaticMarkup(createElement(SiteFooter));

/** The body of the first CSS rule whose selector list matches. */
const rule = (selector: RegExp) => new RegExp(selector.source + String.raw`\s*\{([^}]*)\}`).exec(css)?.[1] ?? "";

describe("Find me: three icon chips that open into their word", () => {
  const chips = [...html.matchAll(/<a href="([^"]*)"[^>]*class="site-find"[^>]*>([\s\S]*?)<\/a>/g)];

  it("is GitHub, LinkedIn and email, in that order, each with an icon and its word", () => {
    expect(chips.map((m) => m[1])).toEqual([GITHUB_URL, LINKEDIN_URL, `mailto:${FIND_ME_EMAIL}`]);
    // The same address andliu.dev's footer mails (andliu-portfolio/lib/site.ts EMAIL).
    expect(FIND_ME_EMAIL).toBe("zeus.andrewliu@gmail.com");
    for (const [, , inner] of chips) expect(inner).toMatch(/<svg/);
    expect(chips.map((m) => /<span class="site-find-label">([^<]*)<\/span>/.exec(m[2])?.[1])).toEqual([
      "GitHub",
      "LinkedIn",
      "Email",
    ]);
  });

  it("opens GitHub and LinkedIn in a new tab but not the mail link, which would leave an empty tab", () => {
    expect(chips.map((m) => /target="_blank"/.test(m[0]))).toEqual([true, true, false]);
  });

  it("hides the word at rest by clipping it, so it stays the link's name", () => {
    const rest = rule(/\.site-find-label/);
    expect(rest).toMatch(/max-width:\s*0/);
    expect(rest).toMatch(/overflow:\s*hidden/);
    expect(rest).not.toMatch(/display:\s*none/);
  });

  it("opens the word on hover, on keyboard focus, and always on a touch screen", () => {
    expect(css).toMatch(/@media \(hover: hover\)\s*\{[^@]*\.site-find:hover \.site-find-label\s*\{[^}]*max-width:\s*8rem/);
    expect(rule(/\.site-find:focus-visible \.site-find-label/)).toMatch(/max-width:\s*8rem/);
    expect(css).toMatch(/@media \(hover: none\)\s*\{\s*\.site-find \.site-find-label\s*\{[^}]*max-width:\s*8rem/);
  });

  it("is at least 44 by 44 and stops sliding under Reduce motion", () => {
    const chip = rule(/\n\.site-find/);
    expect(chip).toMatch(/min-width:\s*44px/);
    expect(chip).toMatch(/min-height:\s*44px/);
    expect(rule(/html\[data-motion="reduced"\] \.site-find,\s*html\[data-motion="reduced"\] \.site-find-label/)).toMatch(
      /transition:\s*none/,
    );
  });
});

describe("the FAQ is hard to miss", () => {
  it("is its own card, once, not a line in the list", () => {
    const faqLinks = [...html.matchAll(/<a href="#\/faq"[^>]*>/g)];
    expect(faqLinks).toHaveLength(1);
    expect(faqLinks[0][0]).toMatch(/class="site-foot-faq /);
    expect(html).toMatch(/Read the FAQ/);
  });

  it("presses like every pressable: a ledge that it sinks onto", () => {
    expect(rule(/\n\.site-foot-faq/)).toMatch(/box-shadow:\s*0 4px 0 var\(--site-foot-faq-edge\)/);
    expect(rule(/\n\.site-foot-faq:active/)).toMatch(/translate:\s*0 4px/);
    expect(rule(/html\[data-motion="reduced"\] \.site-foot-faq:active/)).toMatch(/translate:\s*none/);
  });
});

describe("the footer comes up from under the page", () => {
  it("draws the seam before the footer, and marks the footer for the shell's focus ring", () => {
    expect(html.indexOf('class="site-seam"')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('class="site-seam"')).toBeLessThan(html.indexOf("<footer"));
    expect(html).toMatch(/<footer class="site-footer /);
  });

  it("sits one layer under the page, on its own opaque ground", () => {
    const foot = rule(/\n\.site-footer/);
    expect(foot).toMatch(/z-index:\s*-2/);
    expect(foot).toMatch(/background:\s*var\(--site-foot\)/);
    expect(rule(/#root:has\(> \.site-footer\)/)).toMatch(/isolation:\s*isolate/);
  });

  it("sticks only when it fits and motion is on, and never behind the phone bar", () => {
    expect(rule(/html:not\(\[data-motion="reduced"\]\) \.site-footer\[data-fits\]/)).toMatch(/position:\s*sticky/);
    expect(css).toMatch(/bottom:\s*calc\(var\(--site-bar-h\) \+ env\(safe-area-inset-bottom\)\)/);
    // Server render: nothing measured yet, so it starts in flow.
    expect(html).not.toMatch(/data-fits/);
  });

  it("carries the wash up with the page, inside the page layer SiteChrome draws", () => {
    const wash = rule(/\.site-page > \.site-wash/);
    expect(wash).toMatch(/position:\s*sticky/);
    expect(wash).toMatch(/margin-bottom:\s*-100vh/);
    // Clipped at its own bottom, or the -100vh margin lets the wash ride over the footer.
    expect(rule(/\n\.site-page/)).toMatch(/overflow-y:\s*clip/);
    expect(read("components/SiteChrome.tsx")).toMatch(/className=\{framed \? "site-page" : undefined\}/);
  });
});
