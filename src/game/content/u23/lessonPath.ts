/**
 * Units 2 and 3 in the Unit 1 lesson shape: a read-along explainer, a
 * walk-through and a video slot for each lesson (round 2, 29 Oct 2026). Unit 1
 * has all three (content/u1/lessonPath.ts, lessonExplainers.ts); Units 2 and 3
 * had only the priming preview. The prerequisite link table is lessonLinks.ts
 * beside this file.
 *
 * NO NEW CHEMISTRY LIVES HERE, as in Unit 1. Every walk-through step names a
 * pool entry (`source`) and copies words from its explanation (`quote`);
 * test/u23LessonPath.test.ts fails a quote the source does not contain and a
 * source that comes from a LATER lesson. Explainer cards restate the lesson's
 * own pool explanations in the order a tutor would say them; a drawing is only
 * ever a pointer (`{ beat }`) to a question the lesson already draws, never a
 * typed structure, so every structure on a card is RDKit-derived. Context comes
 * first: card one says why the lesson is there. No arithmetic beyond what a
 * pool entry already shows, no calculator, no trivia. Drafts until the owner
 * signs them off.
 */
import type { Explainer } from "../u1/lessonExplainers";
import type { VideoSlot, WalkStep } from "../u1/lessonPath";

export const U23_EXPLAINERS: Readonly<Record<string, Explainer>> = {
  "u2-induction": {
    minutes: 2,
    uses: ["u0:resonance", "u0:orbitals"],
    cards: [
      { heading: "Why this comes first", body: "Almost every acid, base and ring question in the next two units is really a question about how steady a charge is. Resonance is one way to steady a charge. Induction is the other, and it needs no pi bonds at all." },
      { heading: "A pull along sigma bonds", body: "A more electronegative atom holds the shared pair closer, so the bond is polar. Induction is that pull passed along a chain of sigma bonds.", draw: [{ beat: "u2t-ind-meet-bond" }] },
      { heading: "It fades with distance", body: "Each bond the pull passes through weakens it. The closer the Cl is to the acid group, the stronger the acid.", draw: [{ beat: "u2t-ind-distance" }] },
      { heading: "It adds with number", body: "At the same distance, each extra electronegative atom adds to the pull. When position and count tie, the atom itself decides, and F pulls hardest.", draw: [{ beat: "u2t-ind-count" }] },
      { heading: "Two ways you already knew", body: "Resonance steadies phenoxide because its charge reaches the ring. More s character steadies an sp carbon's anion because the pair sits nearer the nucleus. Induction is the third way, and it needs neither.", draw: [{ beat: "u2t-ind-recall-res" }] },
      { heading: "Take this with you", body: "Close, many and strongly electronegative all strengthen the pull. It steadies a negative charge, so it makes an acid stronger and a base weaker." },
    ],
  },
  "u2-keq-pka": {
    minutes: 2,
    uses: ["u2:induction"],
    cards: [
      { heading: "Why this matters", body: "Induction told you which acid is stronger. Reactions later in the course ask a different question: when an acid meets a base, does anything really happen? pKa answers that, and so does the equilibrium." },
      { heading: "Higher pKa, weaker acid", body: "A higher pKa means a weaker acid, and a weaker acid holds its proton more tightly, so that is the side where an equilibrium rests.", draw: [{ beat: "u2t-keq-meet-weaker" }] },
      { heading: "Rest on the weaker acid", body: "The proton moves to the side that holds it more tightly. Look at the acid that would be formed: if it is the weaker one, the products win.", draw: [{ beat: "u2t-keq-ethoxide-phenol" }] },
      { heading: "How far it rests", body: "Keq is products over reactants. It is ten to the power of the gap between the two pKa values, so each unit of gap is a zero. A gap of 6 is a Keq near a million, read by eye.", draw: [{ beat: "u2t-keq-size-phenol" }] },
      { heading: "A small Keq still counts", body: "A Keq far below one does not mean nothing forms. A ketone with ethoxide leaves a tiny steady amount of enolate, and enolate chemistry works on exactly that.", draw: [{ beat: "u2t-keq-estimate-enolate" }] },
      { heading: "Take this with you", body: "Find both acids, compare the pKa values, and the equilibrium rests on the weaker one. The size of the gap, in tens, says how far." },
    ],
  },
  "u2-energy": {
    minutes: 3,
    uses: ["u2:keq-pka"],
    cards: [
      { heading: "Why a map of energy", body: "From here on, most questions are a choice between paths. An energy diagram is the map. It says which steps can run backwards, where a reaction can get stuck, and which product you collect." },
      { heading: "Wells, humps and Keq", body: "A flat stretch is a species that sits there. A hump is the transition state between two. The hump's height is the barrier and sets the speed. The gap between two wells sets Keq.", energy: "one-way" },
      { heading: "The window", body: "Keq from 10 to the minus 7 to 10 to the 7 runs both ways. A pKa gap is the same: acetic acid (pKa 5) with hydroxide makes water (15.7), Keq 10 to the 10.7, a one way door. Ethanol (16) with hydroxide runs both ways.", energy: "one-way" },
      { heading: "Dead ends, then a door", body: "A reversible step can lead to a dead end, and the reaction just comes back. Each trip is another try. Once an irreversible step is taken, the reaction follows that path down the graph.", energy: "dead-end" },
      { heading: "Two products", body: "Cold, steps cannot be undone: the lower hump wins (kinetic). Warm, they can: the deeper well wins (thermodynamic). HBr on butadiene: 1,2 cold, 1,4 warm. A ketone with LDA gives the less substituted enolate; with ethoxide, the more substituted.", energy: "control" },
      { heading: "Try it yourself", body: "Pick a real reaction, work out Keq and type the exponent. Then slide a step, walk a path, and flip butadiene between cold and warm.", lab: true },
    ],
  },
  "u2-resonance": {
    minutes: 2,
    uses: ["u0:resonance", "u1:allylic", "u2:keq-pka"],
    cards: [
      { heading: "Why a ring needs this", body: "Unit 1 spread a charge over a chain. Here the same idea goes round a loop. It is the reason benzene is stable, and the reason a conjugate base can be so steady that an acid gives up its proton." },
      { heading: "One blend, not two shapes", body: "Resonance forms differ only in where the pi electrons are drawn. The real molecule is one blend, so all six benzene C-C bonds are equal.", draw: [{ beat: "u2t-res-meet-lengths" }] },
      { heading: "Charge runs round the loop", body: "A charge next to a double bond spreads. In a ring of five p orbitals it runs all the way round, so all five carbons share it equally.", draw: [{ beat: "u2t-res-meet-cp" }] },
      { heading: "Steadier base, stronger acid", body: "Acidity follows the conjugate base. The cyclopentadienyl anion spreads its charge over five carbons by resonance, while the cyclopentyl anion keeps it on one.", draw: [{ beat: "u2t-res-cp-acid" }] },
      { heading: "Take this with you", body: "A charge spreads over every atom a loop or chain of p orbitals can reach. The bigger the loop, the more atoms share it, and the steadier the species." },
    ],
  },
  "u2-huckel": {
    minutes: 3,
    uses: ["u2:ring-resonance", "u0:orbitals"],
    cards: [
      { heading: "Why we sort rings", body: "Resonance round a ring is not always a gain. A flat ring that shares its electrons can be unusually stable or unusually unstable. The four tests tell you which, before you predict any reaction." },
      { heading: "Four tests, in order", body: "Cyclic, a p orbital on every ring atom, planar, then 4n + 2 pi electrons. One sp3 carbon breaks the loop, so the ring is nonaromatic and the count is never asked.", draw: [{ beat: "u2-huckel-meet-gate" }] },
      { heading: "Count what each carbon gives", body: "Benzene has 6 pi electrons, which fits 4n + 2 with n = 1. Each carbon gives one electron from its p orbital.", draw: [{ beat: "u2-huckel-meet-count" }] },
      { heading: "4n is the bad news", body: "A flat ring that passes the gate with 4n pi electrons is antiaromatic. A count that gives n as a non whole number is the tell that it fails 4n + 2.", draw: [{ beat: "u2-huckel-cbd" }] },
      { heading: "Take this with you", body: "Gate first, then count. 4n + 2 is aromatic, 4n in a flat ring is antiaromatic, and a broken gate is nonaromatic." },
    ],
  },
  "u2-charged": {
    minutes: 2,
    uses: ["u2:huckel", "u2:keq-pka"],
    cards: [
      { heading: "Why charge changes the count", body: "A ring does not have to be neutral to be aromatic. A lone pair or an empty p orbital can complete the loop, and that explains some surprising acid and leaving group results." },
      { heading: "A lone pair joins the ring", body: "Remove H+ from cyclopentadiene's CH2 and that carbon keeps a lone pair in a p orbital. 4 from the C=C bonds plus 2 is 6, so the anion is aromatic.", draw: [{ beat: "u2-chg-cp-anion" }] },
      { heading: "An empty orbital counts zero", body: "An empty p orbital counts 0 electrons but keeps the ring of p orbitals unbroken. Tropylium has 6 pi electrons over seven p orbitals: aromatic.", draw: [{ beat: "u2-chg-tropylium" }] },
      { heading: "Judge the base or the cation", body: "Acidity is argued on the conjugate base: the more stable the base, the stronger the acid. Only cyclopentadiene gives an aromatic anion.", draw: [{ beat: "u2-chg-acid-pick" }] },
      { heading: "Take this with you", body: "Count the lone pair as 2 and the empty p orbital as 0, run the same four tests, and let ring class rank stability: aromatic, then nonaromatic, then antiaromatic." },
    ],
  },
  "u2-annulene": {
    minutes: 2,
    uses: ["u2:huckel", "u2:charged-rings"],
    cards: [
      { heading: "Why ring size matters", body: "Counting alone is not enough. A ring also has to lie flat, and big or small rings do not always manage it. This is the lesson where the planarity test earns its place." },
      { heading: "Pi count equals ring size", body: "An annulene alternates C=C all the way round, so its pi count is its ring size: 18 for [18]annulene, n = 4.", draw: [{ beat: "u2-ann-meet-size" }] },
      { heading: "A 4n ring bends away", body: "Flat, COT would be antiaromatic, which costs energy. So it does not stay flat: it folds into a tub, and its C=C bonds then act like separate alkenes.", draw: [{ beat: "u2-ann-cot" }] },
      { heading: "Cannot lie flat", body: "[10]Annulene has the right count but cannot lie flat because of its inner H atoms, so it is nonaromatic.", draw: [{ beat: "u2-ann-10" }] },
      { heading: "Take this with you", body: "Antiaromatic needs a 4n count and a flat ring. If a ring can bend to escape, it does, and it ends up nonaromatic." },
    ],
  },
  "u2-hetero": {
    minutes: 2,
    uses: ["u2:huckel", "u2:charged-rings"],
    cards: [
      { heading: "Why heteroatoms matter", body: "Drugs, DNA bases and many reagents are rings with N, O or S in them. Whether a ring atom's lone pair joins the ring decides if the ring is aromatic and whether that atom can act as a base." },
      { heading: "One question about the N", body: "Does the N already have a ring double bond? Yes, as in pyridine: it gives 1 and its pair sits out in the plane. No, as in pyrrole: the pair goes into the ring.", draw: [{ beat: "u2-het-meet-contrast" }] },
      { heading: "Pyridine versus pyrrole", body: "Pyridine's N is in a C=N bond, so its pair sits in an sp2 orbital in the plane. Pyrrole's N pair is in the p orbital and is counted, giving 6 pi electrons.", draw: [{ beat: "u2-het-pyrrole-pair" }] },
      { heading: "A free pair is a base", body: "A lone pair outside the pi system is free to grab a proton. Pyridine is a base because its pair is outside; pyrrole's pair is part of the ring, so it is a very weak base.", draw: [{ beat: "u2-het-protonate" }] },
      { heading: "Take this with you", body: "Ask whether the atom has a ring double bond. That one question tells you the electron count, the aromaticity and the basicity." },
    ],
  },
  "u2-ewg-edg": {
    minutes: 3,
    uses: ["u2:induction", "u2:ring-resonance", "u2:hetero-rings"],
    cards: [
      { heading: "Why this is the hinge", body: "Unit 3 asks where an electrophile goes and how fast. Both answers come from whether a group on the ring gives electrons or takes them, and you now have both tools, induction and resonance, to decide." },
      { heading: "Donors push by resonance", body: "A lone pair next to a ring can donate into it by resonance. That is the pattern of an electron-donating group: OH, OR and NR2.", draw: [{ beat: "u2t-ewg-meet-anisole" }] },
      { heading: "Withdrawers pull", body: "A group that pulls through the pi system withdraws by resonance and leaves the ortho and para carbons electron poor. A group on an sp3 carbon, such as CF3, works by induction alone.", draw: [{ beat: "u2t-ewg-meet-nitro" }] },
      { heading: "The halogen compromise", body: "For Cl the pull through the sigma bond outweighs the donation, so chlorobenzene reacts a little slower than benzene. The donation still sends attack ortho and para.", draw: [{ beat: "u2t-ewg-halogen" }] },
      { heading: "Take this with you", body: "Two routes carry the effect, sigma bonds and the pi system. An electrophile wants electrons, so a donor speeds the reaction and a withdrawer slows it." },
    ],
  },
  "u2-nmr": {
    minutes: 2,
    uses: ["u2:huckel", "u2:ring-size"],
    cards: [
      { heading: "Why a spectrum can tell", body: "Aromaticity is not only a counting game. A flat ring of shared electrons makes its own magnetic effect, and that gives you a way to check a ring from a spectrum. Unit 6 covers the rest of NMR." },
      { heading: "Outside, deshielded", body: "Aromatic H, about 6.5 to 8 ppm, sit downfield of vinylic H because the ring current adds to the field outside the ring.", draw: [{ beat: "u2-nmr-meet-downfield" }] },
      { heading: "Inside, shielded", body: "The ring current deshields H outside an aromatic ring and shields H inside it. [18]Annulene's inner H land below 0 ppm, a sign the ring is aromatic.", draw: [{ beat: "u2-nmr-meet-inner" }] },
      { heading: "Take this with you", body: "Classify the ring first, then read the band. Only an aromatic ring has a ring current, so a nonaromatic tub like COT shows vinylic H instead." },
    ],
  },
  "u3-arenium": {
    minutes: 3,
    uses: ["u2:ring-resonance", "u2:huckel", "u1:cation-ranking"],
    cards: [
      { heading: "The mechanism under everything", body: "Every reaction in this unit is the same three moves with a different electrophile. Learn them once here and the rest of the unit is recall, not new mechanism." },
      { heading: "Attack makes sp3", body: "The attacked carbon goes sp3. One sp3 carbon breaks the ring's loop of p orbitals, so the sigma complex is not aromatic.", draw: [{ beat: "u3-aren-sp3" }] },
      { heading: "The cation is spread", body: "The arenium (sigma complex) cation spreads its + over three carbons: the two ortho to the sp3 carbon and the one para to it. The sp3 carbon never carries it.", draw: [{ beat: "u3-aren-meet-where" }] },
      { heading: "Lose H+ to come back", body: "A base takes the H+ off the sp3 carbon and the ring is aromatic again. Substitution keeps the aromatic ring; addition would destroy it.", draw: [{ beat: "u3-aren-rearom" }] },
      { heading: "Take this with you", body: "Attack, spread the cation over three carbons, lose H+. More resonance forms means a more stable cation and a faster attack, which is the whole logic of directing effects." },
    ],
  },
  "u3-directing": {
    minutes: 3,
    uses: ["u3:arenium", "u2:donor-withdrawer", "u2:induction"],
    cards: [
      { heading: "Why position matters", body: "A substituted ring has more than one place left to react, and which one wins sets what you can make. You already know donors and withdrawers; now see what they do to the arenium cation." },
      { heading: "Donors favour ortho and para", body: "Ortho or para attack lets one form put the + on the carbon carrying the group. If the group can stabilise a cation there, that form is the extra one. Meta attack never does.", draw: [{ beat: "u3-aren-tert" }] },
      { heading: "Lone pair on the first atom", body: "OH is an o/p director and a strong activator: oxygen's lone pair stabilises the sigma complex.", draw: [{ beat: "u3-dir-phenol" }] },
      { heading: "Withdrawers send meta", body: "A nitrile is a meta director and a deactivator. Only meta attack keeps the + away from the carbon carrying the withdrawer.", draw: [{ beat: "u3-dir-cn" }] },
      { heading: "The halogen exception", body: "Halogens deactivate the ring but direct o/p: induction sets the rate, the lone pair sets the position.", draw: [{ beat: "u3-dir-bromo" }] },
      { heading: "Reason it, do not recall it", body: "For any group, ask which attack lets the + sit beside the group, then whether the group helps or hurts there. That one question gives the position and the speed.", draw: [{ beat: "u3-dir-why-nitro" }] },
    ],
  },
  "u3-halo": {
    minutes: 2,
    uses: ["u3:arenium", "u3:directing"],
    cards: [
      { heading: "The first real reaction", body: "Now the arenium mechanism gets an electrophile. Halogenation is the simplest, so it is the place to see the three moves with nothing else in the way." },
      { heading: "The Lewis acid helps", body: "Cl2 with its matching Lewis acid FeCl3 puts one Cl on the ring in place of one H. The Lewis acid carries the same halogen so it cannot scramble the product.", draw: [{ beat: "u3-halo-cl" }] },
      { heading: "Directing still applies", body: "OMe is an o/p director, and para attack gets the oxygen's lone pair form. The ring you start with decides where the halogen lands.", draw: [{ beat: "u3-halo-anisole" }] },
      { heading: "Ring or side chain", body: "With a Lewis acid the ring is attacked. The benzylic C-H needs radical conditions instead.", draw: [{ beat: "u3-halo-vs-nbs" }] },
    ],
  },
  "u3-nitration": {
    minutes: 2,
    uses: ["u3:arenium", "u3:directing"],
    cards: [
      { heading: "Why nitration matters", body: "A nitro group is the standard way to put nitrogen on a ring. It also changes how the ring reacts, so nitration is a step you will place on purpose in a synthesis." },
      { heading: "The nitronium ion", body: "The nitronium ion, NO2+, is the electrophile. It carries the + the ring's pi electrons need to attack.", draw: [{ beat: "u3-nit-electrophile" }] },
      { heading: "It stops at one", body: "A nitro group is a deactivator, so the mononitro product is less reactive than benzene and the reaction stops at one.", draw: [{ beat: "u3-nit-stop" }] },
      { heading: "The next group goes meta", body: "The first nitro group directs the second one meta: 1,3-dinitrobenzene. It also slows the second nitration down.", draw: [{ beat: "u3-nit-second" }] },
    ],
  },
  "u3-sulfo": {
    minutes: 2,
    uses: ["u3:arenium", "u3:directing"],
    cards: [
      { heading: "The reaction that can be undone", body: "Almost every reaction here is a one-way street. Sulfonation is the exception, and that single fact is what makes it useful later as a blocking group." },
      { heading: "Adds SO3H", body: "Sulfonation puts SO3H on the ring through a new C-S bond: benzenesulfonic acid. One ring H is replaced.", draw: [{ beat: "u3-sul-meet" }] },
      { heading: "Runs backwards in hot dilute acid", body: "Desulfonation: hot dilute acid takes the SO3H off and puts H back. Sulfonation is reversible.", draw: [{ beat: "u3-sul-reverse" }] },
      { heading: "A meta director", body: "SO3H is a meta director and a deactivator, the same class as NO2.", draw: [{ beat: "u3-sul-directs" }] },
    ],
  },
  "u3-fc-alkyl": {
    minutes: 3,
    uses: ["u3:arenium", "u3:directing", "u1:cation-ranking"],
    cards: [
      { heading: "A reaction taught as a warning", body: "Friedel-Crafts alkylation looks like the obvious way to add a carbon chain. It is taught here mainly for how it goes wrong, because those two failures are exam favourites." },
      { heading: "The cation may move", body: "The cation from 1-chloropropane ends up secondary (shift: hydride), and the ring bonds to that carbon. The ranking of carbocations from Unit 1 predicts the shift.", draw: [{ beat: "u3-alk-propyl" }] },
      { heading: "It does not stop", body: "Each alkyl group activates the ring, so the product outcompetes benzene: polyalkylation.", draw: [{ beat: "u3-alk-poly" }] },
      { heading: "It fails on a withdrawer", body: "Friedel-Crafts fails on rings carrying a strong withdrawer such as NO2. A nitro group makes the ring too electron poor.", draw: [{ beat: "u3-alk-fails" }] },
    ],
  },
  "u3-fc-acyl": {
    minutes: 2,
    uses: ["u3:fc-alkyl", "u3:directing"],
    cards: [
      { heading: "The fix for both failures", body: "Alkylation rearranged and kept going. Acylation fixes both, and that is why it is the preferred way to put a carbon chain on a ring." },
      { heading: "An electrophile that cannot move", body: "The acylium ion has a resonance form with C triple bond O+, which is why it never rearranges. The chain arrives unrearranged.", draw: [{ beat: "u3-acyl-ion" }] },
      { heading: "It stops after one", body: "The aryl ketone is a deactivated ring, so acylation stops at one. Alkylation has the opposite problem.", draw: [{ beat: "u3-acyl-once" }] },
      { heading: "Still blocked by a withdrawer", body: "Acylation and alkylation both fail on rings carrying a strong withdrawer such as NO2.", draw: [{ beat: "u3-acyl-fails" }] },
    ],
  },
  "u3-blocking": {
    minutes: 2,
    uses: ["u3:sulfonation", "u3:directing"],
    cards: [
      { heading: "Why block at all", body: "An o/p director gives both ortho and para, and separating them is slow and wasteful. If you want only ortho, you can make para unavailable for a while." },
      { heading: "Without a blocker", body: "CH3 directs both ortho and para, so both form. Blocking para is how you get the ortho product cleanly.", draw: [{ beat: "u3-blk-without" }] },
      { heading: "Why SO3H", body: "A blocking group must come off at the end. Sulfonation is reversible; nitration is not, and reducing NO2 leaves NH2.", draw: [{ beat: "u3-blk-why-so3h" }] },
      { heading: "Three steps", body: "With para blocked, CH3 steers bromine ortho, and SO3H agrees because that carbon is meta to it. Removing the blocker leaves the ortho product.", draw: [{ beat: "u3-blk-step2" }] },
    ],
  },
  "u3-nitro-red": {
    minutes: 2,
    uses: ["u3:nitration", "u3:directing"],
    cards: [
      { heading: "The bridge to amines", body: "Nitration put a meta director on the ring. Reducing it turns that into an amine, and the ring swings to the other end of the ladder. That swing is a sequencing tool." },
      { heading: "Every NO2 becomes NH2", body: "Nitro reduction turns each ArNO2 into ArNH2. Nothing else on the ring changes.", draw: [{ beat: "u3-nred-mnt" }] },
      { heading: "The director flips", body: "Reducing NO2 to NH2 flips the ring from a meta deactivator to an o/p activator.", draw: [{ beat: "u3-nred-flip" }] },
    ],
  },
  "u3-c-to-ch2": {
    minutes: 2,
    uses: ["u3:fc-acyl", "u3:fc-alkyl"],
    cards: [
      { heading: "A straight chain at last", body: "Direct alkylation rearranges. Acylating first and then removing the oxygen gives the straight chain you wanted, in two steps." },
      { heading: "C=O becomes CH2", body: "Clemmensen (or Wolff-Kishner) turns the aryl ketone's C=O into CH2: acetophenone gives ethylbenzene.", draw: [{ beat: "u3-ch2-meet" }] },
      { heading: "Why two steps beat one", body: "Acylate then reduce: the acyl group goes on straight and C=O becomes CH2. Direct alkylation gives mainly isopropylbenzene.", draw: [{ beat: "u3-ch2-why" }] },
      { heading: "The director flips again", body: "Reducing the ketone flips the director: acyl (meta, deactivating) becomes alkyl (o/p, activating). Order matters in a synthesis.", draw: [{ beat: "u3-ch2-flip" }] },
    ],
  },
  "u3-benzylic-ox": {
    minutes: 2,
    uses: ["u3:directing", "u1:allylic"],
    cards: [
      { heading: "Benzylic is the allylic idea again", body: "A carbon next to a ring has a radical or cation the ring can share, just as an allylic carbon does in Unit 1. That is why this carbon is the one that reacts." },
      { heading: "Cut back to COOH", body: "Every side chain with a benzylic H is cut back to COOH; a side chain with no benzylic H survives.", draw: [{ beat: "u3-box-ethyl" }] },
      { heading: "No benzylic H, no reaction", body: "The carbon bonded to the ring has no H, so KMnO4 has nowhere to start. tert-Butyl groups survive.", draw: [{ beat: "u3-box-tbu-alone" }] },
      { heading: "The director flips", body: "Oxidising CH3 to COOH flips o/p to meta. Use it to reach meta patterns that an alkyl group cannot give.", draw: [{ beat: "u3-box-flip" }] },
    ],
  },
  "u3-sequencing": {
    minutes: 3,
    uses: ["u3:directing", "u3:blocking", "u3:nitro-reduction", "u3:fc-acyl", "u3:benzylic-ox", "u3:carbonyl-to-ch2"],
    cards: [
      { heading: "Where the unit has been heading", body: "Each earlier lesson was a tool. A synthesis question asks which tool to use first, because every group you add changes where the next one goes." },
      { heading: "Put the director on first", body: "Put the group that directs where you need on first. For 1-bromo-3-nitrobenzene: nitrate, then brominate.", draw: [{ beat: "u3-seq-mbr" }] },
      { heading: "Use a flip", body: "Nitrate while the group on the ring points where you need it. For 4-nitrobenzoic acid: nitrate, then KMnO4. CH3 sends the nitro group para; KMnO4 then turns CH3 into COOH.", draw: [{ beat: "u3-seq-pnba" }] },
      { heading: "Friedel-Crafts before a withdrawer", body: "Do the Friedel-Crafts step before any strong withdrawer goes on. Acylate, then nitrate.", draw: [{ beat: "u3-seq-acyl-first" }] },
    ],
  },
  "u2-nomen": {
    minutes: 2,
    uses: ["u2:donor-withdrawer"],
    cards: [
      { heading: "Why position has names", body: "A second group can land in more than one kind of place on a ring, and the places react differently. Ortho, meta and para let one word say which place you mean, so you can talk about a reaction before you draw it." },
      { heading: "Donors make o and p matter", body: "A donor like OCH3 or OH puts negative charge on the ortho and para carbons. That is why o and p are the positions that matter.", draw: [{ beat: "u2-nom-res-donor" }] },
      { heading: "Count the ring bonds", body: "Count the ring bonds between the two groups: one is ortho, two is meta, three is para.", draw: [{ beat: "u2-nom-meta" }] },
      { heading: "Common parents", body: "COOH on benzene is benzoic acid. Read what sits on the carbonyl carbon: H, CH3 or OH.", draw: [{ beat: "u2-nom-benzoic" }] },
      { heading: "Phenyl and benzyl", body: "Phenyl is the ring itself as a branch, C6H5. Benzyl is the ring plus one CH2, C6H5CH2.", draw: [{ beat: "u2-nom-benzyl" }] },
      { heading: "Take this with you", body: "Use o, m or p only when two groups are on the ring. With three or more, give each group a number.", draw: [{ beat: "u2-nom-why-numbers" }] },
    ],
  },
  "u2-nomen-priority": {
    minutes: 2,
    uses: ["u2:opm"],
    cards: [
      { heading: "Why a rule is needed", body: "Ortho, meta and para stop working at three groups. Then every chemist needs the same answer to two questions: which group names the compound, and where does the numbering start." },
      { heading: "Rank the groups", body: "The highest group takes the suffix. Acid, then ester, amide, nitrile, aldehyde, ketone, alcohol, amine. The rest become prefixes.", draw: [{ beat: "u2t-np-acid" }] },
      { heading: "The top group is carbon 1", body: "The group with the suffix is carbon 1. Then go whichever way round gives the lowest set of locants to the rest: 2,4 beats 4,6.", draw: [{ beat: "u2t-np-locants" }] },
      { heading: "Break a tie alphabetically", body: "Lowest locants first. If they tie, the group that comes first alphabetically gets the lower number.", draw: [{ beat: "u2t-np-alpha" }] },
      { heading: "Take this with you", body: "Rank, number from the top group, take the lowest set, then break any tie alphabetically. Nitro and halogens are only ever prefixes." },
    ],
  },
  "u3-benzylic-br": {
    minutes: 2,
    uses: ["u3:halogenation", "u1:allylic-halogenation"],
    cards: [
      { heading: "Same element, other place", body: "Ring bromination and side-chain bromination both put Br on a molecule, but the conditions choose the place. Light with NBS goes after the side chain, for the same reason an allylic C-H reacts in Unit 1." },
      { heading: "The benzylic carbon", body: "NBS and light brominate the benzylic carbon: the sp3 carbon bonded to the ring, whose radical the ring stabilises.", draw: [{ beat: "u3-bbr-meet" }] },
      { heading: "A longer chain", body: "In propylbenzene the Br still goes on the carbon bonded to the ring, because that is the one whose radical the ring can share.", draw: [{ beat: "u3-bbr-propyl" }] },
      { heading: "No benzylic H, no reaction", body: "No benzylic H, no benzylic bromination. tert-Butylbenzene has nothing for the radical to take.", draw: [{ beat: "u3-bbr-tbu" }] },
      { heading: "Take this with you", body: "Find the carbon bonded to the ring and count its H. One or more and Br goes there; none and nothing happens." },
    ],
  },
  "u3-birch": {
    minutes: 2,
    uses: ["u3:directing", "u2:donor-withdrawer"],
    cards: [
      { heading: "The one that gives up the ring", body: "Every reaction so far kept the ring aromatic. Birch reduction adds H and gives the ring up on purpose, and the donor and withdrawer ideas you already know decide where the H goes." },
      { heading: "Two para carbons pick up H", body: "Birch reduction adds H to two para carbons and leaves a nonconjugated 1,4-diene.", draw: [{ beat: "u3-bir-meet" }] },
      { heading: "A donor stays on a C=C", body: "With a donor such as OCH3, the ring carbon holding the donor stays on a C=C. The two carbons that take H are the ones away from it.", draw: [{ beat: "u3-bir-anisole" }] },
      { heading: "A withdrawer takes the H", body: "A withdrawer's ring carbon is the one that picks up H, so the COOH sits on an sp3 carbon in the product.", draw: [{ beat: "u3-bir-acid" }] },
      { heading: "Not aromatic any more", body: "The Birch product has isolated C=C bonds and no aromaticity.", draw: [{ beat: "u3-bir-conj" }] },
    ],
  },
};

