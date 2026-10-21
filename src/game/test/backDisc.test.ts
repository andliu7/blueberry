/**
 * The shared back disc (owner, 20 Oct, queue item 24: "add a faint circle
 * around it so even if there is an image at the top or something, it's
 * clear"). One class in theme.css, worn by every game back button. Nothing in
 * the type system ties a className to a stylesheet, so a renamed class or a
 * back button that drops it would fail silently; these assertions are that
 * edge. Reads files, not a rendered page, like bootFrontDoor.test.ts.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const game = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(game, rel), "utf8");

// Each back button, by the file it lives in and a snippet unique to its tag.
const BACK_BUTTONS: ReadonlyArray<readonly [string, string]> = [
  ["guide/UnitGuide.tsx", 'aria-label="Back to the path"'],
  ["pathway-sheet/Guidebook.tsx", 'aria-label="Back"'],
  ["onboarding/Frame.tsx", 'className="ob-back'],
  ["cards/ui/DeckScreen.tsx", 'aria-label="Back to your decks"'],
  ["cards/ui/ComposeScreen.tsx", 'aria-label="Back to your decks"'],
];

describe("back disc", () => {
  it("is defined once in theme.css as a layer under the icon", () => {
    const css = read("theme.css");
    expect(css.match(/^\.bb-back-disc \{/gm)).toHaveLength(1);
    expect(css).toMatch(/\.bb-back-disc::before \{[^}]*z-index: -1;[^}]*\}/);
    expect(css).toMatch(/\.bb-back-disc \{[^}]*isolation: isolate;[^}]*\}/);
  });

  it.each(BACK_BUTTONS)("%s wears the shared class", (file, marker) => {
    const src = read(file);
    const at = src.indexOf(marker);
    expect(at).toBeGreaterThan(-1);
    // The opening <button ...> tag around the marker.
    const open = src.lastIndexOf("<button", at);
    const close = src.indexOf(">", at);
    expect(src.slice(open, close)).toContain("bb-back-disc");
  });
});
