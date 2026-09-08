// Reachable from nothing. Imports a banned package that the walk will therefore never
// see. This is the fixture half that proves the coverage assertion earns its place: the
// gate must say "there is a built module I did not inspect" rather than "clean".
import { createRoot } from "react-dom/client";

export function mount(node) {
  return createRoot(node);
}
