/**
 * Unit 6 "which product?" questions: the reaction is given and the student picks the product
 * from its 1H NMR peak table, with IR only as a one-line aid. Every structure and peak comes
 * from scripts/gen_spectra.py (RDKit reaction SMARTS and the additive shift model); nothing
 * here is typed. These sit under a key that is not a lesson node, `u6-nmr-product`, and are
 * played by the Unit 6 Challenge (beats/practice/pools.ts, CHALLENGE_EXTRAS), where the NMR
 * tool is hidden. They are drafts for the owner's review like every Unit 6 entry.
 */
import { NMR_PRODUCT_QUESTIONS } from "../../tabs/spectra/nmrProducts.generated";
import type { PoolEntry, UnitPools } from "../u1/types";

export const U6_NMR_PRODUCT_KEY = "u6-nmr-product";

export const U6_NMR_PRODUCT_POOLS: UnitPools = Object.freeze({
  [U6_NMR_PRODUCT_KEY]: NMR_PRODUCT_QUESTIONS.map(
    (question): PoolEntry => ({
      id: `u6-nmr-prod-${question.id}`,
      item: { kind: "nmrProduct", question: { ...question, id: `u6-nmr-prod-${question.id}` } },
      explanation: `The product is ${question.product.formula}. Count the signals and the H they add up to, then read the splitting: only one drawn structure fits.`,
      provenance: "scripts/gen_spectra.py: product from an RDKit reaction SMARTS, peaks from its additive-rule predictor (+-0.3 ppm 1H); decoys are other products of the same start and are required to differ in their 1H fingerprint.",
      placeholder: true,
    }),
  ),
});
