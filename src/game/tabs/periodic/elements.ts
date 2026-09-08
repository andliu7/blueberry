/**
 * The 118 elements, as data. Authored here from standard reference values
 * (IUPAC 2021 standard atomic weights, abridged to the usual four or five
 * significant figures; Pauling electronegativities; ground state
 * configurations in noble gas shorthand). Masses in square brackets in the
 * sources, for elements with no stable isotope, are given as the mass number
 * of the longest lived isotope and flagged with `massIsNominal`.
 *
 * Categories follow the ptable.com grouping, which is the bar for this tab:
 * alkali metal, alkaline earth, transition metal, post transition metal,
 * metalloid, reactive nonmetal, noble gas, lanthanide, actinide.
 *
 * The table is a tuple array rather than objects so it reads as a table and
 * weighs a third as much in the chunk. `ELEMENTS` expands it once at import.
 */

export type Category =
  | "alkali"
  | "alkaline"
  | "transition"
  | "post_transition"
  | "metalloid"
  | "nonmetal"
  | "noble"
  | "lanthanide"
  | "actinide";

export type Block = "s" | "p" | "d" | "f";
export type Phase = "solid" | "liquid" | "gas" | "unknown";

export interface Element {
  readonly number: number;
  readonly symbol: string;
  readonly name: string;
  readonly mass: number;
  readonly massIsNominal: boolean;
  readonly category: Category;
  readonly group: number | null;
  readonly period: number;
  readonly block: Block;
  readonly electronegativity: number | null;
  readonly configuration: string;
  readonly phase: Phase;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  alkali: "Alkali metal",
  alkaline: "Alkaline earth metal",
  transition: "Transition metal",
  post_transition: "Post-transition metal",
  metalloid: "Metalloid",
  nonmetal: "Reactive nonmetal",
  noble: "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
};

// number, symbol, name, mass, nominal?, category, group, period, block, EN, configuration, phase
type Row = readonly [number, string, string, number, 0 | 1, Category, number | null, number, Block, number | null, string, Phase];

