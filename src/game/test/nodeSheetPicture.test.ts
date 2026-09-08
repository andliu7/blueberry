/**
 * ONE ASSERTION PER MEASURED DIVERGENCE, so no finding on the attempt 2
 * critic's list can be reintroduced silently.
 *
 * The critic put the goal images beside the running screen and named fourteen
 * places where the build was a different design rather than a near miss. Each
 * one is a static property of the stylesheet or the component, so each one is
 * checkable here, the same way pathwaySheetContract.test.ts and
 * canvasBackdrop.test.ts hold their surfaces: read the source, strip the
 * comments so a check reads code and never the prose describing it, assert.
 *
 * These are NOT a substitute for the blind critic, who still judges the
 * rendered look against blueberry_r5-node-sheet-v2_1788286114.png and
 * blueberry_r5-guidebook_1788286119.png. They are the ratchet under it.
 *
 * The image coordinates quoted throughout were re-taken from the committed
 * files, not copied from the critic's report; pathway-sheet.css's header
 * carries the full sampling table.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function read(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../pathway-sheet/${name}`, import.meta.url)), "utf8");
}

/** Comments describe; code decides. Every check below reads code only. */
function strip(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
/** JSX comments are `{/* ... *\/}` and survive the block-comment strip's braces. */
function stripJsx(source: string): string {
  return strip(source).replace(/\{\s*\}/g, "");
}

const CSS = strip(read("pathway-sheet.css"));
const SHEET = stripJsx(read("NodeSheet.tsx"));
const BOOK = stripJsx(read("Guidebook.tsx"));
const WRAPPER = stripJsx(read("SectionBerry.tsx"));
const GLYPH = strip(read("MoleculeGlyph.tsx"));
const CONTENT = strip(read("guidebookContent.ts"));

/** The declaration block for one selector, brace matched from its first `{`. */
function block(css: string, selector: string): string {
  // Anchored at a line start, so ".gb-callout" does not match the nested
  // ".gb-figrow .gb-callout" rule that happens to appear first.
  const at = css.indexOf(`
${selector} {`);
  expect(at, `selector present: ${selector}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

function lengthPx(declarations: string, property: string): number {
  const match = declarations.match(new RegExp(`${property}:\\s*(-?[\\d.]+)(px|rem)`));
  expect(match, `${property} declared with a px or rem length`).not.toBeNull();
  const value = Number(match![1]);
  return match![2] === "rem" ? value * 16 : value;
}

describe("the sheet reads as the same design as the picture", () => {
  it("the card fill is the sheet's own cream, never a white slab in a navy hairline", () => {
    // Sampled: card #f7f3e8 at (300,880) on a #f6f2e7 sheet at (384,700).
    const card = block(CSS, ".ns-card");
    expect(card).toContain("background: var(--ns-card-fill)");
    expect(card).not.toContain("var(--bb-card)");
    expect(card).not.toMatch(/border:\s*\d+px solid/);
  });

  it("there is no scrim: the pathway behind the sheet stays undimmed", () => {
    // Sampled: ground above the sheet #f5f1e5 at (384,300) against #f6f2e7
    // inside it, a two-point delta, and the header's flame and gem read at
    // full saturation. A 30 percent black wash is a different picture.
    const backdrop = block(CSS, ".ns-sheet::backdrop");
    expect(backdrop).toContain("background: transparent");
    expect(backdrop).not.toMatch(/rgb\(0 0 0 \/ 0\.[1-9]/);
  });

  it("the sheet ends at the tab bar rather than filling the viewport", () => {
    // Measured: sheet bottom edge at image y 1101, which is the tab bar's top
    // edge, and Path / Train / Cards / Me stay legible below it.
    const sheet = block(CSS, ".ns-sheet");
    expect(sheet).toMatch(/bottom:\s*var\(--ns-bottom-inset\)/);
    expect(sheet).not.toMatch(/inset:\s*0/);
    expect(sheet).not.toMatch(/height:\s*100dvh/);
    // The inset has to be a real bar height, not a token that resolves to nil.
    const inset = sheet.match(/--ns-bottom-inset:\s*calc\(([\d.]+)rem/);
    expect(inset, "the inset is a real bar height, not a token resolving to nil").not.toBeNull();
    expect(Number(inset![1]) * 16).toBeGreaterThanOrEqual(64);
  });

  it("the head is ONE row: mark, title, hamburger, and nothing under the title", () => {
    // Verified on the image by a dark-pixel scan: the strip from y 725 to 756
    // is empty of ink. The kind label and the cleared chip moved to the
    // dialog's accessible name, which costs no ink.
    expect(SHEET).not.toContain("ns-kind");
    expect(SHEET).not.toContain("ns-cleared");
    expect(CSS).not.toContain(".ns-kind");
    expect(CSS).not.toContain(".ns-cleared");
    expect(SHEET).toMatch(/aria-label=\{model === null \? "Lesson" :/);
  });

  it("the Practice card holds exactly two rows, with no body copy between them", () => {
    // Image: "Practice" plus four pips, then START. 758..897, so 100 css px.
    // The blurb paragraph made the built card 165 css px, 65 percent taller.
    const practice = SHEET.slice(SHEET.indexOf('aria-label={`Practice.'), SHEET.indexOf("model.challenge.enabled"));
    expect(practice).not.toContain("node.blurb");
    expect(practice).toContain("<Pips");
    expect(practice).toContain("ns-start");
  });

  it("the Challenge marks ride a SECOND row, not the heading row", () => {
    // Image: icons scanned at x 170..263, y 1000..1030, left aligned at the
    // card's own padding; the heading's ink sits at y 944..958.
    for (const marks of SHEET.matchAll(/<span className="ns-marks"/g)) {
      const before = SHEET.slice(0, marks.index);
      const openRows = (before.match(/<div className="ns-card__row">/g) ?? []).length;
      const closedRows = (before.match(/<\/div>/g) ?? []).length;
      expect(openRows, "the marks are outside every card__row").toBeLessThanOrEqual(closedRows);
    }
    expect(SHEET).not.toContain("ns-card__end");
    expect(CSS).not.toContain(".ns-card__end");
  });

  it("the berry is centred on the sheet and cropped by the sheet's own edge", () => {
    // Image: blue bbox x 297..461, cx 379 against a screen centre of 388, and
    // a bottom at 1109 against a sheet edge at 1101, so it straddles the edge.
    const peek = block(CSS, ".ns-peek");
    expect(peek).not.toContain("margin-left");
    expect(peek).toContain("left: 50%");
    expect(peek).toContain("translateX(-50%)");
    // Negative, so the berry spills past the sheet edge into the tab bar.
    expect(lengthPx(peek, "bottom")).toBeLessThan(0);
    // Nothing between the berry and the sheet edge may clip it: the peek is a
    // child of the dialog, and the dialog does not hide its overflow.
    expect(block(CSS, ".ns-sheet")).toContain("overflow: visible");
    const panelClose = SHEET.indexOf("</div>\n          </div>");
    expect(SHEET.indexOf('className="ns-peek"')).toBeGreaterThan(panelClose);
  });

  it("the difficulty pips are a quiet warm grey, not the heaviest ink on the card", () => {
    // Sampled #908a7a across both filled pips at row y 796.
    const filled = block(CSS, ".ns-pip.is-filled");
    expect(filled).toContain("var(--ns-quiet-mark)");
    expect(filled).not.toContain("var(--bb-foreground)");
    expect(CSS).toMatch(/--ns-quiet-mark:\s*color-mix\(/);
  });

  it("the Challenge card is half the Practice card's width, as drawn", () => {
    // Measured above the mascot, where nothing occludes it: right edge at
    // image x 381 against the practice card's 628.
    const half = block(CSS, ".ns-card--half");
    expect(half).toMatch(/width:\s*50%/);
    expect(half).toContain("align-self: flex-start");
  });
});

