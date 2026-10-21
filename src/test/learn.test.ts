// @vitest-environment jsdom

/**
 * Learn, SITE-REPLAN.md phase 5: lessons and reactions as one destination.
 *
 * The phase's two checks (section 11), against the real router and real pages:
 *
 * 1. EVERY OLD LEARN ADDRESS LANDS ON A PAGE. Section 2's Learn rows are walked
 *    through `App` itself, not through a copy of its routing: #/lessons, every
 *    #/lessons/<section>, every #/lessons/<section>/<reaction> (for all 43
 *    reactions, under the section the data files them in), #/unit, every
 *    #/unit/<id>, #/reactions, every #/draw/<id>, and the new #/learn. Each must
 *    settle on the expected address with the expected heading, never the 404.
 *
 * 2. NO REACTION VIEW RENDERS A SMILES STRING AS TEXT (owner, 27 Sep: "always draw
 *    it out in the skeletal structure"). Every reaction's sheet is opened and all
 *    three sides read, with the reaction cards under it; then the Learn index
 *    (whose search lists every reaction) and every unit hub's reaction cards.
 *    None may contain any structure string the data carries
 *    (reactants, product, intermediates, byproducts, structure reagent tokens), nor
 *    any molecular formula the data computed.
 *
 *    ONE LIMIT, stated rather than hidden: a one-character SMILES ("O" for water,
 *    "N", "I") is letter-for-letter an ordinary word or initial, so it cannot be
 *    told apart in text and is not searched for. Every SMILES of two or more
 *    characters is. The same trap is why REAGENT_ART is a registry and not a
 *    shape test (STATUS.md, 2026-09-28).
 *
 * The draw page (#/draw/<id>) is walked in check 1 but not in check 2: after a
 * wrong attempt it prints the student's and the expected SMILES, a known open
 * item listed in the phase log, not something this phase changed.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { REACTIONS, REAGENT_ART } from "@/data/reactions";
import { REAGENT_NAMES } from "@/data/learnIndex";
import { LESSON_TOPICS, sectionForFamily } from "@/data/lessonTopics";
import { PATHWAY_UNITS } from "@/game/demo/pathwayMap";

// Known-slow file, explicit timeout (owner, 2026-10-20). These tests render
// the whole site and walk many routes, each a lazy chunk in jsdom; solo the
// slowest default-timeout test takes ~4.9 s, against the 5 s default, so a
// busy `npm test` pool timed them out and cascaded. 20 s is ~4x that. Tests
// that already set their own (30 s, 60 s) keep it. No assertion changes.
vi.setConfig({ testTimeout: 20_000 });
import { LEARN_MAP, lessonsForUnit, partHref, partsForUnit, unitForFamily } from "@/data/learnMap";
import { redirectFor } from "@/lib/redirects";
import { titleForRoute } from "@/lib/useDocumentTitle";
import { SEARCH_EXAMPLES, searchLessons, searchReactions } from "@/lib/learnSearch";
import { WORKED_EXAMPLE_REACTION, WORKED_EXAMPLE_SCHEME } from "@/data/workedExamples";
import { readdirSync, readFileSync } from "node:fs";
import { stagedReagentSteps, stageReagentArt, stageReagentLabel } from "@/game/cards/reactionCard";
import { labelShown } from "@/lib/reagentLabel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Signed out, and no staff overrides: the generated data only, and no network.
vi.mock("@/lib/useSession", () => ({ useSession: () => null }));
vi.mock("@/lib/useCourse", () => ({
  useCourse: () => ({ overrides: null, refresh: () => {} }),
  setCourseField: async () => ({ ok: true }),
}));
// The draw page's editor is Ketcher, which needs a real canvas that jsdom does not
// have. The route and the page around it are what is under test, not the editor.
vi.mock("@/components/ui/molecule-canvas", () => ({ MoleculeCanvas: () => null, default: () => null }));

const NOT_FOUND = "Looks like you're lost";
const unitName = (title: string) => title.split(" · ")[1] ?? title;

let root: Root;
let host: HTMLElement;

async function settle(until: () => boolean) {
  for (let i = 0; i < 60 && !until(); i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
  }
}

async function visit(address: string) {
  await act(async () => {
    window.location.hash = `#/${address}`;
  });
}

const cards = () => [...host.querySelectorAll('[id^="rx-"]')];
const cardText = () => cards().map((c) => c.textContent).join(" ");
const h1 = () => host.querySelector("h1")?.textContent ?? "";
const dialogTitle = () => document.querySelector('[role="dialog"] h2')?.textContent ?? "";

beforeAll(async () => {
  // jsdom has neither; the pages only use them for scroll motion.
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  window.location.hash = "#/learn";
  const { default: App } = await import("@/App");
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(createElement(App));
  });
  await settle(() => h1() === "Learn");
}, 60000);

afterAll(() => {
  act(() => root.unmount());
  host.remove();
});

/** Every old Learn address in section 2, with where it should land and its heading. */
const ADDRESSES: { from: string; to: string; heading: string; sheet?: string }[] = [
  { from: "learn", to: "#/learn", heading: "Learn" },
  { from: "lessons", to: "#/learn", heading: "Learn" },
  { from: "reactions", to: "#/learn?search=open", heading: "Learn" },
  { from: "unit", to: "#/learn", heading: "Learn" },
  ...LESSON_TOPICS.map((t) => ({ from: `lessons/${t.id}`, to: `#/lessons/${t.id}`, heading: t.title })),
  ...REACTIONS.map((r) => {
    const t = LESSON_TOPICS.find((x) => x.id === sectionForFamily(r.family))!;
    const at = `lessons/${t.id}/${r.id}`;
    return { from: at, to: `#/${at}`, heading: t.title, sheet: r.name };
  }),
  ...PATHWAY_UNITS.map((u) => ({ from: `unit/${u.id}`, to: `#/unit/${u.id}`, heading: unitName(u.title) })),
  ...REACTIONS.map((r) => ({ from: `draw/${r.id}`, to: `#/draw/${r.id}`, heading: r.name })),
];

