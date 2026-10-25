import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Payload trim, 2026-10-25: the account menu (Radix's dropdown, about 25 KB gzipped
 * with its popper and focus helpers) and the site search are site-header parts that
 * `#/app` never draws, so both load as their own chunks and stay off the game's first
 * open. These pin that no static import brings them back, and that the bar still
 * shows the avatar button while the menu's chunk is on its way.
 */

vi.mock("@/lib/useSession", () => ({
  useSession: () => ({ name: "Ada Lovelace", email: "ada@example.com", picture: null, role: "member", signOut: () => {} }),
}));
vi.mock("@/lib/profile", () => ({ useProfile: () => ({ firstName: "", lastName: "", avatar: "" }) }));

const { ProfileDropdown } = await import("@/components/ui/profile-dropdown");

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const staticImports = (source: string) => [...source.matchAll(/^import[^;]*?from\s+"([^"]+)"/gm)].map((m) => m[1]);

describe("the account menu and search stay off the game's first open", () => {
  it("profile-dropdown reaches Radix only through lazy()", () => {
    const source = read("components/ui/profile-dropdown.tsx");
    expect(staticImports(source)).not.toContain("@/components/ui/dropdown-menu");
    expect(staticImports(source)).not.toContain("@/components/ui/profile-menu");
    expect(source).toContain('lazy(() => import("@/components/ui/profile-menu")');
  });

  it("SiteChrome reaches GlobalSearch only through lazy()", () => {
    const source = read("components/SiteChrome.tsx");
    expect(staticImports(source)).not.toContain("@/components/GlobalSearch");
    expect(source).toContain('lazy(() => import("@/components/GlobalSearch")');
  });

  it("draws the avatar button while the menu's chunk loads", () => {
    const html = renderToStaticMarkup(createElement(ProfileDropdown));
    expect(html).toContain('aria-label="Account: Ada Lovelace"');
    expect(html).toContain("<button");
  });
});