const ROWS: readonly Row[] = [
  [1, "H", "Hydrogen", 1.008, 0, "nonmetal", 1, 1, "s", 2.2, "1s1", "gas"],
  [2, "He", "Helium", 4.0026, 0, "noble", 18, 1, "s", null, "1s2", "gas"],
  [3, "Li", "Lithium", 6.94, 0, "alkali", 1, 2, "s", 0.98, "[He] 2s1", "solid"],
  [4, "Be", "Beryllium", 9.0122, 0, "alkaline", 2, 2, "s", 1.57, "[He] 2s2", "solid"],
  [5, "B", "Boron", 10.81, 0, "metalloid", 13, 2, "p", 2.04, "[He] 2s2 2p1", "solid"],
  [6, "C", "Carbon", 12.011, 0, "nonmetal", 14, 2, "p", 2.55, "[He] 2s2 2p2", "solid"],
  [7, "N", "Nitrogen", 14.007, 0, "nonmetal", 15, 2, "p", 3.04, "[He] 2s2 2p3", "gas"],
  [8, "O", "Oxygen", 15.999, 0, "nonmetal", 16, 2, "p", 3.44, "[He] 2s2 2p4", "gas"],
  [9, "F", "Fluorine", 18.998, 0, "nonmetal", 17, 2, "p", 3.98, "[He] 2s2 2p5", "gas"],
  [10, "Ne", "Neon", 20.18, 0, "noble", 18, 2, "p", null, "[He] 2s2 2p6", "gas"],
  [11, "Na", "Sodium", 22.99, 0, "alkali", 1, 3, "s", 0.93, "[Ne] 3s1", "solid"],
  [12, "Mg", "Magnesium", 24.305, 0, "alkaline", 2, 3, "s", 1.31, "[Ne] 3s2", "solid"],
  [13, "Al", "Aluminium", 26.982, 0, "post_transition", 13, 3, "p", 1.61, "[Ne] 3s2 3p1", "solid"],
  [14, "Si", "Silicon", 28.085, 0, "metalloid", 14, 3, "p", 1.9, "[Ne] 3s2 3p2", "solid"],
  [15, "P", "Phosphorus", 30.974, 0, "nonmetal", 15, 3, "p", 2.19, "[Ne] 3s2 3p3", "solid"],
  [16, "S", "Sulfur", 32.06, 0, "nonmetal", 16, 3, "p", 2.58, "[Ne] 3s2 3p4", "solid"],
  [17, "Cl", "Chlorine", 35.45, 0, "nonmetal", 17, 3, "p", 3.16, "[Ne] 3s2 3p5", "gas"],
  [18, "Ar", "Argon", 39.95, 0, "noble", 18, 3, "p", null, "[Ne] 3s2 3p6", "gas"],
  [19, "K", "Potassium", 39.098, 0, "alkali", 1, 4, "s", 0.82, "[Ar] 4s1", "solid"],
  [20, "Ca", "Calcium", 40.078, 0, "alkaline", 2, 4, "s", 1.0, "[Ar] 4s2", "solid"],
  [21, "Sc", "Scandium", 44.956, 0, "transition", 3, 4, "d", 1.36, "[Ar] 3d1 4s2", "solid"],
  [22, "Ti", "Titanium", 47.867, 0, "transition", 4, 4, "d", 1.54, "[Ar] 3d2 4s2", "solid"],
  [23, "V", "Vanadium", 50.942, 0, "transition", 5, 4, "d", 1.63, "[Ar] 3d3 4s2", "solid"],
  [24, "Cr", "Chromium", 51.996, 0, "transition", 6, 4, "d", 1.66, "[Ar] 3d5 4s1", "solid"],
  [25, "Mn", "Manganese", 54.938, 0, "transition", 7, 4, "d", 1.55, "[Ar] 3d5 4s2", "solid"],
  [26, "Fe", "Iron", 55.845, 0, "transition", 8, 4, "d", 1.83, "[Ar] 3d6 4s2", "solid"],
  [27, "Co", "Cobalt", 58.933, 0, "transition", 9, 4, "d", 1.88, "[Ar] 3d7 4s2", "solid"],
  [28, "Ni", "Nickel", 58.693, 0, "transition", 10, 4, "d", 1.91, "[Ar] 3d8 4s2", "solid"],
  [29, "Cu", "Copper", 63.546, 0, "transition", 11, 4, "d", 1.9, "[Ar] 3d10 4s1", "solid"],
  [30, "Zn", "Zinc", 65.38, 0, "transition", 12, 4, "d", 1.65, "[Ar] 3d10 4s2", "solid"],
  [31, "Ga", "Gallium", 69.723, 0, "post_transition", 13, 4, "p", 1.81, "[Ar] 3d10 4s2 4p1", "solid"],
  [32, "Ge", "Germanium", 72.63, 0, "metalloid", 14, 4, "p", 2.01, "[Ar] 3d10 4s2 4p2", "solid"],
  [33, "As", "Arsenic", 74.922, 0, "metalloid", 15, 4, "p", 2.18, "[Ar] 3d10 4s2 4p3", "solid"],
  [34, "Se", "Selenium", 78.971, 0, "nonmetal", 16, 4, "p", 2.55, "[Ar] 3d10 4s2 4p4", "solid"],
  [35, "Br", "Bromine", 79.904, 0, "nonmetal", 17, 4, "p", 2.96, "[Ar] 3d10 4s2 4p5", "liquid"],
  [36, "Kr", "Krypton", 83.798, 0, "noble", 18, 4, "p", 3.0, "[Ar] 3d10 4s2 4p6", "gas"],
  [37, "Rb", "Rubidium", 85.468, 0, "alkali", 1, 5, "s", 0.82, "[Kr] 5s1", "solid"],
  [38, "Sr", "Strontium", 87.62, 0, "alkaline", 2, 5, "s", 0.95, "[Kr] 5s2", "solid"],
  [39, "Y", "Yttrium", 88.906, 0, "transition", 3, 5, "d", 1.22, "[Kr] 4d1 5s2", "solid"],
  [40, "Zr", "Zirconium", 91.224, 0, "transition", 4, 5, "d", 1.33, "[Kr] 4d2 5s2", "solid"],
  [41, "Nb", "Niobium", 92.906, 0, "transition", 5, 5, "d", 1.6, "[Kr] 4d4 5s1", "solid"],
  [42, "Mo", "Molybdenum", 95.95, 0, "transition", 6, 5, "d", 2.16, "[Kr] 4d5 5s1", "solid"],
  [43, "Tc", "Technetium", 98, 1, "transition", 7, 5, "d", 1.9, "[Kr] 4d5 5s2", "solid"],
  [44, "Ru", "Ruthenium", 101.07, 0, "transition", 8, 5, "d", 2.2, "[Kr] 4d7 5s1", "solid"],
  [45, "Rh", "Rhodium", 102.91, 0, "transition", 9, 5, "d", 2.28, "[Kr] 4d8 5s1", "solid"],
  [46, "Pd", "Palladium", 106.42, 0, "transition", 10, 5, "d", 2.2, "[Kr] 4d10", "solid"],
  [47, "Ag", "Silver", 107.87, 0, "transition", 11, 5, "d", 1.93, "[Kr] 4d10 5s1", "solid"],
  [48, "Cd", "Cadmium", 112.41, 0, "transition", 12, 5, "d", 1.69, "[Kr] 4d10 5s2", "solid"],
  [49, "In", "Indium", 114.82, 0, "post_transition", 13, 5, "p", 1.78, "[Kr] 4d10 5s2 5p1", "solid"],
  [50, "Sn", "Tin", 118.71, 0, "post_transition", 14, 5, "p", 1.96, "[Kr] 4d10 5s2 5p2", "solid"],
  [51, "Sb", "Antimony", 121.76, 0, "metalloid", 15, 5, "p", 2.05, "[Kr] 4d10 5s2 5p3", "solid"],
  [52, "Te", "Tellurium", 127.6, 0, "metalloid", 16, 5, "p", 2.1, "[Kr] 4d10 5s2 5p4", "solid"],
  [53, "I", "Iodine", 126.9, 0, "nonmetal", 17, 5, "p", 2.66, "[Kr] 4d10 5s2 5p5", "solid"],
  [54, "Xe", "Xenon", 131.29, 0, "noble", 18, 5, "p", 2.6, "[Kr] 4d10 5s2 5p6", "gas"],
  [55, "Cs", "Caesium", 132.91, 0, "alkali", 1, 6, "s", 0.79, "[Xe] 6s1", "solid"],
  [56, "Ba", "Barium", 137.33, 0, "alkaline", 2, 6, "s", 0.89, "[Xe] 6s2", "solid"],
  [57, "La", "Lanthanum", 138.91, 0, "lanthanide", null, 6, "f", 1.1, "[Xe] 5d1 6s2", "solid"],
  [58, "Ce", "Cerium", 140.12, 0, "lanthanide", null, 6, "f", 1.12, "[Xe] 4f1 5d1 6s2", "solid"],
  [59, "Pr", "Praseodymium", 140.91, 0, "lanthanide", null, 6, "f", 1.13, "[Xe] 4f3 6s2", "solid"],
  [60, "Nd", "Neodymium", 144.24, 0, "lanthanide", null, 6, "f", 1.14, "[Xe] 4f4 6s2", "solid"],
  [61, "Pm", "Promethium", 145, 1, "lanthanide", null, 6, "f", 1.13, "[Xe] 4f5 6s2", "solid"],
  [62, "Sm", "Samarium", 150.36, 0, "lanthanide", null, 6, "f", 1.17, "[Xe] 4f6 6s2", "solid"],
  [63, "Eu", "Europium", 151.96, 0, "lanthanide", null, 6, "f", 1.2, "[Xe] 4f7 6s2", "solid"],
  [64, "Gd", "Gadolinium", 157.25, 0, "lanthanide", null, 6, "f", 1.2, "[Xe] 4f7 5d1 6s2", "solid"],
  [65, "Tb", "Terbium", 158.93, 0, "lanthanide", null, 6, "f", 1.2, "[Xe] 4f9 6s2", "solid"],
  [66, "Dy", "Dysprosium", 162.5, 0, "lanthanide", null, 6, "f", 1.22, "[Xe] 4f10 6s2", "solid"],
  [67, "Ho", "Holmium", 164.93, 0, "lanthanide", null, 6, "f", 1.23, "[Xe] 4f11 6s2", "solid"],
  [68, "Er", "Erbium", 167.26, 0, "lanthanide", null, 6, "f", 1.24, "[Xe] 4f12 6s2", "solid"],
  [69, "Tm", "Thulium", 168.93, 0, "lanthanide", null, 6, "f", 1.25, "[Xe] 4f13 6s2", "solid"],
  [70, "Yb", "Ytterbium", 173.05, 0, "lanthanide", null, 6, "f", 1.1, "[Xe] 4f14 6s2", "solid"],
  [71, "Lu", "Lutetium", 174.97, 0, "lanthanide", 3, 6, "d", 1.27, "[Xe] 4f14 5d1 6s2", "solid"],
  [72, "Hf", "Hafnium", 178.49, 0, "transition", 4, 6, "d", 1.3, "[Xe] 4f14 5d2 6s2", "solid"],
  [73, "Ta", "Tantalum", 180.95, 0, "transition", 5, 6, "d", 1.5, "[Xe] 4f14 5d3 6s2", "solid"],
  [74, "W", "Tungsten", 183.84, 0, "transition", 6, 6, "d", 2.36, "[Xe] 4f14 5d4 6s2", "solid"],
  [75, "Re", "Rhenium", 186.21, 0, "transition", 7, 6, "d", 1.9, "[Xe] 4f14 5d5 6s2", "solid"],
  [76, "Os", "Osmium", 190.23, 0, "transition", 8, 6, "d", 2.2, "[Xe] 4f14 5d6 6s2", "solid"],
  [77, "Ir", "Iridium", 192.22, 0, "transition", 9, 6, "d", 2.2, "[Xe] 4f14 5d7 6s2", "solid"],
  [78, "Pt", "Platinum", 195.08, 0, "transition", 10, 6, "d", 2.28, "[Xe] 4f14 5d9 6s1", "solid"],
  [79, "Au", "Gold", 196.97, 0, "transition", 11, 6, "d", 2.54, "[Xe] 4f14 5d10 6s1", "solid"],
  [80, "Hg", "Mercury", 200.59, 0, "transition", 12, 6, "d", 2.0, "[Xe] 4f14 5d10 6s2", "liquid"],
  [81, "Tl", "Thallium", 204.38, 0, "post_transition", 13, 6, "p", 1.62, "[Xe] 4f14 5d10 6s2 6p1", "solid"],
  [82, "Pb", "Lead", 207.2, 0, "post_transition", 14, 6, "p", 2.33, "[Xe] 4f14 5d10 6s2 6p2", "solid"],
  [83, "Bi", "Bismuth", 208.98, 0, "post_transition", 15, 6, "p", 2.02, "[Xe] 4f14 5d10 6s2 6p3", "solid"],
  [84, "Po", "Polonium", 209, 1, "post_transition", 16, 6, "p", 2.0, "[Xe] 4f14 5d10 6s2 6p4", "solid"],
  [85, "At", "Astatine", 210, 1, "metalloid", 17, 6, "p", 2.2, "[Xe] 4f14 5d10 6s2 6p5", "solid"],
  [86, "Rn", "Radon", 222, 1, "noble", 18, 6, "p", 2.2, "[Xe] 4f14 5d10 6s2 6p6", "gas"],
  [87, "Fr", "Francium", 223, 1, "alkali", 1, 7, "s", 0.7, "[Rn] 7s1", "solid"],
  [88, "Ra", "Radium", 226, 1, "alkaline", 2, 7, "s", 0.9, "[Rn] 7s2", "solid"],
  [89, "Ac", "Actinium", 227, 1, "actinide", null, 7, "f", 1.1, "[Rn] 6d1 7s2", "solid"],
  [90, "Th", "Thorium", 232.04, 0, "actinide", null, 7, "f", 1.3, "[Rn] 6d2 7s2", "solid"],
  [91, "Pa", "Protactinium", 231.04, 0, "actinide", null, 7, "f", 1.5, "[Rn] 5f2 6d1 7s2", "solid"],
  [92, "U", "Uranium", 238.03, 0, "actinide", null, 7, "f", 1.38, "[Rn] 5f3 6d1 7s2", "solid"],
  [93, "Np", "Neptunium", 237, 1, "actinide", null, 7, "f", 1.36, "[Rn] 5f4 6d1 7s2", "solid"],
  [94, "Pu", "Plutonium", 244, 1, "actinide", null, 7, "f", 1.28, "[Rn] 5f6 7s2", "solid"],
  [95, "Am", "Americium", 243, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f7 7s2", "solid"],
  [96, "Cm", "Curium", 247, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f7 6d1 7s2", "solid"],
  [97, "Bk", "Berkelium", 247, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f9 7s2", "solid"],
  [98, "Cf", "Californium", 251, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f10 7s2", "solid"],
  [99, "Es", "Einsteinium", 252, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f11 7s2", "solid"],
  [100, "Fm", "Fermium", 257, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f12 7s2", "unknown"],
  [101, "Md", "Mendelevium", 258, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f13 7s2", "unknown"],
  [102, "No", "Nobelium", 259, 1, "actinide", null, 7, "f", 1.3, "[Rn] 5f14 7s2", "unknown"],
  [103, "Lr", "Lawrencium", 266, 1, "actinide", 3, 7, "d", 1.3, "[Rn] 5f14 7s2 7p1", "unknown"],
  [104, "Rf", "Rutherfordium", 267, 1, "transition", 4, 7, "d", null, "[Rn] 5f14 6d2 7s2", "unknown"],
  [105, "Db", "Dubnium", 268, 1, "transition", 5, 7, "d", null, "[Rn] 5f14 6d3 7s2", "unknown"],
  [106, "Sg", "Seaborgium", 269, 1, "transition", 6, 7, "d", null, "[Rn] 5f14 6d4 7s2", "unknown"],
  [107, "Bh", "Bohrium", 270, 1, "transition", 7, 7, "d", null, "[Rn] 5f14 6d5 7s2", "unknown"],
  [108, "Hs", "Hassium", 269, 1, "transition", 8, 7, "d", null, "[Rn] 5f14 6d6 7s2", "unknown"],
  [109, "Mt", "Meitnerium", 278, 1, "transition", 9, 7, "d", null, "[Rn] 5f14 6d7 7s2", "unknown"],
  [110, "Ds", "Darmstadtium", 281, 1, "transition", 10, 7, "d", null, "[Rn] 5f14 6d8 7s2", "unknown"],
  [111, "Rg", "Roentgenium", 282, 1, "transition", 11, 7, "d", null, "[Rn] 5f14 6d9 7s2", "unknown"],
  [112, "Cn", "Copernicium", 285, 1, "transition", 12, 7, "d", null, "[Rn] 5f14 6d10 7s2", "unknown"],
  [113, "Nh", "Nihonium", 286, 1, "post_transition", 13, 7, "p", null, "[Rn] 5f14 6d10 7s2 7p1", "unknown"],
  [114, "Fl", "Flerovium", 289, 1, "post_transition", 14, 7, "p", null, "[Rn] 5f14 6d10 7s2 7p2", "unknown"],
  [115, "Mc", "Moscovium", 290, 1, "post_transition", 15, 7, "p", null, "[Rn] 5f14 6d10 7s2 7p3", "unknown"],
  [116, "Lv", "Livermorium", 293, 1, "post_transition", 16, 7, "p", null, "[Rn] 5f14 6d10 7s2 7p4", "unknown"],
  [117, "Ts", "Tennessine", 294, 1, "post_transition", 17, 7, "p", null, "[Rn] 5f14 6d10 7s2 7p5", "unknown"],
  [118, "Og", "Oganesson", 294, 1, "noble", 18, 7, "p", null, "[Rn] 5f14 6d10 7s2 7p6", "unknown"],
];

export const ELEMENTS: readonly Element[] = Object.freeze(
  ROWS.map(([number, symbol, name, mass, nominal, category, group, period, block, electronegativity, configuration, phase]) =>
    Object.freeze({
      number,
      symbol,
      name,
      mass,
      massIsNominal: nominal === 1,
      category,
      group,
      period,
      block,
      electronegativity,
      configuration,
      phase,
    }),
  ),
);

export function elementBySymbol(symbol: string): Element | null {
  const key = symbol.toLowerCase();
  return ELEMENTS.find((element) => element.symbol.toLowerCase() === key) ?? null;
}

/**
 * Grid placement in the 18 column layout. Lanthanides and actinides (57 to 70
 * and 89 to 102) sit in two rows below the main block, columns 3 to 16, as
 * ptable.com draws them; 71 and 103 sit in group 3 of the main block.
 */
export function gridPosition(element: Element): { readonly column: number; readonly row: number } {
  if (element.number >= 57 && element.number <= 70) return { column: element.number - 57 + 3, row: 9 };
  if (element.number >= 89 && element.number <= 102) return { column: element.number - 89 + 3, row: 10 };
  if (element.group === null) throw new Error(`${element.symbol} has no group and is not an f block row`);
  return { column: element.group, row: element.period };
}