const step = (title: string, text: string, source: string, quote: string): WalkStep => ({ title, text, source, quote });

export const U23_WALKTHROUGHS: Readonly<Record<string, readonly WalkStep[]>> = {
  "u2-nomen": [
    step("See why position has names", "Donors and acceptors treat the three positions differently, so each position gets a name.", "u2-nom-res-donor", "That is why o and p are the positions that matter."),
    step("Count the bonds between groups", "Count along the ring from one group to the other.", "u2-nom-meta", "Count the ring bonds between the two groups: one is ortho, two is meta, three is para."),
    step("Switch to numbers", "From three groups on, o, m and p no longer say enough.", "u2-nom-why-numbers", "With three or more, give each group a number."),
  ],
  "u2-nomen-priority": [
    step("Rank the groups", "Find the group highest on the list. It sets the suffix and the rest become prefixes.", "u2t-np-acid", "the highest takes the suffix"),
    step("Fix carbon 1 and go round", "Start at the suffix group, then pick the direction that gives the lowest set of numbers.", "u2t-np-locants", "The group with the suffix is carbon 1."),
    step("Break a tie by alphabet", "Only when both directions give the same set does the alphabet decide.", "u2t-np-alpha", "the group that comes first alphabetically gets the lower number"),
  ],
  "u2-induction": [
    step("Find the electronegative atom", "Ask which atom holds the shared pair closer. That atom pulls along the sigma bonds.", "u2t-ind-meet-bond", "Induction is that pull passed along a chain of sigma bonds"),
    step("Measure the distance", "Count the bonds between the atom and the acid group. Fewer bonds means a stronger effect.", "u2t-ind-distance", "The closer the Cl is to the acid group, the stronger the acid"),
    step("Count the atoms", "More electronegative atoms at the same distance pull harder together.", "u2t-ind-count", "each extra electronegative atom adds to the pull"),
  ],
  "u2-energy": [
    step("Compare Keq with the window", "Read the size of Keq or the energy gap, then ask whether it sits inside 10 to the minus 7 to 10 to the 7.", "u2e-meet-window", "so the step runs both ways"),
    step("Spot the dead end", "A branch with no way on is only a detour. The reaction comes back.", "u2e-meet-deadend", "A reversible step can lead to a dead end"),
    step("Find the one way door", "Look for the first step that falls past the window and follow it down.", "u2e-first-door", "the reaction follows that path down the energy graph"),
    step("Pick the product", "Say whether the steps can be undone, then choose the hump or the well.", "u2e-kinetic-cold", "Cold and irreversible: the product over the lower hump (kinetic) wins."),
  ],
  "u2-keq-pka": [
    step("Read the pKa values", "Higher pKa is the weaker acid. Write both values down before choosing a side.", "u2t-keq-meet-weaker", "A higher pKa means a weaker acid"),
    step("Name the acid you would form", "Look at the acid on the product side. The equilibrium rests on the weaker acid.", "u2t-keq-ethoxide-phenol", "The acid formed is the weaker one"),
    step("Size the gap", "Subtract the two pKa values. Each unit of gap is a factor of ten in Keq.", "u2t-keq-size-phenol", "Keq is ten to the power of the pKa gap"),
    step("Check the base against the acid", "A base wins only when its conjugate acid is weaker than the acid it meets.", "u2t-keq-alkyne-base", "A base wins when its conjugate acid is weaker than the acid it meets"),
  ],
  "u2-resonance": [
    step("Move only electrons", "Resonance forms differ only in the pi electrons. The real molecule is the blend.", "u2t-res-meet-lengths", "Resonance forms differ only in where the pi electrons are drawn"),
    step("Follow the charge round", "A charge beside a pi system runs to every carbon the p orbitals reach.", "u2t-res-meet-cp", "In a ring of five p orbitals it runs all the way round"),
    step("Link it to acidity", "Compare the conjugate bases. The one that spreads its charge further is steadier, so its acid is stronger.", "u2t-res-cp-acid", "Acidity follows the conjugate base"),
  ],
  "u2-huckel": [
    step("Run the gate", "Cyclic, a p orbital on every ring atom, then planar. One sp3 atom stops the process.", "u2-huckel-meet-gate", "One sp3 carbon breaks the loop, so the ring is nonaromatic."),
    step("Count the pi electrons", "Each ring atom in a double bond gives one electron from its p orbital.", "u2-huckel-meet-count", "Each carbon gives one electron from its p orbital."),
    step("Read n", "Take 2 off and divide by 4. A whole n means aromatic; a flat ring with 4n is antiaromatic.", "u2-huckel-cbd", "A flat ring with 4n pi electrons is antiaromatic."),
  ],
  "u2-charged": [
    step("Count the charged atom", "A lone pair in a p orbital counts 2. An empty p orbital counts 0.", "u2-chg-meet-cation", "An empty p orbital counts 0 electrons but keeps the ring of p orbitals unbroken."),
    step("Run the count", "Add the C=C electrons to the charged atom's share, then take 2 off and divide by 4.", "u2-chg-cp-anion", "The anion's lone pair joins the ring: 6 pi electrons, aromatic."),
    step("Use it on acidity", "Judge the conjugate base. An aromatic base means a stronger acid.", "u2-chg-acid-pick", "Acidity is argued on the conjugate base: the more stable the base, the stronger the acid."),
  ],
  "u2-annulene": [
    step("Count from ring size", "In an annulene each carbon is in one C=C, so the pi count is the ring size.", "u2-ann-meet-size", "An annulene alternates C=C all the way round, so its pi count is its ring size"),
    step("Ask if it can stay flat", "A 4n ring that can bend, bends. Then the p orbitals no longer overlap round the ring.", "u2-ann-cot", "COT would be antiaromatic if flat, so it bends into a tub."),
    step("Check inner crowding", "A good count is not enough if inner atoms force a twist.", "u2-ann-10", "[10]Annulene has the right count but cannot lie flat because of its inner H atoms, so it is nonaromatic."),
  ],
  "u2-hetero": [
    step("Look for a ring double bond", "Ask whether the heteroatom is already in a ring double bond.", "u2-het-meet-contrast", "The rule is one question: does the N already have a ring double bond."),
    step("Place the lone pair", "With a ring double bond, the pair sits in the plane. Without one, it goes into the ring.", "u2-het-pyridine-pair", "Pyridine's N is in a C=N bond, so its pair sits in an sp2 orbital in the plane."),
    step("Predict the base", "A pair outside the pi system is free to take a proton.", "u2-het-protonate", "Pyridine is a base because its pair is outside the pi system."),
  ],
  "u2-ewg-edg": [
    step("Look for a lone pair on the first atom", "A lone pair next to the ring can donate into it by resonance.", "u2t-ewg-meet-anisole", "A lone pair next to a ring can donate into it by resonance."),
    step("Look for a pull through the pi system", "A group that pulls through the pi system leaves ortho and para electron poor.", "u2t-ewg-meet-nitro", "A group that pulls through the pi system withdraws by resonance"),
    step("Decide the rate", "A donor speeds an electrophile's attack and a withdrawer slows it.", "u2t-ewg-eas", "A donor raises the ring's density and speeds the reaction, and a withdrawer lowers it and slows it."),
  ],
  "u2-nmr": [
    step("Classify the ring first", "Only an aromatic ring has a ring current.", "u2-nmr-thiophene", "Classify the ring first, then read the band."),
    step("Read outside the ring", "H outside an aromatic ring are deshielded and appear downfield.", "u2-nmr-meet-downfield", "Aromatic H, about 6.5 to 8 ppm, sit downfield of vinylic H"),
    step("Read inside the ring", "H inside the ring are shielded and can fall below 0 ppm.", "u2-nmr-meet-inner", "The ring current deshields H outside an aromatic ring and shields H inside it."),
  ],
  "u3-arenium": [
    step("Attack and make sp3", "The attacked carbon goes sp3 and the ring is no longer aromatic.", "u3-aren-sp3", "The attacked carbon goes sp3."),
    step("Spread the cation", "The + sits on the two ortho carbons and the para carbon, never the sp3 carbon.", "u3-aren-count", "The sp3 carbon never carries it."),
    step("Lose H+", "A base takes H+ off the sp3 carbon and the ring is aromatic again.", "u3-aren-rearom", "A base takes the H+ off the sp3 carbon and the ring is aromatic again."),
  ],
  "u3-directing": [
    step("Draw the three attacks", "Compare ortho, meta and para attack and count the forms of each cation.", "u3-aren-anisole", "More forms, more stable cation, faster attack."),
    step("Look at the first atom", "A lone pair on the atom bonded to the ring makes the group an o/p director.", "u3-dir-acetanilide", "The amide N has a lone pair on the first atom"),
    step("Handle the exception", "Halogens deactivate the ring but still direct o/p.", "u3-dir-bromo", "induction sets the rate, the lone pair sets the position"),
  ],
  "u3-halo": [
    step("Match the halogen and the acid", "Use the Lewis acid of the same halogen.", "u3-halo-cl", "The Lewis acid carries the same halogen so it cannot scramble the product."),
    step("Apply the director", "An o/p director sends the halogen ortho and para.", "u3-halo-anisole", "OMe is an o/p director"),
  ],
  "u3-nitration": [
    step("Name the electrophile", "The acid mixture makes the nitronium ion, which is what attacks.", "u3-nit-electrophile", "The nitronium ion, NO2+, is the electrophile."),
    step("Expect one nitro group", "The product is less reactive than benzene, so the reaction stops.", "u3-nit-stop", "A nitro group is a deactivator"),
    step("Send the next group meta", "A second group goes meta to the first nitro.", "u3-nit-second", "The first nitro group directs the second one meta"),
  ],
  "u3-sulfo": [
    step("Add SO3H", "Sulfonation forms a C-S bond and replaces one ring H.", "u3-sul-meet", "Sulfonation puts SO3H on the ring, through a new C-S bond"),
    step("Reverse it with hot dilute acid", "Plenty of water and heat take the SO3H back off.", "u3-sul-reverse", "Desulfonation: hot dilute acid takes the SO3H off and puts H back."),
  ],
  "u3-fc-alkyl": [
    step("Predict the cation first", "Rank the cation, then see if a shift makes it more stable before the ring bonds.", "u3-alk-propyl", "The cation from 1-chloropropane ends up secondary (shift: hydride)"),
    step("Expect more than one alkyl group", "The product is more reactive than benzene, so it alkylates again.", "u3-alk-poly", "Each alkyl group activates the ring, so the product outcompetes benzene: polyalkylation."),
    step("Check the ring", "A strong withdrawer on the ring stops the reaction.", "u3-alk-fails", "Friedel-Crafts fails on rings carrying a strong withdrawer such as NO2."),
  ],
  "u3-fc-acyl": [
    step("Use the acylium ion", "The electrophile cannot rearrange, so the chain arrives straight.", "u3-acyl-ion", "Its resonance form with C triple bond O+ is why it never rearranges."),
    step("Expect one ketone", "The product ring is deactivated, so it stops after one.", "u3-acyl-once", "The aryl ketone is a deactivated ring, so acylation stops at one."),
  ],
  "u3-blocking": [
    step("Choose a group that comes off", "Sulfonation is reversible, so SO3H can be removed at the end.", "u3-blk-why-so3h", "A blocking group must come off at the end."),
    step("Let the director do the rest", "With para blocked, the o/p director sends the electrophile ortho.", "u3-blk-step2", "With para blocked, CH3 steers bromine ortho"),
    step("Remove the blocker", "Hot dilute acid takes off only the SO3H, which leaves the ortho product.", "u3-blk-step3", "Removing the blocker leaves 2-bromotoluene"),
  ],
  "u3-nitro-red": [
    step("Reduce each nitro", "Every NO2 becomes NH2 and nothing else on the ring changes.", "u3-nred-mnt", "Nitro reduction turns each ArNO2 into ArNH2"),
    step("Note the flip", "The ring goes from a meta deactivator to an o/p activator.", "u3-nred-flip", "Reducing NO2 to NH2 flips the ring from a meta deactivator to an o/p activator."),
  ],
  "u3-c-to-ch2": [
    step("Reduce the carbonyl", "The C=O becomes CH2 and the chain stays straight.", "u3-ch2-meet", "Clemmensen (or Wolff-Kishner) turns the aryl ketone's C=O into CH2"),
    step("Choose acylate then reduce", "The acyl group goes on straight, so the result is not rearranged.", "u3-ch2-why", "Acylate then reduce: the acyl group goes on straight and C=O becomes CH2."),
  ],
  "u3-benzylic-ox": [
    step("Find the benzylic H", "Look at the carbon bonded to the ring. It needs at least one H.", "u3-box-tbu-alone", "No benzylic H, no reaction."),
    step("Cut back to COOH", "The whole chain is cut back to one carbon.", "u3-box-ethyl", "Every side chain with a benzylic H is cut back to COOH"),
    step("Note the flip", "A CH3 that was o/p becomes a COOH that is meta.", "u3-box-flip", "Oxidising CH3 to COOH flips o/p to meta."),
  ],
  "u3-sequencing": [
    step("Start from the director you need", "Put the group that directs where you need on first.", "u3-seq-mbr", "Put the group that directs where you need on first."),
    step("Use a flip when it helps", "Nitrate while the group on the ring points where you need it, then convert it.", "u3-seq-pnba", "Nitrate while the group on the ring points where you need it."),
    step("Do Friedel-Crafts early", "Do it before any strong withdrawer goes on.", "u3-seq-acyl-first", "Do the Friedel-Crafts step before any strong withdrawer goes on."),
  ],
  "u3-benzylic-br": [
    step("Find the benzylic carbon", "It is the sp3 carbon bonded to the ring.", "u3-bbr-meet", "the sp3 carbon bonded to the ring, whose radical the ring stabilises"),
    step("Check for a benzylic H", "With none, nothing reacts.", "u3-bbr-tbu", "No benzylic H, no benzylic bromination."),
  ],
  "u3-birch": [
    step("Add H to two para carbons", "The two para carbons pick up H and go sp3.", "u3-bir-meet", "Birch reduction adds H to two para carbons and leaves a nonconjugated 1,4-diene."),
    step("Remember it is not aromatic", "Two sp3 carbons sit between the C=C bonds.", "u3-bir-conj", "The Birch product has isolated C=C bonds and no aromaticity."),
  ],
};

