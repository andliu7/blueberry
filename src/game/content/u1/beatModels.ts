/**
 * The turnable 3-D model set (models.ts) each endo/exo question offers once it
 * is answered (Unit 1 review suggestion 9). Kept apart from models.ts so the
 * question screen does not load the coordinates until the fold is opened.
 */
export const U1_BEAT_MODELS: Readonly<Record<string, string>> = {
  "u1-cd-st-endo": "endo-exo",
  "u1-cd-3d-endo-where": "endo",
  "u1-cd-3d-junction": "endo-exo",
  "u1-cd-3d-fumarate-cp": "fumarate",
};

