import fs from "node:fs/promises";
import path from "node:path";

import { PACKAGE_ROOT, toPackageRelative } from "../../paths.ts";
import {
  ORACLE_PROTOCOL,
  ORACLE_VERSION,
  type OracleRequest,
  type SanitizationMayFail,
  type SpeciesPayload,
  type StatePayload,
} from "./payload.ts";

/**
 * Reading the oracle's input corpus off disk.
 *
 * Two sources, both described in packages/validators/python/CONTRACT.md, "Corpus files":
 *
 *   1. packages/validators/python/corpus/*.oracle.json, the oracle's own corpus, which
 *      is authored as JSON because it exists to pin RDKit's behaviour and needs no
 *      chem-core objects to do it.
 *   2. any file under packages/validators/fixtures/ whose name ends .oracle.json. That
 *      directory belongs to the chem-core fixture author. Nothing here writes to it and
 *      nothing here requires it to contain anything. When chem-core fixtures land they
 *      reach the oracle through serializeState() in payload.ts, which produces exactly
 *      the same wire shape.
 *
 * WHAT THIS FILE VALIDATES, AND WHAT IT DELIBERATELY DOES NOT.
 *
 * It validates the corpus wrapper only: the protocol line, the sequence shape, and the
 * one key the wire format does not have, `expect`. It does not validate atoms, bonds, or
 * stereo blocks, because the sidecar already validates those strictly and rejects unknown
 * keys at every level. A second copy of that validation here would be a second thing to
 * keep in step with CONTRACT.md, and the two would drift. A malformed atom therefore
 * arrives as a `fatal` from the sidecar naming the exact state index, which run.ts turns
 * into a failed run.
 *
 * A structural problem found here does not shrink the corpus. It makes the whole oracle
 * run unusable, and every oracle check fails. Dropping an unreadable file and carrying on
 * would report a smaller corpus as a green one, which is the exact silent-pass this
 * package exists to prevent.
 */

export const CORPUS_PROTOCOL = "blueberry-oracle-corpus";
export const CORPUS_VERSION = 1;

/** Absolute path to the oracle's own corpus directory. */
export const ORACLE_CORPUS_DIR: string = path.join(PACKAGE_ROOT, "python", "corpus");

/** Absolute path to the sidecar itself. */
export const SIDECAR_PATH: string = path.join(PACKAGE_ROOT, "python", "oracle_sidecar.py");

/** Files ending in this suffix, anywhere in the fixtures tree, are oracle corpus files. */
export const CORPUS_SUFFIX = ".oracle.json";

const ALLOWED_CORPUS_KEYS = ["protocol", "version", "name", "description", "sequences"];
const ALLOWED_SEQUENCE_KEYS = [
  "id",
  "description",
  "aromaticityInvariantAtomIds",
  "states",
];
const REQUIRED_EXPECT_KEYS = ["meso"];
const OPTIONAL_EXPECT_KEYS = ["unspecifiedStereoDeclared"];
const REQUIRED_DECLARATION_KEYS = ["kind", "ref", "justification", "declaredBy"];
const DECLARATION_KINDS = ["atom", "bond"];

/**
 * An author's recorded, attackable claim that one potential stereo element RDKit reports
 * as unconfigured is an artifact of how the state is written, not an unlabelled centre.
 *
 * This is the same shape and the same discipline as `sanitizationMayFail` in payload.ts,
 * and it exists for the same reason: an escape hatch nobody signed is a blanket one. The
 * cases the stereo check draws from it are listed in stereo-descriptors.ts and in
 * CONTRACT.md, and two of the four are failures.
 *
 * IT DOES NOT TRAVEL ON THE WIRE. `kind` and `ref` name an element in the sidecar's
 * `unspecifiedPotentialStereo` output, so the declaration is only meaningful after RDKit
 * has answered. Sending it would let the sidecar read a claim it is being used to grade.
 * It rides in `expect`, the one corpus key the bridge strips, next to `expect.meso`.
 */
export interface UnspecifiedStereoDeclaration {
  /** Matches the `kind` of a sidecar unspecifiedPotentialStereo entry: atom or bond. */
  readonly kind: string;
  /** The corpus atom or bond id the element is centred on. */
  readonly ref: string;
  /** Why this element is not an unlabelled stereocentre. Required, non empty. */
  readonly justification: string;
  /** Problem id or author. Who signed it. */
  readonly declaredBy: string;
}

