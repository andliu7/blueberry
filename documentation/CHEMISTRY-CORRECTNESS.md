# Chemistry correctness, the reference detail

Read this before writing or changing any code in `chem-core` or `packages/curriculum`.

`CLAUDE.md` carries the rules that hold on every phase: conservation over the multiset, the
system boundary, graded rather than boolean outcomes, and the four result types. This file
carries the detail behind them. Where the two disagree, `CLAUDE.md` wins.

### Three engines, three jobs

See `docs/INHERITED-DECISIONS.md` D3 for the full table. Summary:

- `chem-core`, pure TypeScript, runs in the browser on every interaction. Valence, mass, charge,
  electron bookkeeping, arrow legality. Must answer inside 100 ms
- Indigo, already loaded via `ketcher-standalone` on editor routes, does canonical SMILES for
  structure equivalence. The sibling repo's `checkAnswer.ts` already does this
- RDKit, CI only, Python sidecar, is the oracle that grades chem-core against a reference
  implementation. CIP descriptors, meso detection. It never ships

Do not add `@rdkit/rdkit` WASM to the client. Where RDKit and chem-core disagree, RDKit is presumed
correct and chem-core presumed buggy, with one exception: RDKit's aromaticity perception is a model,
not ground truth, and legitimate reactive intermediates can fail its sanitization. Aromaticity
disagreements go to human adjudication rather than auto-failing.

### CIP stereodescriptors

`chem-core` does not implement CIP. Correct CIP needs the hierarchical digraph with duplicate atoms,
ring handling, and like/unlike auxiliary descriptors, and shipped implementations have carried bugs
in this for years. chem-core computes geometry. RDKit assigns descriptors in validators. Labels
needed at runtime are precomputed at authoring time and stored on the problem, never derived on
device.

### Graded chemistry, not boolean chemistry

The named fixtures below are engine test fixtures first. Mining the owner's real Organic
Chemistry 2 course showed none of them appears standalone on any of six exams across three
semesters, and the course's centre of mass is aromaticity, EAS directing effects, the acyl
reactivity ladder, and enolates, so `docs/COURSE-OUTLINE-ORGO2.md` is the authoritative seed for
exam facing content and its weighting. Owner ruling, recorded 2026-08-21: the exams are NOT
exhaustive, so this material is still authored as content too, placed as side and enrichment
material rather than on the exam weighted spine. More coverage beats less; weighting, not
exclusion, is how the exam signal is honoured.

- Neopentyl systems are strongly disfavored for SN2, roughly 10^-5 relative to ethyl. **Not blocked.**
  The engine says "strongly disfavored, competing pathway likely" and names the competing pathway,
  because the methyl shift to a tertiary cation is the actual lesson. A boolean reject deletes it
- E2 requires periplanarity, dihedral near 0 or 180 degrees. Anti is strongly preferred. Syn
  periplanar E2 is real in conformationally locked systems and is flagged as requiring an authored
  conformational justification, not rejected
- SN1 is stereorandom at the reaction center, meaning both configurations appear in the product set.
  **It is not asserted as 50:50.** Ion pairing gives net inversion excess, commonly 50 to 80 percent
  racemization depending on substrate, solvent, and leaving group. Ratio is an authoring annotation,
  never a computed assertion
- SN2 inverts. This one is a hard assertion
- Anti addition outcomes are verified per substrate geometry. Reference fixtures: Br2 addition to
  cis-2-butene gives the racemic 2,3-dibromobutane pair; to trans-2-butene it gives the meso
  compound. If an implementation swaps these, it has a sign error in the addition geometry
