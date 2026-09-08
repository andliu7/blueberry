/**
 * What is forbidden where, as data.
 *
 * Two separate lists, because two separate rules in CLAUDE.md are being enforced and
 * merging them would make the report say the wrong thing:
 *
 *   CHEM_CORE_BANNED     "packages/chem-core Engine. No React, no DOM, no rendering,
 *                        no RDKit. Pure TS." Anything here inside chem-core's built
 *                        graph is a purity violation.
 *
 *   GAME_ROUTE_BANNED    "Ketcher route: lazy only. Must never be reachable from the
 *                        game route's initial chunk", plus "Do not add @rdkit/rdkit
 *                        WASM to the client" from D3. Ketcher is legal in apps/web, it
 *                        is only illegal in the game route's initial dependency graph.
 *
 * A rule is a name plus a predicate over a module specifier, not a bare string, because
 * `react` must match `react`, `react/jsx-runtime`, and `react-dom/client` while not
 * matching a hypothetical `react-is-not-here`. Matching on a raw substring would do the
 * wrong thing in both directions.
 */

export interface BannedRule {
  /** Printed in the failure. Say what is banned and, briefly, why. */
  readonly name: string;
  /** The rule text this comes from, so a reader can go argue with the source. */
  readonly source: string;
  /** True when this module specifier is an instance of the ban. */
  matches(specifier: string): boolean;
}

/**
 * npm package name of a bare specifier, or null when the specifier is relative or a
 * Node builtin. `react-dom/client` gives `react-dom`, `@rdkit/rdkit/dist/x` gives
 * `@rdkit/rdkit`.
 */
export function packageNameOf(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("/")) return null;
  if (specifier.startsWith("node:")) return null;
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) {
    const scope = parts[0];
    const name = parts[1];
    if (scope === undefined || name === undefined) return null;
    return `${scope}/${name}`;
  }
  const first = parts[0];
  return first === undefined || first === "" ? null : first;
}

function exact(names: readonly string[]): (specifier: string) => boolean {
  const set = new Set(names);
  return (specifier: string): boolean => {
    const pkg = packageNameOf(specifier);
    return pkg !== null && set.has(pkg);
  };
}

function prefixed(prefixes: readonly string[]): (specifier: string) => boolean {
  return (specifier: string): boolean => {
    const pkg = packageNameOf(specifier);
    if (pkg === null) return false;
    return prefixes.some((prefix) => pkg === prefix || pkg.startsWith(`${prefix}-`) || pkg.startsWith(`${prefix}/`));
  };
}

const REACT: BannedRule = {
  name: "react",
  source: "CLAUDE.md, Repository layout: chem-core is 'No React'",
  matches: exact(["react", "react-dom", "react-is", "react-native", "scheduler"]),
};

const REACT_ECOSYSTEM: BannedRule = {
  name: "react ecosystem (@react-three, react-native-*)",
  source: "CLAUDE.md, Repository layout: chem-core is 'No React'",
  matches: prefixed(["@react-three", "react-native"]),
};

const RENDERING: BannedRule = {
  name: "three / WebGL rendering",
  source:
    "CLAUDE.md, Repository layout: chem-core is 'no rendering'. D4: berryBehaviour.ts " +
    "holds the same line, 'No three, no react, no DOM'",
  matches: exact(["three", "@react-three/fiber", "@react-three/drei"]),
};

const RDKIT: BannedRule = {
  name: "@rdkit/rdkit",
  source:
    "CLAUDE.md, Three engines: 'Do not add @rdkit/rdkit WASM to the client. RDKit runs " +
    "CI only, Python sidecar. It never ships'",
  matches: prefixed(["@rdkit"]),
};

const KETCHER: BannedRule = {
  name: "ketcher (ketcher-standalone 15.5 MB, ketcher-react 3.1 MB)",
  source:
    "CLAUDE.md, Budgets: 'Ketcher route: lazy only. Must never be reachable from the " +
    "game route's initial chunk'",
  matches: prefixed(["ketcher", "@ketcher"]),
};

const DOM_LIBRARIES: BannedRule = {
  name: "DOM libraries",
  source: "CLAUDE.md, Repository layout: chem-core is 'no DOM'",
  matches: exact(["jsdom", "happy-dom", "linkedom", "cheerio"]),
};

/** Anything chem-core's built graph may not reach. */
export const CHEM_CORE_BANNED: readonly BannedRule[] = [
  REACT,
  REACT_ECOSYSTEM,
  RENDERING,
  RDKIT,
  KETCHER,
  DOM_LIBRARIES,
];

/** Anything the game route's initial chunk may not reach. */
export const GAME_ROUTE_BANNED: readonly BannedRule[] = [KETCHER, RDKIT];

/** Banned as an npm dependency anywhere in the repository, in any manifest. */
export const RDKIT_RULE: BannedRule = RDKIT;

/**
 * Manifests that may not declare a ketcher package, by repo relative path prefix.
 *
 * Ketcher is legal and expected in apps/web, where D2 records the two failures already
 * paid for getting it working. It is illegal in the engine and in the validator suite:
 * chem-core is pure TypeScript with no dependencies at all, and the validator suite uses
 * the Python RDKit sidecar rather than any browser chemistry engine. A dependency in
 * either of those is somebody solving a problem in the wrong package.
 */
export const KETCHER_MANIFEST_FREE_PACKAGES: readonly string[] = [
  "package.json",
  "packages/chem-core/",
  "packages/validators/",
];

/**
 * DOM and browser host globals, for the token scan in dom-globals.ts.
 *
 * This list is deliberately identifiers only. It cannot catch
 * `globalThis["docu" + "ment"]`, and it is not trying to. It catches the way a real
 * accidental DOM dependency arrives, which is somebody writing `document.createElement`
 * in a file that then gets imported by the engine.
 */
export const DOM_GLOBALS: readonly string[] = [
  "document",
  "window",
  "navigator",
  "localStorage",
  "sessionStorage",
  "customElements",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "XMLHttpRequest",
  "HTMLElement",
  "HTMLCanvasElement",
  "SVGElement",
  "CanvasRenderingContext2D",
  "WebGLRenderingContext",
  "getComputedStyle",
  "matchMedia",
];
