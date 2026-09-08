import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  EXTERNAL_DATA,
  censusFindings,
  computeCurrentLock,
  scanImports,
  type DeclaredExternalPackage,
  type ImportCensus,
} from "../src/integrity.ts";
import { LOCK_PATH } from "../src/paths.ts";

/**
 * THE ANSWER KEY IS IN THE LOCK, AND THE DECLARATION OF IT CANNOT BE SATISFIED BY
 * ACCIDENT.
 *
 * This is the builder side of adversary pass two, finding 4, which
 * `rate-comparison-competing-routes-not-locked.test.ts` demonstrated next door. That test
 * showed that `conservation-disfavoured-rate-comparison` rule 4 asks
 * `competingRoutesFor()` in packages/feedback which route beats a strongly hindered SN2,
 * and that validators.lock.json hashed nothing outside packages/validators, so one array
 * literal in an ordinary implementation package decided what the suite accepts with
 * nothing to see in a validator run.
 *
 * That test is left exactly as the adversary wrote it and it still passes: mocking the
 * module still flips the verdict, because the check is unchanged and rule 4 is still a
 * joint claim over a fixture AND a copy file. What has changed is the second half of its
 * closing paragraph. Its statement that "validators.lock.json hashes only files inside
 * packages/validators" is now out of date, and the widening it names, "widening
 * validators.lock.json to also hash the feedback package's copy files it structurally
 * depends on", is what integrity.ts now does, narrowly. Nothing in this file weakens that
 * test or replaces it. The demonstration and the fix are different artifacts and both are
 * worth keeping.
 *
 * Four things are asserted here, and none of them is "the source contains the string I
 * expected". Each one is a hole somebody could fall into.
 */

function censusOf(
  entries: Readonly<Record<string, readonly string[]>>,
  extraSeen: readonly string[] = [],
): ImportCensus {
  const byPackage = new Map<string, Map<string, Set<string>>>();
  for (const [specifier, bindings] of Object.entries(entries)) {
    byPackage.set(
      specifier,
      new Map(bindings.map((binding) => [binding, new Set(["tests/synthetic.ts"])])),
    );
  }
  return {
    byPackage,
    seenPackages: new Set([...Object.keys(entries), ...extraSeen]),
  };
}

/** The census the real declaration is satisfied by: every declared binding, imported. */
function censusMatchingDeclaration(
  declaration: readonly DeclaredExternalPackage[] = EXTERNAL_DATA,
): ImportCensus {
  const entries: Record<string, readonly string[]> = {};
  for (const declared of declaration) {
    entries[declared.specifier] =
      declared.bindings === undefined ? ["somethingImported"] : Object.keys(declared.bindings);
  }
  return censusOf(entries);
}

describe("the external data declaration is a census, checked against the real import graph", () => {
  it("is satisfied by the imports it describes, so a green run means something", () => {
    expect(censusFindings(censusMatchingDeclaration())).toEqual([]);
  });

  /**
   * The stand-in package here USED TO BE @blueberry/curriculum, and it was changed in
   * Phase 3 wave two when that package became a real declared dependency: a specimen
   * that is genuinely declared cannot demonstrate an undeclared one, and this test went
   * red on the day the census did its job correctly.
   *
   * The assertion is unchanged. Only the name of the imaginary package moved, and it is
   * asserted below to be absent from EXTERNAL_DATA rather than merely believed absent,
   * so the next package this repository adds cannot quietly hollow this test out the way
   * curriculum just did.
   */
  it("a value import from a package nobody declared is a finding, not a pass", () => {
    const undeclared = "@blueberry/pathway";
    expect(
      EXTERNAL_DATA.some((entry) => entry.specifier === undeclared),
      `${undeclared} is now declared, so it can no longer stand in for an undeclared package`,
    ).toBe(false);

    const census = censusMatchingDeclaration();
    census.byPackage.set(
      undeclared,
      new Map([["unlockStateForTopic", new Set(["src/checks/conservation/invented.ts"])]]),
    );
    census.seenPackages.add(undeclared);

    const findings = censusFindings(census);
    expect(findings.map((finding) => finding.kind)).toContain("undeclared-package");
    expect(findings.some((finding) => finding.detail.includes(undeclared))).toBe(true);
  });

  /**
   * The one that matters most. @blueberry/feedback is already declared, so a package
   * level census would wave through a NEW binding out of it, and a new binding out of it
   * is exactly how finding 4 arrived: `competingRoutesFor` was an ordinary import from an
   * already ordinary dependency.
   */
  it("a new binding out of an already declared mixed package is a finding too", () => {
    const census = censusMatchingDeclaration();
    const feedback = census.byPackage.get("@blueberry/feedback");
    expect(feedback).toBeDefined();
    feedback?.set("copyEntriesBySeverity", new Set(["src/checks/feedback/invented.ts"]));

    const findings = censusFindings(census);
    expect(findings.map((finding) => finding.kind)).toContain("undeclared-binding");
    expect(findings.some((finding) => finding.detail.includes("copyEntriesBySeverity"))).toBe(true);
  });

  it("declaring a binding oracle-data without a projection to fingerprint it is a finding", () => {
    const declaration: readonly DeclaredExternalPackage[] = [
      {
        specifier: "@blueberry/feedback",
        role: "mixed",
        reason: "synthetic",
        bindings: {
          competingRoutesFor: { role: "oracle-data", reason: "synthetic" },
        },
        // No projections. This is the shape somebody produces when they classify an
        // import honestly and stop before fingerprinting it, which would leave the answer
        // key out of the lock while the declaration looked complete.
      },
    ];
    const findings = censusFindings(censusMatchingDeclaration(declaration), declaration);
    expect(findings.map((finding) => finding.kind)).toContain("unfingerprinted-oracle");
  });

  it("a declared binding nothing imports any more is a finding, so the census cannot only grow", () => {
    const census = censusMatchingDeclaration();
    census.byPackage.get("@blueberry/feedback")?.delete("competingRoutesFor");

    const findings = censusFindings(census);
    expect(findings.map((finding) => finding.kind)).toContain("declared-but-unused");
  });
});

