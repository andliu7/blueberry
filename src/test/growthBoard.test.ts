// @vitest-environment jsdom
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GrowthBoard, { sampleGrowthData, type GrowthBoardData } from "@/components/admin/GrowthBoard";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EVIL = '<script>window.__pwn=1</script>';

beforeAll(() => {
  const g = globalThis as Record<string, unknown>;
  g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
  // run animation frames inline-ish so the cards draw
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now() + 5000), 0) as unknown as number) as typeof window.requestAnimationFrame;
  window.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof window.cancelAnimationFrame;
});

describe("GrowthBoard", () => {
  it("renders the sample chip when sample data is used (server markup)", () => {
    const html = renderToStaticMarkup(createElement(GrowthBoard));
    expect(html).toContain("Sample data, not live");
  });

  it("hides the chip for real data", () => {
    const real: GrowthBoardData = { ...sampleGrowthData, isSample: false };
    expect(renderToStaticMarkup(createElement(GrowthBoard, { data: real }))).not.toContain("Sample data");
  });

  it("mounts and escapes a script string in a lesson name", async () => {
    const data: GrowthBoardData = {
      ...sampleGrowthData,
      flaggedLessons: [
        { name: EVIL, change: '"><img src=x onerror=1>', daily: [1, 2, 3, 4, 5, 6, 7] },
        ...sampleGrowthData.flaggedLessons.slice(1),
      ],
      exams: [{ name: EVIL, date: EVIL, daysAway: 3 }],
      feedback: [{ label: EVIL, open: 1, total: 2 }],
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root: Root = createRoot(host);
    await act(async () => {
      root.render(createElement(GrowthBoard, { data }));
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const html = host.innerHTML;
    expect(html).toContain("Top flagged lessons");
    expect(html).toContain("&lt;script&gt;");
    expect(host.querySelector("script")).toBeNull();
    expect(host.querySelector("img[src='x']")).toBeNull();
    expect((window as unknown as { __pwn?: number }).__pwn).toBeUndefined();
    await act(async () => root.unmount());
  });

  it("new files carry no old font name and no em dash", () => {
    for (const p of [
      "src/components/ui/finance-bento.tsx",
      "src/components/admin/GrowthBoard.tsx",
      "src/test/growthBoard.test.ts",
    ]) {
      const src = readFileSync(p, "utf8");
      // the test file names the words it forbids, so build them from parts
      expect(src.includes("Ge" + "ist")).toBe(false);
      expect(src.includes(String.fromCharCode(0x2014))).toBe(false);
    }
  });
});

afterAll(() => {
  document.body.innerHTML = "";
});
