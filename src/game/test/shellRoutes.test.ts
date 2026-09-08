/**
 * The tab shell's contract, as checks rather than as a paragraph in a comment.
 *
 * Two claims are made by the owner amendment of 2026-08-28 and both of them are
 * the kind that rot quietly. A tab count rots the first time somebody adds one
 * to the array and nothing complains. "Every route still resolves so a deep
 * link does not 404" rots the first time an id is dropped from the union and a
 * hash in a student's history starts landing on the pathway with no sign that
 * it was ever anything else.
 *
 * mobile-ui's number is the one asserted here: five is the HARD limit. The
 * assertion is written at five because five is a rule where a smaller count is
 * a judgement, and a check should fail on the rule. The count today is asserted
 * separately, so a change to it is a deliberate edit to this file rather than a
 * silent slide.
 *
 * THE COUNT WENT FROM FOUR TO FIVE ON 2026-09-05, and that edit is exactly the
 * deliberate one this file was shaped to force. Feed joins the bar between
 * Cards and Me per the owner's amendment at the calibration gate of
 * 2026-09-01, quoted in CLAUDE.md's tab section and in docs/DESIGN-GOALS.md
 * under "Header and tabs", and drawn in every committed frame in
 * docs/reference/design-goals/units/. The bar now sits ON mobile-ui's ceiling,
 * which is why the rule assertion below matters more than it did at four: a
 * sixth tab cannot be added without one leaving, and this is the check that
 * says so.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ALL_TABS,
  FLAGGED_TABS,
  NAV_TABS,
  TOOL_TABS,
  hrefForReview,
  hrefForTab,
  parseHash,
  tabDefinition,
  type TabId,
} from "../app/routes";
import { OPEN_COURSE_IDS, isCourseOpen } from "../app/courses";

describe("the bar", () => {
  it("never carries more than five items, which is mobile-ui's hard limit", () => {
    expect(NAV_TABS.length).toBeLessThanOrEqual(5);
  });

  it("carries exactly the five the amendment names, in order", () => {
    expect(NAV_TABS.map((tab) => tab.id)).toEqual(["pathway", "trainer", "cards", "feed", "me"]);
  });

  it("sits on the ceiling, so the count and the limit are now the same number", () => {
    // Written as an equality rather than folded into the rule above, because
    // the two say different things: one is mobile-ui's limit and one is the
    // fact that the bar has spent all of it.
    expect(NAV_TABS.length).toBe(5);
  });

  it("puts Feed between Cards and Me, which is the order every goal image draws", () => {
    const order = NAV_TABS.map((tab) => tab.id);
    expect(order.indexOf("feed")).toBe(order.indexOf("cards") + 1);
    expect(order.indexOf("me")).toBe(order.indexOf("feed") + 1);
  });

  it("makes Feed a destination and not a flagged surface", () => {
    // Its daily quests derive from the local journal and ship live; only the
    // lab-mates section waits on a server, and it renders its own honest
    // not-open state inside the tab. A tab with real content today is `nav`.
    expect(tabDefinition("feed").placement).toBe("nav");
    expect(FLAGGED_TABS.some((tab) => tab.id === "feed")).toBe(false);
  });

  it("gives every bar item a short label that fits a phone column", () => {
    for (const tab of NAV_TABS) {
      expect(tab.short.length).toBeGreaterThan(0);
      expect(tab.short.length).toBeLessThanOrEqual(6);
    }
  });

  it("puts the periodic table and the reaction search in the header, not the bar", () => {
    expect(TOOL_TABS.map((tab) => tab.id)).toEqual(["periodic", "search"]);
    for (const tool of TOOL_TABS) {
      expect(NAV_TABS.some((tab) => tab.id === tool.id)).toBe(false);
    }
  });

  it("keeps the three unopened surfaces flagged rather than deleted", () => {
    expect(FLAGGED_TABS.map((tab) => tab.id)).toEqual(["leaderboards", "chat", "messages"]);
  });

  it("gives every tab exactly one placement", () => {
    const counted = [...NAV_TABS, ...TOOL_TABS, ...FLAGGED_TABS].length;
    // ALL_TABS is those three plus the collapsed course browser.
    expect(counted + 1).toBe(ALL_TABS.length);
  });
});

describe("no deep link 404s", () => {
  it("resolves every tab id that has ever been in the bar", () => {
    for (const tab of ALL_TABS) {
      const route = parseHash(hrefForTab(tab.id));
      expect(route).toEqual({ kind: "tab", tab: tab.id, rest: [] });
    }
  });

  it("still resolves the three that left the bar", () => {
    for (const id of ["leaderboards", "chat", "messages"] as const) {
      expect(parseHash(`#/${id}`)).toEqual({ kind: "tab", tab: id, rest: [] });
    }
  });

  it("lands the old #/review hash on the Cards tab it became", () => {
    expect(parseHash("#/review")).toEqual({ kind: "tab", tab: "cards", rest: [] });
    // The Charge sheet's free way out is built from this, so the two agree by
    // construction rather than by two people remembering the same string.
    expect(parseHash(hrefForReview())).toEqual({ kind: "tab", tab: "cards", rest: [] });
  });

  it("keeps the periodic table's element deep link working now that it is a tool", () => {
    expect(parseHash("#/periodic/Br")).toEqual({ kind: "tab", tab: "periodic", rest: ["Br"] });
  });

  it("keeps the courses drill down working now that courses is collapsed", () => {
    expect(parseHash("#/courses/orgo_2/aromaticity")).toEqual({
      kind: "tab",
      tab: "courses",
      rest: ["orgo_2", "aromaticity"],
    });
  });

  it("sends an unknown hash to the pathway rather than to nothing", () => {
    expect(parseHash("#/whatever-this-was")).toEqual({ kind: "tab", tab: "pathway", rest: [] });
  });

  it("resolves the Feed hash the builder could not reach before it was wired", () => {
    expect(parseHash("#/feed")).toEqual({ kind: "tab", tab: "feed", rest: [] });
    expect(parseHash(hrefForTab("feed"))).toEqual({ kind: "tab", tab: "feed", rest: [] });
  });

  it("lights a real bar item for every route in the product", () => {
    // A bar with nothing lit reads as broken. `parent` is what the shell reads,
    // so every tab's parent has to BE a bar item, including the new one's.
    for (const tab of ALL_TABS) {
      const parent = tabDefinition(tab.id as TabId).parent;
      expect(NAV_TABS.some((nav) => nav.id === parent)).toBe(true);
    }
  });

  it("has a definition for every id, so the shell can always title the page", () => {
    for (const tab of ALL_TABS) {
      expect(tabDefinition(tab.id as TabId).label.length).toBeGreaterThan(0);
    }
  });
});

describe("one course is open", () => {
  it("opens Organic Chemistry II and nothing else", () => {
    expect([...OPEN_COURSE_IDS]).toEqual(["orgo_2"]);
  });

  it("greys the other five", () => {
    for (const course of ["gen_chem_1", "gen_chem_2", "orgo_1", "dat", "mcat"] as const) {
      expect(isCourseOpen(course)).toBe(false);
    }
  });
});

/* ------------------------------------------------------------------ */
/* A trainer deep link never leaves the document                        */
/* ------------------------------------------------------------------ */

