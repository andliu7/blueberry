/**
 * Plain-words primers for what Unit 1 assumes from earlier chemistry
 * ("u0:" concepts in lessonLinks.ts), for students who arrive without the
 * full background. Prose only, no structures, no numbers, nothing that
 * needs a drawing: each says what the idea is and how the lesson uses it.
 * Entry-chunk safe. Drafts until the owner signs them off.
 */
export interface Primer {
  readonly title: string;
  readonly text: string;
}

export const U0_PRIMERS: Readonly<Record<string, Primer>> = {
  "u0:resonance": {
    title: "Resonance and curved arrows",
    text: "Some molecules cannot be drawn correctly with one structure, so you draw two or more and the real molecule is a blend of them. Only electrons move between the drawings; every atom stays where it is. A curved arrow starts where the electrons are, a bond or a lone pair, and points to where they go.",
  },
  "u0:carbocation": {
    title: "What a carbocation is",
    text: "A carbocation is a carbon with a positive charge and only three bonds, so it is short of electrons. Anything that shares electrons with it makes it more stable: more carbon groups on it, or a neighbouring double bond. The more it is shared, the more stable it is.",
  },
  "u0:hx-addition": {
    title: "HX adding across a C=C",
    text: "A molecule like HBr adds across a double bond in two steps. The double bond's electrons take the H first, which leaves a carbocation on the other carbon. Then the halide bonds to that carbocation. The carbocation formed in the first step decides where everything ends up.",
  },
  "u0:orbitals": {
    title: "Orbitals and the pi bond",
    text: "A p orbital has two lobes of opposite sign. A pi bond forms when p orbitals on neighbouring atoms overlap side by side. Lobes of the same sign overlap and bond; lobes of opposite sign cancel. Later lessons use this to explain why some molecules react together.",
  },
  "u0:radical": {
    title: "Radicals and the chain idea",
    text: "A radical has one unpaired electron. Radical reactions run as a chain: a radical takes something from a molecule, which leaves a new radical, and that one repeats the step. A single-headed arrow moves one electron, where a double-headed arrow moves a pair.",
  },
};
