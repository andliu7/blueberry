/**
 * The rules behind ShellAtom.tsx, kept free of React so the test can reach
 * them: how many electrons sit in each shell, which shell is the valence
 * shell, how many electrons an atom owns in a molecule, and its formal charge.
 *
 * THE SHELL RULE. Subshells fill in the usual order (lowest n + l first, then
 * lowest n: 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p), each holding 2(2l + 1), and a
 * shell's count is the sum of its subshells. That gives 2, 8, 8 for argon,
 * 2, 8, 8, 1 for potassium and 2, 8, 18, 7 for bromine without a special case.
 * It is only claimed for the elements in SHELL_SYMBOLS: Z 1 to 20 and the two
 * heavier halogens the course uses. Transition metals break the simple
 * "last shell is the valence shell" reading, so they are refused, not guessed.
 * src/game/test/shellAtom.test.ts checks every supported element's last shell
 * against RDKit's periodic table (GetNOuterElecs, in shellModel.generated.ts).
 *
 * This is a shell model: real electrons sit in orbitals, and Unit 1 uses
 * orbitals. The card says so.
 */

/** Element symbols by atomic number, for every element the rule supports. */
export const SHELL_SYMBOLS: Readonly<Record<number, string>> = {
  1: "H", 2: "He", 3: "Li", 4: "Be", 5: "B", 6: "C", 7: "N", 8: "O", 9: "F", 10: "Ne",
  11: "Na", 12: "Mg", 13: "Al", 14: "Si", 15: "P", 16: "S", 17: "Cl", 18: "Ar", 19: "K", 20: "Ca",
  35: "Br", 53: "I",
};

export const SUPPORTED_Z: readonly number[] = Object.keys(SHELL_SYMBOLS).map(Number);

/** Subshells (n, l) in filling order, far enough for iodine. */
const FILL_ORDER: readonly (readonly [number, number])[] = (() => {
  const out: [number, number][] = [];
  for (let n = 1; n <= 6; n++) for (let l = 0; l < n && l <= 3; l++) out.push([n, l]);
  // Lowest n + l first, ties to the lower n.
  return out.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
})();

/** Electrons per shell, innermost first. Throws for an element the rule does not claim. */
export function shellCounts(z: number): readonly number[] {
  if (SHELL_SYMBOLS[z] === undefined) throw new Error(`shellCounts: Z = ${z} is not a supported element`);
  const shells: number[] = [];
  let left = z;
  for (const [n, l] of FILL_ORDER) {
    if (left === 0) break;
    const put = Math.min(left, 2 * (2 * l + 1));
    shells[n - 1] = (shells[n - 1] ?? 0) + put;
    left -= put;
  }
  return shells.map((count) => count ?? 0);
}

/** Electrons in the outermost shell: the valence electrons a neutral atom brings. */
export function valenceElectrons(z: number): number {
  const shells = shellCounts(z);
  return shells[shells.length - 1]!;
}

/** One bond from the atom: who to, and single, double or triple. */
export interface AtomBond {
  readonly to: string;
  readonly order: number;
}

/** The atom in a molecule: its bonds and its lone pairs. */
export interface AtomBonding {
  readonly bonds: readonly AtomBond[];
  readonly lonePairs: number;
}

/** Electrons the atom owns: one of each bonding pair, both of each lone pair. */
export function ownedElectrons(bonding: AtomBonding): number {
  return bonding.bonds.reduce((sum, bond) => sum + bond.order, 0) + 2 * bonding.lonePairs;
}

/** Formal charge: valence electrons brought minus electrons owned. */
export function formalCharge(z: number, bonding: AtomBonding): number {
  return valenceElectrons(z) - ownedElectrons(bonding);
}

/** +1, -1, 0: the way a chemist writes a charge. */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0";
}

export type ElectronRole = "core" | "valence" | "bond" | "lone";

/** One electron to draw: which shell, what it is doing, and where it sits on the ring. */
export interface PlacedElectron {
  readonly id: string;
  /** 1 is the innermost shell. */
  readonly shell: number;
  readonly role: ElectronRole;
  /** Degrees clockwise from the top of the ring. */
  readonly angle: number;
  /** For a bond electron: the partner and the bond order. */
  readonly partner?: string;
  readonly order?: number;
}

/** A bond drawn outward from the valence ring, at the middle angle of its electrons. */
export interface PlacedBond {
  readonly id: string;
  readonly to: string;
  readonly order: number;
  readonly angle: number;
}

/** Degrees between two electrons drawn as one group (a pair, or a double bond's two). */
export const GROUP_SPREAD = 18;

/**
 * Where every electron goes. Core shells are spread evenly. The valence shell
 * is the neutral atom's Lewis dots (one on each of four sides before any pair)
 * with no bonding given, or, with bonding given, the electrons the atom owns:
 * one group per bond and one per lone pair, spread evenly around the ring.
 */
