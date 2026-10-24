/**
 * The pKa paste vocabulary (STATUS C2). The chemistry of each SMILES is checked
 * by RDKit in scripts/check_pka_aliases.py; this file checks the keys and the
 * names: every rung covered, nothing pointing two ways.
 */

import { describe, expect, it } from "vitest";
import { PKA_TABLE, type PkaSiteId } from "@blueberry/curriculum";
import {
  PKA_ALIASES,
  PKA_KNOWN_NO_RUNG,
  PKA_RUNG_SMARTS,
  aliasIndex,
  normaliseSpeciesName,
} from "../settings/pkaAliases";

describe("pKa aliases", () => {
  it("keys every alias list and every SMARTS by a real rung", () => {
    for (const key of Object.keys(PKA_ALIASES)) expect(key in PKA_TABLE, key).toBe(true);
    for (const key of Object.keys(PKA_RUNG_SMARTS)) expect(key in PKA_TABLE, key).toBe(true);
  });

  it("gives every rung at least one alias and a SMARTS", () => {
    for (const id of Object.keys(PKA_TABLE) as PkaSiteId[]) {
      expect(PKA_ALIASES[id]?.length ?? 0, id).toBeGreaterThan(0);
      expect(PKA_RUNG_SMARTS[id], id).toBeTruthy();
    }
  });

  it("never maps one normalised name to two rungs", () => {
    const seen = new Map<string, PkaSiteId>();
    for (const [id, entries] of Object.entries(PKA_ALIASES) as [PkaSiteId, readonly { name: string }[]][]) {
      for (const entry of entries) {
        const name = normaliseSpeciesName(entry.name);
        expect(name, entry.name).not.toBe("");
        const already = seen.get(name);
        if (already !== undefined) expect(already, `${entry.name} is on ${already} and ${id}`).toBe(id);
        seen.set(name, id);
      }
    }
  });

  it("keeps the no-rung species apart from every alias", () => {
    const index = aliasIndex();
    for (const name of PKA_KNOWN_NO_RUNG) {
      expect(index.has(normaliseSpeciesName(name)), name).toBe(false);
    }
  });

  it("carries no substituted compound whose pKa is not the rung's", () => {
    const index = aliasIndex();
    for (const name of ["trifluoroacetic acid", "TFA", "p-nitrophenol", "benzoic acid", "acetylacetone", "diethyl malonate"]) {
      expect(index.has(normaliseSpeciesName(name)), name).toBe(false);
    }
  });

  it("normalises the spellings a sheet uses", () => {
    expect(normaliseSpeciesName("H₂O")).toBe("h2o");
    expect(normaliseSpeciesName("H₃O⁺")).toBe("h3o+");
    expect(normaliseSpeciesName("  Water   (H2O) : ")).toBe("water");
    expect(normaliseSpeciesName("Phenol O–H")).toBe("phenol");
    expect(normaliseSpeciesName("Alkane C−H")).toBe("alkane");
    expect(normaliseSpeciesName("the alpha proton")).toBe("alpha");
    expect(normaliseSpeciesName("Acetic acid pKa =")).toBe("acetic acid");
    expect(normaliseSpeciesName("β-dicarbonyl")).toBe("beta-dicarbonyl");
    expect(normaliseSpeciesName('"Acetic   Acid"')).toBe("acetic acid");
  });
});
