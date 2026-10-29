/**
 * Unit 1's lesson chain as data: what each lesson teaches and assumes. Kept
 * apart from lessonPath.ts (the walk-throughs, the help rows) because the
 * difficulty algorithm in the game's entry chunk reads only this, and the
 * walk-through prose has no business in that chunk.
 *
 * A concept is "u1:<name>" when a Unit 1 lesson teaches it; "u0:<name>" is
 * assumed from Unit 0 and is not checked against the chain. See lessonPath.ts.
 */

export interface LessonLink {
  /** Concepts this lesson teaches. A concept is taught by exactly one lesson. */
  readonly teaches: readonly string[];
  /** Concepts this lesson needs on arrival. Each must be taught earlier, or live in Unit 0. */
  readonly assumes: readonly string[];
}

/** The human label of a concept, for the help path. */
export const CONCEPT_LABELS: Readonly<Record<string, string>> = {
  "u0:resonance": "Resonance and curved arrows",
  "u0:carbocation": "What a carbocation is",
  "u0:hx-addition": "HX adding across a C=C",
  "u0:orbitals": "Orbitals and the pi bond",
  "u0:radical": "Radicals and the chain idea",
  "u1:allylic": "What allylic means",
  "u1:cation-ranking": "Ranking carbocations",
  "u1:anion-ranking": "Ranking carbanions",
  "u1:radical-ranking": "Ranking radicals",
  "u1:diene-addition": "HX adding to a diene",
  "u1:kinetic-thermo": "Kinetic versus thermodynamic",
  "u1:energy-diagram": "Reading an energy diagram",
  "u1:temperature-picks": "Temperature picks the product",
  "u1:x2-addition": "X2 adding to a diene",
  "u1:allylic-halogenation": "NBS and allylic halogenation",
  "u1:pi-mo": "Pi MOs, HOMO and LUMO",
  "u1:diels-alder": "The Diels-Alder reaction",
  "u1:diene-shape": "The diene must reach s-cis",
  "u1:dienophile": "What makes a good dienophile",
  "u1:da-prediction": "Predicting a Diels-Alder product",
  "u1:da-stereo": "Diels-Alder stereochemistry",
  "u1:da-3d": "Drawing the 3-D product",
};

export const U1_LINKS: Readonly<Record<string, LessonLink>> = {
  "u1-allylic": { teaches: ["u1:allylic"], assumes: ["u0:resonance", "u0:carbocation"] },
  "u1-rank-cation": { teaches: ["u1:cation-ranking"], assumes: ["u1:allylic"] },
  "u1-rank-anion": { teaches: ["u1:anion-ranking"], assumes: ["u1:allylic", "u1:cation-ranking"] },
  "u1-rank-radical": { teaches: ["u1:radical-ranking"], assumes: ["u1:allylic", "u1:cation-ranking", "u0:radical"] },
  "u1-12v14": { teaches: ["u1:diene-addition"], assumes: ["u1:allylic", "u1:cation-ranking", "u0:hx-addition"] },
  "u1-kvt": { teaches: ["u1:kinetic-thermo"], assumes: ["u1:diene-addition"] },
  "u1-energy-diagram": { teaches: ["u1:energy-diagram"], assumes: ["u1:kinetic-thermo"] },
  "u1-hx-dienes": { teaches: ["u1:temperature-picks"], assumes: ["u1:diene-addition", "u1:kinetic-thermo", "u1:energy-diagram"] },
  "u1-x2": { teaches: ["u1:x2-addition"], assumes: ["u1:temperature-picks"] },
  "u1-nbs": { teaches: ["u1:allylic-halogenation"], assumes: ["u1:allylic", "u0:radical"] },
  "u1-mo": { teaches: ["u1:pi-mo"], assumes: ["u0:orbitals"] },
  "u1-da": { teaches: ["u1:diels-alder"], assumes: ["u1:pi-mo"] },
  "u1-dienes": { teaches: ["u1:diene-shape"], assumes: ["u1:diels-alder"] },
  "u1-dienophiles": { teaches: ["u1:dienophile"], assumes: ["u1:diels-alder", "u1:pi-mo"] },
  "u1-da-predict": { teaches: ["u1:da-prediction"], assumes: ["u1:diene-shape", "u1:dienophile"] },
  "u1-da-stereo": { teaches: ["u1:da-stereo"], assumes: ["u1:da-prediction"] },
  "u1-da-3d": { teaches: ["u1:da-3d"], assumes: ["u1:da-stereo"] },
};

/** The lesson that teaches a concept, or null for a Unit 0 concept. */
export function teacherOf(concept: string): string | null {
  for (const [node, link] of Object.entries(U1_LINKS)) if (link.teaches.includes(concept)) return node;
  return null;
}

