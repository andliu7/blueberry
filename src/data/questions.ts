export interface QAItem {
  mc?: false;
  q: string;
  a: string;
}

export interface MCItem {
  mc: true;
  q: string;
  options: string[];
  correct: number;
  a: string;
}

export type Question = QAItem | MCItem;

export const questions: Question[] = [
  { q: "Why are Grignard reagents strong nucleophiles?", a: "Mg is far less electronegative than carbon, so the $C-Mg$ bond is <strong class='text-indigo-700'>highly polarized</strong>, leaving carbon electron-rich ($\\delta^-$) and eager to attack electrophiles." },
  { q: "Why are Grignard reagents sensitive to moisture?", a: "They're extremely <strong class='text-indigo-700'>strong bases</strong>. Water gets deprotonated instantly, forming $R-H$ and $Mg(OH)X$ and destroying the reagent." },
  { q: "Why must we dry glassware in the oven?", a: "To drive off invisible <strong class='text-indigo-700'>adsorbed water</strong> on the glass surface, which would otherwise quench the moisture-sensitive Grignard reagent." },
  { q: "Why do we remove the plastic and Teflon pieces from the glassware before placing it in the oven?", a: "They have <strong class='text-indigo-700'>much lower melting points</strong> than glass and will melt, warp, or fuse into the joints." },
  { q: "Why do we add grease to glassware? What happens if we don't add enough? What happens if we add too much?", a: "Grease creates an <strong class='text-indigo-700'>airtight seal</strong> and keeps joints from seizing. Too little lets moisture in; too much can smear into the joint and contaminate the reaction." },
  { q: "Why do Grignard reagents typically need to be synthesized in situ instead of made in advance?", a: "They're <strong class='text-indigo-700'>too reactive to store</strong>. Trace air or moisture leaking into a container degrades them quickly." },
  { q: "Why are carbonyls electrophilic?", a: "Electronegative oxygen pulls electron density through the $\\pi$ bond, leaving the carbonyl carbon <strong class='text-indigo-700'>electron-poor</strong> ($\\delta^+$)." },
  { q: "Why do we need a workup step? What kinds of reagents are good workup reagents?", a: "It <strong class='text-indigo-700'>protonates</strong> the magnesium alkoxide into a neutral alcohol and dissolves the Mg salts. Dilute aqueous acids work best: $H_2SO_4$, $HCl$, or saturated $NH_4Cl$." },
  { q: "What is happening during the extraction?", a: "The alcohol product <strong class='text-indigo-700'>partitions into the ether layer</strong>, since it's more soluble there than in water, separating it from the water-soluble salts." },
  { q: "What is anhydrous ether? Why do we need to use it?", a: "Diethyl ether with essentially <strong class='text-indigo-700'>no trace water</strong>. Needed for the reaction step since any water would quench the Grignard reagent." },
  { q: "What is the reaction setup? Be sure you understand why each piece is connected correctly.", a: "The <strong class='text-indigo-700'>round-bottom flask</strong> (holds the reaction) sits on a heating source (hot plate/heating mantle mounted on a <strong class='text-indigo-700'>lab jack</strong>, so it can be raised to heat or lowered to stop heating quickly), all held in place by <strong class='text-indigo-700'>clamps</strong> attached to a ring stand or support rod. A <strong class='text-indigo-700'>Claisen adapter</strong> splits the single flask neck into two openings, secured with <strong class='text-indigo-700'>keck clips</strong> (plastic clips that lock the ground-glass joints together so they can't pop apart). One arm holds the <strong class='text-indigo-700'>reflux condenser</strong>, topped with a <strong class='text-indigo-700'>drying tube</strong> packed with $CaCl_2$ and loose cotton (the cotton holds the $CaCl_2$ in place while still letting air pass; the $CaCl_2$ blocks atmospheric moisture). The other arm holds the <strong class='text-indigo-700'>separatory/addition funnel</strong> used for dropwise addition, with its stopper resting on a piece of paper against the joint (see Q20)." },
  { q: "Why must we vent the separatory funnel stopper?", a: "Vaporizing ether builds <strong class='text-indigo-700'>pressure</strong> in the closed funnel; venting keeps the stopper from blowing out." },
  { q: "What does $CaCl_2$ do?", a: "Acts as a <strong class='text-indigo-700'>desiccant</strong> in the drying tube, absorbing atmospheric water vapor before it reaches the apparatus." },
  { q: "What do $I_2$ chips do?", a: "React with the $MgO$ coating on the magnesium, <strong class='text-indigo-700'>exposing fresh reactive metal</strong> to start the reaction." },
  { q: "Which way do we connect the condenser (water flow)?", a: "<strong class='text-indigo-700'>In at the bottom, out at the top</strong>, so the jacket stays completely full against gravity." },
  { q: "Why do we add a pipette bulb to the end of the side arm adapter?", a: "It's a <strong class='text-indigo-700'>flexible reservoir</strong> that absorbs minor pressure changes while keeping the system sealed from moisture." },
  { q: "What's a Claisen adapter? Why do we use it here?", a: "A glass Y-piece that <strong class='text-indigo-700'>turns one flask neck into two</strong>, letting us attach both the condenser and addition funnel." },
  { q: "Why do we need a separatory funnel attached to our reaction setup?", a: "Used as an <strong class='text-indigo-700'>addition funnel</strong> for dropwise addition of the alkyl halide, keeping the exothermic reaction controlled." },
  { q: "What happens if the ether is added to the separatory funnel while it is still hot?", a: "Ether (bp $35^\\circ C$) <strong class='text-indigo-700'>flash-vaporizes</strong>, spiking pressure and potentially blowing the stopper out." },
  { q: "Why do we add a piece of paper between the separatory funnel cap and joint?", a: "It keeps the joint from sealing completely airtight. As liquid drips out during addition, <strong class='text-indigo-700'>air needs to get in to equalize the pressure</strong> or the flow stops. The paper creates a tiny gap for that air while still keeping the fit snug enough to block most atmospheric moisture. It also helps keep the joint from seizing shut." },
  { q: "After the alkyl bromide is added, why do we rinse the flask with more ether?", a: "<strong class='text-indigo-700'>Quantitative transfer</strong>: washes residual alkyl bromide into the reaction to maximize yield." },
  { q: "Why do we need to use a condenser?", a: "Ether boils at $35^\\circ C$; the condenser <strong class='text-indigo-700'>returns vapor to the flask</strong> (reflux) so it doesn't boil dry." },
  { q: "After addition of the alkyl bromide, why do we wait 15 minutes?", a: "Gives the reaction time to <strong class='text-indigo-700'>go to completion</strong>, finishing formation of the Grignard reagent." },
  { q: "After addition of the alkyl bromide, why does the reaction get hot?", a: "Forming the $C-Mg$ bond is <strong class='text-indigo-700'>exothermic</strong>." },
  { q: "Why do we add reagents dropwise?", a: "Controls the <strong class='text-indigo-700'>rate of heat release</strong> so the exothermic reaction doesn't boil the ether over." },
  { q: "What would happen if you forgot to turn the water on to the condenser?", a: "Ether vapor escapes uncooled, risking a dry flask and a <strong class='text-indigo-700'>fire hazard</strong>." },
  { q: "In 'week 2,' why do we use ice instead of room-temperature water with the sulfuric acid?", a: "Diluting acid is strongly <strong class='text-indigo-700'>exothermic</strong>; ice absorbs the heat and prevents splattering." },
  { q: "When doing the extraction, which layer is the ether layer?", a: "The <strong class='text-indigo-700'>top layer</strong>. Ether ($\\approx 0.71\\ g/mL$) is less dense than water ($1.0\\ g/mL$)." },
  { q: "Which layer is the desired product in?", a: "The <strong class='text-indigo-700'>organic (ether) layer</strong>." },
  { q: "What goes in the aqueous layer?", a: "Water, leftover acid, and dissolved Mg salts (e.g. $MgBr_2$)." },
  { q: "Why do we return the aqueous layer to the funnel and add more ether?", a: "One extraction never removes 100% of the product (<strong class='text-indigo-700'>partition coefficient</strong>); re-extracting recovers more." },
  { q: "Why do we only use a few mL of ether for each extraction?", a: "Several <strong class='text-indigo-700'>small extractions</strong> recover more total product than one large one, and limit how much ether must later be evaporated." },
  { q: "Why do we wash the combined ether layers with aqueous sodium bicarbonate?", a: "<strong class='text-indigo-700'>Neutralizes</strong> any residual acid that carried over into the organic layer." },
  { q: "Why do we vent the funnel when washing with sodium bicarbonate?", a: "Neutralization produces $CO_2$ gas, which builds <strong class='text-indigo-700'>pressure</strong> quickly." },
  { q: "Why do we dry the ether layer with sodium sulfate?", a: "Removes the <strong class='text-indigo-700'>trace dissolved water</strong> the ether still holds after separation." },
  { q: "How do you know when enough sodium sulfate has been added?", a: "Granules <strong class='text-indigo-700'>stop clumping</strong> and swirl freely, like dry sand." },
  { q: "How do we remove the sodium sulfate afterward?", a: "<strong class='text-indigo-700'>Gravity filtration</strong> through filter paper or a cotton plug." },
  { q: "What would the NMR look like if the ether wasn't fully evaporated?", a: "Extra ether peaks: a <strong class='text-indigo-700'>triplet</strong> near $1.2\\ ppm$ ($CH_3$) and a <strong class='text-indigo-700'>quartet</strong> near $3.5\\ ppm$ ($OCH_2$)." },
  { q: "What should you do if you spill sulfuric acid on your bench?", a: "<strong class='text-indigo-700'>Alert your TA</strong>. Don't just flush with water; neutralize with solid sodium bicarbonate first." },
  { q: "What are likely reasons for a low yield?", a: "Moisture quenching the Grignard reagent, incomplete extraction, transfer losses, or spills." },
  { q: "What is a likely impurity in your final product?", a: "<strong class='text-indigo-700'>Biphenyl</strong>, from homocoupling of the Grignard reagent with unreacted bromobenzene." },
  { q: "What should pure product look like in the IR spectrum?", a: "<strong class='text-indigo-700'>Broad $O-H$ stretch</strong> ($\\approx 3200-3550\\ cm^{-1}$), no $C=O$ peak ($\\approx 1700\\ cm^{-1}$)." },
  { q: "What should impure product look like in the IR spectrum?", a: "A <strong class='text-indigo-700'>sharp $C=O$ peak</strong> ($\\approx 1700\\ cm^{-1}$) shows leftover starting material." },
  {
    mc: true,
    q: "Sample LCTA: For this experiment, would a 3M NaOH solution be a good workup reagent? Choose the best answer.",
    options: [
      "Yes, because 3M NaOH is a mild concentration.",
      "Yes, because it is an inexpensive and safe reagent to remove the MgBr salt.",
      "Yes, because it is an aqueous solution that solubilizes the MgBr salt.",
      "No, because it is a base and cannot protonate the Grignard product.",
      "No, because a stronger concentration of NaOH is required.",
    ],
    correct: 3,
    a: "Correct answer: D. Workup needs to <strong class='text-indigo-700'>protonate</strong> the magnesium alkoxide into a neutral alcohol. $NaOH$ is a base, not a proton source, so it can't supply the $H^+$. Concentration (A, E) or solubility (C) don't fix that. A dilute acid ($H_2SO_4$, $HCl$, $NH_4Cl$) is needed instead.",
  },
];
