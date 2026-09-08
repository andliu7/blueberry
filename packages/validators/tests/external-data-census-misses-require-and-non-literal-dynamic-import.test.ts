import { describe, expect, it } from "vitest";

import {
  censusFindings,
  scanImports,
  scanUnreadableImports,
  type ImportCensus,
} from "../src/integrity.ts";

/**
 * ADVERSARY PASS FOUR, PHASE 1, ATTACK SURFACE 4, AND THE FIX FOR IT.
 *
 * The filing, in the adversary's words: "look for any other syntax that moves values
 * without producing a value binding." The barrel export gap (`export * from "pkg"` recorded
 * as no value binding at all) was found by the third pass adversary and closed; see
 * `external-data-census-barrel-export-blind-spot.test.ts`. This was the fourth way in,
 * found by asking the question that fix's own docstring did not ask: `scanImports` only
 * ever matched four shapes, `import ... from "x"`, `export ... from "x"`, the bare side
 * effect `import "x"`, and `import("x")` with a LITERAL quoted specifier. Node has more
 * than one way to pull a value in from a package, and two of them were none of those four.
 *
 * ATTACK ONE. `require("pkg")`, CommonJS interop. Every regex in `scanImports` was anchored
 * on the keywords `import` or `export`. `require` is neither: it is an ordinary identifier
 * applied to an ordinary call, and `node:module`'s `createRequire` makes a working one
 * available inside an ES module in a single line. A validator source file writing
 * `const rdkit = require("@rdkit/rdkit")` pulled that package in for its value and the
 * census said nothing: not `seenPackages`, not `byPackage`, not a `censusFindings` entry,
 * because `scanImports` returned no `ImportSite` for the line at all. Strictly worse than
 * the barrel gap, which at least recorded the specifier.
 *
 * ATTACK TWO. `import(specifier)` where `specifier` is not a string literal. The dynamic
 * import regex required a quote immediately inside the parentheses, so
 * `await import(someVariable)` matched nothing. Not hypothetical: `measure/bundle.ts`'s
 * `loadEsbuild()` was written that way, and its own comment admitted esbuild was undeclared
 * while saying nothing about the shape generalising to any other package.
 *
 * ================================ WHAT THIS FILE NOW ASSERTS ==========================
 *
 * THE GAP IS CLOSED, AND EVERY ASSERTION BELOW IS WRITTEN THE OTHER WAY ROUND. It failed
 * against the code as filed and passes against the code now. Three changes closed it and
 * each has its own describe block:
 *
 *   1. `scanImports` reads `require("literal")` and records the WILDCARD binding "*", the
 *      same binding `import * as ns` and `export * from` already use, because a require
 *      expression evaluates to the module's whole namespace object. Recording it with an
 *      empty binding list would have re-created the barrel hole exactly, since
 *      `censusOverHashedFiles` skips a site that binds nothing.
 *
 *   2. `import("literal")` now carries the wildcard binding for the same reason. It used to
 *      carry none, which meant a wholly undeclared package pulled in that way reached
 *      `seenPackages` and never reached `byPackage`, and `undeclared-package` is decided off
 *      `byPackage`. The bare side effect form `import "x"` still binds nothing, because that
 *      one genuinely hands back no value.
 *
 *   3. A specifier that is NOT a string literal is refused rather than skipped.
 *      `scanUnreadableImports` finds every `import(` and `require(` whose argument is not a
 *      literal, plus any appearance of `createRequire`, and `censusFindings` turns each into
 *      an `unreadable-import` finding. Every finding is a hard stop, and `regenerateLock`
 *      refuses to write a lock while one exists, so the shape cannot be blessed by accident.
 *      This is the treatment `extractCompetingRoutes` already gave a `competingRoutes`
 *      property it could not parse, and for the reason stated there: the difference between
 *      "there is no data here" and "I could not read the data here" is the difference
 *      between a gate and a decoration.
 *
 * WHAT REMAINS OPEN, STATED SO A GREEN RUN IS NOT READ AS MORE. Rule 3 is a rule about two
 * names, `import` and `require`, and one more, `createRequire`. An alias
 * (`import { createRequire as make } from "node:module"`) defeats the third, and closing
 * that needs a real parser rather than a bigger regex. It is written down here rather than
 * implied.
 *
 * WHY EVERY TEST RUNS AGAINST THE REAL EXPORTED PIPELINE, AND WHY THE KEYWORDS ARE
 * ASSEMBLED AT RUNTIME. Same reasoning as the neighbouring barrel test file: `scanImports`,
 * `scanUnreadableImports` and `censusFindings` are exercised unmodified and exported,
 * `censusFromSource` below is copied line for line from `censusOverHashedFiles`'s own
 * construction so this is a faithful reproduction of the production path, and every keyword
 * that would otherwise read as a real import of this test file by the census that scans this
 * package is assembled from string pieces at runtime so this specimen text is never itself
 * counted.
 */

