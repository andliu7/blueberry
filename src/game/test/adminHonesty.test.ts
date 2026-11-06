import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AdminHome from "../admin/AdminHome";
import { emptyAdminHome } from "../admin/adminHomeData";

const html = renderToStaticMarkup(createElement(AdminHome, { data: emptyAdminHome }));
const live = renderToStaticMarkup(
  createElement(AdminHome, { data: { ...emptyAdminHome, source: "mixed", liveParts: ["growth", "stat:signups", "today"] } }),
);

describe("admin home honesty", () => {
  it("with no live part, prints no invented figure and no row of placeholder dashes", () => {
    expect(html).not.toContain("ahd-kpi");
    expect(html).not.toContain("—");
    expect(html).not.toContain("No data, example");
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
  it("shows billing as parked on purpose, not as a missing connection, and prints no figures", () => {
    expect(html).toContain("<strong>Billing</strong><span>Off for now, on purpose.");
    expect(html).not.toContain("Not connected");
    expect(live).toContain("Coming later");
    expect(live).not.toContain("Not connected");
    expect(html).not.toMatch(/dd.d% over 30 days/);
    expect(html).not.toContain("Working");
    expect(html).not.toContain("Payout to bank");
  });
  it("lists real purchases only when billing is a live part", () => {
    const withRows = renderToStaticMarkup(
      createElement(AdminHome, {
        data: { ...emptyAdminHome, source: "mixed", liveParts: ["billing"], purchases: [{ id: "p1", plan: "pro_monthly", kind: "subscription", status: "active", at: "2026-10-20T10:00:00Z" }] },
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
  it("with nothing read, leads with the tasks and one compact figures note, with no empty chart", () => {
    expect(html).toContain("empty-layout");
    expect(html.indexOf("Loading tasks")).toBeGreaterThan(-1);
    expect(html.indexOf("Loading tasks")).toBeLessThan(html.indexOf("ahd-note"));
    expect(html).toContain("Figures need a staff account");
    expect(html).toContain("read from the database with a staff account");
    expect(html.match(/ahd-note__act/g)?.length).toBe(1);
    expect(html).toContain("Open your account");
    expect(html).toContain("<strong>Uptime</strong>");
    expect(html).not.toContain("ahd-chart");
    expect(html).not.toContain("Your overview");
    expect(html).not.toContain("ah-nil");
    expect(html).not.toContain("What fills in here");
    expect(html).not.toContain("ah-strip");
    expect(live).toContain("ah-strip");
    expect(live).not.toContain("empty-layout");
  });
  it("does not repeat Tasks under On this page: the sidebar's Tasks item already goes there", () => {
    expect(html).not.toContain("On this page");
    expect(html).not.toContain('href="#ah-tasks"');
    expect(live).toContain("On this page");
    expect(live).not.toContain('href="#ah-tasks"');
  });
  it("puts New task beside the title as an outline button, leaving Start as the one filled action", () => {
    expect(html).toContain("ah-outline");
    expect(html).not.toContain("ah-primary");
    expect(html).toContain("New task");
  });
  it("offers a way into the app from the admin shell", () => {
    expect(html).toContain("Open the app");
  });
});
