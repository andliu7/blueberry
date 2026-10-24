// @vitest-environment jsdom

/**
 * The paste card on the pKa settings screen (STATUS C2), mounted for real:
 * paste two lines, press Update, read the summary and the store; press Reset
 * and read the store again. A .ts file with createElement because the suite's
 * include pattern is *.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import PkaSettings from "../settings/PkaSettings";
import { pkaSettings, pkaValueFor } from "../settings/pka";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  pkaSettings.reset();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(PkaSettings)));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  pkaSettings.reset();
});

/** Types into a React-controlled textarea: set through the native setter, then fire input. */
function type(field: HTMLTextAreaElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function button(label: string): HTMLButtonElement {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === label);
  if (found === undefined) throw new Error(`no button "${label}"`);
  return found;
}

describe("Paste your sheet", () => {
  it("applies a pasted sheet and says what changed and what it could not use", () => {
    const field = host.querySelector("textarea");
    if (field === null) throw new Error("no textarea");
    type(field, "Water 15.7\nacetic acid 4.76\nphenol 10\nunobtainium 3");
    act(() => button("Update my values").click());

    const regions = [...host.querySelectorAll('[role="status"][aria-live="polite"]')];
    const status = regions.map((region) => region.textContent ?? "").join(" ");
    expect(status).toContain("Changed (2)");
    expect(status).toContain("Water 16 -> 15.7");
    expect(status).toContain("Carboxylic acid O-H 5 -> 4.76");
    expect(status).toContain("Already the same (1)");
    expect(status).toContain("Could not use (1)");
    expect(status).toContain("unobtainium 3");

    const snapshot = pkaSettings.getSnapshot();
    expect(pkaValueFor(snapshot, "water")).toBe(15.7);
    expect(pkaValueFor(snapshot, "carboxylic_acid")).toBe(4.76);
    // An unchanged value is not stored as an override.
    expect(snapshot.overrides).toEqual({ water: 15.7, carboxylic_acid: 4.76 });
  });

  it("resets to Blueberry's values", () => {
    const field = host.querySelector("textarea");
    if (field === null) throw new Error("no textarea");
    type(field, "Water 15.7");
    act(() => button("Update my values").click());
    expect(pkaSettings.getSnapshot().overrides).toEqual({ water: 15.7 });

    act(() => button("Reset to Blueberry's values").click());
    expect(pkaSettings.getSnapshot().overrides).toEqual({});
    expect(host.textContent).toContain("Back to Blueberry's values.");
  });

  it("says where the values are saved", () => {
    expect(host.textContent).toContain("Saved on this device. Sign in to keep them on every device.");
  });
});
