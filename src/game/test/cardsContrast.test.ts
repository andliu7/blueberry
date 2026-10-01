/**
 * The Cards stylesheet's colours, measured from the files that paint them.
 *
 * RE-PINS cardsScene.test's contrast check, which held the old deck tray's
 * decorative props to the 3.0 graphics floor and went with the tray. The
 * rebuild's new colours are the mastery strip, the forecast and the grade
 * chips, and they carry meaning, so they are held to the same floors: every
 * strip cell's edge is at least 3.0 against the card in both themes (the
 * edge is the mark a student sees; the fill only tells states apart), and
 * every text-on-fill pair is at least 4.5.
 *
 * It READS cards.css and theme.css rather than copying hexes here, because a
 * table of colours beside the stylesheet is a copy, and copies drift.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REACTIONS, REAGENT_ART } from "../../data/reactions";
import { PREDICT_ANSWERS, PREDICT_DISTRACTORS } from "../cards/predictDistractors.generated";

const CARDS = readFileSync(fileURLToPath(new URL("../cards/ui/cards.css", import.meta.url)), "utf8");
const THEME = readFileSync(fileURLToPath(new URL("../theme.css", import.meta.url)), "utf8");

/** The declarations of the first rule whose selector is exactly `selector`, and that declares `probe`. */
function block(css: string, selector: string, probe: string): string {
  const pattern = new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "g");
  for (const match of css.matchAll(pattern)) {
    if ((match[2] ?? "").includes(probe)) return match[2] ?? "";
  }
  throw new Error(`no ${selector} block declaring ${probe}`);
}

