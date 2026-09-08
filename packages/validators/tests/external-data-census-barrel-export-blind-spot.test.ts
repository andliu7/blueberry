import { describe, expect, it } from "vitest";

import { censusFindings, scanImports, type ImportCensus } from "../src/integrity.ts";

/**
 * ADVERSARY PASS THREE, PHASE 1, ITEM 1 IN THE BRIEF: "get a value dependency past the
 * census."
 *
 * `censusOverHashedFiles` in src/integrity.ts (private, so this test drives the same
 * pipeline through the exported pieces it is built from: `scanImports` for one file's
 * import sites, then the same byPackage/seenPackages construction the real function uses,
 * read straight off its source, lines ~611-639) builds its census by treating a value
 * import as proven only when `site.valueBindings.length > 0`:
 *
 *     for (const site of scanImports(source)) {
 *       if (!isExternalSpecifier(site.specifier)) continue;
 *       const pkg = packageOf(site.specifier);
 *       seenPackages.add(pkg);
 *       if (site.valueBindings.length === 0) continue;
 *       ... only now does anything get recorded into byPackage ...
 *     }
 *
 * `scanImports` computes `valueBindings` for a bare `export * from "pkg";` as EMPTY. Trace
 * through `valueBindingsOf`: the import clause between "export" and "from" is "* ", which
 * trims to "*". The wildcard branch is `/^\*\s+as\s+/.test(item)`, which requires the
 * literal keyword "as" to be present, so it only fires for `import * as ns from "pkg"` or
 * the ES2020 `export * as ns from "pkg"`. A bare `export * from "pkg"`, which re-exports
 * every NAMED export of pkg as a value binding available to anyone who imports the
 * re-exporting module, has no "as" clause, fails that test, and falls through to the plain
 * identifier check `/^[A-Za-z_$][\w$]*$/.exec("*")`, which does not match "*" either. So
 * `valueBindingsOf` returns `[]` for a wildcard re-export, and the caller's own asymmetric
 * handling of `import * as ns` (recorded as binding "*", which IS classified) versus
 * `export * from` (recorded as nothing) is the gap.
 *
 * THE CONSEQUENCE, TRACED THROUGH censusOverHashedFiles AND censusFindings TOGETHER.
 *
 * `seenPackages.add(pkg)` runs unconditionally, so a wildcard re-export of a brand new
 * external package is not invisible to the CENSUS OBJECT. But `censusFindings`'s
 * "undeclared-package" rule only iterates `census.byPackage`, which a wildcard re-export
 * never populates because of the early `continue` above. A completely new external
 * dependency, imported into this package for the first time via nothing but
 * `export * from "some-new-package";` in one hashed file, produces ZERO findings: not
 * "undeclared-package", not "undeclared-binding", nothing. Every value that package
 * exports, `competingRoutesFor` included if the new package happened to be a second copy
 * of `@blueberry/feedback` under a different specifier, becomes reachable from any other
 * file in this package via a plain relative import of the barrel, and the census that
 * exists specifically to force every value import to be declared says nothing about it.
 *
 * This is strictly worse than the binding-level gap the mixed-package machinery already
 * defends against (a NEW BINDING off an ALREADY DECLARED mixed package, which
 * `external-data-declaration.test.ts` already proves is caught): here the whole PACKAGE
 * is new and undeclared, and the census is silent regardless.
 *
 * WHY THIS IS TESTED AGAINST THE REAL EXPORTED PIPELINE RATHER THAN A MOCK.
 *
 * `scanImports` is exported and run unmodified. The census construction below is not a
 * re-implementation with different rules; it is line-for-line the same two rules
 * `censusOverHashedFiles` applies (seenPackages always, byPackage only when
 * `valueBindings.length > 0`), applied to `scanImports`'s real output, so this is a
 * faithful reproduction of the production code path rather than a strawman.
 *
 * As with the neighbouring test file, the keyword is assembled at runtime so this file's
 * own sample text is not itself counted as a real import by the census that scans this
 * package.
 *
 * =====================================================================================
 * WHAT CLOSED IT, AND WHAT THIS FILE ASSERTS NOW.
 *
 * Everything above is the finding as it was filed and is left exactly as written, because
 * it is the record of what the gap was. The assertions below are inverted: they now assert
 * the closed behaviour, which is what the finding's own last paragraph asked for.
 *
 * The fix is in `valueBindingsOf` in src/integrity.ts, not in `censusFindings`. A bare
 * `export * from "pkg"` is now recorded as the wildcard value binding "*", the same
 * binding `import * as ns from "pkg"` has always produced, so the two wildcard forms are
 * symmetric and everything downstream of the scanner works unchanged. `byPackage` is
 * populated, and `censusFindings` reports `undeclared-package` off the same rule it always
 * used.
 *
 * The adversary's own suggestion, walking `seenPackages` as well as `byPackage`, was
 * considered and not taken. `seenPackages` deliberately holds every specifier seen at all,
 * type only and side effect imports included, and the census's contract is about VALUES: a
 * type is erased at runtime and carries no data the suite grades against, which is why a
 * type only import contributes no bindings on purpose. Reporting `undeclared-package` off
 * `seenPackages` would turn `import type { Foo } from "pkg"` into a hard stop and would
 * print "is imported for its values ()" with nothing in the parentheses. `seenPackages` is
 * also already the fallback that keeps a declared but type only package from reading as
 * `declared-but-unused`, and one set cannot mean two different things in two rules. The
 * scanner was wrong; the census was answering correctly the question it was asked.
 *
 * The two contrast cases below are kept and still pass unchanged. They are what proves the
 * fix made the wildcard forms agree with each other rather than making everything fire.
 * =====================================================================================
 */

