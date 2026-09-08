import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { conservationChecks } from "../src/checks/conservation/index.ts";
import {
  declaresLoaderRefusal,
  LOADER_CHECK_NAME,
} from "../src/checks/conservation/family.ts";
import { loadCorpus } from "../src/checks/conservation/fixture-schema.ts";

/**
 * THE NEGATIVE CONTROLS FOR `conservation-fixture-schema`, WHICH CANNOT LIVE IN fixtures/.
 *
 * The fourth pass adversary filed a pathway whose two SN1 capture steps carried the same
 * step id: correct chemistry, two honest annotations, and unwritable, because annotation
 * binding keys on the step id string. `parsePathway` now refuses such a pathway, and
 * `conservation-fixture-schema` is the name that lets a fixture declare, in its own
 * `expect.mustFail`, that being refused is the point.
 *
 * That mechanism has exactly one negative control on disk, the adversary's own fixture, and
 * it can only demonstrate the row where a declared refusal happens. The other three rows
 * cannot be fixtures at all:
 *
 *   a refusal NOT declared             would make the committed suite red by construction.
 *   a fixture declaring the loader
 *     and then PARSING                 would make the committed suite red by construction.
 *   a refusal so early that `expect`
 *     itself never parsed              cannot carry a declaration to test.
 *
 * So they are here, driven over a temporary corpus directory built in this file, using the
 * real exported `loadCorpus` and the real registered check. Nothing under fixtures/ is
 * touched and nothing about the committed corpus is assumed.
 *
 * WHY THIS FILE EXISTS AT ALL, RATHER THAN TRUSTING THE ONE FIXTURE. The exemption is the
 * only place in this family where a failure is turned into a pass, so it is the first thing
 * an adversary should attack. Three of its four rows are unobservable from the corpus, and
 * an exemption whose refusal path is untested is an exemption that could quietly become
 * unconditional.
 */

let corpusDir: string;

/** A one step SN2, valid against the schema, with the id and expectation supplied. */
function fixtureText(input: {
  readonly id: string;
  readonly expect: Record<string, unknown>;
  readonly duplicateStepId: boolean;
}): string {
  const step = (stepId: string) => ({
    id: stepId,
    identity: {
      elementaryStep: "concerted_substitution",
      route: "sn2",
      reactionCenters: ["C1"],
    },
    arrows: [
      {
        id: "a1",
        electrons: 2,
        source: { kind: "lonePair", atomId: "O1" },
        sink: { kind: "betweenAtoms", atomIds: ["O1", "C1"] },
      },
    ],
    from: {
      id: `${stepId}-from`,
      members: [
        {
          role: "substrate",
          species: {
            id: "chloromethane",
            atoms: [
              { id: "C1", element: "C", implicitHydrogens: 3 },
              { id: "Cl1", element: "Cl", lonePairs: 3 },
            ],
            bonds: [{ id: "b1", a: "C1", b: "Cl1", order: 1 }],
          },
        },
        {
          role: "nucleophile",
          species: {
            id: "hydroxide",
            atoms: [
              { id: "O1", element: "O", formalCharge: -1, lonePairs: 3 },
              { id: "H1", element: "H" },
            ],
            bonds: [{ id: "b2", a: "O1", b: "H1", order: 1 }],
          },
        },
      ],
    },
    to: {
      id: `${stepId}-to`,
      members: [
        {
          role: "substrate",
          species: {
            id: "chloromethane",
            atoms: [
              { id: "C1", element: "C", implicitHydrogens: 3 },
              { id: "Cl1", element: "Cl", lonePairs: 3 },
            ],
            bonds: [{ id: "b1", a: "C1", b: "Cl1", order: 1 }],
          },
        },
        {
          role: "nucleophile",
          species: {
            id: "hydroxide",
            atoms: [
              { id: "O1", element: "O", formalCharge: -1, lonePairs: 3 },
              { id: "H1", element: "H" },
            ],
            bonds: [{ id: "b2", a: "O1", b: "H1", order: 1 }],
          },
        },
      ],
    },
  });

  return JSON.stringify(
    {
      schemaVersion: 2,
      id: input.id,
      title: "a temporary fixture built by loader-refusal-is-declared-never-assumed.test.ts",
      expect: input.expect,
      pathway: {
        id: "temporary-pathway",
        route: "sn2",
        steps: input.duplicateStepId ? [step("step-1"), step("step-1")] : [step("step-1")],
      },
    },
    null,
    2,
  );
}

async function write(name: string, text: string): Promise<string> {
  const absolute = path.join(corpusDir, `${name}.fixture.json`);
  await fs.writeFile(absolute, text, "utf8");
  return absolute;
}

beforeAll(async () => {
  corpusDir = await fs.mkdtemp(path.join(os.tmpdir(), "blueberry-loader-refusal-"));
});

afterAll(async () => {
  await fs.rm(corpusDir, { recursive: true, force: true });
});