const REQUIRE_KEYWORD = ["requ", "ire"].join("");
const IMPORT_KEYWORD = ["imp", "ort"].join("");
const CREATE_REQUIRE_KEYWORD = ["create", "Requ", "ire"].join("");

/**
 * censusOverHashedFiles's own construction, copied faithfully from src/integrity.ts, exactly
 * as the neighbouring barrel test file does, so this exercises the identical rule rather
 * than a paraphrase of it. The `unreadable` half is copied from the same function.
 */
function censusFromSource(specimen: {
  readonly relativePath: string;
  readonly source: string;
}): ImportCensus {
  const byPackage = new Map<string, Map<string, Set<string>>>();
  const seenPackages = new Set<string>();
  const unreadable: string[] = [];

  const isExternal = (specifier: string): boolean =>
    !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.startsWith("node:");
  const packageOf = (specifier: string): string => {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] as string);
  };

  for (const site of scanUnreadableImports(specimen.source)) {
    unreadable.push(`${specimen.relativePath}:${site.line} ${site.why}. Line reads: ${site.text}`);
  }

  for (const site of scanImports(specimen.source)) {
    if (!isExternal(site.specifier)) continue;
    const pkg = packageOf(site.specifier);
    seenPackages.add(pkg);
    if (site.valueBindings.length === 0) continue;
    const bindings = byPackage.get(pkg) ?? new Map<string, Set<string>>();
    byPackage.set(pkg, bindings);
    for (const binding of site.valueBindings) {
      const where = bindings.get(binding) ?? new Set<string>();
      bindings.set(binding, where);
      where.add(specimen.relativePath);
    }
  }

  return { byPackage, seenPackages, unreadable: unreadable.sort() };
}

describe("scanImports sees an ordinary named import of a new package, the control case", () => {
  // Specifiers are never written next to their keyword inside a test title here. The census
  // that scans this package reads strings as code, so a title spelling out a real import of a
  // real package name would be counted as one. Same reason the keywords are assembled below.
  it("an ordinary named import of a new package produces a site with the value binding", () => {
    const sites = scanImports(`${IMPORT_KEYWORD} { x } from "totally-new-external-package";`);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.specifier).toBe("totally-new-external-package");
    expect(sites[0]?.valueBindings).toEqual(["x"]);
  });
});

describe("ATTACK ONE, CLOSED: scanImports reads require() with a literal specifier", () => {
  it("a require call with a literal specifier is a site carrying the wildcard binding, not silence", () => {
    const sites = scanImports(`const x = ${REQUIRE_KEYWORD}("totally-new-external-package");`);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.specifier).toBe("totally-new-external-package");
    // "*", not []. An empty binding list is skipped by the census, which is precisely the
    // hole the barrel export fix closed, and recording require() that way would reopen it.
    expect(sites[0]?.valueBindings).toEqual(["*"]);
  });

  it("destructuring the require() result is read the same way", () => {
    const sites = scanImports(
      `const { competingRoutesFor } = ${REQUIRE_KEYWORD}("totally-new-external-package");`,
    );
    expect(sites).toHaveLength(1);
    expect(sites[0]?.specifier).toBe("totally-new-external-package");
    expect(sites[0]?.valueBindings).toEqual(["*"]);
  });

  it("an identifier that merely ends in the keyword is not a require call", () => {
    // requireKeys( is a real function in fixture-schema.ts and a property access is not
    // the global require either. Neither may be counted as a module pull.
    expect(scanImports(`${REQUIRE_KEYWORD}Keys(object, at, ["id"], []);`)).toHaveLength(0);
    expect(scanImports(`harness.${REQUIRE_KEYWORD}("totally-new-external-package");`)).toHaveLength(
      0,
    );
  });
});

