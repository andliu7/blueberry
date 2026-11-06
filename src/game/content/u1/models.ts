/**
 * Which turnable 3-D models (stage-cd.models.ts, generated from RDKit) show
 * where (ADDED 3 Nov, Unit 1 review suggestion 9). A set is one or two models
 * side by side. Read-along cards name a set with `model`; the questions in
 * beatModels.ts offer theirs after the answer, folded under "Turn it in 3-D",
 * so the model never gives an answer away and never adds a decision before one.
 */
import type { Model3D } from "../../beats/model3d";
import { CD_MODELS } from "./stage-cd.models";

export const U1_MODEL_SETS: Readonly<Record<string, readonly { readonly key: string; readonly name: string }[]>> = {
  "endo-exo": [
    { key: "nbanh-endo", name: "endo adduct" },
    { key: "nbanh-exo", name: "exo adduct" },
  ],
  "endo": [{ key: "nbanh-endo", name: "endo adduct" }],
  "fumarate": [{ key: "nbdiester-endoexo", name: "fumarate adduct: one ester endo, one exo" }],
};

/** A set resolved to its models, or null when a key does not resolve. */
export function modelSet(set: string): readonly { readonly model: Model3D; readonly name: string }[] | null {
  const rows = U1_MODEL_SETS[set];
  if (rows === undefined) return null;
  const out = rows.map((row) => ({ model: CD_MODELS[row.key], name: row.name }));
  return out.every((one) => one.model !== undefined) ? (out as { model: Model3D; name: string }[]) : null;
}
