// @vitest-environment jsdom
/**
 * The sign-in page when the #/app gate sent the visitor (owner, 23 Oct, G1).
 * Headed into the app it says why an account comes first and suggests Pro,
 * with no price and no promise; headed to the staff viewer it adds a staff
 * line; arriving from anywhere else it reads as it always did.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

vi.mock("@/lib/useSession", () => ({ useSession: () => null }));
vi.mock("@/lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/supabase")>()),
  supabaseConfigured: true,
}));

import { SignInPage } from "@/components/SignInPage";
import { rememberReturn } from "@/lib/returnTo";

afterEach(() => sessionStorage.clear());

const render = () => renderToString(createElement(SignInPage, { mode: "signin" }));
const ORIGINAL = "Decks and lessons are readable without an account.";

describe("SignInPage gate variant", () => {
  it("headed to #/app: says why, and links Pro to the plans page", () => {
    rememberReturn("#/app");
    const html = render();
    expect(html).toContain("The practice app keeps your lessons, streak and XP on your account");
    expect(html).toContain("Blueberry Pro");
    expect(html).toContain('href="#/d/subscriptions"');
    expect(html).not.toContain(ORIGINAL);
    expect(html).not.toContain("Staff: sign in to open the lesson viewer");
    // No price on this page: prices come from Stripe on the plans page.
    expect(html).not.toMatch(/\$\d/);
  });

  it("headed to #/app/admin: adds the staff line", () => {
    rememberReturn("#/app/admin/u1-allylic");
    const html = render();
    expect(html).toContain("Staff: sign in to open the lesson viewer. Your role comes from the course roster.");
  });

  it("from anywhere else: the original copy and no Pro card", () => {
    const html = render();
    expect(html).toContain(ORIGINAL);
    expect(html).not.toContain("Blueberry Pro");
    expect(html).not.toContain("#/d/subscriptions");
  });

  it("does not pull billing or the plans page into the sign-in chunk", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/components/SignInPage.tsx", "utf8");
    expect(source).not.toMatch(/from "@\/components\/ui\/subscription-plans"|from "@\/lib\/billing/);
  });
});