const slot = (minutes: number, shows: readonly string[]): VideoSlot => ({ minutes, status: "not-filmed", shows });

/** The video lessons' slots. Nothing is filmed; the read-along cards are the script. */
export const U23_VIDEO_SLOTS: Readonly<Record<string, VideoSlot>> = {
  "u2-induction": slot(2, ["A polar bond with the pair pulled to one end", "The same pull one, two, three bonds away", "More atoms pulling at once"]),
  "u2-keq-pka": slot(2, ["Two pKa values side by side", "The proton moving to the weaker acid's side", "The gap counted off in factors of ten", "A base that wins and one that does not"]),
  "u2-energy": slot(3, ["A step with Keq inside the window", "A dead end and a one way door on one diagram", "Two products over a low hump and a high one"]),
  "u2-resonance": slot(2, ["Benzene's two drawings blending into one", "A charge running round a five-carbon ring", "Two conjugate bases compared"]),
  "u2-huckel": slot(3, ["The gate run on a ring, atom by atom", "Counting pi electrons carbon by carbon", "Aromatic and antiaromatic rings side by side"]),
  "u2-charged": slot(2, ["Cyclopentadiene losing H+", "Tropylium's empty p orbital", "Ranking three cations by ring class"]),
  "u2-annulene": slot(2, ["An 18-membered ring staying flat", "COT folding into a tub", "[10]Annulene's inner H clashing"]),
  "u2-hetero": slot(2, ["Pyridine and pyrrole drawn together", "Where each lone pair sits", "Which one takes a proton"]),
  "u2-ewg-edg": slot(3, ["A lone pair donating into a ring", "A withdrawer leaving ortho and para poor", "The halogen compromise"]),
  "u2-nmr": slot(2, ["A ring current round a flat ring", "Outside H and inside H on one spectrum", "A nonaromatic tub for contrast"]),
  "u3-arenium": slot(3, ["The electrophile met by the pi cloud", "The cation spread over three carbons", "H+ leaving and the ring closing again"]),
  "u3-directing": slot(3, ["Ortho, meta and para attack compared", "A donor's extra resonance form", "A withdrawer's best attack"]),
  "u3-halo": slot(2, ["The Lewis acid making the electrophile", "The three arenium moves", "A directed product"]),
  "u3-nitration": slot(2, ["The nitronium ion forming", "Attack and loss of H+", "A second nitration going meta"]),
  "u3-sulfo": slot(2, ["SO3 adding to the ring", "Hot dilute acid running it backwards", "Why that matters later"]),
  "u3-fc-alkyl": slot(3, ["A primary cation shifting", "A product that reacts again", "A ring that refuses"]),
  "u3-fc-acyl": slot(2, ["The acylium ion", "A straight chain arriving", "One ketone and stop"]),
  "u3-blocking": slot(2, ["SO3H taking the para seat", "The electrophile forced ortho", "The blocker removed"]),
  "u3-nitro-red": slot(2, ["NO2 becoming NH2", "The ring's director flipping", "Where this leads"]),
  "u3-c-to-ch2": slot(2, ["C=O becoming CH2", "Acylate then reduce against direct alkylation", "The director flipping"]),
  "u3-benzylic-ox": slot(2, ["KMnO4 meeting a benzylic H", "A chain cut back to COOH", "A tert-butyl group that survives"]),
  "u3-sequencing": slot(3, ["A target and the group that must go first", "A flip used on purpose", "A Friedel-Crafts step placed early"]),
  "u2-nomen": slot(2, ["Two groups on a ring and the three positions between them", "A donor's charge landing on o and p", "A third group forcing numbers"]),
  "u2-nomen-priority": slot(2, ["A ring with three groups and no obvious parent", "The ranking list and the top group taking the suffix", "Two numberings compared, then a tie broken"]),
  "u3-benzylic-br": slot(2, ["NBS and light meeting a side chain", "The ring sharing a benzylic radical", "tert-Butylbenzene with no H to give"]),
  "u3-birch": slot(2, ["Na in liquid ammonia meeting a ring", "A donor's carbon staying on a C=C", "A product that is no longer aromatic"]),
};