/**
 * The census scans every .ts file the lock hashes, and this file is one of them. A test
 * input written as a literal import statement would therefore be counted as a real
 * import of this package, and a sample naming a package that does not exist would fail
 * the whole suite with a confusing message. So the keyword is assembled at runtime in
 * every sample below. The scanner's own tests do not get to vote in the census they feed.
 */
const KEYWORD = ["imp", "ort"].join("");

describe("the import scanner the census is built from", () => {
  it("reads a multi line named import and separates value bindings from type only ones", () => {
    const sites = scanImports(
      [
        `${KEYWORD} {`,
        "  allMechanismRoutes,",
        "  findAtom,",
        "  type MechanismRoute,",
        "} from '@blueberry/chem-core';",
        `${KEYWORD} type { CauseId } from '@blueberry/chem-core';`,
      ].join("\n"),
    );
    const values = sites.flatMap((site) => site.valueBindings);
    expect(values).toContain("allMechanismRoutes");
    expect(values).toContain("findAtom");
    expect(values).not.toContain("MechanismRoute");
    expect(values).not.toContain("CauseId");
  });

  it("does not read an import out of a comment, which is most of this repository by line count", () => {
    const sites = scanImports(
      [
        "/**",
        ` * This file talks about ${KEYWORD} { competingRoutesFor } from '@blueberry/feedback'`,
        " * at length, because the reason it exists is worth writing down.",
        " */",
        `// ${KEYWORD} { causeCopy } from '@blueberry/feedback';`,
        "const x = 1;",
      ].join("\n"),
    );
    expect(sites).toEqual([]);
  });

  it("reads a dynamic import and a side effect import, which are still ways in", () => {
    const sites = scanImports(
      [
        `const m = await ${KEYWORD}('@blueberry/feedback');`,
        `${KEYWORD} 'some-polyfill';`,
      ].join("\n"),
    );
    expect(sites.map((site) => site.specifier).sort()).toEqual([
      "@blueberry/feedback",
      "some-polyfill",
    ]);
  });
});

describe("the competing route answer key is in the committed lock", () => {
  it("the projection on disk is byte identical to the one the lock records", async () => {
    const onDisk = (await computeCurrentLock()).lock.externalData.entries;
    const stored = JSON.parse(await readFile(LOCK_PATH, "utf8")) as {
      externalData?: { entries?: Record<string, string> };
    };
    const projectionsOf = (entries: Readonly<Record<string, string>>): Record<string, string> =>
      Object.fromEntries(
        Object.entries(entries).filter(([key]) => key.includes(" projection ")),
      );

    // Deliberately narrower than checkIntegrity(), which compares everything. This
    // assertion is about the answer key alone, so it stays green while somebody is
    // halfway through editing a check and goes red only when the data a fixture is
    // graded against has moved without a deliberate lock regeneration.
    expect(projectionsOf(onDisk)).toEqual(projectionsOf(stored.externalData?.entries ?? {}));
  });

  it("names the neopentyl route the adversary's fixture was rejected for not naming", async () => {
    const entries = (await computeCurrentLock()).lock.externalData.entries;
    expect(
      entries[
        "@blueberry/feedback projection cause-copy-competing-routes sn2_center_strongly_hindered"
      ],
    ).toBe("carbocation_rearrangement");
  });
});