describe("the refusal itself", () => {
  it("a pathway with two steps sharing an id is refused, and the message names the real problem", async () => {
    const absolute = await write(
      "temp-duplicate-step-id-undeclared",
      fixtureText({
        id: "temp-duplicate-step-id-undeclared",
        expect: { kind: "good" },
        duplicateStepId: true,
      }),
    );

    const corpus = await loadCorpus([absolute], corpusDir);
    expect(corpus.fixtures).toHaveLength(0);
    expect(corpus.loadErrors).toHaveLength(1);

    const message = corpus.loadErrors[0]?.message ?? "";
    // Not a generic "could not parse". It says which two steps, and why it matters.
    expect(message).toContain("steps[1].id");
    expect(message).toContain("already the id of steps[0]");
    expect(message).toContain("unique within a pathway");
  });

  it("the same pathway with distinct step ids parses, so the rule is about the ids and nothing else", async () => {
    const absolute = await write(
      "temp-distinct-step-ids",
      fixtureText({
        id: "temp-distinct-step-ids",
        expect: { kind: "good" },
        duplicateStepId: false,
      }),
    );

    const corpus = await loadCorpus([absolute], corpusDir);
    expect(corpus.loadErrors).toEqual([]);
    expect(corpus.fixtures).toHaveLength(1);
  });
});

describe("the exemption is authored in the fixture, and only there", () => {
  it("an undeclared refusal is still a hard failure in an ordinary check", async () => {
    const absolute = await write(
      "temp-refusal-not-declared",
      fixtureText({
        id: "temp-refusal-not-declared",
        expect: { kind: "good" },
        duplicateStepId: true,
      }),
    );

    const corpus = await loadCorpus([absolute], corpusDir);
    expect(declaresLoaderRefusal(corpus.loadErrors[0] as never)).toBe(false);

    const valence = conservationChecks.find((check) => check.name === "conservation-valence");
    const result = await valence?.run({
      repoRoot: corpusDir,
      packageRoot: corpusDir,
      fixturesDir: corpusDir,
      fixtures: [absolute],
    });
    expect(result?.status).toBe("fail");
    expect(result?.failures.some((failure) => failure.actual.includes("already the id of"))).toBe(
      true,
    );
  });

  it("a declared refusal is read as the control firing, and the declaration is the fixture's own", async () => {
    const absolute = await write(
      "temp-refusal-declared",
      fixtureText({
        id: "temp-refusal-declared",
        expect: {
          kind: "broken",
          mustFail: [LOADER_CHECK_NAME],
          note: "declares that the loader must refuse it",
        },
        duplicateStepId: true,
      }),
    );

    const corpus = await loadCorpus([absolute], corpusDir);
    expect(corpus.loadErrors).toHaveLength(1);
    expect(declaresLoaderRefusal(corpus.loadErrors[0] as never)).toBe(true);

    // A second, ordinary fixture, because a corpus in which every file was refused is an
    // empty corpus and family.ts fails that on its own terms. The question here is whether
    // the declared refusal is a failure, not whether an empty corpus is.
    const companion = await write(
      "temp-refusal-declared-companion",
      fixtureText({
        id: "temp-refusal-declared-companion",
        expect: { kind: "good" },
        duplicateStepId: false,
      }),
    );

    const loader = conservationChecks.find((check) => check.name === LOADER_CHECK_NAME);
    const result = await loader?.run({
      repoRoot: corpusDir,
      packageRoot: corpusDir,
      fixturesDir: corpusDir,
      fixtures: [absolute, companion],
    });
    // Not a failure, and the refusal is printed rather than swallowed.
    expect(result?.failures).toEqual([]);
    expect(result?.status).toBe("pass");
    expect(
      result?.notMeasurable?.some((entry) => entry.property.includes("refused by the loader")),
    ).toBe(true);
  });

  it("declaring the loader check and then PARSING is a failure, so the exemption cannot rot", async () => {
    const absolute = await write(
      "temp-declared-but-parses",
      fixtureText({
        id: "temp-declared-but-parses",
        expect: {
          kind: "broken",
          mustFail: [LOADER_CHECK_NAME],
          note: "claims the loader must refuse it, but nothing in it is malformed",
        },
        duplicateStepId: false,
      }),
    );

    const loader = conservationChecks.find((check) => check.name === LOADER_CHECK_NAME);
    const result = await loader?.run({
      repoRoot: corpusDir,
      packageRoot: corpusDir,
      fixturesDir: corpusDir,
      fixtures: [absolute],
    });
    expect(result?.status).toBe("fail");
    expect(
      result?.failures.some((failure) => failure.actual.includes("it parsed cleanly")),
    ).toBe(true);
  });

  it("a file too malformed to reach expect cannot claim the exemption", async () => {
    // The declaration lives in `expect`, and `expect` is parsed before the pathway
    // precisely so a file the loader is about to refuse can still carry it. A file that is
    // not JSON at all, or whose header is wrong, never gets that far, so it can never buy
    // silence. This is the guard that keeps the exemption from being a free pass.
    const absolute = path.join(corpusDir, "temp-not-json.fixture.json");
    await fs.writeFile(absolute, "{ this is not json", "utf8");

    const corpus = await loadCorpus([absolute], corpusDir);
    expect(corpus.loadErrors).toHaveLength(1);
    expect(corpus.loadErrors[0]?.expect).toBeUndefined();
    expect(declaresLoaderRefusal(corpus.loadErrors[0] as never)).toBe(false);
  });
});
