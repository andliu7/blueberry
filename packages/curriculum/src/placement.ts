/**
 * Where a problem sits in the syllabus, and how hard it is.
 *
 * Three closed unions with typed record registries, the same construction
 * chem-core's causes.ts uses and for the same reason: a topic written as a free
 * string cannot be counted, cannot be grouped for mastery, and cannot be checked
 * for coverage. `CourseId`, `TopicId` and `ConceptId` are unions, `TOPICS` and
 * `CONCEPTS` are typed `Record<Id, Definition>`, so a member of the union with no
 * definition is a compile error and a definition outside the union is one too.
 *
 * THE ORGANIC CHEMISTRY II TREE IS NOW REAL. `docs/COURSE-OUTLINE-ORGO2.md` is
 * the authoritative structure and this file is its executable half. Everything
 * under `orgo_2` below traces to a numbered section of that document, including
 * every prerequisite edge. Where that document and CLAUDE.md disagree, CLAUDE.md
 * wins; section 9 of the document lists the conflicts found.
 *
 * WHAT THIS FILE CARRIES AND WHAT IT DOES NOT. It carries topics, which is the
 * granularity a `Problem` is filed at, plus the prerequisite edge list and the
 * cross cutting concepts. It does NOT carry the subtopic and skill layer below a
 * topic. That layer exists, it is section 3 of the outline, and it stays in the
 * document until there is a lesson schema to register it in. The argument in the
 * paragraph above applies one level down as hard as it applies here: a skill
 * written as a free string in an array is a skill nobody can count. It becomes
 * `LessonId` with a registry of this same shape, and not before.
 *
 * THREE MODELLING DECISIONS WORTH THE READ, because each one was a judgement call
 * and each is reversible only with an argument:
 *
 *   PREREQUISITES ARE DEPENDENCIES, NOT DELIVERY ORDER. The source course opens
 *   its alcohol block immediately after its spectroscopy block, and opens its
 *   benzene block on leftover Diels-Alder practice. Both are facts about a
 *   timetable. Neither is encoded as an edge, because the placement quiz walks
 *   this graph backwards to decide where a struggling student starts, and
 *   answering "you failed epoxides, go back and do NMR" is a wrong answer. The
 *   outline records both under section 4 and says they are not encoded.
 *
 *   THE CROSS ACT LINKS ARE CONCEPTS, NOT EDGES. Kinetic versus thermodynamic
 *   control is taught on dienes in Act 1 and re-tested on enolates in Act 3. That
 *   is a real link and it is not a prerequisite: a student can learn enolate
 *   chemistry without diene chemistry. It lives in `CONCEPTS`, which is a
 *   separate relation with its own `introducedIn` and `reusedIn`, so a diagnostic
 *   can say "this is the same idea you met on dienes" without the unlock graph
 *   gating one behind the other.
 *
 *   THE EPOXIDE ORDERING FIX. `epoxides` depends on
 *   `nucleophiles_and_leaving_groups`, a deliberately lightweight node, and NOT
 *   on `nucleophilic_addition_carbon`. The source course opens epoxides with
 *   Grignard reagents and acetylides two weeks before it formally teaches them on
 *   carbonyls. A graph built from "where is this reagent first formally taught"
 *   produces the edge `nucleophilic_addition_carbon -> epoxides`, which inverts
 *   two weeks of the course and gates the whole opening of Act 1 behind Act 2.
 *   See outline section 4.
 */

export type CourseId =
  | "gen_chem_1"
  | "gen_chem_2"
  | "orgo_1"
  | "orgo_2"
  | "dat"
  | "mcat";

/**
 * The three act structure of Organic Chemistry II, plus the spine.
 *
 * These are not an editorial device. They are the exam boundaries, stable across
 * three semesters of the source course, and each act's exam assumes the previous
 * act completely. `act_0` is the spine: the carried prerequisites and the four
 * slots every exam tests regardless of act. It has no exam of its own.
 *
 * Only `orgo_2` topics carry an act. See outline section 2.
 */
export type ActId = "act_0" | "act_1" | "act_2" | "act_3";

export interface ActDefinition {
  readonly id: ActId;
  readonly label: string;
  /** What the act's exam assumes and never re-teaches. Outline section 2. */
  readonly assumes: string;
}

