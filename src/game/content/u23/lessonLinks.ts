/**
 * Units 2 and 3 as a lesson chain, the same data shape as Unit 1's
 * (content/u1/lessonLinks.ts): what each lesson teaches and what it assumes.
 * Round 2 of the units 2 and 3 piece (29 Oct 2026). The report's complaint was
 * that Unit 3 recalls EWG/EDG, resonance and the arenium cation without saying
 * which earlier lesson taught them; here every such assumption names its teacher,
 * so a stuck student gets "earlier lessons that teach what this assumes".
 *
 * A concept is "u2:<name>" or "u3:<name>" when a lesson in that unit teaches it,
 * "u1:<name>" when a Unit 1 lesson does (see content/u1/lessonLinks.ts), and
 * "u0:<name>" when it is assumed from Unit 0 and is not checked against the chain.
 * Entry-chunk safe: no prose beyond labels. Drafts until the owner signs them off.
 */
import type { LessonLink } from "../u1/lessonLinks";

export const U23_LABELS: Readonly<Record<string, string>> = {
  "u2:induction": "Induction through sigma bonds",
  "u2:keq-pka": "pKa and which side of an equilibrium wins",
  "u2:energy-keq": "Energy diagrams, Keq and which steps reverse",
  "u2:ring-resonance": "Resonance round a ring",
  "u2:huckel": "The four aromaticity tests",
  "u2:charged-rings": "Charged aromatic rings",
  "u2:ring-size": "Annulenes and ring size",
  "u2:hetero-rings": "Heterocycles and the lone pair",
  "u2:donor-withdrawer": "Donors and withdrawers",
  "u2:ring-current": "The ring-current signature",
  "u2:opm": "Ortho, meta and para",
  "u2:priority": "Naming priority and lowest locants",
  "u3:arenium": "The arenium mechanism",
  "u3:directing": "Directing effects",
  "u3:halogenation": "Ring halogenation",
  "u3:nitration": "Nitration",
  "u3:sulfonation": "Sulfonation and its reversal",
  "u3:fc-alkyl": "Friedel-Crafts alkylation",
  "u3:fc-acyl": "Friedel-Crafts acylation",
  "u3:blocking": "Blocking groups",
  "u3:nitro-reduction": "Nitro reduction",
  "u3:carbonyl-to-ch2": "Carbonyl to CH2",
  "u3:benzylic-ox": "Benzylic oxidation",
  "u3:sequencing": "Ordering a multistep synthesis",
  "u3:benzylic-br": "Benzylic bromination",
  "u3:birch": "Birch reduction",
};

export const U2_LINKS: Readonly<Record<string, LessonLink>> = {
  "u2-induction": { teaches: ["u2:induction"], assumes: ["u0:resonance", "u0:orbitals"] },
  "u2-keq-pka": { teaches: ["u2:keq-pka"], assumes: ["u2:induction"] },
  "u2-energy": { teaches: ["u2:energy-keq"], assumes: ["u2:keq-pka"] },
  "u2-resonance": { teaches: ["u2:ring-resonance"], assumes: ["u0:resonance", "u1:allylic", "u2:keq-pka"] },
  "u2-huckel": { teaches: ["u2:huckel"], assumes: ["u2:ring-resonance", "u0:orbitals"] },
  "u2-charged": { teaches: ["u2:charged-rings"], assumes: ["u2:huckel", "u2:keq-pka"] },
  "u2-annulene": { teaches: ["u2:ring-size"], assumes: ["u2:huckel", "u2:charged-rings"] },
  "u2-hetero": { teaches: ["u2:hetero-rings"], assumes: ["u2:huckel", "u2:charged-rings"] },
  "u2-ewg-edg": { teaches: ["u2:donor-withdrawer"], assumes: ["u2:induction", "u2:ring-resonance", "u2:hetero-rings"] },
  "u2-nmr": { teaches: ["u2:ring-current"], assumes: ["u2:huckel", "u2:ring-size"] },
  "u2-nomen": { teaches: ["u2:opm"], assumes: ["u2:huckel", "u2:ring-resonance", "u2:donor-withdrawer"] },
  "u2-nomen-priority": { teaches: ["u2:priority"], assumes: ["u2:opm"] },
};

export const U3_LINKS: Readonly<Record<string, LessonLink>> = {
  "u3-arenium": { teaches: ["u3:arenium"], assumes: ["u2:ring-resonance", "u2:huckel", "u1:cation-ranking"] },
  "u3-directing": { teaches: ["u3:directing"], assumes: ["u3:arenium", "u2:donor-withdrawer", "u2:induction"] },
  "u3-halo": { teaches: ["u3:halogenation"], assumes: ["u3:arenium", "u3:directing"] },
  "u3-nitration": { teaches: ["u3:nitration"], assumes: ["u3:arenium", "u3:directing"] },
  "u3-sulfo": { teaches: ["u3:sulfonation"], assumes: ["u3:arenium", "u3:directing"] },
  "u3-fc-alkyl": { teaches: ["u3:fc-alkyl"], assumes: ["u3:arenium", "u3:directing", "u1:cation-ranking"] },
  "u3-fc-acyl": { teaches: ["u3:fc-acyl"], assumes: ["u3:fc-alkyl", "u3:directing"] },
  "u3-blocking": { teaches: ["u3:blocking"], assumes: ["u3:sulfonation", "u3:directing"] },
  "u3-nitro-red": { teaches: ["u3:nitro-reduction"], assumes: ["u3:nitration", "u3:directing"] },
  "u3-c-to-ch2": { teaches: ["u3:carbonyl-to-ch2"], assumes: ["u3:fc-acyl", "u3:fc-alkyl"] },
  "u3-benzylic-ox": { teaches: ["u3:benzylic-ox"], assumes: ["u3:directing", "u1:allylic"] },
  "u3-sequencing": { teaches: ["u3:sequencing"], assumes: ["u3:directing", "u3:blocking", "u3:nitro-reduction", "u3:fc-acyl", "u3:benzylic-ox", "u3:carbonyl-to-ch2"] },
  "u3-benzylic-br": { teaches: ["u3:benzylic-br"], assumes: ["u3:halogenation", "u1:allylic-halogenation", "u0:radical"] },
  "u3-birch": { teaches: ["u3:birch"], assumes: ["u3:directing", "u2:donor-withdrawer"] },
};