export interface CorpusSpecies {
  readonly id: string;
  /**
   * The author's meso claim, or null when the species carries no `expect` block at all.
   * Null and false are different answers and the meso check treats them differently: a
   * species that lost its expectation must be visible, not read as "expected false".
   */
  readonly expectMeso: boolean | null;
  /**
   * Declared artifact stereo elements. Empty when nothing is declared, which is the same
   * statement as no `expect` block at all: an undeclared unspecified element fails.
   * Unlike expectMeso there is no null case, because there is nothing an author can lose
   * here without the stale-declaration rule in stereo-descriptors.ts firing.
   */
  readonly unspecifiedStereoDeclared: readonly UnspecifiedStereoDeclaration[];
}

export interface CorpusState {
  /** Unique across the whole corpus. Composed here, never read from the file. */
  readonly stateRef: string;
  readonly sequenceId: string;
  /** Package relative path of the file this came from. */
  readonly file: string;
  /** Position within the sequence, from zero. */
  readonly index: number;
  /** Exactly what goes on the wire. `expect` has been removed. */
  readonly payload: StatePayload;
  readonly species: readonly CorpusSpecies[];
  /** Every atom id in the state, across all species. */
  readonly atomIds: ReadonlySet<string>;
  /** Atom id to the id of the species holding it. */
  readonly speciesByAtomId: ReadonlyMap<string, string>;
  readonly sanitizationMayFail: SanitizationMayFail | null;
}

export interface CorpusSequence {
  readonly id: string;
  readonly file: string;
  readonly description: string;
  readonly aromaticityInvariantAtomIds: readonly string[];
  readonly states: readonly CorpusState[];
}