describe("ATTACK TWO, CLOSED: a specifier that is not a literal is refused, not skipped", () => {
  it("`import(literal)` is read, and carries the wildcard binding rather than none", () => {
    const literal = scanImports(`void ${IMPORT_KEYWORD}("totally-new-external-package");`);
    expect(literal).toHaveLength(1);
    expect(literal[0]?.specifier).toBe("totally-new-external-package");
    expect(literal[0]?.valueBindings).toEqual(["*"]);
    expect(scanUnreadableImports(`void ${IMPORT_KEYWORD}("totally-new-external-package");`)).toEqual(
      [],
    );
  });

  it("`import(variable)` still yields no site, and is now reported as unreadable", () => {
    const source = [
      `const specifier = "totally-new-external-package";`,
      `const loaded = await ${IMPORT_KEYWORD}(specifier);`,
    ].join("\n");

    // Unchanged and correct: the specifier is not in the text, so there is no site to make.
    expect(scanImports(source)).toHaveLength(0);
    // Changed: silence is no longer the answer.
    const unreadable = scanUnreadableImports(source);
    expect(unreadable).toHaveLength(1);
    expect(unreadable[0]?.line).toBe(2);
    expect(unreadable[0]?.why).toContain("not a string literal");
  });

  it("`require(variable)` is reported the same way", () => {
    const source = `const rdkit = ${REQUIRE_KEYWORD}(chosenPackage);`;
    expect(scanImports(source)).toHaveLength(0);
    const unreadable = scanUnreadableImports(source);
    expect(unreadable).toHaveLength(1);
    expect(unreadable[0]?.why).toContain("not a string literal");
  });

  it("createRequire is reported, because no scan can follow the require it manufactures", () => {
    const source = [
      `import { ${CREATE_REQUIRE_KEYWORD} } from "node:module";`,
      `const req = ${CREATE_REQUIRE_KEYWORD}(import.meta.url);`,
      `const rdkit = req("totally-new-external-package");`,
    ].join("\n");

    // req("pkg") is still invisible, and always will be to a scanner: the function is bound
    // to an arbitrary local name. What is visible is the manufacture, and that is reported.
    expect(
      scanImports(source).some((site) => site.specifier === "totally-new-external-package"),
    ).toBe(false);
    const unreadable = scanUnreadableImports(source);
    expect(unreadable.length).toBeGreaterThanOrEqual(2);
    expect(unreadable.every((site) => site.why.includes("createRequire"))).toBe(true);
  });

  it("a literal specifier wrapped onto the next line is NOT reported unreadable", () => {
    // The formatter writes this shape routinely. A line based test would call it unreadable
    // while the literal sits in plain sight one line down, which is a false report.
    const source = [
      `const { thing } = await ${IMPORT_KEYWORD}(`,
      `  "totally-new-external-package"`,
      `);`,
    ].join("\n");
    expect(scanUnreadableImports(source)).toEqual([]);
    expect(scanImports(source)[0]?.specifier).toBe("totally-new-external-package");
  });

  it("a specimen written inside a template literal is not reported as real code", () => {
    // This is how the adversary's own test files are written so they do not count as
    // imports of themselves. Strings are blanked before the unreadable scan for exactly
    // this reason, unlike the readable scan, which needs the literals intact.
    const source = "const specimen = `const x = await impo" + "rt(someVariable);`;";
    expect(scanUnreadableImports(source)).toEqual([]);
  });
});

