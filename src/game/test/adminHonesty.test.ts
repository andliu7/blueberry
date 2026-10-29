import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdminHome from "../admin/AdminHome";
import { sampleAdminHome } from "../admin/adminHomeData";

const html = renderToStaticMarkup(createElement(AdminHome, { data: sampleAdminHome }));
const live = renderToStaticMarkup(
  createElement(AdminHome, { data: { ...sampleAdminHome, source: "mixed", liveParts: ["growth", "stat:signups", "today"] } }),
);

describe("admin home honesty", () => {
  it("with no live part, prints no invented figure and says No data, example", () => {
    expect(html).toContain("No data, example");
    expect(html).not.toContain("Sample data");
    expect(html).not.toContain("$1,534");
    expect(html).not.toContain("1,284");
    expect(html).not.toContain("Service is slow");
  });
  it("money and system status stay examples even when other parts are live", () => {
    expect(live).toContain("Stripe");
    expect(live).toContain("example-note");
    expect(live).toContain("Source: profiles table");
    expect(live).not.toContain("$411");
  });
  it("collapses revenue, payouts and system status into one not-connected card with no figures", () => {
    expect(html).toContain("Not connected yet");
    expect(html).not.toMatch(/dd.d% over 30 days/);
    expect(html).not.toContain("Working");
    expect(html).not.toContain("Payout to bank");
  });
  it("lists real purchases only when billing is a live part", () => {
    const withRows = renderToStaticMarkup(
      createElement(AdminHome, {
        data: { ...sampleAdminHome, source: "mixed", liveParts: ["billing"], purchases: [{ id: "p1", plan: "pro_monthly", kind: "subscription", status: "active", at: "2026-10-20T10:00:00Z" }] },
      }),
    );
    expect(withRows).toContain("pro_monthly");
    expect(withRows).toContain("amounts are held by Stripe");
    expect(html).not.toContain("pro_monthly");
  });
  it("offers no sign-in action inside the dashboard: staff only reach it through the gate", () => {
    expect(html).not.toContain("Sign in");
    expect(html).not.toContain("#/signin");
    expect(html).toContain("connect-banner");
    expect(live).not.toContain("connect-banner");
  });
  it("offers a way into the app from the admin shell", () => {
    expect(html).toContain("Open the app");
  });
});