export interface LoadedCorpus {
  /** Package relative paths of every file read, sorted. */
  readonly files: readonly string[];
  readonly sequences: readonly CorpusSequence[];
  /** Every state, flattened, in the order they are sent to the sidecar. */
  readonly states: readonly CorpusState[];
  /** Structural problems. Non empty means the run is unusable. */
  readonly errors: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Unknown keys are an error, not an ignorable extra.
 *
 * CONTRACT.md gives the reason for the same rule in the sidecar: a typo in a field name
 * read as "the author did not state this" is how a check quietly stops checking. An
 * `expct` block would otherwise silently remove a meso expectation.
 *
 * `optional` keys may be absent but may not be misspelled. There is exactly one of them,
 * `expect.unspecifiedStereoDeclared`, and it is optional because absent and empty are the
 * same statement there: nothing is declared, so an unspecified element fails. A misspelled
 * one still has to be loud, because `unspecifiedStereoDeclaired` read as "nothing
 * declared" would turn a real declaration into a silent hard failure and, worse, the
 * matching stale-declaration rule would never see it.
 */
function keyProblems(
  value: Record<string, unknown>,
  required: readonly string[],
  where: string,
  optional: readonly string[] = [],
): string[] {
  const problems: string[] = [];
  const allowed = [...required, ...optional];
  const unknown = Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .sort();
  if (unknown.length > 0) {
    problems.push(
      `${where}: unknown key(s) ${unknown.join(", ")}. Allowed: ${[...allowed].sort().join(", ")}`,
    );
  }
  const missing = required.filter((key) => !(key in value)).sort();
  if (missing.length > 0) {
    problems.push(`${where}: missing required key(s) ${missing.join(", ")}`);
  }
  return problems;
}

/**
 * Read `expect.unspecifiedStereoDeclared`.
 *
 * Everything structural about a declaration is rejected here rather than downstream,
 * because a half formed declaration must never reach the point where it could be read as
 * covering an element. The empty justification is checked in BOTH places: here, so a
 * corpus file carrying one cannot be loaded at all, and again in stereo-descriptors.ts, so
 * the rule "a declaration without a justification covers nothing" is a property of the
 * evaluator rather than a property of one file reader that happens to run first. The
 * evaluator copy is the one the gate self test drives.
 *
 * Returns null when the block is unusable, which makes the whole state unusable, which
 * makes the run unusable. A dropped state would be a smaller corpus reported as a green
 * one.
 */
function parseUnspecifiedStereoDeclarations(
  raw: unknown,
  where: string,
  errors: string[],
): UnspecifiedStereoDeclaration[] | null {
  if (!Array.isArray(raw)) {
    errors.push(
      `${where}: unspecifiedStereoDeclared must be an array. Omit the key entirely to ` +
        `declare nothing`,
    );
    return null;
  }

  const declarations: UnspecifiedStereoDeclaration[] = [];
  let usable = true;

  for (const [slot, entry] of raw.entries()) {
    const at = `${where}.unspecifiedStereoDeclared[${slot}]`;
    if (!isRecord(entry)) {
      errors.push(`${at}: must be an object`);
      usable = false;
      continue;
    }
    const problems = keyProblems(entry, REQUIRED_DECLARATION_KEYS, at);
    if (problems.length > 0) {
      errors.push(...problems);
      usable = false;
      continue;
    }

    const kind = entry["kind"];
    if (typeof kind !== "string" || !DECLARATION_KINDS.includes(kind)) {
      errors.push(`${at}: kind must be one of ${DECLARATION_KINDS.join(", ")}`);
      usable = false;
      continue;
    }
    const ref = entry["ref"];
    if (typeof ref !== "string" || ref.trim() === "") {
      errors.push(`${at}: ref must be a non empty atom or bond id`);
      usable = false;
      continue;
    }
    const justification = entry["justification"];
    if (typeof justification !== "string" || justification.trim() === "") {
      errors.push(
        `${at}: justification must be a non empty string. A declaration is a recorded ` +
          `act an adversary can read and argue with; one with nothing written on it is ` +
          `an unsigned skip`,
      );
      usable = false;
      continue;
    }
    const declaredBy = entry["declaredBy"];
    if (typeof declaredBy !== "string" || declaredBy.trim() === "") {
      errors.push(`${at}: declaredBy must be a non empty problem id or author`);
      usable = false;
      continue;
    }

    if (declarations.some((one) => one.kind === kind && one.ref === ref)) {
      errors.push(
        `${at}: ${kind} ${ref} is declared twice. One element takes one declaration, so ` +
          `the second can never be matched and is stale the moment it is written`,
      );
      usable = false;
      continue;
    }

    declarations.push({ kind, ref, justification, declaredBy });
  }

  return usable ? declarations : null;
}

interface FileLoad {
  readonly sequences: readonly CorpusSequence[];
  readonly errors: readonly string[];
}

function loadOneFile(relativePath: string, raw: string): FileLoad {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      sequences: [],
      errors: [`${relativePath}: not valid JSON: ${(error as Error).message}`],
    };
  }

  if (!isRecord(parsed)) {
    return { sequences: [], errors: [`${relativePath}: top level must be a JSON object`] };
  }
  errors.push(...keyProblems(parsed, ALLOWED_CORPUS_KEYS, relativePath));
  if (parsed["protocol"] !== CORPUS_PROTOCOL) {
    errors.push(
      `${relativePath}: protocol is ${JSON.stringify(parsed["protocol"])}, ` +
        `this loader reads ${JSON.stringify(CORPUS_PROTOCOL)}`,
    );
  }
  if (parsed["version"] !== CORPUS_VERSION) {
    errors.push(
      `${relativePath}: version is ${JSON.stringify(parsed["version"])}, ` +
        `this loader reads ${CORPUS_VERSION}. Refusing to guess at a shape it does not know`,
    );
  }
  const rawSequences = parsed["sequences"];
  if (!Array.isArray(rawSequences)) {
    errors.push(`${relativePath}: sequences must be an array`);
    return { sequences: [], errors };
  }
  if (rawSequences.length === 0) {
    errors.push(`${relativePath}: sequences is empty. A corpus file that carries no state checks nothing`);
  }

  const sequences: CorpusSequence[] = [];
  const seenSequenceIds = new Set<string>();

  for (const [position, rawSequence] of rawSequences.entries()) {
    const where = `${relativePath} sequence[${position}]`;
    if (!isRecord(rawSequence)) {
      errors.push(`${where}: must be an object`);
      continue;
    }
    errors.push(...keyProblems(rawSequence, ALLOWED_SEQUENCE_KEYS, where));

    const id = rawSequence["id"];
    if (typeof id !== "string" || id.trim() === "") {
      errors.push(`${where}: id must be a non empty string`);
      continue;
    }
    if (seenSequenceIds.has(id)) {
      errors.push(
        `${relativePath}: duplicate sequence id ${JSON.stringify(id)}. Ids compose the ` +
          `stateRef a failure is reported under, so two of them makes a failure unattributable`,
      );
      continue;
    }
    seenSequenceIds.add(id);

    const description = rawSequence["description"];
    if (typeof description !== "string") {
      errors.push(`${where}: description must be a string`);
    }

    const invariant = rawSequence["aromaticityInvariantAtomIds"];
    const invariantIds: string[] = [];
    if (!Array.isArray(invariant)) {
      errors.push(
        `${where}: aromaticityInvariantAtomIds must be an array. Write [] to claim ` +
          `nothing; omitting the claim entirely is not the same statement`,
      );
    } else {
      for (const [slot, entry] of invariant.entries()) {
        if (typeof entry !== "string" || entry.trim() === "") {
          errors.push(`${where}: aromaticityInvariantAtomIds[${slot}] must be a non empty atom id`);
          continue;
        }
        if (invariantIds.includes(entry)) {
          errors.push(`${where}: aromaticityInvariantAtomIds names ${entry} twice`);
          continue;
        }
        invariantIds.push(entry);
      }
    }

    const rawStates = rawSequence["states"];
    if (!Array.isArray(rawStates)) {
      errors.push(`${where}: states must be an array`);
      continue;
    }
    if (rawStates.length === 0) {
      errors.push(`${where}: states is empty`);
      continue;
    }

    const states: CorpusState[] = [];
    for (const [index, rawState] of rawStates.entries()) {
      const stateWhere = `${where} state[${index}]`;
      if (!isRecord(rawState)) {
        errors.push(`${stateWhere}: must be an object`);
        continue;
      }
      if ("stateRef" in rawState) {
        errors.push(
          `${stateWhere}: carries its own stateRef. The bridge composes stateRef from the ` +
            `file, sequence, and index so it is unique and traceable; an authored one would ` +
            `be silently overwritten`,
        );
        continue;
      }
      const stateId = rawState["id"];
      if (typeof stateId !== "string" || stateId.trim() === "") {
        errors.push(`${stateWhere}: id must be a non empty string`);
        continue;
      }
      const rawSpecies = rawState["species"];
      if (!Array.isArray(rawSpecies)) {
        errors.push(`${stateWhere}: species must be an array`);
        continue;
      }
      if (rawSpecies.length === 0) {
        errors.push(`${stateWhere}: species is empty. A state is a multiset of species and an empty one is not a state`);
        continue;
      }

      const species: CorpusSpecies[] = [];
      const wireSpecies: SpeciesPayload[] = [];
      const atomIds = new Set<string>();
      const speciesByAtomId = new Map<string, string>();
      let stateUsable = true;

      for (const [slot, rawOne] of rawSpecies.entries()) {
        const speciesWhere = `${stateWhere} species[${slot}]`;
        if (!isRecord(rawOne)) {
          errors.push(`${speciesWhere}: must be an object`);
          stateUsable = false;
          continue;
        }
        const speciesId = rawOne["id"];
        if (typeof speciesId !== "string" || speciesId.trim() === "") {
          errors.push(`${speciesWhere}: id must be a non empty string`);
          stateUsable = false;
          continue;
        }

        let expectMeso: boolean | null = null;
        let declared: readonly UnspecifiedStereoDeclaration[] = [];
        if ("expect" in rawOne) {
          const expect = rawOne["expect"];
          if (!isRecord(expect)) {
            errors.push(`${speciesWhere}: expect must be an object`);
            stateUsable = false;
          } else {
            errors.push(
              ...keyProblems(
                expect,
                REQUIRED_EXPECT_KEYS,
                `${speciesWhere} expect`,
                OPTIONAL_EXPECT_KEYS,
              ),
            );
            const meso = expect["meso"];
            if (typeof meso === "boolean") {
              expectMeso = meso;
            } else {
              errors.push(`${speciesWhere}: expect.meso must be true or false`);
              stateUsable = false;
            }
            if ("unspecifiedStereoDeclared" in expect) {
              const parsed = parseUnspecifiedStereoDeclarations(
                expect["unspecifiedStereoDeclared"],
                `${speciesWhere} expect`,
                errors,
              );
              if (parsed === null) stateUsable = false;
              else declared = parsed;
            }
          }
        }

        // `expect` is the one key the wire format does not have. Everything else goes
        // through untouched, so a field this loader has never heard of still reaches the
        // sidecar and is rejected there by name rather than being dropped here.
        const { expect: _dropped, ...wire } = rawOne;
        void _dropped;
        wireSpecies.push(wire as unknown as SpeciesPayload);
        species.push({ id: speciesId, expectMeso, unspecifiedStereoDeclared: declared });

        const rawAtoms = rawOne["atoms"];
        if (Array.isArray(rawAtoms)) {
          for (const rawAtom of rawAtoms) {
            if (!isRecord(rawAtom)) continue;
            const atomId = rawAtom["id"];
            if (typeof atomId !== "string") continue;
            if (atomIds.has(atomId)) {
              errors.push(
                `${stateWhere}: atom id ${atomId} appears in more than one species. ` +
                  `The aromaticity check compares atom ids across states and cannot do ` +
                  `that when one id names two atoms`,
              );
              stateUsable = false;
              continue;
            }
            atomIds.add(atomId);
            speciesByAtomId.set(atomId, speciesId);
          }
        }
      }

      const duplicateSpecies = species
        .map((one) => one.id)
        .filter((id, at, all) => all.indexOf(id) !== at);
      if (duplicateSpecies.length > 0) {
        errors.push(
          `${stateWhere}: duplicate species id(s) ${[...new Set(duplicateSpecies)].sort().join(", ")}`,
        );
        stateUsable = false;
      }

      if (!stateUsable) continue;

      const mayFail = (rawState["sanitizationMayFail"] ?? null) as SanitizationMayFail | null;
      const stateRef = `${relativePath}#seq:${id}/state:${index}`;

      states.push({
        stateRef,
        sequenceId: id,
        file: relativePath,
        index,
        payload: {
          stateRef,
          id: stateId,
          sanitizationMayFail: mayFail,
          species: wireSpecies,
        },
        species,
        atomIds,
        speciesByAtomId,
        sanitizationMayFail: mayFail,
      });
    }

    sequences.push({
      id,
      file: relativePath,
      description: typeof description === "string" ? description : "",
      aromaticityInvariantAtomIds: invariantIds,
      states,
    });
  }

  return { sequences, errors };
}