describe("the guidebook reads as the same design as the picture", () => {
  it("the back control is an arrow with a shaft, wider than it is tall", () => {
    // Image: dark-pixel bbox 27 wide by 22 tall. The bare chevron the build
    // drew was about 8 by 15, taller than wide: a different motif.
    const glyph = BOOK.slice(BOOK.indexOf("function BackGlyph"), BOOK.indexOf("function PageProps"));
    const path = glyph.match(/d="([^"]+)"/);
    expect(path, "BackGlyph draws a path").not.toBeNull();
    // A shaft is an explicit horizontal run; the chevron had none.
    expect(path![1]).toMatch(/H[\d.]/);
  });

  it("the KEY IDEA callout is a soft fill with no outline", () => {
    // Image: a column scan at x 500 crosses its top edge at y 582 with a
    // six-point soft transition and no dark stroke.
    const callout = block(CSS, ".gb-callout");
    expect(callout).toContain("border: 0");
    expect(callout).not.toContain("var(--bb-border)");
    expect(callout).toContain("background: var(--tab-active)");
  });

  it("the explainer shapes are muted, and spend neither the brand nor the progress semantic", () => {
    // DESIGN-GOALS: light green is the PROGRESS semantic everywhere, and a
    // triangle in a schematic is not a completed node, a filled bar, a
    // correct state or a checkmark.
    const figure = BOOK.slice(BOOK.indexOf("function ExplainerFigure"), BOOK.indexOf("function StripArt"));
    expect(figure).not.toMatch(/fill="var\(--progress\)"/);
    expect(figure).not.toMatch(/fill="var\(--bb-primary\)"/);
    expect(figure).not.toMatch(/fill="var\(--chip-face\)"/);
    // Every shape still carries its outline, so the audit resolves it there.
    const shapes = figure.match(/<(circle|rect|polygon)[^>]*fill="[^"]*color-mix[^"]*"[^>]*>/gs) ?? [];
    expect(shapes.length, "three muted outcome shapes").toBe(3);
  });

  it("the page ends on a MASCOT BLOCK, not on a fourth card", () => {
    /*
       RE-SPECIFIED against a re-scan of the reference, and it is stricter
       than the check it replaces rather than looser. The old version asserted
       only that a fourth SECTION existed, and a "Before you start" checklist
       CARD satisfied it. Re-scanning the reference at x 132..190, y 1024..1084
       finds the page's last block is a leafed berry beside a heading, with no
       card boundary anywhere below the worked example, and DESIGN-GOALS locks
       this page at three parts: explainer, key-idea callout, numbered
       worked-example strip. A fourth card is a fourth part. So the check now
       names the shape the picture has AND forbids the one it does not: the
       old assertion passed on the rejected composition, this one cannot.
    */
    expect(CONTENT).toContain("closing");
    expect(BOOK).toContain("content.closing.heading");
    expect(BOOK).toContain("content.closing.line");
    const heads = BOOK.match(/className="gb-section-head/g) ?? [];
    expect(heads.length, "two section headers in the same treatment").toBe(2);
    // The fourth card, by name, so it cannot come back quietly.
    expect(CSS).not.toContain(".gb-checks");
    expect(BOOK).not.toContain("gb-checks");
    expect(CONTENT).not.toContain("checklist");
  });

  it("both section-head berries carry the reference's leaf", () => {
    // Re-scanned: the sheet's peek and the guidebook's two section heads all
    // draw a green leaf beside the calyx (peek leaf at image x 398..442 y
    // 1007..1038, guidebook head leaf at x 162..178 y 1032..1044). The build
    // drew a bare blue face at all three. The leaf is an accessory layer
    // AROUND the imported mark, per D4; see BerryLeaf.tsx.
    // The wrapper moved to its own file: while it lived in Guidebook.tsx the
    // "no bare Berry" guard below matched the wrapper's OWN body, firing on the
    // very mechanism it exists to protect. Extracting it lets both halves hold
    // at full strength, and the guard is now STRICTER than it was: not "no bare
    // Berry with a sizePx", but no bare Berry in the guidebook at all.
    expect(WRAPPER).toContain("<BerryLeaf");
    expect(SHEET).toContain("<BerryLeaf");
    // Every Berry in the guidebook goes through the leafed wrapper, so a new
    // section cannot quietly drop the leaf again.
    expect(BOOK).not.toMatch(/<Berry/);
    const wrapped = BOOK.match(/<SectionBerry\b/g) ?? [];
    expect(wrapped.length, "both heads use the leafed wrapper").toBe(2);
  });

  it("the peek is a leafed dome with hands ON the sheet edge", () => {
    /*
       The reference's berry is not a sphere sitting on the bar. A per-pixel
       scan of x 280..480, y 990..1115 finds a body x 324..444 cut FLAT at
       y 1101, which is the sheet's own bottom edge, and two blue blobs
       centred (314,1100) and (443,1100) that straddle that line and hang to
       y 1114. So the body stops at the edge and the HANDS are the only part
       that crosses it. The build ran the whole body past the edge until the
       tab bar's 2 px rule cut it.
    */
    expect(SHEET).toContain("<BerryHands");
    const crop = block(CSS, ".ns-peek__crop");
    expect(crop).toContain("overflow: hidden");
    // The wrapper spills past the sheet edge; the crop's own bottom margin
    // takes that spill back, so the crop line lands ON the edge.
    const spill = -lengthPx(block(CSS, ".ns-peek"), "bottom");
    expect(spill, "the wrapper spills past the sheet edge").toBeGreaterThan(0);
    expect(lengthPx(crop, "margin-bottom"), "the crop takes the spill back").toBe(spill);
    // The hands sit in that spill and are NOT clipped by the crop.
    const hands = block(CSS, ".ns-peek__hands");
    expect(hands).toContain("position: absolute");
    expect(hands).not.toContain("overflow: hidden");
  });

  it("the environment is THREE terraced steps and an antenna, not one dome", () => {
    /*
       REWRITTEN against the corrected build. The old version of this check
       asserted a single `.gb-prop__hill`, which is the shape the round 2
       critic rejected: "one 272x160 semicircular dome right-anchored behind
       the callout only, one more dome far below at the checklist head, no
       third step and no antenna". The picture draws a broad low SHOULDER
       whose crest runs from behind the figure card off the right edge, a
       second lower step behind the callout, a third rising from the left
       under Worked Example, and a thin curled antenna on the first crest.
       So the check now names all four, and it is stricter than the one it
       replaces rather than looser: the old assertion passed on the rejected
       composition and this one cannot.
    */
    expect(BOOK).toContain("function FigureProps");
    expect(BOOK).toContain("function TailProps");
    expect(BOOK).not.toContain("function PageProps");
    // The rejected shape, by name.
    expect(CSS).not.toContain("gb-prop__hill");
    const prop = block(CSS, ".gb-prop");
    expect(prop).toContain("position: absolute");
    expect(prop).toContain("z-index: -1");
    // The anchors are the sections themselves, so a title that wraps to two
    // lines moves every prop with the content instead of stranding it.
    // Line endings are normalised: this file is CRLF on Windows and the old
    // check compared against LF, which is why it failed on a correct build.
    const lines = CSS.replace(/\r\n/g, "\n").split("\n").join("|");
    expect(lines).toContain(".gb-figrow,|.gb-section-head {|  position: relative;");
    // Step one hugs the figure row it sits behind rather than floating above
    // the H1, which is where the rejected dome sat.
    const stepOne = lengthPx(block(CSS, ".gb-prop--figrow .gb-prop__step-one"), "top");
    expect(Math.abs(stepOne), "the first crest hugs the figure row").toBeLessThan(24);
    for (const part of ["gb-prop__step-two", "gb-prop__antenna", "gb-prop__step-three"]) {
      expect(CSS, `${part} is drawn`).toContain(part);
      expect(BOOK, `${part} is placed`).toContain(part);
    }
    // The third step rises from the LEFT, the mirror of the first, so the
    // page reads as descending terraces rather than the same shape twice.
    expect(block(CSS, ".gb-prop--tail .gb-prop__step-three")).toMatch(/left:\s*-?[\d.]+rem/);
    expect(block(CSS, ".gb-prop--figrow .gb-prop__step-one")).toMatch(/right:\s*-?[\d.]+rem/);
  });
});