export function placeElectrons(z: number, bonding?: AtomBonding): { electrons: PlacedElectron[]; bonds: PlacedBond[] } {
  const shells = shellCounts(z);
  const last = shells.length;
  const electrons: PlacedElectron[] = [];
  const bonds: PlacedBond[] = [];
  shells.slice(0, -1).forEach((count, i) => {
    // Offset each ring a little so the core electrons do not line up in a spoke.
    for (let k = 0; k < count; k++) electrons.push({ id: `s${i + 1}e${k}`, shell: i + 1, role: "core", angle: (i * 23 + (k * 360) / count) % 360 });
  });
  if (bonding === undefined) {
    const v = shells[last - 1]!;
    if (last === 1) {
      // H and He: one ring of capacity two, so one dot, or a pair.
      const k = v;
      for (let j = 0; j < k; j++) electrons.push({ id: `s1e${j}`, shell: 1, role: "valence", angle: (j - (k - 1) / 2) * GROUP_SPREAD });
      return { electrons, bonds };
    }
    const sites = [0, 0, 0, 0];
    for (let j = 0; j < v; j++) sites[j % 4]! += 1;
    let n = 0;
    sites.forEach((k, s) => {
      for (let j = 0; j < k; j++) electrons.push({ id: `s${last}e${n++}`, shell: last, role: "valence", angle: s * 90 + (j - (k - 1) / 2) * GROUP_SPREAD });
    });
    return { electrons, bonds };
  }
  const groups = bonding.bonds.length + bonding.lonePairs;
  let n = 0;
  for (let g = 0; g < groups; g++) {
    const centre = (g * 360) / Math.max(1, groups);
    const bond = bonding.bonds[g];
    const k = bond === undefined ? 2 : bond.order;
    for (let j = 0; j < k; j++) {
      const angle = centre + (j - (k - 1) / 2) * GROUP_SPREAD;
      electrons.push(
        bond === undefined
          ? { id: `s${last}e${n++}`, shell: last, role: "lone", angle }
          : { id: `s${last}e${n++}`, shell: last, role: "bond", angle, partner: bond.to, order: bond.order },
      );
    }
    if (bond !== undefined) bonds.push({ id: `b${g}`, to: bond.to, order: bond.order, angle: centre });
  }
  return { electrons, bonds };
}

const BOND_WORD: Readonly<Record<number, string>> = { 1: "a bond", 2: "a double bond", 3: "a triple bond" };

/** The card's lines for one electron. */
export function describeElectron(symbol: string, e: PlacedElectron): { heading: string; body: string } {
  const where = `Shell ${e.shell}`;
  if (e.role === "core") {
    return { heading: `${where}, core`, body: `A core electron. It sits close to the nucleus and takes no part in bonding.` };
  }
  if (e.role === "valence") {
    return { heading: `${where}, valence`, body: `A valence electron, in the outer shell. Valence electrons are the ones that make bonds.` };
  }
  if (e.role === "lone") {
    return { heading: `${where}, valence`, body: `Part of a lone pair. ${symbol} keeps both electrons of the pair, so it owns both.` };
  }
  const order = e.order ?? 1;
  const share = order === 1 ? `the pair is shared, so ${symbol} counts this one as its own` : `the bond shares ${2 * order} electrons, and ${symbol} counts ${order} of them as its own`;
  return { heading: `${where}, valence`, body: `In ${BOND_WORD[order] ?? "a bond"} to ${e.partner ?? "a neighbour"}: ${share}.` };
}

/** The formal charge line in two parts, so the sum can be kept on one line. */
export function formalChargeParts(z: number, bonding: AtomBonding): { lead: string; sum: string } {
  const symbol = SHELL_SYMBOLS[z] ?? "";
  const brought = valenceElectrons(z);
  const owned = ownedElectrons(bonding);
  return { lead: `${symbol} brought ${brought} and owns ${owned}:`, sum: `formal charge ${brought} − ${owned} = ${signed(brought - owned)}.` };
}

/** The formal charge line, worked out in full. */
export function formalChargeLine(z: number, bonding: AtomBonding): string {
  const { lead, sum } = formalChargeParts(z, bonding);
  return `${lead} ${sum}`;
}

/**
 * The legend under the drawing. Free atom: its shell counts, which is what is
 * drawn. In a molecule the valence ring shows the electrons the atom owns, not
 * the free atom's, so the legend gives both: the free counts (what it brought)
 * and the counts drawn here (core shells, then owned). `drawn` is per ring,
 * innermost first, and always equals the dots placeElectrons puts on each ring.
 */
export function shellLegend(z: number, bonding?: AtomBonding): { free: readonly number[]; drawn: readonly number[]; text: string } {
  const free = shellCounts(z);
  if (bonding === undefined) return { free, drawn: free, text: `Shells: ${free.join(", ")}` };
  const symbol = SHELL_SYMBOLS[z] ?? "";
  const owned = ownedElectrons(bonding);
  const drawn = [...free.slice(0, -1), owned];
  const inBonds = 2 * bonding.bonds.reduce((sum, bond) => sum + bond.order, 0);
  const lone = 2 * bonding.lonePairs;
  const parts = [inBonds > 0 ? `${inBonds} in bonds, counted half each` : "", lone > 0 ? `${lone} in lone pairs` : ""].filter(Boolean).join(", plus ");
  return { free, drawn, text: `Free ${symbol}: ${free.join(", ")} · here ${symbol} owns ${owned} (${parts})` };
}
