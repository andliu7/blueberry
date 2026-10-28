import { describe, expect, it } from "vitest";
import {
  DEFAULT_GROUND,
  DEEP_BLUE_HUE,
  GROUND_KEY,
  createGround,
  groundCss,
  groundFor,
  hueOf,
} from "../settings/groundTheme";
import type { SettingsStorage } from "../settings/pka";

function memory(initial: Record<string, string> = {}): SettingsStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
  } as SettingsStorage & { data: Record<string, string> };
}

describe("page colour", () => {
  it("writes nothing for lavender, so the default is the theme.css look", () => {
    expect(groundCss(DEFAULT_GROUND)).toBe("");
  });

  it("paints deep blue in both themes without !important", () => {
    const css = groundCss({ preset: "deepblue", custom: "#5a3fd8" });
    expect(css).toContain(`hsl(${DEEP_BLUE_HUE} 100% 93%)`);
    expect(css).toContain("html.dark:root");
    expect(css).not.toContain("!important");
  });

  it("reads the hue of a colour and ignores greys", () => {
    expect(hueOf("#ff0000")).toBe(0);
    expect(hueOf("#00ff00")).toBe(120);
    expect(hueOf("#0000ff")).toBe(240);
    expect(hueOf("#808080")).toBe(259);
    expect(hueOf("not a colour")).toBe(259);
  });

  it("keeps the light ground pale and the dark ground deep for every hue", () => {
    const lightness = (s: string) => Number(/ (\d+)%\)$/.exec(s.replace(/ \/.*\)$/, ")"))?.[1]);
    for (let h = 0; h < 360; h += 15) {
      const { light, dark } = groundFor(h);
      expect(lightness(light.top)).toBeGreaterThanOrEqual(88);
      expect(lightness(light.bottom)).toBeGreaterThanOrEqual(88);
      expect(lightness(dark.top)).toBeLessThanOrEqual(17);
      expect(lightness(dark.bottom)).toBeLessThanOrEqual(17);
    }
  });

  it("stores a choice and rejects a bad colour", () => {
    const storage = memory();
    const store = createGround(storage);
    store.set({ preset: "custom", custom: "#12ab34" });
    expect(JSON.parse(storage.data[GROUND_KEY])).toEqual({ preset: "custom", custom: "#12ab34" });
    store.set({ preset: "custom", custom: "#12ab3" });
    expect(store.getSnapshot().custom).toBe("#12ab34");
  });

  it("reads a damaged saved value as the default", () => {
    expect(createGround(memory({ [GROUND_KEY]: "{oops" })).getSnapshot()).toEqual(DEFAULT_GROUND);
    expect(createGround(memory({ [GROUND_KEY]: JSON.stringify({ preset: "neon", custom: 4 }) })).getSnapshot()).toEqual(DEFAULT_GROUND);
  });
});