describe("one motif, one mark", () => {
  it("the sheet head and the guidebook badge draw the SAME component", () => {
    expect(GLYPH).toContain("export function MoleculeGlyph");
    for (const [name, source] of [
      ["NodeSheet.tsx", SHEET],
      ["Guidebook.tsx", BOOK],
    ] as const) {
      expect(source, `${name} imports the shared glyph`).toContain('from "./MoleculeGlyph"');
      expect(source, `${name} draws it`).toContain("<MoleculeGlyph />");
      expect(source, `${name} defines no copy of it`).not.toMatch(/function (Molecule|Badge)Glyph/);
    }
  });

  it("the motif is a TWO CENTRE skeleton, not a four-around-one star", () => {
    /*
       The round 2 critic's finding, and the whole reason this mark was
       redrawn: the build was "a symmetric ONE-CENTRE X, four satellites at 90
       degrees around a --bb-primary violet hub". The picture is an asymmetric
       two-centre ball and stick, mauve bonded to slate blue, each carrying
       two small satellites, in a box wider than it is tall.
    */
    const box = GLYPH.match(/viewBox="0 0 (\d+) (\d+)"/);
    expect(box, "the mark declares its own box").not.toBeNull();
    expect(Number(box![1]), "wider than tall, as the bbox measures").toBeGreaterThan(Number(box![2]));

    type Atom = { readonly cx: number; readonly cy: number; readonly r: number };
    const atoms: Atom[] = [...GLYPH.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)]
      .map((m) => ({ cx: Number(m[1]), cy: Number(m[2]), r: Number(m[3]) }));
    expect(atoms.length, "two centres and four satellites").toBe(6);
    const byRadius = [...atoms].sort((a, b) => b.r - a.r);
    const [centreA, centreB] = byRadius as [Atom, Atom, ...Atom[]];
    const satellites = byRadius.slice(2);
    // The two centres are bonded to each other and sit apart horizontally.
    expect(Math.abs(centreA.cx - centreB.cx)).toBeGreaterThan(8);
    // Every satellite is smaller than every centre, so the hierarchy reads.
    for (const s of satellites) expect(s.r).toBeLessThan(centreB.r);
    // Two satellites hang off each centre, which is what makes it asymmetric
    // rather than a star: split them by which centre is nearer.
    const near = (s: Atom, c: Atom) => Math.hypot(s.cx - c.cx, s.cy - c.cy);
    const nearer = satellites.map((s) => (near(s, centreA) < near(s, centreB) ? 0 : 1));
    expect(nearer.filter((n) => n === 0)).toHaveLength(2);
    expect(nearer.filter((n) => n === 1)).toHaveLength(2);
  });

  it("the mark is muted, and spends no HUD semantic on decoration", () => {
    // The rejected build filled saturated cyan (--diamond), orange-red
    // (--streak), periwinkle (--chip-face) and bright violet under a near
    // black stroke, which put the gem and streak meanings inside a lesson
    // mark. Every fill is now a derived ns-atom token.
    for (const token of ["--diamond", "--streak", "--bb-primary-bright"]) {
      expect(GLYPH, `${token} is not spent here`).not.toContain(`var(${token})`);
    }
    const fills = GLYPH.match(/fill="var\(--[a-z-]+\)"/g) ?? [];
    expect(fills.length, "every atom fill comes from the mark's own family").toBe(6);
    for (const fill of fills) expect(fill).toMatch(/fill="var\(--ns-atom-[a-z]+\)"/);
    // A near-ground cream fill renders as a hole, so every atom keeps a rim.
    const atoms = GLYPH.match(/<circle[^/]*\/>/g) ?? [];
    expect(atoms.length).toBe(6);
    for (const atom of atoms) expect(atom).toContain('stroke="var(--ns-atom-rim)"');
    // The rim is the mark's own warm grey, lighter than the title beside it,
    // not the 2.2 px near black the rejected build stroked.
    const rimWidths = [...GLYPH.matchAll(/strokeWidth="([\d.]+)"/g)].map((m) => Number(m[1]));
    for (const w of rimWidths) expect(w, "thin rims").toBeLessThanOrEqual(2);
  });

  it("the goal green is not spent on decoration anywhere in this surface", () => {
    // FILL-ONLY is about where the green may sit; this is about what it MEANS.
    // Nothing here reports progress, so nothing here wears the progress fill.
    for (const source of [GLYPH, SHEET]) {
      expect(source).not.toContain("var(--progress)");
      expect(source).not.toContain("var(--progress-deep)");
    }
  });
});
