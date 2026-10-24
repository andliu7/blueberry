// @vitest-environment jsdom

/**
 * The paste card with rows that have no rung (STATUS C2): a pasted HCl lands on
 * the site's pKa deck, is reported as changed and marked deck only, and Reset
 * clears it too.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import PkaSettings from "../settings/PkaSettings";
import { pkaSettings } from "../settings/pka";
import { pkaSheet } from "../settings/pkaSheet";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  pkaSettings.reset();
  pkaSheet.clearAll();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(createElement(PkaSettings)));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  pkaSettings.reset();
  pkaSheet.clearAll();
});

function paste(text: string) {
  const field = host.querySelector("textarea");
  if (field === null) throw new Error("no textarea");
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setter?.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const update = [...host.querySelectorAll("button")].find((b) => b.textContent === "Update my values");
  act(() => update?.click());
}

describe("Paste your sheet, rows with no rung", () => {
  it("puts them on the pKa deck and says so", () => {
    paste("HCl -6\nHF 3\nunobtainium 3");
    const status = host.textContent ?? "";
    expect(status).toContain("Changed (1)");
    expect(status).toContain("Hydrochloric acid (pKa deck only) -7 -> -6");
    expect(status).toContain("Already the same (1)");
    expect(status).toContain("Hydrofluoric acid (pKa deck only) 3");
    expect(status).toContain("Could not use (1)");
    expect(status).toContain("no rung in the lessons yet");
    expect(pkaSheet.getSnapshot()).toEqual({ hcl: -6 });
    expect(pkaSettings.getSnapshot().overrides).toEqual({});
  });

  it("clears them on Reset", () => {
    paste("HCl -6");
    const reset = [...host.querySelectorAll("button")].find((b) => b.textContent === "Reset to Blueberry's values");
    act(() => reset?.click());
    expect(pkaSheet.getSnapshot()).toEqual({});
  });
});