const KEYWORD = ["exp", "ort"].join("");
const IMP_KEYWORD = ["imp", "ort"].join("");

/**
 * censusOverHashedFiles's own construction, copied faithfully from src/integrity.ts so this
 * test exercises the identical rule rather than a paraphrase of it.
 */
function censusFromSource(specimen: { readonly relativePath: string; readonly source: string }): ImportCensus {
  const byPackage = new Map<string, Map<string, Set<string>>>();
  const seenPackages = new Set<string>();

  const isExternal = (specifier: string): boolean =>
    !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.startsWith("node:");
  const packageOf = (specifier: string): string => {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] as string);
  };

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

  return { byPackage, seenPackages };
}

describe("scanImports classifies all three wildcard forms as one wildcard value binding", () => {
  it("`export * as ns from` is classified, same as `import * as ns from`", () => {
    const sites = scanImports(`${KEYWORD} * as ns from "totally-new-external-package";`);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.valueBindings).toEqual(["*"]);
  });

  it("`import * as ns from` is classified as a wildcard binding", () => {
    const sites = scanImports(`${IMP_KEYWORD} * as ns from "totally-new-external-package";`);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.valueBindings).toEqual(["*"]);
  });

  it("and bare `export * from`, with no `as` clause, is classified the same way", () => {
    const sites = scanImports(`${KEYWORD} * from "totally-new-external-package";`);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.specifier).toBe("totally-new-external-package");
    // This was the gap. Semantically this line re-exports every named export of the
    // package as a value any importer of this module can use, so it is at least as much a
    // value import as the two forms above, and it is now recorded as the same binding.
    expect(sites[0]?.valueBindings).toEqual(["*"]);
  });

  it("`export type * from` stays type only and still carries no value bindings", () => {
    const sites = scanImports(`${KEYWORD} type * from "totally-new-external-package";`);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.specifier).toBe("totally-new-external-package");
    // The other side of the fix. A type only wildcard re-export carries no runtime value,
    // so widening the wildcard branch must not widen this one with it.
    expect(sites[0]?.valueBindings).toEqual([]);
  });
});

describe(
  "the consequence, now closed: a brand new external package, introduced only through a " +
    "bare wildcard re-export, is reported as undeclared",
  () => {
    it("seenPackages notices it, byPackage now does too, and censusFindings reports it", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/barrel.ts",
        source: `${KEYWORD} * from "totally-new-external-package";\n`,
      });

      expect(census.seenPackages.has("totally-new-external-package")).toBe(true);
      // Was false. The barrel now populates byPackage under the wildcard binding, which is
      // the map censusFindings actually walks.
      expect(census.byPackage.has("totally-new-external-package")).toBe(true);
      expect([...(census.byPackage.get("totally-new-external-package")?.keys() ?? [])]).toEqual([
        "*",
      ]);

      const findings = censusFindings(census, []);
      const mentionsNewPackage = findings.some((finding) =>
        finding.detail.includes("totally-new-external-package"),
      );
      // The gate this test now holds: an entirely undeclared external package, freshly
      // imported for its values via a barrel, is a hard stop with its own status, exactly
      // as it always was for a plain named import.
      expect(mentionsNewPackage).toBe(true);
      expect(findings.map((finding) => finding.kind)).toEqual(["undeclared-package"]);
    });

    it("a type only wildcard re-export of an undeclared package is still not a finding", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/types-barrel.ts",
        source: `${KEYWORD} type * from "totally-new-external-package";\n`,
      });

      expect(census.seenPackages.has("totally-new-external-package")).toBe(true);
      expect(census.byPackage.has("totally-new-external-package")).toBe(false);
      // This is the case that walking seenPackages would have broken. A type carries no
      // value the suite grades anything against, so requiring a classification for one
      // would be friction with nothing on the other side of it.
      expect(censusFindings(census, [])).toEqual([]);
    });

    it("contrast: the same new package, imported for one named value directly, IS caught", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/direct.ts",
        source: `${IMP_KEYWORD} { somethingImported } from "totally-new-external-package";\n`,
      });

      expect(census.byPackage.has("totally-new-external-package")).toBe(true);

      const findings = censusFindings(census, []);
      expect(findings.some((finding) => finding.kind === "undeclared-package")).toBe(true);
      expect(
        findings.some((finding) => finding.detail.includes("totally-new-external-package")),
      ).toBe(true);
    });
  },
);