export const ACTS: Readonly<Record<ActId, ActDefinition>> = Object.freeze({
  act_0: Object.freeze({
    id: "act_0",
    label: "The spine",
    assumes:
      "General Chemistry acid and base equilibria, and the Organic Chemistry I structure and " +
      "bonding vocabulary. Not examined as an act; examined on every act's exam.",
  }),
  act_1: Object.freeze({
    id: "act_1",
    label: "Pi systems and the aromatic ring",
    assumes:
      "Resonance, pKa magnitudes, carbocation stability and rearrangement, substitution and " +
      "elimination selection, alkene addition, and R/S and E/Z. Substitution and elimination " +
      "never appear as standalone questions, only as embedded steps.",
  }),
  act_2: Object.freeze({
    id: "act_2",
    label: "The carbonyl as electrophile",
    assumes:
      "Act 1 completely. Aryl rings are the default substituent and aromatic activation logic " +
      "is carried forward and re-tested.",
  }),
  act_3: Object.freeze({
    id: "act_3",
    label: "The carbonyl as nucleophile, plus amines",
    assumes:
      "Act 2 non negotiably. An aldol is addition with an enolate nucleophile and a Claisen is " +
      "acyl substitution with one. Act 1 returns through diazonium chemistry.",
  }),
});

export type TopicId =
  // General Chemistry I
  | "stoichiometry"
  | "gas_laws"
  | "solutions_and_concentration"
  // General Chemistry II
  | "acid_base_equilibria"
  | "titration_curves"
  // Organic Chemistry I, including the carried prerequisites Organic II assumes
  | "structure_and_bonding"
  | "resonance_and_delocalisation"
  | "carbocation_stability_and_rearrangement"
  | "nucleophiles_and_leaving_groups"
  | "substitution_and_elimination"
  | "alkene_addition"
  | "spectroscopy_ir"
  | "spectroscopy_nmr"
  | "degrees_of_unsaturation"
  // Organic Chemistry II, Act 0, the spine
  | "pka_and_acidity"
  | "structure_determination"
  // Organic Chemistry II, Act 1, pi systems and the aromatic ring
  | "alcohol_leaving_groups"
  | "oxidation_and_reduction_ladder"
  | "ethers"
  | "epoxides"
  | "allylic_halogenation"
  | "conjugation_and_mo"
  | "diene_addition"
  | "diels_alder"
  | "iupac_nomenclature"
  | "phenols"
  | "aromaticity"
  | "aromatic_substitution"
  | "eas_directing_effects"
  | "nucleophilic_aromatic_substitution"
  | "arene_side_chain_chemistry"
  | "alkyne_chemistry"
  // Organic Chemistry II, Act 2, the carbonyl as electrophile
  | "carbonyl_chemistry"
  | "nucleophilic_addition_carbon"
  | "nucleophilic_addition_oxygen"
  | "nucleophilic_addition_nitrogen"
  | "prochirality_re_si"
  | "carboxylic_acids"
  | "nucleophilic_acyl_substitution"
  // Organic Chemistry II, Act 3, the carbonyl as nucleophile, plus amines
  | "enols_and_enolates"
  | "aldol_and_claisen"
  | "alpha_alkylation"
  | "conjugate_addition"
  | "amines"
  | "diazonium_chemistry"
  | "multistep_synthesis";

/**
 * A concept taught in one topic and assessed in another.
 *
 * A separate relation from the prerequisite graph, deliberately. Outline section
 * 5 has the evidence for each one. The two that matter most for feedback are
 * `pka_keq_viability`, which is mechanically computable from the pKa table in
 * pka.ts, and `resonance_delocalisation`, which is the single most explicitly
 * policed failure in the source course.
 */
export type ConceptId =
  | "kinetic_vs_thermodynamic_control"
  | "pka_keq_viability"
  | "ewg_edg_rubric"
  | "conjugate_base_stability_argument"
  | "resonance_delocalisation"
  | "carbocation_rearrangement"
  | "anti_addition_geometry"
  | "protecting_group_strategy"
  | "acyl_reactivity_ladder"
  | "oxidation_state_ladder";

export interface ConceptDefinition {
  readonly id: ConceptId;
  /** Student facing, so it is a phrase and not an identifier. */
  readonly label: string;
  /** The topic that teaches it. Exactly one, or it is not a concept, it is a rule. */
  readonly introducedIn: TopicId;
  /** Topics that assess it again, in a different context. Never includes `introducedIn`. */
  readonly reusedIn: readonly TopicId[];
}

