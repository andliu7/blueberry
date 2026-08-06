import type { Deck } from "@/data/types";

/**
 * Lab 7, the chemoselective reduction.
 *
 * Content is Andrew's, used verbatim. The one liberty taken is ordering: the
 * source list runs in the order the questions were written down, which puts the
 * LiAlH4 comparison at number 33 and the TLC block in the middle of the
 * workup. Here they are grouped the way the lab actually runs, because a deck
 * is drilled in order and jumping between chromatography and hydride chemistry
 * costs you the thread.
 */
export const reductionDeck: Deck = {
  id: "reduction",
  title: "[CHEM 242] Lab 7: Reduction of Vanillin Acetate",
  short: "Reduction",
  group: "lab",
  added: "2026-08-03",
  titleLines: ["REDUCTION", "LCTA"],
  subtitle:
    "37 questions on the chemoselective reduction. Hide the answers, rate your recall, and drill until they stick.",
  blurb:
    "Hydride chemistry, TLC monitoring, extraction workup and the IR that proves the ester survived.",
  footNote: "Remember: the aldehyde goes, the ester stays. That is the whole experiment.",
  about:
    "In this lab you reduce the aldehyde of vanillin acetate to a primary alcohol with sodium borohydride, while deliberately leaving the ester alone.\n\nThat selectivity is the point. $NaBH_4$ is reactive enough for an aldehyde and too weak for an ester, so one functional group in a polyfunctional molecule can be changed on purpose. Swap in $LiAlH_4$ and you lose exactly that: it takes the ester too, and you end up with vanillyl alcohol.\n\nThree techniques carry the experiment. TLC tells you when the reaction is done, by the reactant spot disappearing. A liquid-liquid extraction separates your product from the boron and sodium salts. The IR at the end is the proof: a new broad $O-H$, no aldehyde $C=O$ and no $2720/2820$ doublet, and an ester $C=O$ still sitting there.",
  purpose:
    "Demonstrate chemoselective reduction: sodium borohydride is reactive enough to convert an aldehyde to a primary alcohol but too weak to touch an ester, so a single functional group in a polyfunctional molecule can be modified deliberately. The supporting skills are TLC reaction monitoring, liquid-liquid extraction workup, and IR confirmation of a functional group transformation.",
  funFact:
    "The acetate protecting group is why this works at all: free vanillin's phenol would just get deprotonated and consume hydride. And less than about one percent of the world's vanillin comes from actual orchid pods. Most is synthesised from guaiacol or pulled out of lignin, a waste stream of paper pulping. Fittingly, borohydride chemistry is also used industrially to bleach that same wood pulp.",
  motif: "vanillin",
  from: "#5b21b6",
  to: "#7c3aed",
  questions: [
    // ---- Reduction fundamentals
    { q: "What is a reduction?", a: "Gain of electrons. In organic terms, an <strong class='text-indigo-700'>increase in C–H bonds</strong> and/or a decrease in C–heteroatom bonds. Here: aldehyde → primary alcohol." },
    { q: "What functional groups are important to consider?", a: "Aldehyde (gets reduced), aryl ester/acetate (<strong class='text-indigo-700'>must survive</strong>), methoxy ether and aromatic ring (spectators). Product functional group: $1^\\circ$ benzylic alcohol." },
    { q: "What is a hydride and what are its characteristics?", a: "$H^-$, hydrogen carrying two electrons. Small, strongly basic, strongly nucleophilic. It is <strong class='text-indigo-700'>hydridic</strong> because it is bonded to B or Al, which are less electronegative than H, so electron density sits on the hydrogen." },
    { q: "What is the general mechanism of hydride reduction?", a: "Concerted hydride transfer: the $B-H$ bond delivers $H^-$ to the electrophilic carbonyl carbon while the $C=O$ $\\pi$ electrons shift onto oxygen. The resulting alkoxide is captured by boron as a <strong class='text-indigo-700'>borate ester</strong>; solvent ($EtOH/H_2O$) protonates on workup to give the alcohol. Each boron can deliver up to 4 hydrides." },
    { q: "What happens if we use $LiAlH_4$ instead of $NaBH_4$?", a: "It is strong enough to reduce the <strong class='text-indigo-700'>ester as well as the aldehyde</strong>. You would cleave the acetate and end up with vanillyl alcohol (4-hydroxy-3-methoxybenzyl alcohol) plus ethanol, losing the chemoselectivity that is the entire point of this lab." },

    // ---- Reagents and handling
    { q: "What are the two common reducing agents and how do they differ?", a: "$NaBH_4$ is mild and selective (aldehydes/ketones only) and tolerates protic solvents like $EtOH/H_2O$. $LiAlH_4$ is far stronger (esters, amides, carboxylic acids, nitriles) because <strong class='text-indigo-700'>Al is less electronegative than B</strong>, making its hydrides more electron-rich; it requires dry aprotic ether solvents and reacts violently with water." },
    { q: "Why are reducing agents water sensitive?", a: "$H^-$ is a strong base. It deprotonates any $O-H$, generating <strong class='text-indigo-700'>$H_2$ gas</strong> and borate/aluminate salts. That destroys the reagent before it can reduce your substrate." },
    { q: "Where and how do we store reducing agents, and why?", a: "Dry, tightly sealed container in a <strong class='text-indigo-700'>desiccator</strong>, away from moisture and acids. $NaBH_4$ is hygroscopic and slowly decomposes in ambient humidity." },
    { q: "What is a desiccator?", a: "A sealed chamber holding a <strong class='text-indigo-700'>drying agent</strong> (Drierite/$CaSO_4$, silica gel) that keeps the internal atmosphere low-humidity." },
    { q: "How many equivalents of reducing agent do we need to reduce one carbonyl?", a: "One <strong class='text-indigo-700'>hydride equivalent</strong> per carbonyl. Since $NaBH_4$ carries 4 hydrides, that is $0.25$ mol $NaBH_4$ per mol carbonyl stoichiometrically." },
    { q: "Why do we add excess $NaBH_4$?", a: "Ethanol and water <strong class='text-indigo-700'>consume hydride competitively</strong>, the solid is never 100% intact after storage, and excess drives the reaction to completion in a reasonable time." },
    { q: "Why do we cool the vanillin acetate/ethanol solution in an ice bath before adding $NaBH_4$?", a: "Both the reduction and the $NaBH_4$/protic-solvent side reaction are <strong class='text-indigo-700'>exothermic</strong>. Cooling controls the exotherm, prevents boiling or bubbling over from $H_2$ evolution, and slows destruction of the reagent by ethanol." },
    { q: "If this reaction were run with $LiAlH_4$ instead, what changes would we need to make?", a: "Switch to a rigorously <strong class='text-indigo-700'>dry aprotic solvent</strong> (THF or $Et_2O$): ethanol or water would destroy it instantly and dangerously. Flame-dried glassware, inert atmosphere, slow cold addition, and a careful sequential quench (water / NaOH / water) instead of simply adding water." },

    // ---- TLC
    { q: "Which solvent is more polar: ethyl acetate or hexanes? How can we tell?", a: "<strong class='text-indigo-700'>Ethyl acetate.</strong> It has a polar $C=O$ plus $C-O$ bonds, a net dipole, and H-bond-accepting ability (dielectric $\\approx 6$). Hexanes are pure hydrocarbon with London forces only (dielectric $\\approx 1.9$)." },
    { q: "What is TLC?", a: "Thin-layer chromatography: a <strong class='text-indigo-700'>silica-coated plate</strong> (polar stationary phase) with a solvent mobile phase, used here to monitor reaction progress." },
    { q: "What are the basic principles of chromatography?", a: "Compounds <strong class='text-indigo-700'>partition</strong> between a stationary and a mobile phase. Stronger affinity for the stationary phase means slower migration; differential affinity produces separation." },
    { q: "Compounds are separated on a TLC plate based on what property?", a: "<strong class='text-indigo-700'>Polarity</strong>: how strongly each compound adsorbs to the polar silica versus dissolving in the less polar eluent." },
    { q: "If we make a 1:4 mixture of ethyl acetate:hexanes, how much of each do we need for 10 mL total?", a: "<strong class='text-indigo-700'>2 mL ethyl acetate + 8 mL hexanes.</strong>" },
    { q: "When running a TLC of the reaction mixture, why do we have to spot the vanillin acetate reactant next to the reaction spot?", a: "$R_f$ is only reproducible on the <strong class='text-indigo-700'>same plate in the same chamber</strong>. Co-spotting authentic reactant gives a direct same-plate comparison, so you can tell whether a spot is leftover starting material or product." },
    { q: "Why do we examine the TLC plate under a UV lamp?", a: "Both compounds are colourless. The plate contains an <strong class='text-indigo-700'>$F_{254}$ fluorescent indicator</strong> that glows under 254 nm; the aromatic rings absorb that light, so spots appear dark against a green background." },
    { q: "What is $R_f$?", a: "(Distance from baseline to spot centre) $\\div$ (distance from baseline to solvent front). <strong class='text-indigo-700'>Always $\\leq 1$.</strong>" },
    { q: "What are we checking for when we run TLCs of the reaction mixture?", a: "<strong class='text-indigo-700'>Disappearance of the starting-material spot</strong> and appearance of a single new spot: reaction completion." },
    { q: "Would the $R_f$ change if we used a bigger TLC plate?", a: "<strong class='text-indigo-700'>No.</strong> $R_f$ is a ratio, so it is independent of plate size as long as stationary phase, eluent and conditions are unchanged." },
    { q: "Why shouldn't we use pen to mark the TLC plates?", a: "Ink dyes are organic and <strong class='text-indigo-700'>soluble in the eluent</strong>. They migrate up the plate, streak, and show under UV, contaminating the result. Pencil graphite is insoluble and stays put." },
    { q: "What should the TLC plate look like when checking to see if your reaction is complete?", a: "Reaction lane: <strong class='text-indigo-700'>one spot at the product $R_f$</strong>, nothing left at the reactant $R_f$. Co-spot lane: two clearly resolved spots." },
    { q: "Which spot is higher?", a: "The <strong class='text-indigo-700'>reactant</strong> (vanillin acetate). The product has a free $O-H$ that hydrogen-bonds to silica, so it is more polar, sticks harder, and travels lower." },

    // ---- Workup
    { q: "When the reaction is complete, why do we add water?", a: "To <strong class='text-indigo-700'>quench excess $NaBH_4$</strong> and hydrolyse the borate ester intermediate, freeing the alcohol. It also dissolves the boron/sodium salts and creates the aqueous phase for extraction." },
    { q: "Why do we add ether to the separatory funnel?", a: "It is a <strong class='text-indigo-700'>water-immiscible organic solvent</strong> that dissolves the product but not the inorganic salts, and its low boiling point makes it easy to strip off afterward." },
    { q: "What goes into the aqueous layer?", a: "Sodium and borate salts, $NaBH_4$ decomposition products, ethanol, bisulfite and its adducts: anything <strong class='text-indigo-700'>water-soluble and ionic</strong>." },
    { q: "Why do we wash the ether layer with aqueous sodium bisulfite?", a: "Bisulfite adds to any unreacted aldehyde to form a <strong class='text-indigo-700'>water-soluble bisulfite adduct</strong>, pulling leftover vanillin acetate out of the ether layer. It is a purification step targeting the expected impurity." },
    { q: "Why do we need to add sodium sulfate to the organic layer?", a: "<strong class='text-indigo-700'>Drying agent.</strong> It scavenges dissolved water from the ether, preventing a wet oil, which would skew the mass and add a large $O-H$ band to the IR." },
    { q: "What are possible impurities?", a: "Unreacted vanillin acetate, residual ether or ethanol, water, vanillin or vanillyl alcohol if any ester cleavage occurred, boron salts, trace bisulfite." },

    // ---- Calculations
    { q: "What kinds of calculations do we need to know how to do for this experiment?", a: "Molar masses (vanillin acetate $194.18$, $NaBH_4$ $37.83$, product $196.20$ g/mol), moles from mass, equivalents (<strong class='text-indigo-700'>hydride equivalents $= 4 \\times$ mol $NaBH_4$</strong>), limiting reagent, theoretical yield, percent yield, $R_f$, and solvent-ratio volumes." },

    // ---- IR
    { q: "How do you prepare the sample for an IR?", a: "The product is an oil, so run it <strong class='text-indigo-700'>neat</strong>: one drop directly on the ATR crystal, or as a thin film between salt plates. No solvent, no KBr pellet." },
    { q: "How much sample do you need for an IR?", a: "Essentially <strong class='text-indigo-700'>one drop</strong>, enough to cover the crystal window, on the order of a milligram." },
    { q: "What is a &ldquo;background&rdquo;?", a: "A scan of the clean or empty instrument capturing atmospheric $CO_2$ and water vapour plus optical contributions. It is <strong class='text-indigo-700'>subtracted from the sample scan</strong> so only the compound's absorbances remain." },
    { q: "What should the IR spectrum look like?", a: "<strong class='text-indigo-700'>Reactant:</strong> two carbonyls, ester $C=O \\approx 1760$ $cm^{-1}$ and conjugated aldehyde $C=O \\approx 1690$ $cm^{-1}$, plus the diagnostic aldehyde $C-H$ doublet near $2720/2820$ $cm^{-1}$, and no $O-H$.<br><br><strong class='text-indigo-700'>Product:</strong> new broad $O-H \\approx 3200-3500$ $cm^{-1}$, loss of the aldehyde $C=O$ and the $2720/2820$ doublet, ester $C=O$ still present $\\approx 1750-1765$ $cm^{-1}$. That last point proves the aldehyde was reduced without touching the ester." },

    {
      mc: true,
      q: "Sample LCTA: your TLC after 30 minutes shows two spots in the reaction lane, one matching the co-spotted reactant. What should you do?",
      options: [
        "Work the reaction up now; two spots means two products",
        "Add more ethanol and re-run the plate",
        "Stir a further 10 minutes and re-spot, since reactant remains",
        "Switch to $LiAlH_4$ to push it to completion",
      ],
      correct: 2,
      a: "<strong class='text-indigo-700'>C.</strong> A spot at the reactant $R_f$ means unreacted vanillin acetate is still there, and the procedure says to continue in 10-minute increments until it is gone. Working up now costs yield and leaves an impurity that the bisulfite wash then has to remove. $LiAlH_4$ would cleave the ester and destroy the selectivity the experiment is demonstrating.",
    },
  ],
};
