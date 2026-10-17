import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_TABS } from "@/lib/homeDemo";
import { DESTINATIONS } from "@/lib/siteNav";
import { redirectFor } from "@/lib/redirects";
import { titleForRoute } from "@/lib/useDocumentTitle";

/**
 * The home phone demo (SITE-REPLAN.md section 7, beat 2; phase 4b's check: "each tab's link
 * resolves").
 */
describe("home phone demo", () => {
  it("shows Learn, Practice, Review, Schedule, in that order (owner, 7 Oct)", () => {
    expect(DEMO_TABS.map((t) => t.label)).toEqual(["Learn", "Practice", "Review", "Schedule"]);
  });

  it("links each tab to the same address the site header uses", () => {
    for (const tab of DEMO_TABS) {
      const d = DESTINATIONS.find((x) => x.id === tab.id);
      expect(tab.href, tab.id).toBe(d?.href);
    }
  });

  it("links only to live pages: no retired address, no 404", () => {
    for (const tab of DEMO_TABS) {
      expect(tab.href.startsWith("#/"), tab.href).toBe(true);
      const route = tab.href.slice(2).split("?")[0];
      expect(redirectFor(route), `${tab.href} is retired`).toBeNull();
      expect(titleForRoute(route), `${tab.href} has no page`).not.toBe("blueberry · Not Found");
    }
  });

  it("stays out of the entry bundle: home loads it only through React.lazy", () => {
    const home = readFileSync(new URL("../components/HomePage.tsx", import.meta.url), "utf8");
    expect(home).toMatch(/lazy\(\(\) => import\("@\/components\/HomePhoneDemo"\)\)/);
    expect(home).not.toMatch(/^import .*HomePhoneDemo/m);
  });
});