async function listOracleCorpusFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(ORACLE_CORPUS_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(CORPUS_SUFFIX))
      .map((entry) => path.join(ORACLE_CORPUS_DIR, entry.name))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/**
 * Load every corpus file, from the oracle's own directory and from the fixture corpus.
 *
 * `fixtures` is CheckContext.fixtures, the already scanned absolute paths. This function
 * does not walk the fixture directory itself, so the fixture count in the report and the
 * set of files the oracle reads cannot disagree.
 */
export async function loadCorpus(fixtures: readonly string[]): Promise<LoadedCorpus> {
  const own = await listOracleCorpusFiles();
  const fromFixtures = fixtures.filter((file) => file.endsWith(CORPUS_SUFFIX)).slice().sort();
  const all = [...own, ...fromFixtures];

  const files: string[] = [];
  const sequences: CorpusSequence[] = [];
  const errors: string[] = [];

  for (const absolute of all) {
    const relative = toPackageRelative(absolute);
    files.push(relative);
    let raw: string;
    try {
      raw = await fs.readFile(absolute, "utf8");
    } catch (error) {
      errors.push(`${relative}: could not be read: ${(error as Error).message}`);
      continue;
    }
    const loaded = loadOneFile(relative, raw);
    sequences.push(...loaded.sequences);
    errors.push(...loaded.errors);
  }

  const states = sequences.flatMap((sequence) => sequence.states);

  const seenRefs = new Set<string>();
  for (const state of states) {
    if (seenRefs.has(state.stateRef)) {
      errors.push(
        `duplicate stateRef ${state.stateRef}. Results are matched back to input by ` +
          `stateRef, so two states under one ref means one of them is never checked`,
      );
    }
    seenRefs.add(state.stateRef);
  }

  return { files, sequences, states, errors };
}

/** The request that goes to the sidecar. One call, every state in the corpus. */
export function buildRequest(corpus: LoadedCorpus): OracleRequest {
  return {
    protocol: ORACLE_PROTOCOL,
    version: ORACLE_VERSION,
    states: corpus.states.map((state) => state.payload),
  };
}
