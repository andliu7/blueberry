// One hop from the entry. Pure arithmetic, and it re-exports the module that is not.
// The point of this file is that it is innocent: the violation is one level further
// down, so a gate that only read the entry point would report clean.
import { overlayFor } from "./arrow-overlay.js";

export function tetrahedralFrame(center, neighbours) {
  const overlay = overlayFor(center);
  return { center, neighbours, overlay };
}
