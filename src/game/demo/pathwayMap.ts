/**
 * The Orgo II pathway map as data: every node of the owner's full inventory
 * (reference images/Orgo_Pathway_Map_Full.pdf), 192 nodes across 15 units,
 * classified by dependency load exactly as the source classifies them.
 *
 *   spine   Required. Blocks downstream units. 86 nodes.
 *   branch  Optional side quest, reachable later at no cost. 95 nodes.
 *   gate    No preparative reactions: checkpoint quiz or parallel track. 10.
 *   boss    Integration node, gated on multiple units. 1.
 *
 * `playable` links a node to a trainer entry that exists TODAY: a reaction id,
 * a sequence id, or a resonance id. A node without one is authoring queue,
 * not absence of intent, and the browser shows it that way. This file is the
 * coverage ledger the waves burn down: when a wave lands, its nodes gain
 * their `playable` link here, and the count on the browser header moves.
 */

export type NodeKind = "spine" | "branch" | "gate" | "boss";

export type PlayableLink =
  | { readonly kind: "reaction"; readonly id: string }
  | { readonly kind: "sequence"; readonly id: string }
  | { readonly kind: "resonance"; readonly id: string }
  /**
   * A lesson beat rather than a mechanism: an MCQ, a matching board, a ladder
   * to sort, or a synthesis gap. The id is the node's own id, because a beat is
   * authored for one slot on the map and BeatRunner resolves the node to
   * whichever surface has content for it.
   */
  | { readonly kind: "beat"; readonly id: string };

export interface PathwayNode {
  readonly id: string;
  readonly kind: NodeKind;
  readonly title: string;
  readonly blurb: string;
  readonly playable?: PlayableLink;
}

export interface PathwayUnit {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  readonly nodes: readonly PathwayNode[];
}