export interface TopicDefinition {
  readonly id: TopicId;
  /** The course a student meets this topic in first. */
  readonly course: CourseId;
  /** Short label. Student facing, so it is a phrase and not an identifier. */
  readonly label: string;
  /**
   * Topics a student is assumed to have met already.
   *
   * This is the edge list of the pathway graph. The placement quiz walks it
   * backwards from a topic the student failed to find where to start them, and
   * the Duolingo shaped track in Phase 5 renders it forward as unlock gates.
   * Unlock STATE is progress and is enforced server side per the
   * non-negotiables; this is the static shape of the graph, which is content.
   *
   * Dependencies only. Delivery order is not an edge. See the file header.
   */
  readonly prerequisites: readonly TopicId[];
  /** Organic Chemistry II only. Which act's exam this topic is assessed on. */
  readonly act?: ActId;
}

export const TOPICS: Readonly<Record<TopicId, TopicDefinition>> = Object.freeze({
  // ---- General Chemistry I ------------------------------------------------
  stoichiometry: Object.freeze({
    id: "stoichiometry",
    course: "gen_chem_1",
    label: "Stoichiometry and limiting reactants",
    prerequisites: Object.freeze([] as const),
  }),
  gas_laws: Object.freeze({
    id: "gas_laws",
    course: "gen_chem_1",
    label: "Gas laws",
    prerequisites: Object.freeze(["stoichiometry"] as const),
  }),
  solutions_and_concentration: Object.freeze({
    id: "solutions_and_concentration",
    course: "gen_chem_1",
    label: "Solutions and concentration",
    prerequisites: Object.freeze(["stoichiometry"] as const),
  }),

  // ---- General Chemistry II ----------------------------------------------
  acid_base_equilibria: Object.freeze({
    id: "acid_base_equilibria",
    course: "gen_chem_2",
    label: "Acid and base equilibria",
    prerequisites: Object.freeze(["solutions_and_concentration"] as const),
  }),
  titration_curves: Object.freeze({
    id: "titration_curves",
    course: "gen_chem_2",
    label: "Titration curves",
    prerequisites: Object.freeze(["acid_base_equilibria"] as const),
  }),

  // ---- Organic Chemistry I, and the prerequisites Organic II assumes ------
  structure_and_bonding: Object.freeze({
    id: "structure_and_bonding",
    course: "orgo_1",
    label: "Structure and bonding",
    prerequisites: Object.freeze([] as const),
  }),
  resonance_and_delocalisation: Object.freeze({
    id: "resonance_and_delocalisation",
    course: "orgo_1",
    label: "Resonance and delocalisation",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  carbocation_stability_and_rearrangement: Object.freeze({
    id: "carbocation_stability_and_rearrangement",
    course: "orgo_1",
    label: "Carbocation stability and rearrangement",
    prerequisites: Object.freeze(["structure_and_bonding", "resonance_and_delocalisation"] as const),
  }),
  nucleophiles_and_leaving_groups: Object.freeze({
    id: "nucleophiles_and_leaving_groups",
    course: "orgo_1",
    label: "Nucleophiles and leaving groups",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  substitution_and_elimination: Object.freeze({
    id: "substitution_and_elimination",
    course: "orgo_1",
    label: "Substitution and elimination",
    prerequisites: Object.freeze([
      "structure_and_bonding",
      "nucleophiles_and_leaving_groups",
    ] as const),
  }),
  alkene_addition: Object.freeze({
    id: "alkene_addition",
    course: "orgo_1",
    label: "Alkene addition",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  spectroscopy_ir: Object.freeze({
    id: "spectroscopy_ir",
    course: "orgo_1",
    label: "Infrared spectroscopy",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  spectroscopy_nmr: Object.freeze({
    id: "spectroscopy_nmr",
    course: "orgo_1",
    label: "Nuclear magnetic resonance spectroscopy",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  degrees_of_unsaturation: Object.freeze({
    id: "degrees_of_unsaturation",
    course: "orgo_1",
    label: "Degrees of unsaturation",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),

  // ---- Organic Chemistry II, Act 0, the spine ----------------------------
  pka_and_acidity: Object.freeze({
    id: "pka_and_acidity",
    course: "orgo_2",
    label: "pKa, acidity, and equilibrium position",
    prerequisites: Object.freeze(["acid_base_equilibria", "resonance_and_delocalisation"] as const),
    act: "act_0",
  }),
  structure_determination: Object.freeze({
    id: "structure_determination",
    course: "orgo_2",
    label: "Structure determination from spectra",
    prerequisites: Object.freeze([
      "spectroscopy_ir",
      "spectroscopy_nmr",
      "degrees_of_unsaturation",
    ] as const),
    act: "act_0",
  }),

  // ---- Organic Chemistry II, Act 1 ---------------------------------------
  alcohol_leaving_groups: Object.freeze({
    id: "alcohol_leaving_groups",
    course: "orgo_2",
    label: "Alcohols as leaving groups",
    prerequisites: Object.freeze([
      "substitution_and_elimination",
      "pka_and_acidity",
      "carbocation_stability_and_rearrangement",
    ] as const),
    act: "act_1",
  }),
  oxidation_and_reduction_ladder: Object.freeze({
    id: "oxidation_and_reduction_ladder",
    course: "orgo_2",
    label: "The oxidation and reduction ladder",
    prerequisites: Object.freeze(["alcohol_leaving_groups"] as const),
    act: "act_1",
  }),
  ethers: Object.freeze({
    id: "ethers",
    course: "orgo_2",
    label: "Ethers: formation and cleavage",
    prerequisites: Object.freeze([
      "alcohol_leaving_groups",
      "carbocation_stability_and_rearrangement",
    ] as const),
    act: "act_1",
  }),
  epoxides: Object.freeze({
    id: "epoxides",
    course: "orgo_2",
    label: "Epoxides: formation and ring opening",
    // The ordering fix. See the file header and outline section 4.
    prerequisites: Object.freeze([
      "alcohol_leaving_groups",
      "nucleophiles_and_leaving_groups",
      "alkene_addition",
    ] as const),
    act: "act_1",
  }),
  allylic_halogenation: Object.freeze({
    id: "allylic_halogenation",
    course: "orgo_2",
    label: "Allylic and benzylic halogenation",
    prerequisites: Object.freeze(["alkene_addition", "resonance_and_delocalisation"] as const),
    act: "act_1",
  }),
  conjugation_and_mo: Object.freeze({
    id: "conjugation_and_mo",
    course: "orgo_2",
    label: "Conjugation and molecular orbitals",
    prerequisites: Object.freeze(["resonance_and_delocalisation"] as const),
    act: "act_1",
  }),
  diene_addition: Object.freeze({
    id: "diene_addition",
    course: "orgo_2",
    label: "Electrophilic addition to conjugated dienes",
    prerequisites: Object.freeze([
      "allylic_halogenation",
      "alkene_addition",
      "carbocation_stability_and_rearrangement",
    ] as const),
    act: "act_1",
  }),
  diels_alder: Object.freeze({
    id: "diels_alder",
    course: "orgo_2",
    label: "The Diels-Alder reaction",
    prerequisites: Object.freeze(["conjugation_and_mo", "diene_addition"] as const),
    act: "act_1",
  }),
  iupac_nomenclature: Object.freeze({
    id: "iupac_nomenclature",
    course: "orgo_2",
    label: "IUPAC nomenclature and group priority",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
    act: "act_1",
  }),
  phenols: Object.freeze({
    id: "phenols",
    course: "orgo_2",
    label: "Phenols: acidity and substituent effects",
    prerequisites: Object.freeze(["pka_and_acidity", "resonance_and_delocalisation"] as const),
    act: "act_1",
  }),
  aromaticity: Object.freeze({
    id: "aromaticity",
    course: "orgo_2",
    label: "Aromaticity",
    prerequisites: Object.freeze(["conjugation_and_mo", "resonance_and_delocalisation"] as const),
    act: "act_1",
  }),
  aromatic_substitution: Object.freeze({
    id: "aromatic_substitution",
    course: "orgo_2",
    label: "Electrophilic aromatic substitution",
    prerequisites: Object.freeze([
      "aromaticity",
      "alkene_addition",
      "resonance_and_delocalisation",
    ] as const),
    act: "act_1",
  }),
  eas_directing_effects: Object.freeze({
    id: "eas_directing_effects",
    course: "orgo_2",
    label: "Directing effects and aromatic synthesis order",
    prerequisites: Object.freeze(["aromatic_substitution", "phenols"] as const),
    act: "act_1",
  }),
  nucleophilic_aromatic_substitution: Object.freeze({
    id: "nucleophilic_aromatic_substitution",
    course: "orgo_2",
    label: "Nucleophilic aromatic substitution and benzyne",
    prerequisites: Object.freeze([
      "eas_directing_effects",
      "nucleophiles_and_leaving_groups",
    ] as const),
    act: "act_1",
  }),
  arene_side_chain_chemistry: Object.freeze({
    id: "arene_side_chain_chemistry",
    course: "orgo_2",
    label: "Arene side chain chemistry and ring reduction",
    prerequisites: Object.freeze([
      "aromatic_substitution",
      "allylic_halogenation",
      "oxidation_and_reduction_ladder",
    ] as const),
    act: "act_1",
  }),
  alkyne_chemistry: Object.freeze({
    id: "alkyne_chemistry",
    course: "orgo_2",
    label: "Alkyne chemistry",
    prerequisites: Object.freeze(["substitution_and_elimination"] as const),
    act: "act_1",
  }),

  // ---- Organic Chemistry II, Act 2 ---------------------------------------
  carbonyl_chemistry: Object.freeze({
    id: "carbonyl_chemistry",
    course: "orgo_2",
    label: "Carbonyl structure and reactivity",
    prerequisites: Object.freeze([
      "iupac_nomenclature",
      "nucleophiles_and_leaving_groups",
    ] as const),
    act: "act_2",
  }),
  nucleophilic_addition_carbon: Object.freeze({
    id: "nucleophilic_addition_carbon",
    course: "orgo_2",
    label: "Carbon nucleophiles added to a carbonyl",
    prerequisites: Object.freeze([
      "carbonyl_chemistry",
      "nucleophiles_and_leaving_groups",
      "alkyne_chemistry",
    ] as const),
    act: "act_2",
  }),
  nucleophilic_addition_oxygen: Object.freeze({
    id: "nucleophilic_addition_oxygen",
    course: "orgo_2",
    label: "Oxygen nucleophiles, hemiacetals and acetals",
    prerequisites: Object.freeze(["carbonyl_chemistry", "pka_and_acidity"] as const),
    act: "act_2",
  }),
  nucleophilic_addition_nitrogen: Object.freeze({
    id: "nucleophilic_addition_nitrogen",
    course: "orgo_2",
    label: "Nitrogen nucleophiles, imines and enamines",
    prerequisites: Object.freeze([
      "carbonyl_chemistry",
      "nucleophilic_addition_carbon",
      "pka_and_acidity",
    ] as const),
    act: "act_2",
  }),
  prochirality_re_si: Object.freeze({
    id: "prochirality_re_si",
    course: "orgo_2",
    label: "Prochirality and the Re and Si faces",
    prerequisites: Object.freeze(["nucleophilic_addition_carbon"] as const),
    act: "act_2",
  }),
  carboxylic_acids: Object.freeze({
    id: "carboxylic_acids",
    course: "orgo_2",
    label: "Carboxylic acids",
    prerequisites: Object.freeze([
      "carbonyl_chemistry",
      "pka_and_acidity",
      "oxidation_and_reduction_ladder",
    ] as const),
    act: "act_2",
  }),
  nucleophilic_acyl_substitution: Object.freeze({
    id: "nucleophilic_acyl_substitution",
    course: "orgo_2",
    label: "Nucleophilic acyl substitution and the reactivity ladder",
    prerequisites: Object.freeze(["carbonyl_chemistry", "carboxylic_acids"] as const),
    act: "act_2",
  }),

  // ---- Organic Chemistry II, Act 3 ---------------------------------------
  enols_and_enolates: Object.freeze({
    id: "enols_and_enolates",
    course: "orgo_2",
    label: "Enols, enolates, and alpha carbon chemistry",
    prerequisites: Object.freeze([
      "carbonyl_chemistry",
      "pka_and_acidity",
      "resonance_and_delocalisation",
    ] as const),
    act: "act_3",
  }),
  aldol_and_claisen: Object.freeze({
    id: "aldol_and_claisen",
    course: "orgo_2",
    label: "Aldol and Claisen condensations",
    prerequisites: Object.freeze([
      "enols_and_enolates",
      "nucleophilic_addition_carbon",
      "nucleophilic_acyl_substitution",
    ] as const),
    act: "act_3",
  }),
  alpha_alkylation: Object.freeze({
    id: "alpha_alkylation",
    course: "orgo_2",
    label: "Alpha alkylation and the ester syntheses",
    prerequisites: Object.freeze([
      "enols_and_enolates",
      "aldol_and_claisen",
      "nucleophilic_addition_nitrogen",
    ] as const),
    act: "act_3",
  }),
  conjugate_addition: Object.freeze({
    id: "conjugate_addition",
    course: "orgo_2",
    label: "Conjugate addition",
    prerequisites: Object.freeze(["enols_and_enolates", "nucleophilic_addition_carbon"] as const),
    act: "act_3",
  }),
  amines: Object.freeze({
    id: "amines",
    course: "orgo_2",
    label: "Amines",
    prerequisites: Object.freeze([
      "nucleophilic_addition_nitrogen",
      "pka_and_acidity",
      "nucleophilic_acyl_substitution",
    ] as const),
    act: "act_3",
  }),
  diazonium_chemistry: Object.freeze({
    id: "diazonium_chemistry",
    course: "orgo_2",
    label: "Diazonium chemistry",
    // The edge that closes Act 3 back onto Act 1.
    prerequisites: Object.freeze(["amines", "eas_directing_effects"] as const),
    act: "act_3",
  }),
  multistep_synthesis: Object.freeze({
    id: "multistep_synthesis",
    course: "orgo_2",
    label: "Multistep synthesis",
    // The only topic that depends across all three acts. Outline section 4.
    prerequisites: Object.freeze([
      "eas_directing_effects",
      "nucleophilic_addition_oxygen",
      "nucleophilic_acyl_substitution",
      "aldol_and_claisen",
      "oxidation_and_reduction_ladder",
      "alkene_addition",
    ] as const),
    act: "act_3",
  }),
});

export const CONCEPTS: Readonly<Record<ConceptId, ConceptDefinition>> = Object.freeze({
  kinetic_vs_thermodynamic_control: Object.freeze({
    id: "kinetic_vs_thermodynamic_control",
    label: "Kinetic versus thermodynamic control",
    introducedIn: "diene_addition",
    reusedIn: Object.freeze(["nucleophilic_addition_nitrogen", "enols_and_enolates"] as const),
  }),
  pka_keq_viability: Object.freeze({
    id: "pka_keq_viability",
    label: "Deciding whether a step is viable from pKa and Keq",
    introducedIn: "pka_and_acidity",
    reusedIn: Object.freeze([
      "nucleophilic_addition_oxygen",
      "nucleophilic_addition_nitrogen",
      "carboxylic_acids",
      "nucleophilic_acyl_substitution",
      "enols_and_enolates",
    ] as const),
  }),
  ewg_edg_rubric: Object.freeze({
    id: "ewg_edg_rubric",
    label: "Withdrawing or donating, by resonance or by induction",
    introducedIn: "phenols",
    reusedIn: Object.freeze([
      "eas_directing_effects",
      "diels_alder",
      "nucleophilic_aromatic_substitution",
    ] as const),
  }),
  conjugate_base_stability_argument: Object.freeze({
    id: "conjugate_base_stability_argument",
    label: "Argue acidity from the conjugate base, never from the acid",
    introducedIn: "pka_and_acidity",
    reusedIn: Object.freeze(["phenols", "aromaticity", "enols_and_enolates"] as const),
  }),
  resonance_delocalisation: Object.freeze({
    id: "resonance_delocalisation",
    label: "Delocalisation, drawn rather than asserted",
    introducedIn: "resonance_and_delocalisation",
    reusedIn: Object.freeze([
      "diene_addition",
      "aromaticity",
      "aromatic_substitution",
      "enols_and_enolates",
      "nucleophilic_acyl_substitution",
    ] as const),
  }),
  carbocation_rearrangement: Object.freeze({
    id: "carbocation_rearrangement",
    label: "A cation rearranges if a better one is one shift away",
    introducedIn: "carbocation_stability_and_rearrangement",
    reusedIn: Object.freeze([
      "alcohol_leaving_groups",
      "ethers",
      "aromatic_substitution",
    ] as const),
  }),
  anti_addition_geometry: Object.freeze({
    id: "anti_addition_geometry",
    label: "Anti addition, and what it does to the product stereochemistry",
    introducedIn: "epoxides",
    reusedIn: Object.freeze(["alkene_addition", "oxidation_and_reduction_ladder"] as const),
  }),
  protecting_group_strategy: Object.freeze({
    id: "protecting_group_strategy",
    label: "Masking a group, working elsewhere, then unmasking",
    introducedIn: "nucleophilic_addition_oxygen",
    reusedIn: Object.freeze([
      "nucleophilic_addition_nitrogen",
      "amines",
      "multistep_synthesis",
    ] as const),
  }),
  acyl_reactivity_ladder: Object.freeze({
    id: "acyl_reactivity_ladder",
    label: "The acyl reactivity ladder, and which edges exist",
    introducedIn: "nucleophilic_acyl_substitution",
    reusedIn: Object.freeze(["carboxylic_acids", "aldol_and_claisen"] as const),
  }),
  oxidation_state_ladder: Object.freeze({
    id: "oxidation_state_ladder",
    label: "Carbon oxidation state as a ladder with one level steps",
    introducedIn: "oxidation_and_reduction_ladder",
    reusedIn: Object.freeze([
      "carboxylic_acids",
      "nucleophilic_acyl_substitution",
      "multistep_synthesis",
    ] as const),
  }),
});

export function allTopicIds(): readonly TopicId[] {
  return Object.keys(TOPICS) as TopicId[];
}

export function topicCount(): number {
  return allTopicIds().length;
}

/** Throws on an unknown id, because a lookup miss here is an authoring defect. */
export function topicDefinition(id: TopicId): TopicDefinition {
  const definition = TOPICS[id];
  if (definition === undefined) {
    throw new Error(`Unknown topic id: ${String(id)}`);
  }
  return definition;
}

export function topicIdsForCourse(course: CourseId): readonly TopicId[] {
  return allTopicIds().filter((id) => topicDefinition(id).course === course);
}

/**
 * The four content courses, in teaching order. DAT and MCAT are absent on
 * purpose: no topic's HOME is a review course, because mastery and the pathway
 * graph live in one place, per the Problem.course doc in problem.ts.
 */
export const CONTENT_COURSE_IDS: readonly CourseId[] = Object.freeze([
  "gen_chem_1",
  "gen_chem_2",
  "orgo_1",
  "orgo_2",
]);

/**
 * Every claimable course. A validator iterating courses derives its list from
 * here rather than writing its own, because a hardcoded copy is how the DAT
 * and MCAT walks went untested until an adversary pass found them broken.
 */
export const ALL_COURSE_IDS: readonly CourseId[] = Object.freeze([
  ...CONTENT_COURSE_IDS,
  "dat",
  "mcat",
]);

/**
 * The topics a course PROBES, which is wider than the topics it HOMES.
 *
 * For a content course the two lists are the same. DAT and MCAT are review
 * courses over the whole content sequence: they home no topics
 * (topicIdsForCourse returns [] for both, by design), and they probe every
 * content course's topics in teaching order. Before this function existed the
 * placement quiz walked topicIdsForCourse directly, and a student claiming DAT
 * or MCAT finished with zero questions asked and an empty starting frontier,
 * breaking the recommendation's own "never empty" contract.
 */
export function probeTopicIdsForCourse(course: CourseId): readonly TopicId[] {
  if (course === "dat" || course === "mcat") {
    return CONTENT_COURSE_IDS.flatMap((content) => topicIdsForCourse(content));
  }
  return topicIdsForCourse(course);
}

/** Organic Chemistry II only. Everything else has no act and is filtered out. */
export function topicIdsForAct(act: ActId): readonly TopicId[] {
  return allTopicIds().filter((id) => topicDefinition(id).act === act);
}

export function allConceptIds(): readonly ConceptId[] {
  return Object.keys(CONCEPTS) as ConceptId[];
}

export function conceptCount(): number {
  return allConceptIds().length;
}

/** Throws on an unknown id, for the same reason `topicDefinition` does. */
export function conceptDefinition(id: ConceptId): ConceptDefinition {
  const definition = CONCEPTS[id];
  if (definition === undefined) {
    throw new Error(`Unknown concept id: ${String(id)}`);
  }
  return definition;
}

/** Every concept this topic teaches or re-tests, in registry order. */
export function conceptIdsForTopic(topic: TopicId): readonly ConceptId[] {
  return allConceptIds().filter((id) => {
    const concept = conceptDefinition(id);
    return concept.introducedIn === topic || concept.reusedIn.includes(topic);
  });
}

/**
 * The full transitive prerequisite set for a topic, nearest first.
 *
 * This is the walk the placement quiz makes backwards from a topic a student
 * failed. Breadth first, so the first thing it reaches is the closest gap, which
 * is the one worth asking about next.
 */
export function prerequisiteClosure(topic: TopicId): readonly TopicId[] {
  const seen = new Set<TopicId>();
  const ordered: TopicId[] = [];
  let frontier: readonly TopicId[] = topicDefinition(topic).prerequisites;
  while (frontier.length > 0) {
    const next: TopicId[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
      next.push(...topicDefinition(id).prerequisites);
    }
    frontier = next;
  }
  return ordered;
}

/**
 * Every way the two registries can be internally wrong, checked once at import.
 *
 * The type system already stops an unknown id being written down. It cannot stop
 * a cycle, and a cycle in the pathway graph is a topic no student can ever
 * unlock and a placement walk that does not terminate. The repository's pattern
 * for a defect an author cannot find by reading is a constructor that refuses,
 * and this is that pattern applied to a data file: importing it runs the check.
 */
function assertRegistriesAreSound(): void {
  for (const id of allTopicIds()) {
    const topic = topicDefinition(id);
    if (topic.id !== id) {
      throw new Error(`topic registered under ${id} declares its id as ${topic.id}`);
    }
    if (topic.prerequisites.includes(id)) {
      throw new Error(`topic ${id} lists itself as its own prerequisite`);
    }
    const seen = new Set<TopicId>();
    for (const prerequisite of topic.prerequisites) {
      if (TOPICS[prerequisite] === undefined) {
        throw new Error(`topic ${id} requires ${prerequisite}, which is not a registered topic`);
      }
      if (seen.has(prerequisite)) {
        throw new Error(`topic ${id} lists ${prerequisite} as a prerequisite twice`);
      }
      seen.add(prerequisite);
    }
    if (prerequisiteClosure(id).includes(id)) {
      throw new Error(
        `topic ${id} is a prerequisite of itself through a cycle, so nothing can ever unlock it`,
      );
    }
  }

  for (const id of allConceptIds()) {
    const concept = conceptDefinition(id);
    if (concept.id !== id) {
      throw new Error(`concept registered under ${id} declares its id as ${concept.id}`);
    }
    if (TOPICS[concept.introducedIn] === undefined) {
      throw new Error(`concept ${id} is introduced in ${concept.introducedIn}, which is not a topic`);
    }
    if (concept.reusedIn.length === 0) {
      throw new Error(
        `concept ${id} is reused nowhere, so it is a rule local to ${concept.introducedIn} and ` +
          `belongs in that topic rather than in this registry`,
      );
    }
    const seen = new Set<TopicId>();
    for (const topic of concept.reusedIn) {
      if (TOPICS[topic] === undefined) {
        throw new Error(`concept ${id} is reused in ${topic}, which is not a registered topic`);
      }
      if (topic === concept.introducedIn) {
        throw new Error(`concept ${id} lists its own introducing topic ${topic} as a reuse site`);
      }
      if (seen.has(topic)) {
        throw new Error(`concept ${id} lists ${topic} as a reuse site twice`);
      }
      seen.add(topic);
    }
  }
}

assertRegistriesAreSound();

/**
 * Difficulty, on the same scale as the student rating it moves against.
 *
 * CLAUDE.md's Progression section: the rating is Elo LIKE, a student against a
 * problem rather than head to head, so a problem carries a difficulty for the
 * expected against actual comparison to have two numbers. The chess scale is the
 * named inspiration, so the bounds are the chess ones, and they are bounds rather
 * than a suggestion because a problem authored at 40 or at 40000 silently
 * saturates every expected score computed against it.
 *
 * The rating UPDATE is not in this package and must not arrive here. CLAUDE.md
 * puts it server side, computed from the append only attempt history, never
 * client supplied. This package ships the number a server side updater reads.
 */
export const DIFFICULTY_MIN = 400;
export const DIFFICULTY_MAX = 2400;

export type Difficulty = number;

export function isValidDifficulty(value: number): boolean {
  return Number.isInteger(value) && value >= DIFFICULTY_MIN && value <= DIFFICULTY_MAX;
}