function token(declarations: string, name: string): string {
  const match = declarations.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (match?.[1] === undefined) throw new Error(`${name} is not a plain hex here`);
  return match[1];
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = [
  { name: "light", cards: block(CARDS, ":root", "--cell-due-edge"), theme: block(THEME, ":root", "--bb-card:") },
  { name: "dark", cards: block(CARDS, ".dark", "--cell-due-edge"), theme: block(THEME, ".dark", "--bb-card:") },
] as const;

const STATES = ["new", "learning", "due", "young", "mastered", "suspended"] as const;

describe.each(THEMES)("the $name theme", ({ name, cards, theme }) => {
  const card = token(theme, "--bb-card");
  // The dark block restates only what changes; anything it leaves out is
  // inherited from the light block, as the browser would resolve it.
  const light = THEMES[0].cards;
  const cardsToken = (tokenName: string) => (cards.includes(`${tokenName}:`) ? token(cards, tokenName) : token(light, tokenName));

  it.each(STATES)("the %s cell's edge clears the 3.0 graphics floor on the card", (state) => {
    const edge = cards.includes(`--cell-${state}-edge: var(`) ? null : cardsToken(`--cell-${state}-edge`);
    expect(edge, `${name} ${state}`).not.toBeNull();
    expect(ratio(edge as string, card)).toBeGreaterThanOrEqual(3);
  });

  it("the grade chips' ink clears 4.5 on Hard and Easy", () => {
    const ink = token(theme, "--chip-ink");
    expect(ratio(ink, token(light, "--grade-hard"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(ink, token(light, "--grade-easy"))).toBeGreaterThanOrEqual(4.5);
  });

  it("the acid and base chips read at 4.5 or better", () => {
    expect(ratio(cardsToken("--rxn-acid-ink"), cardsToken("--rxn-acid"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(cardsToken("--rxn-base-ink"), cardsToken("--rxn-base"))).toBeGreaterThanOrEqual(4.5);
  });

  it("the Remove card red reads at 4.5 on the sheet it sits on", () => {
    // .cards-sheet__panel paints --bb-background.
    expect(ratio(token(theme, "--bb-destructive"), token(theme, "--bb-background"))).toBeGreaterThanOrEqual(4.5);
  });

  it("Good and the start button, green as a fill under dark ink, clear 4.5", () => {
    expect(ratio(token(theme, "--progress-ink"), token(theme, "--progress"))).toBeGreaterThanOrEqual(4.5);
  });

  /* THE HOME, added round 2: the dark "6 due" pill measured 2.33:1 at 12px
     and this file never looked at it. A token is resolved the way the browser
     does: this theme's block first, then the light one, then theme.css, and a
     var() is followed to the hex it names. */
  const themeLight = THEMES[0].theme;
  const resolve = (tokenName: string): string => {
    for (const source of [cards, light, theme, themeLight]) {
      const match = source.match(new RegExp(`${tokenName}:\\s*([^;]+);`));
      if (match?.[1] === undefined) continue;
      const value = match[1].trim();
      const ref = value.match(/^var\((--[\w-]+)\)$/);
      return ref?.[1] === undefined ? value : resolve(ref[1]);
    }
    throw new Error(`${tokenName} is not declared`);
  };
  const declared = (selector: string, property: string): string => {
    const rule = block(CARDS, selector, property);
    const match = rule.match(new RegExp(`(^|[;\\s])${property}:\\s*var\\((--[\\w-]+)\\)`));
    if (match?.[2] === undefined) throw new Error(`${selector} ${property} is not a var()`);
    return resolve(match[2]);
  };

  it("the deck's due pill reads at 4.5 or better", () => {
    expect(ratio(declared(".due-pill", "color"), declared(".due-pill", "background"))).toBeGreaterThanOrEqual(4.5);
  });

  it("the home's muted words read at 4.5 on the card and on the page", () => {
    const muted = token(theme, "--bb-muted-foreground");
    expect(ratio(muted, card)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(muted, token(theme, "--bb-background"))).toBeGreaterThanOrEqual(4.5);
  });

  it("every forecast bar is visible on the card, by its fill or by its edge", () => {
    for (const [fill, edge] of [
      ["--chip-face", "--chip-edge"],
      ["--progress", "--progress-edge"],
    ] as const) {
      const best = Math.max(ratio(resolve(fill), card), ratio(resolve(edge), card));
      expect(best, `${name} ${fill}`).toBeGreaterThanOrEqual(3);
    }
  });

  it("the after-pick badges read at 4.5 or better", () => {
    expect(ratio(declared(".predict__badge--right", "color"), declared(".predict__badge--right", "background"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(declared(".predict__badge--picked", "color"), declared(".predict__badge--picked", "background"))).toBeGreaterThanOrEqual(4.5);
  });
});

it("never paints Again or a wrong call in the error ramp", () => {
  // The one legitimate use of the destructive red (--bb-destructive) in this sheet is the Remove card button.
  const uses = [...CARDS.matchAll(/var\(--bb-destructive\)/g)].length;
  const inDanger = [...block(CARDS, ".cards-danger", "--bb-destructive").matchAll(/var\(--bb-destructive\)/g)].length;
  expect(inDanger).toBeGreaterThan(0);
  expect(uses).toBe(inDanger);
});

/* GLYPHS INSIDE THE DRAWINGS, round 3. Everything above reads CSS; the atom
   labels RDKit draws live in the SVG files, and nobody measured them: the
   round 2 critic found a blue N at 3.53:1 on the dark Product tile and 6px
   labels on the options and reagents. These read the shipped files the cards
   point at, every fill and every label, in both themes. */
describe("the atom labels inside the card drawings", () => {
  const PUBLIC = (path: string) => readFileSync(fileURLToPath(new URL(`../../../public/${path}`, import.meta.url)), "utf8");
  const ROOT_PX = 16;

  /** Each atom label's fill, and its tallest glyph in viewBox units (the letter, not a subscript). */
  function labels(svg: string): { fill: string; height: number }[] {
    const groups = new Map<string, { fill: string; height: number }>();
    for (const match of svg.matchAll(/<path class='(atom-\d+)' d='([^']*)' fill='(#[0-9A-Fa-f]{6})'/g)) {
      const numbers = [...(match[2] ?? "").matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      const ys = numbers.filter((_, index) => index % 2 === 1);
      const height = Math.max(...ys) - Math.min(...ys);
      const key = match[1] ?? "";
      const previous = groups.get(key);
      if (previous === undefined || height > previous.height) groups.set(key, { fill: match[3] ?? "", height });
    }
    return [...groups.values()];
  }

  function viewBoxHeight(svg: string): number {
    const match = svg.match(/viewBox='0 0 [\d.]+ ([\d.]+)'/);
    if (match?.[1] === undefined) throw new Error("no viewBox");
    return Number(match[1]);
  }

  /** A rem height declared in cards.css, in CSS px. */
  function remHeight(selector: string, property: string): number {
    const match = block(CARDS, selector, property).match(new RegExp(`(^|[;\\s])${property}:\\s*([\\d.]+)rem`));
    if (match?.[2] === undefined) throw new Error(`${selector} ${property} is not in rem`);
    return Number(match[2]) * ROOT_PX;
  }

  /** color-mix(in srgb, a p%, b): a straight per-channel mix, as the browser does it in sRGB. */
  function mix(a: string, share: number, b: string): string {
    const channel = (hex: string, i: number) => Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return `#${[0, 1, 2]
      .map((i) => Math.round(channel(a, i) * share + channel(b, i) * (1 - share)).toString(16).padStart(2, "0"))
      .join("")}`;
  }

  const options = PREDICTED_OPTIONS();
  const reagents = DRAWN_REAGENTS();

  function PREDICTED_OPTIONS(): { light: string; dark: string }[] {
    const all = [...Object.values(PREDICT_ANSWERS), ...Object.values(PREDICT_DISTRACTORS).flat()];
    return all.map((entry) => ({ light: entry.light ?? "", dark: entry.dark ?? "" }));
  }

  function DRAWN_REAGENTS(): { light: string; dark: string }[] {
    return Object.values(REAGENT_ART).map((entry) => ({ light: entry.light ?? "", dark: entry.dark ?? "" }));
  }

  /** The Product tile's fill, from the rule that paints it: color-mix of two tokens. */
  function productTile(theme: (typeof THEMES)[number]): string {
    const rule = block(CARDS, ".predict__option--right", "background");
    const match = rule.match(/color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)/);
    if (match?.[1] === undefined || match[2] === undefined || match[3] === undefined) throw new Error("Product tile is not a two-token mix");
    const hex = (name: string) => token(theme.theme.includes(`${name}:`) ? theme.theme : THEMES[0].theme, name);
    return mix(hex(match[1]), Number(match[2]) / 100, hex(match[3]));
  }

  it("sets every option label at 11px or more on a phone", () => {
    const px = remHeight(".predict", "--predict-art-height");
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      for (const path of [option.light, option.dark]) {
        const svg = PUBLIC(path);
        const scale = px / viewBoxHeight(svg);
        for (const label of labels(svg)) expect(label.height * scale, path).toBeGreaterThanOrEqual(11);
      }
    }
  });

  it("sets every reagent label at 11px or more on the card", () => {
    const px = remHeight(".rxn-reagent__art", "height");
    for (const reagent of reagents) {
      for (const path of [reagent.light, reagent.dark]) {
        const svg = PUBLIC(path);
        const scale = px / viewBoxHeight(svg);
        for (const label of labels(svg)) expect(label.height * scale, path).toBeGreaterThanOrEqual(11);
      }
    }
  });

  it.each(THEMES)("holds every option label to 4.5 on the card and on the Product tile, $name", (theme) => {
    const card = token(theme.theme, "--bb-card");
    const tile = productTile(theme);
    for (const option of options) {
      const path = theme.name === "light" ? option.light : option.dark;
      for (const label of labels(PUBLIC(path))) {
        expect(ratio(label.fill, card), `${path} ${label.fill} on card`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(label.fill, tile), `${path} ${label.fill} on ${tile}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it.each(THEMES)("holds every reagent and scheme label to 4.5 on the reaction panel, $name", (theme) => {
    // .rxn-panel paints --bb-muted; the reagents, the start and the product sit on it.
    const panel = token(theme.theme, "--bb-muted");
    const paths = [
      ...reagents.map((r) => (theme.name === "light" ? r.light : r.dark)),
      ...REACTIONS.flatMap((r) =>
        theme.name === "light" ? [r.art.start_light, r.art.product_light] : [r.art.start_dark, r.art.product_dark],
      ),
    ].filter((path): path is string => path !== undefined && path !== "");
    for (const path of paths) {
      for (const label of labels(PUBLIC(path))) {
        expect(ratio(label.fill, panel), `${path} ${label.fill}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
