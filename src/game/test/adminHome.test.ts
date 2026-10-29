import { describe, expect, it } from "vitest";
import { hrefForAdmin, parseHash } from "../app/routes";
import { formatMoney, invoicesCsv, relativeTime, sampleAdminHome, stepRate, uptimePercent } from "../admin/adminHomeData";

describe("admin home data", () => {
  it("is labelled sample and never live", () => {
    expect(sampleAdminHome.source).toBe("sample");
  });
  it("routes #/app/admin/home to the admin viewer", () => {
    expect(parseHash(hrefForAdmin("home"))).toEqual({ kind: "admin", node: "home" });
  });
  it("funnel never grows from one stage to the next", () => {
    const c = sampleAdminHome.funnel.map((s) => s.count);
    for (let i = 1; i < c.length; i += 1) expect(c[i]!).toBeLessThanOrEqual(c[i - 1]!);
    expect(stepRate(1480, 9200)).toBe(16);
  });
  it("formats money, time and uptime", () => {
    expect(formatMoney(4900)).toBe("$49");
    expect(formatMoney(41150)).toBe("$411.50");
    expect(relativeTime(6)).toBe("6 min ago");
    expect(relativeTime(380)).toBe("6 h ago");
    expect(uptimePercent([true, true, true, false])).toBe("75.0");
  });
  it("writes a csv with a header and one line per row", () => {
    const lines = invoicesCsv(sampleAdminHome.invoices).split("\n");
    expect(lines).toHaveLength(sampleAdminHome.invoices.length + 1);
    expect(lines[0]).toBe("Invoice,Learner,Plan,Date,Amount,Status");
  });
  it("uses no em dash in the page copy", () => {
    expect(JSON.stringify(sampleAdminHome)).not.toContain("\u2014");
  });
});
