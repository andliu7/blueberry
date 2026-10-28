// @vitest-environment jsdom
/**
 * Save as you go, round 4: the safe choice is the easy one.
 *
 * The critic's round 3 findings this suite pins:
 *   1. START OVER's sheet gave the big filled key to ERASE. Now KEEP MY
 *      PROGRESS is the filled key, first, and the erase is plain text after it
 *      (ChargeGate + resume/restartCopy.ts isRestart). A plain entry sheet is
 *      unchanged: START is still its big key.
 *   2. The resume screen's X opened the "your progress is saved" sheet on top
 *      of a screen that already says so. Now it leaves at once (leaveNow.ts).
 *   3. The leave sheet says the lesson's XP, diamonds and streak credit are
 *      paid on finishing, and does not promise diamonds on a replay.
 */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deriveEconomy } from "@blueberry/economy";

import { ChargeGate } from "../charge/ChargeGate";
import { chargeGateModel, type ChargeGateNode } from "../charge/chargeGateModel";
import { isRestart, leaveRewardLine, restartCopy } from "../resume/restartCopy";
import { LessonLeave } from "../resume/LeaveSheet";
import { ResumePrompt } from "../resume/ResumePrompt";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NODE: ChargeGateNode = { id: "u1-allylic", kind: "concept", title: "Allylic/resonance delocalization", href: "#/app/lesson/u1-allylic" };

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false;
  };
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

/** The sheet's pressable keys, in document order, as [label, classes]. */
function keys(): Array<[string, string]> {
  return [...host.querySelectorAll<HTMLButtonElement>(".sp-card button:not(.sp-x)")].map((b) => [b.textContent?.trim() ?? "", b.className]);
}

// The sheet's first render in jsdom (Berry, the meter) takes about 4s cold, so these two get a 20s budget.
describe("START OVER's sheet makes keeping the default", { timeout: 20_000 }, () => {
  it("puts KEEP MY PROGRESS first as the filled key and the erase last as plain text", () => {
    act(() => root.render(createElement(ChargeGate, { node: NODE, onClose: () => {}, reducedMotion: true, restartSaved: "3 saved questions" })));
    const k = keys();
    expect(k[0]?.[0]).toBe("Keep my progress");
    expect(k[0]?.[1]).toContain("sp-go");
    const last = k[k.length - 1];
    expect(last?.[0]).toBe("Erase and start over");
    expect(last?.[1]).toContain("sp-quiet");
    expect(last?.[1]).toContain("restart-erase");
    // One keep key, never a second dismiss under the erase.
    expect(k.filter(([label]) => label === "Keep my progress")).toHaveLength(1);
  });

  it("leaves a plain entry sheet as it was: START is the big filled key", () => {
    act(() => root.render(createElement(ChargeGate, { node: NODE, onClose: () => {}, reducedMotion: true })));
    const k = keys();
    expect(k[0]?.[1]).toContain("sp-go");
    expect(k.some(([, cls]) => cls.includes("restart-erase"))).toBe(false);
  });

  it("is only the restart sheet when there is a save to erase and charge to start", () => {
    const ready = chargeGateModel(deriveEconomy([], "2026-10-17T14:00:00.000Z"), NODE);
    expect(isRestart(restartCopy(ready, "3 saved questions"), "3 saved questions")).toBe(true);
    expect(isRestart(ready, undefined)).toBe(false);
    expect(isRestart(ready, "")).toBe(false);
  });
});

describe("the resume screen's X leaves at once", () => {
  it("calls the real leave, not the asking exit, inside LessonLeave", () => {
    let left = 0;
    let asked = 0;
    act(() =>
      root.render(
        createElement(LessonLeave, {
          node: NODE.id,
          saves: true,
          reducedMotion: true,
          onLeave: () => {
            left += 1;
          },
          children: () =>
            createElement(ResumePrompt, {
              node: NODE.id,
              title: NODE.title,
              detail: "3 questions done and saved",
              saved: "3 saved questions",
              bar: null,
              reducedMotion: true,
              onContinue: () => {},
              onRestart: () => {},
              onExit: () => {
                asked += 1;
              },
            }),
        }),
      ),
    );
    act(() => host.querySelector<HTMLButtonElement>(".lesson-exit")?.click());
    expect(left).toBe(1);
    expect(asked).toBe(0);
    expect(host.querySelector(".leave-sheet[open]")).toBeNull();
  });
});

describe("the leave sheet is honest about rewards", () => {
  it("says XP, diamonds and streak land on finishing, and drops diamonds on a replay", () => {
    expect(leaveRewardLine(false)).toBe("Your XP, diamonds and streak credit land when you finish it.");
    expect(leaveRewardLine(true)).not.toContain("diamonds");
    expect(leaveRewardLine(true)).toContain("XP");
  });
});