describe(
  "the consequence, inverted: an undeclared external package pulled in through either shape " +
    "now produces a censusFindings entry",
  () => {
    it("require() path: seenPackages, byPackage, and censusFindings all see it", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/smuggled-require.ts",
        source: `const rdkit = ${REQUIRE_KEYWORD}("totally-new-external-package");\n`,
      });

      expect(census.seenPackages.has("totally-new-external-package")).toBe(true);
      expect(census.byPackage.has("totally-new-external-package")).toBe(true);

      const findings = censusFindings(census, []);
      expect(findings.map((finding) => finding.kind)).toEqual(["undeclared-package"]);
      expect(findings[0]?.detail).toContain("totally-new-external-package");
    });

    it("non literal import() path: the package is unknown, and that itself is the finding", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/smuggled-dynamic-import.ts",
        source: [
          `const specifier = "totally-new-external-package";`,
          `const loaded = await ${IMPORT_KEYWORD}(specifier);`,
        ].join("\n"),
      });

      // The package name is genuinely not knowable from the text, so the finding cannot be
      // undeclared-package. It is unreadable-import, which says the honest thing: the
      // census cannot tell whether this is declared, because it cannot tell what it is.
      const findings = censusFindings(census, []);
      expect(findings.map((finding) => finding.kind)).toEqual(["unreadable-import"]);
      expect(findings[0]?.detail).toContain("src/checks/conservation/smuggled-dynamic-import.ts:2");
      expect(findings[0]?.detail).toContain("cannot say which package it is");
    });

    it("a declared package pulled in through require() produces no finding", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/legitimate.ts",
        source: `const core = ${REQUIRE_KEYWORD}("@blueberry/chem-core");\n`,
      });
      expect(
        censusFindings(census, [
          { specifier: "@blueberry/chem-core", role: "subject-under-test", reason: "declared" },
        ]),
      ).toEqual([]);
    });

    it(
      "contrast: the same new package, pulled in through the two already closed holes, IS " +
        "still caught, so nothing regressed while these two were closed",
      () => {
        const barrel = censusFromSource({
          relativePath: "src/checks/conservation/barrel.ts",
          source: `${["exp", "ort"].join("")} * from "totally-new-external-package";\n`,
        });
        expect(censusFindings(barrel, []).map((finding) => finding.kind)).toEqual([
          "undeclared-package",
        ]);

        const direct = censusFromSource({
          relativePath: "src/checks/conservation/direct.ts",
          source: `${IMPORT_KEYWORD} { thing } from "totally-new-external-package";\n`,
        });
        expect(censusFindings(direct, []).map((finding) => finding.kind)).toEqual([
          "undeclared-package",
        ]);
      },
    );
  },
);

describe("the real package: measure/bundle.ts's esbuild is now visible and declared", () => {
  it("EXTERNAL_DATA carries esbuild with a role and a reason", async () => {
    const { EXTERNAL_DATA } = await import("../src/integrity.ts");
    const declared = EXTERNAL_DATA.find((entry) => entry.specifier === "esbuild");
    expect(declared).toBeDefined();
    expect(declared?.role).toBe("no-data");
    expect((declared?.reason ?? "").length).toBeGreaterThan(80);
  });

  it("loadEsbuild names its specifier as a literal, so the census can read it", async () => {
    const fs = await import("node:fs/promises");
    const url = await import("node:url");
    const here = url.fileURLToPath(new URL("../src/measure/bundle.ts", import.meta.url));
    const source = await fs.readFile(here, "utf8");

    // The whole point of the fix: this file reaches esbuild through a readable specifier,
    // and nothing in it is unreadable to the scanner.
    expect(scanUnreadableImports(source)).toEqual([]);
    expect(scanImports(source).some((site) => site.specifier === "esbuild")).toBe(true);
  });
});
