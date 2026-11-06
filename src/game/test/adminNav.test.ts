// @vitest-environment jsdom
// Admin navigation pins (owner, 3 Nov: "can't go back on Bloom", "still can't go back
// to the admin from the settings page"). Each admin page must keep a way home, and the
// admin -> settings -> admin round trip must be one tap each way.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { cameFromAdmin, hrefForSettingsFromAdmin, hrefForTab } from "../app/routes";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), "utf8");

describe("admin navigation", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("opens Settings with a flag that only the admin sets", () => {
    const href = hrefForSettingsFromAdmin();
    expect(href.startsWith(hrefForTab("me", "settings"))).toBe(true);
    window.location.hash = href;
    expect(cameFromAdmin()).toBe(true);
    window.location.hash = hrefForTab("me", "settings");
    expect(cameFromAdmin()).toBe(false);
  });

  it("gives Settings a Back to admin key when opened from the admin", () => {
    const me = read("../tabs/me/MeTab.tsx");
    expect(me).toMatch(/backHref=\{hrefForAdmin\("home"\)\} backLabel="Back to admin" showLabel/);
  });

  it("lists Open the app once, in the sidebar only", () => {
    const home = read("../admin/AdminHome.tsx");
    expect(home.match(/>\s*Open the app\s*</g) ?? []).toHaveLength(0);
    expect(home.match(/label: "Open the app"/g) ?? []).toHaveLength(1);
    expect(home).toMatch(/label: "Settings", icon: "gear", href: hrefForSettingsFromAdmin\(\)/);
  });

  it("mounts every sidebar page inside the shell that holds Home", () => {
    const viewer = read("../admin/AdminViewer.tsx");
    for (const node of ["stats", "activity", "bloom", "lessons"]) {
      expect(viewer).toContain(`page("${node}",`);
    }
  });
});
