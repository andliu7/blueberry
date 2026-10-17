import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteNavLinks } from "@/components/ui/site-nav";
import { PRESS } from "@/components/ui/site-nav-events";

/**
 * The nav item's press and current state (shell round 2, 2026-10-07; round 4 drew the
 * glyphs, made the press show at frame 0 and took the outline off the current tab).
 *
 * The site suite runs in node with no DOM (vitest.config.ts says why), so this pins
 * the three things that make the state work from their sources: the markup carries
 * the classes and `aria-current` the stylesheet keys on, the stylesheet's press rule
 * sinks 2px in --bb-dur-press with no movement under reduced motion, and the current
 * tab's colours, read from the token files, clear WCAG's 3:1 for a UI component in
 * both themes. The browser measurement (transform 80ms after pointer down) is in the
 * shell round 2 log; this is the part that cannot silently regress.
 */

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const shellCss = read("components/ui/site-shell.css").replace(/\/\*[\s\S]*?\*\//g, "");
const tokensCss = read("tokens.css").replace(/\/\*[\s\S]*?\*\//g, "");
const indexCss = read("index.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** The declarations of the rule whose selector list includes exactly `selector`. */
function rule(css: string, selector: string): string {
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.split(",").some((one) => one.trim() === selector)) return body;
  }
  throw new Error(`no rule ${selector}`);
}

/** The value a custom property ends up with for `:root` or `.dark`: the last one wins. */
function token(css: string, block: ":root" | ".dark", name: string): string | undefined {
  let value: string | undefined;
  for (const [, sel, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (sel.trim() !== block) continue;
    const m = new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(body);
    if (m) value = m[1];
  }
  return value;
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}
function hue(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe("the nav item answers a press", () => {
  it("sinks by the 3px lip on pointer down, in the press duration, under 80ms", () => {
    const pressed = rule(shellCss, ".site-nav-item:active .site-nav-face");
    expect(pressed).toMatch(/translate:\s*0 3px/);
    expect(pressed).toMatch(/translate var\(--bb-dur-press\)/);
    const ms = Number(/--bb-dur-press:\s*(\d+)ms/.exec(tokensCss)?.[1]);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(80);
  });

  it("changes at frame 0: the wash snaps with no transition, the sink follows", () => {
    // Round 3's press was pixel-identical to rest on the first frame (critic): every
    // property eased in over 60ms. Now the colour has a 0s transition.
    const pressed = rule(shellCss, ".site-nav-item:active .site-nav-face");
    expect(pressed).toMatch(/background-color 0s/);
    // Round 5: tab items are flat (rule 5). No lip at rest, on the current chip, or in
    // the press, so nothing drops a lip that was never drawn.
    for (const sel of [".site-nav-face", '.site-nav-item[aria-current="page"] .site-nav-face', ".site-nav-item:active .site-nav-face"]) {
      expect(rule(shellCss, sel), sel).not.toMatch(/box-shadow:\s*0 \d+px 0/);
    }
    expect(tokensCss).not.toMatch(/--site-nav-ledge/);
  });

  it("changes colour on press as well, so the press still shows under reduced motion", () => {
    expect(rule(shellCss, ".site-nav-item:active .site-nav-face")).toMatch(
      /background-color:\s*var\(--site-nav-wash-press\)/,
    );
    expect(rule(shellCss, 'html[data-motion="reduced"] .site-nav-item:active .site-nav-face')).toMatch(
      /translate:\s*none/,
    );
  });

  it("answers a finger at pointer down too, on the phone bar and the header (round 6)", () => {
    // A phone holds :active back for ~260ms (critic, round 5), so every item marks itself
    // data-pressed on pointerdown, and the stylesheet draws exactly the :active press for it.
    const pressed = rule(shellCss, ".site-nav-item:active .site-nav-face");
    expect(rule(shellCss, ".site-nav-item[data-pressed] .site-nav-face")).toBe(pressed);
    expect(rule(shellCss, 'html[data-motion="reduced"] .site-nav-item[data-pressed] .site-nav-face')).toMatch(
      /translate:\s*none/,
    );
    for (const placement of ["bar", "header"] as const) {
      // Rendered as an element tree, not HTML, because event handlers do not print.
      const tree = SiteNavLinks({ route: "lessons", placement }) as { props: { children: { props: Record<string, unknown> }[] } };
      const items = tree.props.children;
      expect(items, placement).toHaveLength(5);
      for (const item of items) {
        for (const handler of ["onPointerDown", "onPointerUp", "onPointerCancel", "onPointerLeave"] as const) {
          expect(item.props[handler], `${placement} ${handler}`).toBe(PRESS[handler]);
        }
      }
    }
    // The handlers set and clear the attribute the stylesheet keys on.
    const attrs = new Map<string, string>();
    const el = { setAttribute: (k: string, v: string) => attrs.set(k, v), removeAttribute: (k: string) => attrs.delete(k) };
    const ev = { currentTarget: el } as unknown as Parameters<typeof PRESS.onPointerDown>[0];
    PRESS.onPointerDown(ev);
    expect(attrs.has("data-pressed")).toBe(true);
    for (const end of [PRESS.onPointerUp, PRESS.onPointerCancel, PRESS.onPointerLeave]) {
      PRESS.onPointerDown(ev);
      end(ev);
      expect(attrs.has("data-pressed")).toBe(false);
    }
  });

  it("puts the moving face inside every item, in both placements", () => {
    for (const placement of ["header", "bar"] as const) {
      const html = renderToStaticMarkup(createElement(SiteNavLinks, { route: "lessons", placement }));
      const items = [...html.matchAll(/<a [^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
      expect(items).toHaveLength(5);
      for (const [, cls, inner] of items) {
        expect(cls.split(" ")).toContain("site-nav-item");
        expect(inner).toContain("site-nav-face");
      }
    }
  });
});

describe("the current tab", () => {
  it("is marked with aria-current on exactly one item, in both placements", () => {
    for (const placement of ["header", "bar"] as const) {
      const html = renderToStaticMarkup(createElement(SiteNavLinks, { route: "study-decks", placement }));
      const marked = [...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/g)];
      expect(marked.map(([, inner]) => inner.replace(/<[^>]+>/g, ""))).toEqual(["Review"]);
    }
  });

  it("draws the wash chip in a 2px outline and violet words from the tokens", () => {
    const current = rule(shellCss, '.site-nav-item[aria-current="page"] .site-nav-face');
    expect(current).toMatch(/background-color:\s*var\(--site-nav-wash\)/);
    // Round 5 (owner): the chip sits inside a 2px outline, drawn as an inset ring so the
    // chip never changes size. Not a border, here or at rest. Round 6: the ring is
    // --site-nav-ring, a tint of the wash, not the full violet (contrast below).
    expect(current).toMatch(/box-shadow:\s*inset 0 0 0 2px var\(--site-nav-ring\)/);
    expect(current).not.toMatch(/border/);
    expect(rule(shellCss, ".site-nav-face")).not.toMatch(/border/);
    expect(rule(shellCss, '.site-nav-item[aria-current="page"]')).toMatch(/color:\s*var\(--site-nav-ink\)/);
    // One indicator (shell round 3): the desktop underline under the pill is gone, so no
    // current-tab rule draws a pseudo-element.
    expect(shellCss).not.toMatch(/aria-current="page"\]::(after|before)/);
  });

  it("draws one glyph per tab in its own colours, current or not", () => {
    for (const route of ["schedule", "lessons"]) {
      const html = renderToStaticMarkup(createElement(SiteNavLinks, { route, placement: "bar" }));
      const icons = [...html.matchAll(/<svg [^>]*data-tab-icon="([a-z]+)"[^>]*>/g)].map(([, id]) => id);
      expect(icons).toEqual(["learn", "practice", "review", "schedule", "me"]);
      expect(html).not.toMatch(/lucide/);
    }
    // Round 7 (requirement changed): no outline. Duolingo's bar, measured, rings no glyph;
    // the edge is a darker second tone. So the first thing each glyph paints, right after
    // its clip, is its whole silhouette in its shade tone (the 3:1 edge the loop below
    // measures, and the mark the contrast audit reads against the bar), and no shape
    // carries a shade stroke.
    const html = renderToStaticMarkup(createElement(SiteNavLinks, { route: "", placement: "bar" }));
    const header = renderToStaticMarkup(createElement(SiteNavLinks, { route: "", placement: "header" }));
    for (const markup of [html, header]) {
      for (const [, id, inner] of markup.matchAll(/<svg [^>]*data-tab-icon="([a-z]+)"[^>]*>([\s\S]*?)<\/svg>/g)) {
        // No outline: no copy of a silhouette (a clip path's shape) is stroked.
        const silhouettes = new Set([...inner.matchAll(/<clipPath [^>]*><path d="([^"]+)"/g)].map(([, d]) => d));
        for (const [, d, style] of inner.matchAll(/<path d="([^"]+)"[^>]*?(?:style="([^"]*)")?[^>]*>/g)) {
          if (silhouettes.has(d)) expect(style ?? "", `${id} silhouette`).not.toMatch(/stroke/);
        }
        expect(inner, id).not.toMatch(/vector-effect/);
        const first = /^<g[^>]*><clipPath [^>]*><path d="([^"]+)"><\/path><\/clipPath><path d="([^"]+)" style="([^"]*)"/.exec(inner);
        expect(first, `${id} paints its silhouette first`).toBeTruthy();
        expect(first![2], id).toBe(first![1]);
        expect(first![3], id).toBe(`fill:var(--site-tab-${id}-shade)`);
      }
    }
    // Round 8 (requirement changed): Duolingo's phone app, measured (log): a 44px chip (theirs
    // 45) and a 40px svg whose drawing paints 32 to 36px (siteTabInk.test.ts measures it).
    // Round 7 was a 36px svg in a 48px chip; round 6 a 30px svg in a 44px chip.
    const nav = read("components/ui/site-nav.tsx");
    expect(nav).toMatch(/<SiteTabIcon id=\{d\.id\} className="size-10" \/>/);
    expect(nav).toMatch(/<span className="site-nav-face flex size-11 /);
    expect(nav).toMatch(/<SiteTabIcon id=\{d\.id\} simple className="size-7 shrink-0" \/>/);
    const glyphs = (h: string) => [...h.matchAll(/<svg [^>]*data-tab-icon="([a-z]+)"[^>]*>([\s\S]*?)<\/svg>/g)];
    const strip = (h: string) => h.replace(/tab-[a-z]+-[A-Za-z0-9]+/g, "");
    for (const [i, [, id, inner]] of glyphs(header).entries()) {
      expect(strip(inner), `${id} desktop variant`).not.toBe(strip(glyphs(html)[i][2]));
    }
    // No shell rule paints an svg, so nothing recolours the glyph on the current tab.
    expect(shellCss).not.toMatch(/svg\s*[,{]/);
    // Every colour in the glyph file is a tab token: no hex, no other variable.
    const art = read("components/ui/site-tab-icons.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(art).not.toMatch(/#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/);
    const vars = new Set([...art.matchAll(/var\((--[a-z-]+)/g)].map(([, v]) => v));
    expect([...vars].every((v) => v.startsWith("--site-tab-"))).toBe(true);
  });

  for (const block of [":root", ".dark"] as const) {
    const theme = block === ":root" ? "light" : "dark";
    it(`reads in ${theme}: violet words on the chip, every glyph outline 3:1 on the bar and the chip`, () => {
      const card = token(indexCss, block, "--card");
      // Round 6: the phone bar sits on the page's ground, the header on the card.
      const ground = token(tokensCss, block, "--site-ground");
      const wash = token(tokensCss, block, "--site-nav-wash");
      const press = token(tokensCss, block, "--site-nav-wash-press");
      const ink = token(tokensCss, block, "--site-nav-ink");
      expect([card, ground, wash, press, ink].every(Boolean)).toBe(true);
      // The label is text: 4.5:1 on the wash at rest and pressed.
      expect(contrast(ink!, wash!)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink!, press!)).toBeGreaterThanOrEqual(4.5);
      // Round 5: every glyph's 2px outline, in its shade tone, holds WCAG 1.4.11's 3:1
      // against the bar and against the chip it sits on when current or pressed, so
      // the silhouette never fades. The face is bright and has no floor of its own.
      for (const id of ["learn", "practice", "review", "schedule", "me"]) {
        const shade = token(tokensCss, block, `--site-tab-${id}-shade`) ?? token(tokensCss, ":root", `--site-tab-${id}-shade`);
        expect(shade, id).toBeTruthy();
        for (const under of [card!, ground!, wash!, press!]) {
          expect(contrast(shade!, under), `${id} outline on ${under}`).toBeGreaterThanOrEqual(3);
        }
        // One bright face in both themes: night does not redefine it.
        expect(token(tokensCss, ":root", `--site-tab-${id}`), id).toBeTruthy();
        expect(token(tokensCss, ".dark", `--site-tab-${id}`), id).toBeUndefined();
      }
      // Round 7: Me's hair cap is the head's top edge (no outline any more), so it holds
      // the same 3:1 as a shade on the same four grounds.
      const hair = token(tokensCss, block, "--site-tab-me-4");
      expect(hair).toBeTruthy();
      for (const under of [card!, ground!, wash!, press!]) {
        expect(contrast(hair!, under), `me hair on ${under}`).toBeGreaterThanOrEqual(3);
      }
      // The current chip's ring is 3:1 on the header and on the phone bar (round 6: the
      // softened tint, --site-nav-ring, replaced --site-nav-line here; the floor is the same).
      const ring = token(tokensCss, block, "--site-nav-ring");
      expect(ring).toBeTruthy();
      expect(contrast(ring!, card!)).toBeGreaterThanOrEqual(3);
      expect(contrast(ring!, ground!)).toBeGreaterThanOrEqual(3);
      // Round 8: the wash is a quiet tint of the bar it sits on, not a filled chip (critic,
      // round 7: night's #2f2a5e read as a violet button). Light is 1.13:1 on its ground,
      // Duolingo's night chip 1.22:1; the ring, not the fill, says "current".
      expect(contrast(wash!, ground!), "wash on the bar").toBeLessThanOrEqual(1.3);
      // ...and it is a tint of the wash: the same hue within 15 degrees, not the violet.
      expect(Math.abs(hue(ring!) - hue(wash!))).toBeLessThanOrEqual(15);
      // One violet, by night too: no sky blue (#aac7ff is hue 218).
      for (const c of [ink!]) {
        expect(hue(c)).toBeGreaterThanOrEqual(240);
        expect(hue(c)).toBeLessThanOrEqual(275);
      }
    });
  }
});

describe("the phone bar and the shell's focus ring (shell round 3)", () => {
  const nav = read("components/ui/site-nav.tsx");
  const barClass = /aria-label="Site, bottom bar"\s*className="([^"]*)"/.exec(nav)?.[1] ?? "";

  it("is a full-width strip on the bottom edge with a 2px rule on top, on the page's ground", () => {
    const cls = barClass.split(/\s+/);
    // Round 6: the bar is the ground, not the white card, so the rule is the one edge
    // where the page meets it (white under a lavender rule over lavender drew three).
    expect(cls).toEqual(expect.arrayContaining(["fixed", "inset-x-0", "bottom-0", "border-t-2", "bg-[var(--site-ground)]"]));
    expect(cls).not.toContain("bg-card");
    expect(cls).toContain("border-[var(--site-hairline)]");
    expect(cls).toContain("pb-[env(safe-area-inset-bottom)]");
    // Not round 2's floating card: no inset from the sides, no rounding, no 2px outline.
    expect(cls.filter((c) => /^(inset-x-[1-9]|rounded|border-2$|bottom-\[)/.test(c))).toEqual([]);
  });

  it("is 64px with its rule, Duolingo's phone app bar, and every item fills its height (round 8)", () => {
    // Round 7 was 80. Duolingo's app measures 60 above the home indicator, plus its hairline;
    // ours carries labels too, so the 62px item holds the 44px chip and a 12px label line.
    expect(/--site-bar-h:\s*4rem/.test(shellCss)).toBe(true);
    const item = /: "(flex flex-1 flex-col[^"]*)"/.exec(nav)?.[1].split(" ") ?? [];
    expect(item).toEqual(expect.arrayContaining(["self-stretch", "leading-3", "text-xs"]));
    expect(barClass).toMatch(/h-\[calc\(var\(--site-bar-h\)\+env\(safe-area-inset-bottom\)\)\]/);
  });

  it("lets the wordmark give way on a phone while a timer pill shows, so the row fits", () => {
    const rule = /\.site-header:has\(\.site-pill > \*\) \.site-wordmark\s*\{([^}]*)\}/.exec(shellCss)?.[1] ?? "";
    expect(rule).toMatch(/position:\s*absolute/);
    expect(nav).toContain('className="site-pill contents"');
    expect(nav).toMatch(/className="site-wordmark /);
  });

  it("draws a 3px focus ring on everything in the header, the bar, the footer and the page header", () => {
    // Round 7 added the shared page header: Learn's reading berry is a focusable div with
    // outline-none, and it showed nothing when Tab reached it (critic, round 6).
    const ring =
      /\.site-header :focus-visible,\s*\.site-bar :focus-visible,\s*\.site-footer :focus-visible,\s*\.page-header :focus-visible\s*\{([^}]*)\}/.exec(shellCss)?.[1] ?? "";
    expect(ring).toMatch(/outline:\s*3px solid var\(--ring\)/);
    expect(ring).toMatch(/outline-offset:\s*2px/);
    expect(nav).toMatch(/className="site-header /);
    expect(read("components/ui/site-footer.tsx")).toMatch(/"site-footer /);
    expect(read("components/ui/page-header.tsx")).toMatch(/className=\{cn\("page-header /);
  });

  it("gives every footer link and switch at least 44 by 44 (round 7: Terms was 41 wide)", () => {
    const link = /const LINK = "([^"]*)"/.exec(read("components/ui/site-footer.tsx"))?.[1] ?? "";
    expect(link.split(" ")).toEqual(expect.arrayContaining(["min-h-11", "min-w-11"]));
  });

  it("keeps the footer's berry at 44px and does not repeat the five tabs (round 4)", () => {
    const footer = read("components/ui/site-footer.tsx");
    expect(footer).toMatch(/aria-label=\{`\$\{SITE_NAME\}, home`\}\s*className="[^"]*[ "]size-11[ "]/);
    expect(footer).not.toMatch(/DESTINATIONS/);
    expect(footer).toMatch(/role="switch"/);
  });
});
