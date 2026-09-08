// The violation, at depth 3 from the entry.
//
// Two separate rules break here on purpose:
//   1. `react` is a banned import, found by the import graph walk.
//   2. `document` is a DOM host global, invisible to any import walk, found only by the
//      token scan in measure/dom-globals.ts.
import { createElement } from "react";

export function overlayFor(center) {
  const host = document.createElement("div");
  host.dataset.atom = String(center);
  return createElement("g", { "data-atom": center });
}