describe("every old Learn address lands on a page", () => {
  it.each(ADDRESSES.map((a) => [a.from, a] as const))("#/%s", async (_, a) => {
    await visit(a.from);
    const landed = () =>
      window.location.hash === a.to && h1() === a.heading && (a.sheet === undefined || dialogTitle() === a.sheet);
    await settle(landed);
    expect(window.location.hash).toBe(a.to);
    expect(h1()).toBe(a.heading);
    if (a.sheet !== undefined) expect(dialogTitle()).toBe(a.sheet);
    expect(document.body.textContent).not.toContain(NOT_FOUND);
    // A redirect lands in one hop, on a live address with a tab title.
    const route = a.to.slice(2).split("?")[0]!;
    expect(redirectFor(route)).toBeNull();
    expect(titleForRoute(route)).not.toContain("Not Found");
  });
});

/** Every structure string and formula the data carries, two characters or more. */
function structureStrings(r: (typeof REACTIONS)[number]): string[] {
  const isStructure = (t: string) => REAGENT_ART[t] !== undefined || /[[\]=#]/.test(t);
  return [
    ...r.reactants,
    r.product,
    ...r.intermediates,
    ...r.stages.flatMap((s) => [...s.reagents.filter(isStructure), ...s.byproducts]),
    ...r.reactant_formulas,
    r.product_formula,
  ].filter((s) => s.length >= 2);
}
const ALL_STRUCTURES = [...new Set(REACTIONS.flatMap(structureStrings))];

/** The strings that appear in `text` as a whole token, not inside a longer word. */
function printed(text: string, strings: readonly string[]): string[] {
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return strings.filter((s) => new RegExp(`(^|[\\s,;:(])${escape(s)}($|[\\s,;:.)])`).test(text));
}

describe("no reaction view prints a SMILES string or a formula", () => {
  it("the table of strings is not empty (the check can fail)", () => {
    expect(ALL_STRUCTURES.length).toBeGreaterThan(100);
    expect(printed("Byproducts: O=S=O", ALL_STRUCTURES)).toContain("O=S=O");
  });

  it.each(REACTIONS.map((r) => [r.id, r] as const))("sheet for %s, all three sides", async (_, r) => {
    const t = sectionForFamily(r.family);
    await visit(`lessons/${t}/${r.id}`);
    await settle(() => dialogTitle() === r.name);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    for (const side of ["Setup", "Conditions", "Product"]) {
      const tab = [...dialog.querySelectorAll('[role="tab"]')].find((b) => b.textContent === side) as HTMLElement;
      await act(async () => tab.click());
      expect(tab.getAttribute("aria-selected")).toBe("true");
      expect(printed(dialog.textContent ?? "", ALL_STRUCTURES), `${side} side`).toEqual([]);
    }
    // The lesson page under the sheet: its reaction cards. Only the cards: the
    // lesson's own prose is the owner's writing, which this phase does not touch
    // (its worked examples do spell "H2O"; listed in the phase log for him).
    expect(cards().length).toBeGreaterThan(0);
    expect(printed(cardText(), ALL_STRUCTURES)).toEqual([]);
  });

  it("the Learn index, whose search lists every reaction", async () => {
    await visit("learn");
    await settle(() => h1() === "Learn" && host.querySelector('nav[aria-label="Reactions"]') !== null);
    // Browsing, the index starts folded to its lesson names: unfold every group.
    for (const b of host.querySelectorAll('nav[aria-label="Reactions"] [aria-expanded="false"]')) {
      await act(async () => (b as HTMLElement).click());
    }
    for (const r of REACTIONS) expect(host.textContent).toContain(r.name);
    expect(printed(host.textContent ?? "", ALL_STRUCTURES)).toEqual([]);
  });

  /* Learn round 3 moved the reaction cards off the hub onto their lesson pages
     (the sheet test above reads every one of them there). So the hub is checked
     WHOLE now, not only its cards: nothing on it may print a structure string,
     and every reaction of the unit must still be one press away, through a path
     node to the lesson that holds its card. */
  it.each(PATHWAY_UNITS.map((u) => [u.id, u] as const))("unit hub %s", async (id, u) => {
    await visit(`unit/${id}`);
    await settle(() => h1() === unitName(u.title));
    const main = host.querySelector("main")!;
    expect(printed(main.textContent ?? "", ALL_STRUCTURES)).toEqual([]);
    const nodes = [...main.querySelectorAll<HTMLAnchorElement>("a.lrn-node")].map((a) => a.getAttribute("href"));
    // S3 round 4: a lesson shared with other units opens with `?unit=`, so the lesson
    // page keeps the student in this unit (partHref says which address).
    expect(nodes).toEqual(lessonsForUnit(id).map((t) => partHref(t.id, id)));
    for (const r of REACTIONS.filter((x) => unitForFamily(x.family) === id)) {
      expect(nodes, r.id).toContain(partHref(sectionForFamily(r.family), id));
    }
  });
});

/**
 * 3. REAGENTS ARE DRAWN, NOT TYPED (Learn round 2; owner: "also draw out the
 *    reagents in the reactions"). Where REAGENT_ART has a drawing, the card and
 *    both sheet sides that list reagents show that drawing, named by its alt,
 *    and do NOT print its bottle label as text. Where it has none (the Grignard,
 *    the Gilman, PCC and the rest of STATUS.md's data gaps), the label is printed,
 *    typeset. And nothing in a card or the sheet is set in a monospace face.
 */
describe("reagents are drawn where the data draws them, never typed beside", () => {
  type Want = { label: string; name: string; drawn: boolean; text: boolean };
  const wants = (steps: readonly { label: string; art?: { light?: string; dark?: string } }[]): Want[] =>
    steps
      .filter((s) => s.label.length > 0 || s.art !== undefined)
      .map((s) => ({ label: s.label, name: nameOf(s.art), drawn: s.art !== undefined, text: labelShown(s as never) }));

  function holds(area: Element, want: Want[], where: string) {
    const text = area.textContent ?? "";
    const alts = [...area.querySelectorAll("img")].map((i) => i.getAttribute("alt"));
    for (const w of want) {
      if (w.drawn) expect(alts, `${where}: drawing of ${w.label}`).toContain(w.name);
      // A formula label printed where the drawing stands is the failure. A label
      // that is an ordinary word ("acrolein") could also be a reactant's name.
      if (!w.text && /[A-Z0-9+]/.test(w.label)) expect(text, `${where}: typed ${w.label}`).not.toContain(w.label);
      if (w.text) expect(text, `${where}: label ${w.label}`).toContain(w.label);
    }
  }

  it("the data still has both kinds (the check can fail)", () => {
    const all = REACTIONS.flatMap((r) => wants(stagedReagentSteps(r)));
    expect(all.some((w) => w.drawn && !w.text)).toBe(true);
    expect(all.some((w) => !w.drawn)).toBe(true);
  });

  it.each(REACTIONS.map((r) => [r.id, r] as const))("%s: card and sheet", async (_, r) => {
    await visit(`lessons/${sectionForFamily(r.family)}/${r.id}`);
    await settle(() => dialogTitle() === r.name);
    const dialog = document.querySelector('[role="dialog"]')!;
    const perStage = r.stages.map((st) => {
      const art = stageReagentArt(st);
      return { label: stageReagentLabel(st), ...(art === undefined ? {} : { art }) };
    });
    for (const side of ["Setup", "Conditions"]) {
      const tab = [...dialog.querySelectorAll('[role="tab"]')].find((b) => b.textContent === side) as HTMLElement;
      await act(async () => tab.click());
      const areas = [...dialog.querySelectorAll("[data-reagents]")];
      expect(areas.length, side).toBeGreaterThan(0);
      const joined = document.createElement("div");
      for (const a of areas) joined.appendChild(a.cloneNode(true));
      holds(joined, wants(perStage), `${side} side`);
    }
    expect(dialog.querySelectorAll(".font-mono").length, "monospace in the sheet").toBe(0);

    const card = host.querySelector(`#rx-${r.id}`)!;
    expect(card).not.toBeNull();
    holds(card.querySelector("[data-reagents]")!, wants(stagedReagentSteps(r)), "card");
    expect(card.querySelectorAll(".font-mono").length, "monospace on the card").toBe(0);
  });
});

/** The spoken name of a reagent drawing: REAGENT_NAMES for the token whose file it is. */
function nameOf(art?: { light?: string; dark?: string }): string {
  if (!art) return "";
  const token = Object.keys(REAGENT_ART).find((t) => REAGENT_ART[t]!.light === art.light && REAGENT_ART[t]!.dark === art.dark);
  return token ? (REAGENT_NAMES[token] ?? "") : "";
}

/**
 * 4. EVERY STRUCTURE HAS A NAME, IN BOTH THEMES (Learn round 3). In dark theme,
 *    the default, the visible copy of every drawing was `aria-hidden` with an
 *    empty alt, so a screen reader heard none of them; and the reagent alts were
 *    bottle labels ("CH3C#C-"). Now: every image on a Learn page and in the sheet
 *    has a non-empty alt, none is aria-hidden, the light and dark copies of one
 *    drawing say the same thing, and no alt is a formula or a SMILES string.
 */
describe("every structure image is named, in both themes, never by formula", () => {
  // Every bottle label that reads as a formula (a digit, a charge, a bond) and
  // every structure string and RDKit formula the data carries.
  const FORMULAS = [
    ...new Set([
      ...REACTIONS.flatMap((r) => r.stages.map(stageReagentLabel)).filter((l) => /[0-9+#=]|-$/.test(l)),
      ...ALL_STRUCTURES,
    ]),
  ];

  it("every drawn reagent has a name in the index (the check can fail)", () => {
    for (const token of Object.keys(REAGENT_ART)) expect(REAGENT_NAMES[token], token).toBeTruthy();
    expect(FORMULAS).toContain("CH3C#C-");
  });

  function check(area: Element, where: string) {
    const imgs = [...area.querySelectorAll("img")];
    expect(imgs.length, `${where}: images`).toBeGreaterThan(0);
    for (const img of imgs) {
      const alt = img.getAttribute("alt") ?? "";
      expect(alt, `${where}: ${img.getAttribute("src")}`).not.toBe("");
      expect(img.getAttribute("aria-hidden"), `${where}: ${alt}`).toBeNull();
      expect(printed(alt, FORMULAS), `${where}: alt "${alt}"`).toEqual([]);
    }
    // The two theme copies of one drawing sit side by side and must agree.
    for (const img of imgs) {
      const src = img.getAttribute("src") ?? "";
      if (!src.endsWith("-light.svg")) continue;
      const twin = imgs.find((i) => i.getAttribute("src") === src.replace(/-light\.svg$/, "-dark.svg"));
      if (twin) expect(twin.getAttribute("alt"), src).toBe(img.getAttribute("alt"));
    }
  }

  it.each(REACTIONS.map((r) => [r.id, r] as const))("%s: lesson page and sheet", async (_, r) => {
    await visit(`lessons/${sectionForFamily(r.family)}/${r.id}`);
    await settle(() => dialogTitle() === r.name);
    check(host.querySelector(`#rx-${r.id}`)!, "card");
    const dialog = document.querySelector('[role="dialog"]')!;
    for (const side of ["Setup", "Conditions", "Product"]) {
      const tab = [...dialog.querySelectorAll('[role="tab"]')].find((b) => b.textContent === side) as HTMLElement;
      await act(async () => tab.click());
      if (dialog.querySelector("img")) check(dialog, `${side} side`);
    }
  });

  it("the Learn index", async () => {
    // Learn round 4: the index's drawing is the Continue card's reaction, which
    // depends on the lessons this browser has opened (earlier tests open many).
    // As a new visitor it is Unit 1, Lesson 1, which has reactions to draw.
    // S3 round 2: the card moves on from FINISHED lessons, so clear those too.
    localStorage.removeItem("blueberry_lessons_opened_v1");
    localStorage.removeItem("blueberry_lessons_finished_v1");
    await visit("learn");
    await settle(() => h1() === "Learn" && host.querySelector('[aria-labelledby="resume-title"] img') !== null);
    check(host.querySelector("main")!, "index");
  });
});

/**
 * 5. A PATH, AND NO DEAD ENDS (Learn round 3). The hub and every lesson page
 *    show exactly one filled button (the docked Start, the "Up next" step); every
 *    lesson ends on a step somewhere else; its menu lists only its unit's lessons.
 */
describe("one filled button, a scoped menu, and a way on from every lesson", () => {
  it.each(PATHWAY_UNITS.map((u) => [u.id, u] as const))("unit hub %s", async (id, u) => {
    await visit(`unit/${id}`);
    await settle(() => h1() === unitName(u.title));
    // Always one: a lesson, else practice, else the next unit, else back to Learn.
    expect(host.querySelectorAll("main .lrn-btn").length).toBe(1);
  });

  it.each(LESSON_TOPICS.map((t) => [t.id, t] as const))("lesson %s", async (id, t) => {
    await visit(`lessons/${id}`);
    await settle(() => h1() === t.title && document.querySelector('[role="dialog"]') === null);
    const main = host.querySelector("main")!;
    expect(main.querySelectorAll(".lrn-btn").length, "filled buttons").toBe(1);
    const next = main.querySelector<HTMLAnchorElement>('[aria-labelledby="next-title"] a.lrn-btn')!;
    expect(next, "up next").not.toBeNull();
    expect(next.getAttribute("href")).not.toBe(`#/lessons/${id}`);
    const unitId = LEARN_MAP.find((row) => row.section === id)!.units[0]!;
    const menu = [...main.querySelectorAll<HTMLAnchorElement>("nav.lrn-card a")].map((a) => a.getAttribute("href"));
    expect(menu).toEqual(lessonsForUnit(unitId).map((x) => partHref(x.id, unitId)));
    const i = lessonsForUnit(unitId).findIndex((x) => x.id === id);
    const after = lessonsForUnit(unitId)[i + 1];
    if (after) expect(next.getAttribute("href")).toBe(partHref(after.id, unitId));
    // Learn round 4: chemistry first. A lesson with reactions puts its first
    // reaction card ahead of the lesson text in the page, so a phone shows it on
    // its first screen (from 1280px CSS moves it beside the text).
    const first = REACTIONS.find((r) => sectionForFamily(r.family) === id);
    if (first) {
      const card = main.querySelector(`#rx-${first.id}`)!;
      const article = main.querySelector("article")!;
      expect(card, "first reaction card").not.toBeNull();
      expect(card.compareDocumentPosition(article) & Node.DOCUMENT_POSITION_FOLLOWING, "card before the text").toBeTruthy();
    }
  });
});

/**
 * 6. WORKED EXAMPLES (Learn round 3, changed in rounds 4 and 6).
 *    Round 4: an example whose chemistry RDKit found in the reaction data
 *    (data/workedExamples.ts, written by scripts/match_worked_examples.py) is drawn
 *    with that reaction's scheme: its starting material, its reagents and its
 *    product, named, and no generated picture from public/cards/.
 *    Round 6: EVERY other example is drawn too, from the structures its old picture
 *    was generated from (WORKED_EXAMPLE_SCHEME): start, product and every drawn
 *    reagent named, every undrawn reagent typeset, no picture from public/cards/,
 *    no typed conditions row, and none of its own structure strings printed.
 */
describe("worked examples", () => {
  const withExamples = LESSON_TOPICS.filter((t) => t.examples.length > 0);
  const matchOf = (e: string[]) => REACTIONS.find((r) => r.id === WORKED_EXAMPLE_REACTION[e[3]!]);

  it("the match table names real reactions and pictures the lessons use (the check can fail)", () => {
    const pictures = withExamples.flatMap((t) => t.examples.map((e) => e[3]));
    const entries = Object.entries(WORKED_EXAMPLE_REACTION);
    expect(entries.length).toBeGreaterThan(0);
    for (const [picture, id] of entries) {
      expect(pictures, picture).toContain(picture);
      expect(REACTIONS.map((r) => r.id), picture).toContain(id);
    }
  });

  it("every example has exactly one drawing source, and both kinds of reagent exist (the check can fail)", () => {
    const pictures = withExamples.flatMap((t) => t.examples.map((e) => e[3]!));
    for (const picture of pictures) {
      const sources = [WORKED_EXAMPLE_REACTION[picture], WORKED_EXAMPLE_SCHEME[picture]].filter(Boolean);
      expect(sources.length, picture).toBe(1);
    }
    const steps = Object.values(WORKED_EXAMPLE_SCHEME).flatMap((s) => s.groups.flat());
    expect(steps.some((st) => st.art !== undefined)).toBe(true);
    expect(steps.some((st) => st.art === undefined)).toBe(true);
  });

  it.each(withExamples.map((t) => [t.id, t] as const))("lesson %s", async (id, t) => {
    await visit(`lessons/${id}`);
    await settle(() => h1() === t.title && document.querySelector('[aria-labelledby="examples-title"]') !== null);
    const section = host.querySelector('[aria-labelledby="examples-title"]')!;
    for (const e of t.examples) {
      const box = section.querySelector(`[id="wx-${e[3]!.replace(/\.svg$/, "")}"]`)!;
      expect(box, `${id}: ${e[0]}`).not.toBeNull();
      const alts = [...box.querySelectorAll("img")].map((i) => i.getAttribute("alt"));
      const srcs = [...box.querySelectorAll("img")].map((i) => i.getAttribute("src") ?? "");
      const text = box.textContent ?? "";
      expect(srcs.filter((src) => src.includes("cards/")), `${id}: ${e[0]} picture`).toEqual([]);
      expect(printed(text, ALL_STRUCTURES), `${id}: ${e[0]}`).toEqual([]);
      // The old conditions row is gone: its "|"-separated line is not printed.
      expect(text, `${id}: ${e[0]} conditions row`).not.toContain(e[1]!);
      const r = matchOf(e);
      if (r) {
        expect(alts, `${id}: ${e[0]} start`).toContain(`Structure of ${r.reactant_labels.join(" and ")}`);
        expect(alts, `${id}: ${e[0]} product`).toContain(`Structure of ${r.product_label}`);
        for (const step of stagedReagentSteps(r)) {
          if (step.art) expect(alts, `${id}: ${e[0]} reagent ${step.label}`).toContain(nameOf(step.art));
        }
        continue;
      }
      const w = WORKED_EXAMPLE_SCHEME[e[3]!]!;
      expect(alts, `${id}: ${e[0]} start`).toContain(`Structure of ${w.reactant_labels.join(" and ")}`);
      expect(alts, `${id}: ${e[0]} product`).toContain(`Structure of ${w.product_label}`);
      for (const step of w.groups.flat()) {
        if (step.art) {
          expect(alts, `${id}: ${e[0]} reagent ${step.label}`).toContain(step.name ?? nameOf(step.art));
          if (!labelShown(step)) expect(text, `${id}: typed ${step.label}`).not.toContain(step.label);
        } else {
          expect(text, `${id}: label ${step.label}`).toContain(step.label);
        }
      }
      const own = [w.smiles.start, w.smiles.product, ...w.smiles.reagents].filter((x) => x.length > 1);
      expect(printed(text, own), `${id}: ${e[0]} own structures`).toEqual([]);
    }
  });
});

/**
 * 7. DRAWINGS SHOWN SMALL STAY READABLE, AND A REAGENT HAS ONE INK (Learn round 6).
 *    critic-learn-r5 measured the unit thumbnails' atom labels at 4.2 to 5.8px, and
 *    at night a drawn H3O+ came out CPK red beside a typeset CH3MgBr in the ink.
 */
// Run from the repo root (vitest's root); jsdom's import.meta.url is not a file URL.
const PUBLIC_DIR = `${process.cwd()}/public/`;
const publicFile = (path: string) => readFileSync(`${PUBLIC_DIR}${path}`, "utf8");

/** The height of each atom label RDKit drew, in the file's own units. RDKit writes a
 *  label as one path per glyph, all classed `atom-N`, so a label's height is the y extent
 *  of all of its glyphs together: "Br" is the B's cap height, not the lowercase r's, and
 *  a charge or a subscript belongs to the label it sits on. */
function labelHeights(svg: string): number[] {
  const ys = new Map<string, number[]>();
  for (const m of svg.matchAll(/<path class='atom-(\d+)' d='([^']+)'/g)) {
    const points = [...m[2]!.matchAll(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g)].map((p) => Number(p[2]));
    ys.set(m[1]!, [...(ys.get(m[1]!) ?? []), ...points]);
  }
  return [...ys.values()].map((y) => Math.max(...y) - Math.min(...y));
}

describe("thumbnails and reagent ink", () => {
  const thumbs = readdirSync(`${PUBLIC_DIR}reactions`).filter((f) => f.includes("-thumb-"));

  it("every reaction has its thumbnails, and the measure finds small letters (the check can fail)", () => {
    for (const r of REACTIONS) {
      for (const key of ["start_thumb_light", "start_thumb_dark", "product_thumb_light", "product_thumb_dark"] as const) {
        expect(r.art[key], `${r.id} ${key}`).toBeTruthy();
      }
    }
    // A full-size drawing shown in a 64px tile, as round 5 did: its letters are about
    // 20 units of 210, so about 6px there. The measure has to see that as too small.
    const full = labelHeights(publicFile(REACTIONS[0]!.art.start_light!));
    expect(full.length).toBeGreaterThan(0);
    expect(Math.min(...full) * (64 / 210)).toBeLessThan(11);
  });

  it("every atom label in a thumbnail file is 11 units or taller", () => {
    expect(thumbs.length).toBe(REACTIONS.length * 4);
    for (const f of thumbs) {
      const svg = publicFile(`reactions/${f}`);
      expect(svg, f).toMatch(/viewBox='0 0 120 88'/);
      const heights = labelHeights(svg);
      if (heights.length > 0) expect(Math.min(...heights), f).toBeGreaterThanOrEqual(11);
    }
  });

  it("a thumbnail is shown at its drawn size or larger, never smaller", async () => {
    for (const page of ["learn", "unit/u7"]) {
      localStorage.removeItem("blueberry_lessons_opened_v1");
      await visit(page);
      await settle(() => host.querySelector('main img[src*="-thumb-"]') !== null);
      const imgs = [...host.querySelectorAll<HTMLImageElement>('main img[src*="-thumb-"]')];
      expect(imgs.length, page).toBeGreaterThan(0);
      for (const img of imgs) {
        // 120 by 88 is the file; 164 by 120 is the same drawing at 1.36x.
        const size = /\bh-\[(\d+)px\] w-\[(\d+)px\]/.exec(img.className);
        expect(size, `${page}: ${img.className}`).not.toBeNull();
        expect(Number(size![1]), page).toBeGreaterThanOrEqual(88);
        expect(Number(size![2]), page).toBeGreaterThanOrEqual(120);
        expect(Number(size![2]) / Number(size![1]), page).toBeCloseTo(120 / 88, 1);
        expect(img.className, page).toContain("max-w-none");
      }
    }
  });

  it("every reagent drawing is in --bb-deep, the typeset labels' ink, in each theme", () => {
    const tokens = readFileSync(`${process.cwd()}/src/tokens.css`, "utf8");
    const deep = [...tokens.matchAll(/--bb-deep:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]!.toUpperCase());
    expect(deep.length).toBe(2);
    const [light, dark] = deep;
    const files = [
      ...Object.values(REAGENT_ART).flatMap((a) => [[a.light, light], [a.dark, dark]] as const),
      ...Object.values(WORKED_EXAMPLE_SCHEME).flatMap((w) =>
        w.groups.flat().flatMap((st) => (st.art ? ([[st.art.light, light], [st.art.dark, dark]] as const) : [])),
      ),
    ];
    expect(files.length).toBeGreaterThan(50);
    for (const [file, ink] of files) {
      const colours = new Set(
        [...publicFile(file!).matchAll(/(?:fill|stroke)[:=]'?(#[0-9A-Fa-f]{6})/g)].map((m) => m[1]!.toUpperCase()),
      );
      expect([...colours], file).toEqual([ink]);
    }
  });
});

describe("the unit mapping table (a DRAFT pending the owner)", () => {
  it("names every lesson exactly once, and only units that exist", () => {
    expect(LEARN_MAP.map((r) => r.section).sort()).toEqual(LESSON_TOPICS.map((t) => t.id).sort());
    const ids = new Set(PATHWAY_UNITS.map((u) => u.id));
    for (const row of LEARN_MAP) {
      for (const u of [...row.units, ...Object.values(row.families ?? {})]) expect(ids.has(u), `${row.section} -> ${u}`).toBe(true);
    }
  });

  it("puts every reaction in a unit", () => {
    for (const r of REACTIONS) expect(unitForFamily(r.family), r.id).toBeDefined();
  });

  it("files nitration and Friedel-Crafts acylation under Aromaticity, in Unit 3 (owner, 7 Oct)", () => {
    for (const id of ["nitration", "friedel-crafts-acylation"]) {
      const r = REACTIONS.find((x) => x.id === id)!;
      expect(sectionForFamily(r.family)).toBe("aromatics");
      expect(unitForFamily(r.family)).toBe("u3");
    }
  });

  it("leaves diazonium formation and Sandmeyer under Amines, undecided by the owner", () => {
    for (const id of ["diazonium-formation", "sandmeyer"]) {
      const r = REACTIONS.find((x) => x.id === id)!;
      expect(sectionForFamily(r.family)).toBe("amines");
    }
  });
});

describe("reaction search", () => {
  it("finds by name, reagent and starting material", () => {
    expect(searchReactions(REACTIONS, "aldol").map((r) => r.id)).toContain("aldol-addition");
    expect(searchReactions(REACTIONS, "pcc").map((r) => r.id)).toContain("pcc-oxidation");
    expect(searchReactions(REACTIONS, "acetophenone").map((r) => r.id)).toContain("grignard-addition-ketone");
  });

  it("narrows by unit, and every word must match", () => {
    expect(searchReactions(REACTIONS, "", "u3").every((r) => unitForFamily(r.family) === "u3")).toBe(true);
    expect(searchReactions(REACTIONS, "aldol zzzz")).toEqual([]);
  });

  /* Learn round 3: recall. Each expected count is derived from the data, not
     tuned: RDKit's SMARTS matches in scripts/build_learn_index.py (it prints the
     group counts), and the reaction names. "Grignard reagent" is the one reaction
     the data names Grignard, whose stages are reagent stages, plus the Addition
     lesson, whose text says "Grignard reagent". */
  it("finds by reagent role, functional group and reagent name", () => {
    const ids = (q: string) => searchReactions(REACTIONS, q).map((r) => r.id);
    expect(ids("Grignard reagent")).toEqual(["grignard-addition-ketone"]);
    expect(searchLessons("Grignard reagent").map((t) => t.id)).toEqual(["addition"]);
    // 13 reactions hold a ketone in a starting material or the product (RDKit).
    expect(ids("ketone")).toHaveLength(13);
    expect(ids("ketone")).toEqual(expect.arrayContaining(["nabh4-reduction", "wittig-olefination", "clemmensen", "friedel-crafts-acylation"]));
    expect(ids("ketones")).toEqual(ids("ketone"));
    // 6 hold an ester (RDKit), e.g. Fischer esterification makes one, LiAlH4 reduces one.
    expect(ids("ester")).toHaveLength(6);
    expect(ids("ester")).toEqual(expect.arrayContaining(["fischer-esterification", "lialh4-reduction", "claisen-condensation"]));
    // PubChem names the drawn BH4- "Borohydride": the name finds what "NaBH4" finds.
    expect(ids("borohydride")).toEqual(ids("nabh4"));
    expect(ids("borohydride")).toEqual(["nabh4-reduction"]);
    // 4 hold a nitrile (RDKit): cyanohydrin makes one, the other three are nitrile reactions.
    expect(ids("nitrile")).toEqual(["cyanohydrin", "nitrile-formation", "nitrile-basic-hydrolysis", "nitrile-reduction"]);
    expect(ids("zzqxv")).toEqual([]);
  });

  it("every example chip finds a reaction (Learn round 4)", () => {
    for (const q of SEARCH_EXAMPLES) expect(searchReactions(REACTIONS, q).length, q).toBeGreaterThan(0);
  });
});

/**
 * S3 round 2: Learn's decision card moves on from FINISHED lessons only. Opening a
 * lesson and pressing Back used to send a student to the next unit.
 */
describe("the decision card moves on when a lesson is finished, not opened", () => {
  const button = () => host.querySelector('[aria-labelledby="resume-title"] a.lrn-btn')?.textContent ?? "";

  it("opened only: still Unit 1, and the button says Keep reading", async () => {
    localStorage.setItem("blueberry_lessons_opened_v1", JSON.stringify(["dienes"]));
    localStorage.removeItem("blueberry_lessons_finished_v1");
    // Away and back, so Learn mounts again and reads storage afresh.
    await visit("unit/u1");
    await settle(() => h1() !== "Learn");
    await visit("learn");
    await settle(() => h1() === "Learn");
    await settle(() => button() !== "");
    // S3 round 5: the headline is the lesson, the unit is named under it as the path
    // names it, and the eyebrow says where it sits ("of N", one-lesson units included).
    // The picture is from that lesson's first family.
    expect(host.querySelector("#resume-title")?.textContent).toBe("Dienes & Diels-Alder");
    expect(host.querySelector(".lrn-decide-unit")?.textContent).toBe("Conjugation, Resonance & Dienes");
    expect(host.querySelector(".lrn-decide-body .lrn-eyebrow")?.textContent).toBe("Up next · Unit 1 · Lesson 1 of 1");
    expect(host.querySelector(".lrn-decide-art-name")?.textContent).toBe("1,4-addition to a conjugated diene");
    expect(button()).toBe("Keep reading");
  });

  it("finished: the card moves to Unit 2", async () => {
    localStorage.setItem("blueberry_lessons_finished_v1", JSON.stringify(["dienes"]));
    // Earlier tests open many lessons; a lesson opened would read "Keep reading".
    localStorage.removeItem("blueberry_lessons_opened_v1");
    // Away and back, so Learn mounts again and reads storage afresh.
    await visit("unit/u1");
    await settle(() => h1() !== "Learn");
    await visit("learn");
    await settle(() => h1() === "Learn");
    await settle(() => button() !== "");
    expect(button()).toBe("Start Unit 2");
    localStorage.removeItem("blueberry_lessons_opened_v1");
    localStorage.removeItem("blueberry_lessons_finished_v1");
  });

  it("S3 round 3: a shared lesson is named by this unit's part, and the path runs 1 to 15", async () => {
    // Unit 5's own lessons done; its last lesson is the periodic acid part of Amines & sugars.
    localStorage.setItem(
      "blueberry_lessons_finished_v1",
      JSON.stringify(["dienes", "aromatics", "alcohols", "oxidation", "overview", "addition"]),
    );
    localStorage.removeItem("blueberry_lessons_opened_v1");
    await visit("unit/u1");
    await settle(() => h1() !== "Learn");
    await visit("learn");
    await settle(() => h1() === "Learn");
    await settle(() => button() !== "");
    expect(host.querySelector("#resume-title")?.textContent).toBe("Periodic acid cleavage");
    expect(host.querySelector(".lrn-decide-unit")?.textContent).toBe("Alcohols, Diols, Ethers & Epoxides");
    expect(host.querySelector(".lrn-decide-body .lrn-eyebrow")?.textContent).toContain("Lesson 3 of 3");
    // S3 round 4: the button opens the lesson AS UNIT 5 READS IT (`?unit=u5`), so its back
    // link, menu and "Up next" stay in Unit 5 instead of handing the student to Unit 10.
    expect(host.querySelector(".lrn-decide-btn")?.getAttribute("href")).toBe("#/lessons/amines?unit=u5");
    // The plate draws the product with its count from the balanced equation (2 formaldehyde).
    expect(host.querySelector(".lrn-decide-count")?.textContent).toBe("2");
    // Every unit is a stop, numbered without a gap; a part-finished unit is "started".
    const stops = [...host.querySelectorAll(".lrn-spine > li")];
    expect(stops).toHaveLength(15);
    stops.forEach((li, i) => {
      if (li.getAttribute("data-state") !== "done") expect(li.querySelector(".lrn-stop-node")?.textContent).toBe(String(i + 1));
    });
    expect(host.querySelectorAll('.lrn-spine li[data-state="started"]').length).toBeGreaterThan(0);
    localStorage.removeItem("blueberry_lessons_finished_v1");
  });
});

/**
 * S3 round 4: a lesson shared by several units is read once PER UNIT. Reading Aromaticity
 * for Unit 2 used to tick Units 2, 3 and 4 at once; now it ticks Unit 2 only, and the
 * card's picture is always the unit's own chemistry (Unit 2 has none, so no borrowed
 * bromination from Unit 3).
 */
describe("a shared lesson counts for one unit at a time", () => {
  const button = () => host.querySelector('[aria-labelledby="resume-title"] a.lrn-btn')?.textContent ?? "";

  it("Unit 2's card draws no other unit's reaction, and reading it ticks Unit 2 only", async () => {
    localStorage.setItem("blueberry_lessons_finished_v1", JSON.stringify(["dienes"]));
    localStorage.removeItem("blueberry_lessons_opened_v1");
    await visit("unit/u1");
    await settle(() => h1() !== "Learn");
    await visit("learn");
    await settle(() => h1() === "Learn");
    await settle(() => button() !== "");
    expect(button()).toBe("Start Unit 2");
    // S3 round 5: no reaction to draw, so Bloom says what the reading is; no plate.
    expect(host.querySelector(".lrn-scene-bubble")?.textContent).toBe("Reading first: Aromaticity");
    expect(host.querySelector(".lrn-decide-plate")).toBeNull();

    localStorage.setItem("blueberry_lessons_finished_v1", JSON.stringify(["dienes", "aromatics"]));
    await visit("unit/u1");
    await settle(() => h1() !== "Learn");
    await visit("learn");
    await settle(() => h1() === "Learn");
    await settle(() => button() !== "");
    const state = (n: number) => host.querySelectorAll(".lrn-spine > li")[n - 1]?.getAttribute("data-state");
    expect(state(2)).toBe("done");
    expect(state(3)).toBe("current");
    expect(state(4)).toBe("later");
    // Unit 3's card opens the same lesson as Unit 3 reads it, and draws Unit 3's chemistry.
    expect(host.querySelector(".lrn-decide-btn")?.getAttribute("href")).toBe("#/lessons/aromatics?unit=u3");
    const drawn = host.querySelector(".lrn-decide-art-name")?.textContent;
    const r = REACTIONS.find((x) => x.name === drawn);
    expect(r && unitForFamily(r.family)).toBe("u3");
    localStorage.removeItem("blueberry_lessons_finished_v1");
  }, 30_000);

  it("every part key is unique, and a lesson's first unit keeps the plain lesson id", () => {
    const keys = PATHWAY_UNITS.flatMap((u) => partsForUnit(u.id).map((p) => p.key));
    expect(new Set(keys).size).toBe(keys.length);
    for (const row of LEARN_MAP) expect(partsForUnit(row.units[0]!).find((p) => p.lesson.id === row.section)?.key).toBe(row.section);
  });
});


/**
 * S3 round 5: the card promised "Periodic acid cleavage" and the page opened on amines,
 * diazonium salts and Sandmeyer. A part page is titled by the part, shows only its unit's
 * reactions, folds the whole lesson's text, and ends on a button that finishes it on the
 * site (back to Learn), with practice as the quiet second way.
 */
describe("a lesson read as another unit's part opens on that part", () => {
  it("Unit 5's periodic acid part of Amines & sugars", async () => {
    localStorage.removeItem("blueberry_lessons_finished_v1");
    await visit("unit/u5");
    await settle(() => h1() !== "Learn" && h1() !== "Periodic acid cleavage");
    await visit("lessons/amines?unit=u5");
    await settle(() => h1() === "Periodic acid cleavage");
    expect(h1()).toBe("Periodic acid cleavage");
    const main = host.querySelector("main")!;
    // Only Unit 5's chemistry is on the page.
    const ids = [...main.querySelectorAll('[id^="rx-"]')].map((el) => el.id.slice(3));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      const r = REACTIONS.find((x) => x.id === id)!;
      expect(unitForFamily(r.family), id).toBe("u5");
    }
    expect(ids).not.toContain("diazonium-formation");
    expect(ids).not.toContain("sandmeyer");
    // The lesson's own text is still there, folded, never edited.
    expect(main.querySelector("details.lrn-fold summary")?.textContent).toContain("The whole Amines & sugars lesson");
    // Unit 5's last lesson: finish it here, back to Learn; practice is the quiet link.
    const end = main.querySelector<HTMLAnchorElement>('[aria-labelledby="next-title"] a.lrn-btn')!;
    expect(end.textContent).toBe("Finish lesson");
    expect(end.getAttribute("href")).toBe("#/learn");
    expect(main.querySelector("#next-title")?.textContent).toBe("That is Unit 5 read");
    expect(main.querySelectorAll(".lrn-btn").length).toBe(1);
    await act(async () => end.click());
    expect(JSON.parse(localStorage.getItem("blueberry_lessons_finished_v1") ?? "[]")).toContain("amines@u5");
    localStorage.removeItem("blueberry_lessons_finished_v1");
  }, 30_000);
});
