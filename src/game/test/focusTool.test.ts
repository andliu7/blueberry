// @vitest-environment jsdom
/**
 * The focus timer as an app tool (owner, 28 Oct): it is one of the header tools, it has a
 * route and a Settings row, and its provider is above every screen so it survives a closed
 * sheet. The clock arithmetic itself is useFocusTimer's, which the site already uses.
 */
import { readFileSync } from "node:fs";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ALL_TABS, TOOL_TABS, parseHash } from "../app/routes";
import { FocusProvider, useFocus } from "../tabs/focus/FocusProvider";
import FocusTab from "../tabs/focus/FocusTab";
import { titleForRoute } from "../../lib/useDocumentTitle";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("the focus tool is wired", () => {
  it("is a header tool under Me with its own route and title", () => {
    const tab = ALL_TABS.find((t) => t.id === "focus");
    expect(tab?.placement).toBe("tool");
    expect(tab?.parent).toBe("me");
    expect(TOOL_TABS.some((t) => t.id === "focus")).toBe(true);
    expect(parseHash("#/app/focus")).toEqual({ kind: "tab", tab: "focus", rest: [] });
    expect(titleForRoute("app/focus")).toBe("blueberry · Focus timer");
  });

  it("has its provider above the routes and a Settings row", () => {
    const app = read("../App.tsx");
    expect(app).toMatch(/<FocusProvider>\s*<AppRoutes \/>\s*<\/FocusProvider>/);
    expect(read("../tabs/me/MeTab.tsx")).toContain("<FocusSetting />");
  });
});

describe("the timer screen", () => {
  function mount(withProvider: boolean) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(withProvider ? createElement(FocusProvider, null, createElement(FocusTab)) : createElement(FocusTab)));
    return { host, root };
  }

  it("says so, instead of crashing, where there is no provider", () => {
    const { host, root } = mount(false);
    expect(host.textContent).toContain("isn't available");
    act(() => root.unmount());
    host.remove();
  });

  it("starts, shows the eye-rest countdown, pauses and ends", async () => {
    localStorage.clear();
    const { host, root } = mount(true);
    const press = (label: string) => {
      const button = [...host.querySelectorAll("button")].find((b) => b.textContent?.trim() === label);
      expect(button, label).toBeDefined();
      act(() => button!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    };
    expect(host.querySelector("[role=timer]")?.textContent).toBe("25:00");
    press("Start focus");
    expect(host.querySelector("[data-focus-tab]")?.getAttribute("data-phase")).toBe("focus");
    expect(host.textContent).toContain("Eye rest in");
    // A real pause banks seconds; in the same millisecond it would bank none and read as a fresh start.
    await new Promise((resolve) => setTimeout(resolve, 30));
    press("Pause");
    expect(host.querySelector("[data-focus-tab]")?.getAttribute("data-phase")).toBe("idle");
    expect(host.textContent).toContain("Resume");
    press("End");
    expect(host.textContent).toContain("Start focus");
    act(() => root.unmount());
    host.remove();
  });

  it("useFocus is null outside a provider", () => {
    let seen: unknown = "unset";
    function Probe() {
      seen = useFocus();
      return null;
    }
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(createElement(Probe)));
    expect(seen).toBeNull();
    act(() => root.unmount());
  });
});

describe("no em dash in the new files", () => {
  it("is clean", () => {
    for (const file of ["../tabs/focus/FocusProvider.tsx", "../tabs/focus/FocusTab.tsx", "../tabs/focus/focus.css", "../settings/FocusSetting.tsx"]) {
      expect(read(file), file).not.toContain("—");
    }
  });
});