/**
 * The pathway's mechanism nodes used to link as "?reaction=x#/trainer". A
 * query string BEFORE the hash is part of the document URL, so following one
 * is a full navigation: measured on the pathway as one mainFrame navigation, a
 * window sentinel lost, and about two seconds of the front-door loader
 * replaying where the mechanism should be. Every "?hunt=" and "?sequence="
 * node on the map did it, which is every mechanism in the product.
 *
 * The fix is to carry the parameter inside the hash. This reads the source
 * rather than calling hrefForPlayable, which is module-private to PathwayTab
 * and would need that whole component imported into a DOM-less suite to reach.
 * Coarse in the safe direction: it looks for the exact shape of the defect, a
 * template literal whose query sits ahead of its hash.
 */
describe("the pathway's trainer deep link", () => {
  const pathway = readFileSync(
    fileURLToPath(new URL("../tabs/pathway/PathwayTab.tsx", import.meta.url)),
    "utf8",
  );

  it("puts the query inside the hash, not before it", () => {
    expect(pathway).toMatch(/`#\/trainer\?\$\{param\}=/);
  });

  it("no longer builds a link whose query precedes the hash", () => {
    expect(pathway).not.toMatch(/`\?\$\{param\}=[^`]*#\/trainer`/);
  });

  it("parseHash reads a tab through a hash query, which is what makes that safe", () => {
    expect(parseHash("#/trainer?reaction=williamson")).toEqual({ kind: "tab", tab: "trainer", rest: [] });
    expect(parseHash("#/lesson/u1-kvt?x=1")).toEqual({ kind: "lesson", node: "u1-kvt" });
  });
});
