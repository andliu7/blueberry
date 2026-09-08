// A second banned package on a shorter chain than react's, so the report has to carry
// both findings rather than stopping at whichever it met first.
import { Vector3 } from "three";

export function chargeBadge(atom) {
  return new Vector3(atom.x, atom.y, 0);
}
