import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteNavLinks } from "@/components/ui/site-nav";
import { DESTINATIONS, destinationFor, isFlowRoute } from "@/lib/siteNav";
import { GAME_HREF } from "@/game/app/routes";

/**
 * The site's five destinations (SITE-REPLAN.md phase 3, owner answer 2026-10-07).
 *
 * Rendered with `renderToStaticMarkup`, which needs no DOM, so this stays in the
 * site's node suite: the links are read out of the HTML the component produces.
 */
function links(route: string, placement: "header" | "bar" = "header") {
  const html = renderToStaticMarkup(createElement(SiteNavLinks, { route, placement }));
  return [...html.matchAll(/<a ([^>]*)>(.*?)<\/a>/g)].map(([, attrs, inner]) => ({
    href: /href="([^"]*)"/.exec(attrs)?.[1],
    current: /aria-current="page"/.test(attrs),
    label: inner.replace(/<[^>]+>/g, ""),
  }));
}

describe("the site navigation", () => {
  it("draws exactly the five destinations, in order, with their addresses", () => {
    expect(links("")).toEqual([
      { href: "#/learn", current: false, label: "Learn" },
      { href: GAME_HREF, current: false, label: "Practice" },
      { href: "#/study-decks", current: false, label: "Review" },
      { href: "#/schedule", current: false, label: "Schedule" },
      { href: "#/d", current: false, label: "Me" },
    ]);
  });

  it("draws the same five on the phone bar", () => {
    expect(links("", "bar").map((l) => l.label)).toEqual(["Learn", "Practice", "Review", "Schedule", "Me"]);
  });

  it("goes to the game through its route helper, never a hand-built hash", () => {
    expect(GAME_HREF).toBe("#/app");
    expect(DESTINATIONS.find((d) => d.id === "practice")?.href).toBe(GAME_HREF);
  });

  const cases: [string, string | null][] = [
    ["", null],
    ["home", null],
    ["contact", null],
    ["terms", null],
    ["nope-not-here", null],
    ["lessons", "Learn"],
    ["lessons/addition/grignard-addition-ketone", "Learn"],
    ["reactions", "Learn"],
    ["unit/u1", "Learn"],
    ["draw/grignard-addition-ketone", "Learn"],
    ["app", "Practice"],
    ["app/trainer", "Practice"],
    ["study-decks", "Review"],
    ["folder/carbonyls", "Review"],
    ["deck/grignard", "Review"],
    ["schedule", "Schedule"],
    ["d", "Me"],
    ["d/settings", "Me"],
    ["workspace", "Me"],
    ["new-reaction", "Me"],
  ];

  for (const [route, label] of cases) {
    it(`marks ${label ?? "nothing"} as current on #/${route}`, () => {
      const current = links(route).filter((l) => l.current).map((l) => l.label);
      expect(current).toEqual(label ? [label] : []);
    });
  }

  it("does not count a lookalike prefix as the same destination", () => {
    // "decks" must not match "deck", nor "dashboard" match "d".
    expect(destinationFor("decks")).toBeNull();
    expect(destinationFor("dashboard")).toBeNull();
  });

  it("stands down on the flows", () => {
    for (const flow of ["signin", "signup", "staff", "enter", "start", "start/course"]) {
      expect(isFlowRoute(flow), flow).toBe(true);
    }
    for (const page of ["", "lessons", "d", "deck/grignard", "startle"]) {
      expect(isFlowRoute(page), page).toBe(false);
    }
  });
});