export const PATHWAY_UNITS: readonly PathwayUnit[] = [
  {
    id: "u1",
    title: "Unit 1 · Conjugation, Resonance & Dienes",
    note: "Gates Unit 9's control logic and all of Unit 12.",
    nodes: [
      { id: "u1-allylic", kind: "spine", title: "Allylic/resonance delocalization", blurb: "Draw and rank allyl cation, radical, anion resonance forms.", playable: { kind: "resonance", id: "res-allyl-1" } },
      { id: "u1-12v14", kind: "spine", title: "1,2- vs 1,4-addition of HX", blurb: "Kinetic 1,2 cold, thermodynamic 1,4 warm.", playable: { kind: "sequence", id: "seq-diene" } },
      { id: "u1-kvt", kind: "spine", title: "Kinetic vs thermodynamic control", blurb: "Hammond postulate, reaction coordinate diagrams.", playable: { kind: "beat", id: "u1-kvt" } },
      { id: "u1-x2", kind: "spine", title: "X₂ addition to dienes", blurb: "Br₂, Cl₂ → 1,2- and 1,4-dihalides, same allylic-cation logic.", playable: { kind: "sequence", id: "seq-diene-br2" } },
      { id: "u1-nbs", kind: "branch", title: "Allylic halogenation", blurb: "NBS, hν; low [Br₂] is the whole trick." },
      { id: "u1-da", kind: "branch", title: "Diels–Alder", blurb: "s-cis diene + EWG dienophile; endo rule, stereospecific." },
      { id: "u1-ied", kind: "branch", title: "Inverse/hetero Diels–Alder", blurb: "Carbonyl or imine in the cycloaddition." },
      { id: "u1-poly", kind: "branch", title: "Radical polymerization of dienes", blurb: "Conceptual mention." },
    ],
  },
  {
    id: "u2",
    title: "Unit 2 · Aromaticity & Benzene",
    note: "Checkpoint quiz, not a lesson unit. Unlocks Unit 3.",
    nodes: [
      { id: "u2-huckel", kind: "gate", title: "Hückel 4n+2 classification", blurb: "Aromatic vs antiaromatic vs nonaromatic." },
      { id: "u2-annulene", kind: "gate", title: "Annulenes and ring size", blurb: "Why cyclooctatetraene tubs out." },
      { id: "u2-hetero", kind: "gate", title: "Heterocycles", blurb: "Pyridine's lone pair sits out; pyrrole's joins in." },
      { id: "u2-charged", kind: "gate", title: "Charged aromatics", blurb: "Cyclopentadienyl anion, tropylium cation." },
      { id: "u2-nmr", kind: "gate", title: "Ring-current NMR signature", blurb: "Deshields outside, shields inside. Links to Unit 6." },
      { id: "u2-nomen", kind: "branch", title: "Nomenclature review", blurb: "o/m/p, common names, polycyclics." },
    ],
  },
  {
    id: "u3",
    title: "Unit 3 · Electrophilic Aromatic Substitution",
    note: "Core of the course. Gates Units 4, 10, 11.",
    nodes: [
      { id: "u3-arenium", kind: "spine", title: "Arenium (σ-complex) mechanism", blurb: "Attack → cation → rearomatize: the mechanism under every node here.", playable: { kind: "sequence", id: "seq-eas" } },
      { id: "u3-halo", kind: "spine", title: "Halogenation", blurb: "Cl₂/FeCl₃; Br₂/FeBr₃; I₂ needs an oxidant.", playable: { kind: "sequence", id: "seq-eas-br" } },
      { id: "u3-nitration", kind: "spine", title: "Nitration", blurb: "HNO₃/H₂SO₄, electrophile NO₂⁺.", playable: { kind: "sequence", id: "seq-eas" } },
      { id: "u3-sulfo", kind: "spine", title: "Sulfonation and desulfonation", blurb: "Reversible, which is what makes it a blocking group.", playable: { kind: "sequence", id: "seq-sulfonation" } },
      { id: "u3-fc-acyl", kind: "spine", title: "Friedel–Crafts acylation", blurb: "RCOCl/AlCl₃; no rearrangement, self-limiting.", playable: { kind: "sequence", id: "seq-fc-acyl" } },
      { id: "u3-directing", kind: "spine", title: "Directing effects", blurb: "o/p vs m; activators vs deactivators; the halogen anomaly.", playable: { kind: "beat", id: "u3-directing" } },
      { id: "u3-blocking", kind: "spine", title: "Blocking-group strategy", blurb: "Sulfonate para, react, desulfonate.", playable: { kind: "beat", id: "u3-blocking" } },
      { id: "u3-nitro-red", kind: "spine", title: "Nitro reduction", blurb: "H₂/Pd or metal/HCl → aniline. The bridge into Unit 10.", playable: { kind: "beat", id: "u3-nitro-red" } },
      { id: "u3-c-to-ch2", kind: "spine", title: "Carbonyl → CH₂ after acylation", blurb: "Clemmensen or Wolff–Kishner: the unrearranged alkyl chain.", playable: { kind: "reaction", id: "wolff-extrusion" } },
      { id: "u3-sequencing", kind: "spine", title: "Multistep sequencing logic", blurb: "When to nitrate, reduce, block: order of operations.", playable: { kind: "beat", id: "u3-sequencing" } },
      { id: "u3-fc-alkyl", kind: "branch", title: "Friedel–Crafts alkylation", blurb: "Taught as a failure mode: rearrangement, polyalkylation." },
      { id: "u3-benzylic-br", kind: "branch", title: "Benzylic bromination", blurb: "NBS, hν; needs a benzylic H." },
      { id: "u3-benzylic-ox", kind: "branch", title: "Benzylic oxidation", blurb: "KMnO₄ → ArCOOH; t-Bu survives." },
      { id: "u3-birch", kind: "branch", title: "Birch reduction", blurb: "Na/NH₃(l)/ROH → 1,4-cyclohexadiene." },
      { id: "u3-gk", kind: "branch", title: "Gattermann–Koch formylation", blurb: "CO, HCl, AlCl₃/CuCl → ArCHO." },
      { id: "u3-ghh", kind: "branch", title: "Gattermann / Houben–Hoesch", blurb: "HCN or RCN, HCl, ZnCl₂." },
      { id: "u3-vilsmeier", kind: "branch", title: "Vilsmeier–Haack", blurb: "POCl₃, DMF; activated rings only." },
      { id: "u3-kolbe", kind: "branch", title: "Kolbe–Schmitt", blurb: "Phenoxide + CO₂ → salicylic acid. Shared with Unit 11." },
      { id: "u3-reimer", kind: "branch", title: "Reimer–Tiemann", blurb: "CHCl₃/NaOH via dichlorocarbene. Shared with Unit 11." },
    ],
  },
  {
    id: "u4",
    title: "Unit 4 · Nucleophilic Aromatic Substitution & Benzyne",
    note: "Short unit: aromatic reactivity inverts.",
    nodes: [
      { id: "u4-snar", kind: "spine", title: "SNAr addition–elimination", blurb: "Aryl halide with o/p EWG + a nucleophile.", playable: { kind: "sequence", id: "seq-snar" } },
      { id: "u4-meisenheimer", kind: "spine", title: "Meisenheimer complex", blurb: "Drawing the charge onto the nitro oxygen is the exam question.", playable: { kind: "sequence", id: "seq-snar" } },
      { id: "u4-lg-order", kind: "spine", title: "Reversed leaving-group order", blurb: "F > Cl > Br > I: addition is rate-determining.", playable: { kind: "sequence", id: "seq-snar" } },
      { id: "u4-benzyne", kind: "branch", title: "Benzyne elimination–addition", blurb: "NaNH₂/NH₃; symmetric addition gives a mixture." },
      { id: "u4-isotope", kind: "branch", title: "Isotope-labelling proof", blurb: "¹⁴C chlorobenzene, 50:50 products." },
      { id: "u4-dow", kind: "branch", title: "Dow phenol process", blurb: "Historical." },
    ],
  },
  {
    id: "u5",
    title: "Unit 5 · Alcohols, Diols, Ethers & Epoxides",
    note: "Highest node count outside Unit 9.",
    nodes: [
      { id: "u5-roh-rx", kind: "spine", title: "Alcohol → alkyl halide", blurb: "SOCl₂, PBr₃, HX; inversion where it matters.", playable: { kind: "sequence", id: "seq-roh-hbr" } },
      { id: "u5-tosylate", kind: "spine", title: "Tosylate / mesylate", blurb: "Bad LG to good LG with retention.", playable: { kind: "sequence", id: "seq-mesylate" } },
      { id: "u5-dehydration", kind: "spine", title: "Dehydration", blurb: "H₂SO₄ Δ (E1, Zaitsev) or POCl₃/pyridine (E2).", playable: { kind: "reaction", id: "e2" } },
      { id: "u5-oxidation", kind: "spine", title: "Oxidation ladder", blurb: "PCC to aldehyde, Jones to acid, 3° no reaction.", playable: { kind: "beat", id: "u5-oxidation" } },
      { id: "u5-williamson", kind: "spine", title: "Williamson ether synthesis", blurb: "Alkoxide + 1° halide, SN2.", playable: { kind: "reaction", id: "williamson" } },
      { id: "u5-protecting", kind: "spine", title: "Protecting-group logic", blurb: "Silyl ethers, benzyl, THP: orthogonality.", playable: { kind: "beat", id: "u5-protecting" } },
      { id: "u5-epoxidation", kind: "spine", title: "Epoxidation", blurb: "mCPBA, syn and stereospecific; or halohydrin + base.", playable: { kind: "reaction", id: "epoxidation" } },
      { id: "u5-ep-acid", kind: "spine", title: "Epoxide opening, acidic", blurb: "More substituted carbon, anti.", playable: { kind: "reaction", id: "epoxide-acidic" } },
      { id: "u5-ep-base", kind: "spine", title: "Epoxide opening, basic", blurb: "Less hindered carbon, anti, clean SN2.", playable: { kind: "reaction", id: "epoxide-basic" } },
      { id: "u5-syn-diol", kind: "spine", title: "Syn-dihydroxylation", blurb: "OsO₄/NMO or cold KMnO₄ → cis-diol.", playable: { kind: "beat", id: "u5-syn-diol" } },
      { id: "u5-anti-diol", kind: "spine", title: "Anti-dihydroxylation", blurb: "mCPBA then H₃O⁺ → trans-diol. Teach as a pair with syn.", playable: { kind: "reaction", id: "epoxide-acidic" } },
      { id: "u5-appel", kind: "branch", title: "Appel reaction", blurb: "CBr₄/PPh₃, driven by P=O." },
      { id: "u5-swern", kind: "branch", title: "Swern / DMP / TEMPO detail", blurb: "Reagent-selection nuance." },
      { id: "u5-alkoxymerc", kind: "branch", title: "Alkoxymercuration", blurb: "Hg(OAc)₂/ROH then NaBH₄; Markovnikov ether." },
      { id: "u5-cleavage", kind: "branch", title: "Ether cleavage", blurb: "Excess HI/HBr, Δ." },
      { id: "u5-sharpless", kind: "branch", title: "Sharpless epoxidation", blurb: "Allylic alcohols, chiral DET. Advanced." },
      { id: "u5-diol-cleave", kind: "branch", title: "Oxidative cleavage of diols", blurb: "HIO₄ → two carbonyls." },
      { id: "u5-pinacol", kind: "branch", title: "Pinacol rearrangement", blurb: "1,2-diol, H⁺, Δ: the 1,2-shift." },
      { id: "u5-thiols", kind: "branch", title: "Thiols and sulfides", blurb: "RSH, R₂S, sulfoxide, sulfone." },
    ],
  },
  {
    id: "u6",
    title: "Unit 6 · Spectroscopy & Structure Determination",
    note: "Parallel track: one node injected into every downstream problem.",
    nodes: [
      { id: "u6-dou", kind: "gate", title: "Degrees of unsaturation", blurb: "Cheapest information in the problem." },
      { id: "u6-ir", kind: "gate", title: "IR diagnostics", blurb: "C=O ≈ 1700 and its shifts; O–H broad; C≡N ≈ 2250." },
      { id: "u6-hnmr", kind: "gate", title: "¹H NMR", blurb: "Shift, integration, multiplicity, J." },
      { id: "u6-cnmr", kind: "gate", title: "¹³C and DEPT", blurb: "Count, symmetry, CH₃/CH₂/CH/quaternary." },
      { id: "u6-ms", kind: "gate", title: "Mass spectrometry", blurb: "Isotope patterns, α-cleavage, McLafferty." },
      { id: "u6-2d", kind: "branch", title: "2D NMR", blurb: "COSY, HSQC, HMBC." },
      { id: "u6-uv", kind: "branch", title: "UV-Vis and conjugation", blurb: "λmax, Woodward–Fieser. Links to Unit 1." },
    ],
  },
  {
    id: "u7",
    title: "Unit 7 · Aldehydes & Ketones: Nucleophilic Addition",
    note: "Gates Units 8, 9, 13, 14.",
    nodes: [
      { id: "u7-mechanism", kind: "spine", title: "Carbonyl polarity and the addition mechanism", blurb: "Nu attacks C, alkoxide forms, workup protonates.", playable: { kind: "reaction", id: "carbonyl-addition" } },
      { id: "u7-hydration", kind: "spine", title: "Hydration", blurb: "Gem-diol; favored for formaldehyde and chloral.", playable: { kind: "sequence", id: "seq-hydration" } },
      { id: "u7-acetal", kind: "spine", title: "Hemiacetal and acetal", blurb: "Every arrow reversible, pushed both directions.", playable: { kind: "sequence", id: "seq-hemiacetal" } },
      { id: "u7-protect", kind: "spine", title: "Acetal as protecting group", blurb: "Dioxolane on, H₃O⁺ off. Load-bearing downstream.", playable: { kind: "beat", id: "u7-protect" } },
      { id: "u7-imine", kind: "spine", title: "Imine formation", blurb: "1° amine, pH ≈ 4–5; the pH-rate bell curve.", playable: { kind: "reaction", id: "imine-attack" } },
      { id: "u7-enamine", kind: "spine", title: "Enamine formation", blurb: "2° amine; sets up Stork chemistry in Unit 9.", playable: { kind: "reaction", id: "enamine-attack" } },
      { id: "u7-grignard", kind: "spine", title: "Grignard and organolithium addition", blurb: "1°/2°/3° alcohol by carbonyl choice.", playable: { kind: "reaction", id: "grignard-methyl" } },
      { id: "u7-hydride", kind: "spine", title: "Hydride reduction", blurb: "NaBH₄ mild, LiAlH₄ strong.", playable: { kind: "reaction", id: "hydride-reduction" } },
      { id: "u7-wittig", kind: "spine", title: "Wittig olefination", blurb: "Ylide → alkene with unambiguous placement.", playable: { kind: "sequence", id: "seq-wittig" } },
      { id: "u7-12v14", kind: "spine", title: "1,2 vs 1,4 selectivity on enones", blurb: "Hard 1,2, soft 1,4; the node Unit 9 depends on.", playable: { kind: "reaction", id: "grignard-12" } },
      { id: "u7-to-ch2", kind: "spine", title: "Reduction to CH₂", blurb: "Clemmensen, Wolff–Kishner, thioacetal/Raney Ni.", playable: { kind: "reaction", id: "wolff-extrusion" } },
      { id: "u7-cyanohydrin", kind: "branch", title: "Cyanohydrin formation", blurb: "Adds one carbon; nitrile handle for Unit 8.", playable: { kind: "reaction", id: "cyanohydrin" } },
      { id: "u7-bisulfite", kind: "branch", title: "Bisulfite adduct", blurb: "Purification trick, reversible." },
      { id: "u7-thioacetal", kind: "branch", title: "Thioacetal", blurb: "Then Raney Ni desulfurizes." },
      { id: "u7-derivative-tests", kind: "branch", title: "Carbonyl derivative tests", blurb: "Oxime, hydrazone, 2,4-DNP, semicarbazone." },
      { id: "u7-hwe", kind: "branch", title: "Horner–Wadsworth–Emmons", blurb: "E-enoate selectively." },
      { id: "u7-bv", kind: "branch", title: "Baeyer–Villiger", blurb: "Migratory aptitude 3° > 2° ≈ Ar > 1° > Me." },
      { id: "u7-ald-to-acid", kind: "branch", title: "Aldehyde → carboxylic acid", blurb: "Tollens, Jones, and the tests." },
      { id: "u7-cannizzaro", kind: "branch", title: "Cannizzaro", blurb: "No-α-H aldehyde disproportionates." },
      { id: "u7-mpv", kind: "branch", title: "Meerwein–Ponndorf–Verley", blurb: "Reversible with Oppenauer." },
    ],
  },
  {
    id: "u8",
    title: "Unit 8 · Carboxylic Acids & Derivatives",
    note: "The reactivity ladder is the organizing principle.",
    nodes: [
      { id: "u8-ladder", kind: "spine", title: "The reactivity ladder", blurb: "Down the ladder free, up only with activation.", playable: { kind: "beat", id: "u8-ladder" } },
      { id: "u8-tetrahedral", kind: "spine", title: "Tetrahedral intermediate mechanism", blurb: "Addition then elimination, under every node here.", playable: { kind: "sequence", id: "seq-acyl" } },
      { id: "u8-to-acylcl", kind: "spine", title: "Acid → acyl chloride", blurb: "SOCl₂, oxalyl chloride: climbing the ladder.", playable: { kind: "sequence", id: "seq-socl2" } },
      { id: "u8-to-anhydride", kind: "spine", title: "Acid → anhydride", blurb: "Heat a diacid, or acid + acyl chloride.", playable: { kind: "sequence", id: "seq-anhydride-make" } },
      { id: "u8-fischer", kind: "spine", title: "Fischer esterification", blurb: "Reversible; drive with excess or remove water.", playable: { kind: "sequence", id: "seq-fischer" } },
      { id: "u8-acylcl-all", kind: "spine", title: "Acyl chloride → everything", blurb: "Ester, amide, anhydride, acid.", playable: { kind: "sequence", id: "seq-acyl" } },
      { id: "u8-anhydride", kind: "spine", title: "Anhydride → ester/amide/acid", blurb: "Same partners, slower, one acyl wasted.", playable: { kind: "sequence", id: "seq-anhydride" } },
      { id: "u8-hydrolysis", kind: "spine", title: "Ester hydrolysis", blurb: "Acidic reversible; saponification irreversible.", playable: { kind: "sequence", id: "seq-sapon" } },
      { id: "u8-transester", kind: "spine", title: "Transesterification", blurb: "Same tetrahedral logic, equilibrium-driven.", playable: { kind: "sequence", id: "seq-transester" } },
      { id: "u8-amide-hyd", kind: "spine", title: "Amide hydrolysis", blurb: "Forcing conditions; why amides resist is the concept.", playable: { kind: "sequence", id: "seq-amide-hyd" } },
      { id: "u8-nitrile", kind: "spine", title: "Nitrile chemistry", blurb: "From R–X + CN⁻ or amide dehydration; hydrolysis back.", playable: { kind: "reaction", id: "grignard-nitrile" } },
      { id: "u8-lialh4", kind: "spine", title: "LiAlH₄ reductions", blurb: "Acid/ester → alcohol; amide → amine; nitrile → amine.", playable: { kind: "sequence", id: "seq-lialh4" } },
      { id: "u8-dibal", kind: "spine", title: "DIBAL-H partial reduction", blurb: "One equivalent, cold: stop at the aldehyde.", playable: { kind: "reaction", id: "dibal-ester" } },
      { id: "u8-organomet", kind: "spine", title: "Organometallics on derivatives", blurb: "Two additions on esters; over-addition unavoidable.", playable: { kind: "sequence", id: "seq-grignard-ester" } },
      { id: "u8-gilman", kind: "spine", title: "Gilman + acyl chloride", blurb: "Stops cleanly at the ketone.", playable: { kind: "sequence", id: "seq-gilman" } },
      { id: "u8-decarb", kind: "spine", title: "Decarboxylation", blurb: "β-keto acids, 6-membered TS. Load-bearing for Unit 9.", playable: { kind: "reaction", id: "decarboxylation" } },
      { id: "u8-steglich", kind: "branch", title: "Steglich esterification", blurb: "DCC/DMAP; returns for peptides." },
      { id: "u8-diazomethane", kind: "branch", title: "Diazomethane methylation", blurb: "Quantitative and explosive." },
      { id: "u8-carboxylate-alk", kind: "branch", title: "Carboxylate alkylation", blurb: "SN2, 1° halides only." },
      { id: "u8-weinreb", kind: "branch", title: "Weinreb amide", blurb: "The chelate stops over-addition." },
      { id: "u8-nabh4", kind: "branch", title: "NaBH₄ on derivatives", blurb: "Chemoselectivity node." },
      { id: "u8-hvz", kind: "branch", title: "Hell–Volhard–Zelinsky", blurb: "α-bromo acid; mechanistically Unit 9." },
      { id: "u8-kolbe-e", kind: "branch", title: "Kolbe electrolysis", blurb: "Radical dimerization." },
      { id: "u8-hunsdiecker", kind: "branch", title: "Hunsdiecker", blurb: "One carbon shorter." },
    ],
  },
  {
    id: "u9",
    title: "Unit 9 · Enols & Enolates: α-Carbon Chemistry",
    note: "The spine of the spine, split 9a/9b/9c.",
    nodes: [
      { id: "u9-tautomer", kind: "spine", title: "9a · Keto–enol tautomerism", blurb: "Acid- and base-catalyzed, both directions.", playable: { kind: "sequence", id: "seq-tautomer" } },
      { id: "u9-pka", kind: "spine", title: "9a · α-proton pKa hierarchy", blurb: "The table that decides which base you need.", playable: { kind: "beat", id: "u9-pka" } },
      { id: "u9-enolate-res", kind: "spine", title: "9a · Enolate resonance and geometry", blurb: "Ambident: C- vs O-alkylation.", playable: { kind: "sequence", id: "seq-aldol" } },
      { id: "u9-kvt-enolate", kind: "spine", title: "9a · Kinetic vs thermodynamic enolate", blurb: "LDA cold vs NaOEt warm. Callback to Unit 1.", playable: { kind: "beat", id: "u9-kvt-enolate" } },
      { id: "u9-halo-acid", kind: "spine", title: "9a · α-Halogenation, acid", blurb: "Stops at mono; halogen deactivates the enol.", playable: { kind: "sequence", id: "seq-halo-acid" } },
      { id: "u9-halo-base", kind: "spine", title: "9a · α-Halogenation, base", blurb: "Runs away: each halogen acidifies the rest.", playable: { kind: "reaction", id: "alpha-bromination" } },
      { id: "u9-aldol", kind: "spine", title: "9b · Aldol addition", blurb: "β-hydroxy carbonyl; retro-aldol is a real answer.", playable: { kind: "sequence", id: "seq-aldol" } },
      { id: "u9-aldol-cond", kind: "spine", title: "9b · Aldol condensation", blurb: "E1cb dehydration; conjugation drives it.", playable: { kind: "sequence", id: "seq-condensation" } },
      { id: "u9-crossed", kind: "spine", title: "9b · Crossed / mixed aldol", blurb: "No-α-H partner, or a preformed enolate.", playable: { kind: "sequence", id: "seq-crossed-aldol" } },
      { id: "u9-intra", kind: "spine", title: "9b · Intramolecular aldol", blurb: "5- and 6-membered rings win.", playable: { kind: "reaction", id: "intra-aldol" } },
      { id: "u9-claisen", kind: "spine", title: "9b · Claisen condensation", blurb: "Stoichiometric base pulls the equilibrium.", playable: { kind: "sequence", id: "seq-claisen" } },
      { id: "u9-dieckmann", kind: "spine", title: "9b · Dieckmann", blurb: "Intramolecular Claisen → cyclic β-ketoester.", playable: { kind: "sequence", id: "seq-dieckmann" } },
      { id: "u9-crossed-claisen", kind: "spine", title: "9b · Crossed Claisen", blurb: "One ester with no α-H.", playable: { kind: "sequence", id: "seq-claisen" } },
      { id: "u9-alkylation", kind: "spine", title: "9c · Enolate alkylation", blurb: "Preformed enolate + 1° R–X.", playable: { kind: "reaction", id: "enolate-alkylation" } },
      { id: "u9-malonic", kind: "spine", title: "9c · Malonic ester synthesis", blurb: "Alkylate, hydrolyze, decarboxylate.", playable: { kind: "sequence", id: "seq-malonic" } },
      { id: "u9-acetoacetic", kind: "spine", title: "9c · Acetoacetic ester synthesis", blurb: "Same three-step logic; methyl ketone out.", playable: { kind: "reaction", id: "decarboxylation" } },
      { id: "u9-michael", kind: "spine", title: "9c · Michael addition", blurb: "Soft nucleophile, 1,4.", playable: { kind: "reaction", id: "michael-addition" } },
      { id: "u9-cuprate", kind: "spine", title: "9c · Conjugate organocuprate", blurb: "Unstabilized alkyl delivered 1,4.", playable: { kind: "reaction", id: "cuprate-conjugate" } },
      { id: "u9-robinson", kind: "spine", title: "9c · Robinson annulation", blurb: "Michael then intramolecular aldol condensation.", playable: { kind: "sequence", id: "seq-robinson" } },
      { id: "u9-retro", kind: "spine", title: "9c · Retrosynthetic C–C disconnection", blurb: "The skill the whole unit builds.", playable: { kind: "beat", id: "u9-retro" } },
      { id: "u9-haloform", kind: "branch", title: "Haloform reaction", blurb: "Iodoform and its yellow precipitate." },
      { id: "u9-stork", kind: "branch", title: "Stork enamine alkylation", blurb: "Softer alternative to enolate alkylation." },
      { id: "u9-mannich", kind: "branch", title: "Mannich reaction", blurb: "β-amino carbonyl; biosynthesis relevance." },
      { id: "u9-knoevenagel", kind: "branch", title: "Knoevenagel", blurb: "Aldol condensation with a stabilized donor." },
      { id: "u9-reformatsky", kind: "branch", title: "Reformatsky", blurb: "Zinc enolate, mild enough not to self-condense." },
      { id: "u9-directed", kind: "branch", title: "Directed aldol at low temperature", blurb: "LDA at –78 °C, then the electrophile." },
    ],
  },
  {
    id: "u10",
    title: "Unit 10 · Amines",
    note: "Diazonium chemistry is retroactively load-bearing for Unit 3.",
    nodes: [
      { id: "u10-basicity", kind: "spine", title: "Basicity vs nucleophilicity", blurb: "Aliphatic > aryl > amide; pKaH reasoning.", playable: { kind: "beat", id: "u10-basicity" } },
      { id: "u10-red-amination", kind: "spine", title: "Reductive amination", blurb: "NaBH₃CN reduces the iminium, not the carbonyl.", playable: { kind: "reaction", id: "iminium-reduction" } },
      { id: "u10-amide-red", kind: "spine", title: "Amide reduction", blurb: "LiAlH₄, keeping the substitution pattern.", playable: { kind: "reaction", id: "iminium-reduction" } },
      { id: "u10-nitrile-red", kind: "spine", title: "Nitrile reduction", blurb: "Adds one carbon on the way to the amine.", playable: { kind: "reaction", id: "nitrile-hydride" } },
      { id: "u10-nitro-red", kind: "spine", title: "Nitro reduction", blurb: "The Unit 3 to Unit 10 bridge.", playable: { kind: "beat", id: "u10-nitro-red" } },
      { id: "u10-diazonium", kind: "spine", title: "Diazonium formation", blurb: "NaNO₂/HCl at 0–5 °C, no negotiation on temperature.", playable: { kind: "reaction", id: "diazonium-first" } },
      { id: "u10-diazo-sub", kind: "spine", title: "Diazonium substitution", blurb: "Sandmeyer and friends; NH₂ as a temporary director.", playable: { kind: "sequence", id: "seq-diazo-sub" } },
      { id: "u10-acyl-protect", kind: "spine", title: "Amine acylation as protection", blurb: "Ac₂O moderates aniline for controlled EAS.", playable: { kind: "sequence", id: "seq-anhydride" } },
      { id: "u10-direct-alk", kind: "branch", title: "Direct alkylation of ammonia", blurb: "The over-alkylation failure mode." },
      { id: "u10-gabriel", kind: "branch", title: "Gabriel synthesis", blurb: "Phthalimide route to pure 1° amines." },
      { id: "u10-azide", kind: "branch", title: "Azide route", blurb: "R–N₃ then reduce; cleanest 1° amine." },
      { id: "u10-hofmann-r", kind: "branch", title: "Hofmann rearrangement", blurb: "Amide to amine, one carbon shorter." },
      { id: "u10-curtius", kind: "branch", title: "Curtius rearrangement", blurb: "Acyl azide → isocyanate → amine." },
      { id: "u10-hofmann-e", kind: "branch", title: "Hofmann elimination", blurb: "Exhaustive methylation → anti-Zaitsev alkene." },
      { id: "u10-cope", kind: "branch", title: "Cope elimination", blurb: "Amine oxide, syn, intramolecular." },
      { id: "u10-azo", kind: "branch", title: "Azo coupling", blurb: "Diazonium as the EAS electrophile: dyes." },
    ],
  },
  {
    id: "u11",
    title: "Unit 11 · Phenols",
    note: "Arguably folds into Units 3 and 5.",
    nodes: [
      { id: "u11-acidity", kind: "spine", title: "Phenol acidity", blurb: "pKa about 10; conjugate-base resonance.", playable: { kind: "beat", id: "u11-acidity" } },
      { id: "u11-phenoxide", kind: "spine", title: "Phenoxide as nucleophile", blurb: "Williamson to aryl ethers; esters.", playable: { kind: "reaction", id: "phenoxide-alkylation" } },
      { id: "u11-eas", kind: "branch", title: "EAS on phenol", blurb: "Tribromination without a Lewis acid." },
      { id: "u11-kolbe", kind: "branch", title: "Kolbe–Schmitt", blurb: "Salicylic acid." },
      { id: "u11-reimer", kind: "branch", title: "Reimer–Tiemann", blurb: "Salicylaldehyde via dichlorocarbene." },
      { id: "u11-quinone", kind: "branch", title: "Quinone / hydroquinone redox", blurb: "Reversible two-electron couple." },
      { id: "u11-claisen-r", kind: "branch", title: "Claisen rearrangement", blurb: "[3,3]; also a Unit 12 node." },
    ],
  },
  {
    id: "u12",
    title: "Unit 12 · Pericyclic Reactions",
    note: "Entire unit branches off Unit 1.",
    nodes: [
      { id: "u12-da", kind: "branch", title: "Diels–Alder [4+2]", blurb: "Thermal, endo rule, stereospecific." },
      { id: "u12-22", kind: "branch", title: "[2+2] cycloaddition", blurb: "Photochemical; thermally forbidden." },
      { id: "u12-dipolar", kind: "branch", title: "1,3-Dipolar cycloaddition", blurb: "Five-membered heterocycles." },
      { id: "u12-electro", kind: "branch", title: "Electrocyclic reactions", blurb: "Con/disrotatory by electron count." },
      { id: "u12-cope", kind: "branch", title: "Cope rearrangement", blurb: "[3,3], chair-like TS." },
      { id: "u12-claisen", kind: "branch", title: "Claisen rearrangement", blurb: "[3,3], irreversible when it rearomatizes." },
      { id: "u12-15h", kind: "branch", title: "[1,5]-hydride shifts", blurb: "Cyclopentadiene scrambling." },
      { id: "u12-wh", kind: "branch", title: "Woodward–Hoffmann rules", blurb: "The unifying framework." },
    ],
  },
  {
    id: "u13",
    title: "Unit 13 · Carbohydrates",
    note: "Branches off Unit 7. Terminal.",
    nodes: [
      { id: "u13-fischer", kind: "branch", title: "Fischer projections and D/L", blurb: "R/S from a Fischer projection." },
      { id: "u13-anomers", kind: "branch", title: "Cyclization and anomers", blurb: "Pyranose, furanose, α vs β." },
      { id: "u13-mutarotation", kind: "branch", title: "Mutarotation", blurb: "Through the open chain; Unit 7 chemistry." },
      { id: "u13-glycoside", kind: "branch", title: "Glycoside formation", blurb: "Acetal locks the anomeric center." },
      { id: "u13-protect", kind: "branch", title: "Protecting-group chemistry", blurb: "Permethylation, peracetylation." },
      { id: "u13-oxidation", kind: "branch", title: "Oxidation", blurb: "Aldonic, aldaric, uronic." },
      { id: "u13-tests", kind: "branch", title: "Reducing-sugar tests", blurb: "Tollens, Benedict, Fehling." },
      { id: "u13-reduction", kind: "branch", title: "Reduction", blurb: "Alditols." },
      { id: "u13-kiliani", kind: "branch", title: "Kiliani–Fischer synthesis", blurb: "Chain plus one, epimeric pair." },
      { id: "u13-wohl", kind: "branch", title: "Wohl and Ruff degradation", blurb: "Chain minus one; structure proof partner." },
      { id: "u13-osazone", kind: "branch", title: "Osazone formation", blurb: "C2 epimers converge." },
    ],
  },
  {
    id: "u14",
    title: "Unit 14 · Amino Acids, Peptides & Proteins",
    note: "Branches off Units 7 and 8.",
    nodes: [
      { id: "u14-orthogonal", kind: "spine", title: "Protecting-group orthogonality", blurb: "Boc/TFA, Cbz/H2-Pd, Fmoc/piperidine: three that never touch.", playable: { kind: "beat", id: "u14-orthogonal" } },
      { id: "u14-zwitterion", kind: "branch", title: "Zwitterions and pI", blurb: "Titration curves, isoelectric point." },
      { id: "u14-strecker", kind: "branch", title: "Strecker synthesis", blurb: "Aldehyde + NH3 + HCN, racemic." },
      { id: "u14-sorensen", kind: "branch", title: "Gabriel–malonic (Sorensen)", blurb: "Units 9 and 10 combined." },
      { id: "u14-red-am", kind: "branch", title: "Reductive amination of α-keto acids", blurb: "Unit 10 applied." },
      { id: "u14-coupling", kind: "branch", title: "Peptide coupling", blurb: "DCC or EDC/HOBt; racemization is the risk." },
      { id: "u14-edman", kind: "branch", title: "Edman degradation", blurb: "One residue at a time from the N-terminus." },
      { id: "u14-sanger", kind: "branch", title: "Sanger reagent", blurb: "SNAr labels the N-terminus. Unit 4 callback." },
      { id: "u14-ninhydrin", kind: "branch", title: "Ninhydrin", blurb: "Purple; proline yellow." },
      { id: "u14-geometry", kind: "branch", title: "Peptide-bond geometry", blurb: "Planarity, cis/trans, proline the exception." },
    ],
  },
  {
    id: "u15",
    title: "Unit 15 · Lipids & Capstone",
    note: "One boss node plus a branch cluster.",
    nodes: [
      { id: "u15-boss", kind: "boss", title: "Multistep synthesis design", blurb: "Gated on Units 3, 5, 7, 8, 9. Everything integrates here or is exposed." },
      { id: "u15-sapon", kind: "branch", title: "Saponification of fats", blurb: "Unit 8 hydrolysis on a triglyceride." },
      { id: "u15-hydrog", kind: "branch", title: "Hydrogenation of oils", blurb: "Partial hydrogenation, trans fats." },
      { id: "u15-fatty", kind: "branch", title: "Fatty-acid structure", blurb: "Saturation, packing, melting point." },
      { id: "u15-terpene", kind: "branch", title: "Terpene and steroid biosynthesis", blurb: "Isoprene units, cationic cascades." },
    ],
  },
];

/** How much of the map is playable today, computed from the data itself. */
export function coverage(): { readonly playable: number; readonly total: number; readonly spinePlayable: number; readonly spineTotal: number } {
  let playable = 0;
  let total = 0;
  let spinePlayable = 0;
  let spineTotal = 0;
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      total += 1;
      if (node.playable !== undefined) playable += 1;
      if (node.kind === "spine") {
        spineTotal += 1;
        if (node.playable !== undefined) spinePlayable += 1;
      }
    }
  }
  return { playable, total, spinePlayable, spineTotal };
}

/**
 * One node by id, or null.
 *
 * Exists because a surface that CLEARS a node has to know two things the node
 * id alone does not carry: whether it is on the spine, which the economy pays
 * differently, and its title for a receipt. BeatRunner is the first caller.
 * Linear scan over roughly 200 nodes, run once when a lesson ends, so an index
 * would be a cache with an invalidation bug and no measurable win.
 */
export function pathwayNode(id: string): PathwayNode | null {
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      if (node.id === id) return node;
    }
  }
  return null;
}
