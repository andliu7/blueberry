# Conservation fixture corpus

Every file here ending in `.fixture.json` is one mechanism pathway plus a declaration of what
the twelve conservation checks are supposed to say about it. This README is the only file in this
directory that is not a fixture, and it is on the allowlist in
`src/checks/conservation/fixture-schema.ts` (`NON_FIXTURE_FILES`). Anything else that is neither
a fixture nor on that list is reported as a stray file and fails the run, because a fixture saved
as `.json` instead of `.fixture.json` would sit here verifying nothing while inflating the count.

## Format

The authoritative definition is `src/checks/conservation/fixture-schema.ts`. It is a strict
parser: unknown keys are rejected everywhere, so a typo in `justification` or `mustFail` fails
loudly instead of silently downgrading a negative control into an ordinary fixture. The summary
below is a reading aid, not a second source of truth.

```jsonc
{
  "schemaVersion": 2,            // must equal FIXTURE_SCHEMA_VERSION
  "id": "...",                   // must equal the filename without .fixture.json
  "title": "...",                // one sentence, what the step is
  "expect": {
    "kind": "good" | "broken",
    "mustFail": [],              // check names this fixture is declared to break
    "note": ""                   // required when kind is "broken", says what is wrong
  },
  "pathway": {
    "id": "...",
    "route": "sn2",              // a MechanismRoute from chem-core routes.ts
    "steps": [
      {
        "id": "step-1",
        "identity": {
          "elementaryStep": "concerted_substitution",   // an ElementaryStepKind
          "route": "sn2",                               // optional
          "reactionCenters": ["C1"]
        },
        "arrows": [                                     // optional, defaults to []
          {
            "id": "a1",
            "electrons": 2,                             // 1 or 2, defaults to 2
            "source": { "kind": "lonePair", "atomId": "Br1" },
            "sink":   { "kind": "betweenAtoms", "atomIds": ["Br1", "C1"] }
          }
        ],
        "from": { "id": "s0", "members": [], "spectators": [] },
        "to":   { "id": "s1", "members": [], "spectators": [] }
      }
    ],
    "annotations": [                                // optional, schema v2
      {
        "kind": "rate_comparison",                  // an AuthoredAnnotation kind
        "value": "...",                             // the authored claim
        "justification": "..."                      // why the claim is what it is
      }
    ]
  }
}
```

A source is one of `{ kind: "lonePair" | "singleElectron", atomId }` or
`{ kind: "bond", bondId }`. A sink is one of `{ kind: "atom", atomId }` or
`{ kind: "betweenAtoms", atomIds: [a, b] }`. Bond ids are resolved against the `from` state, so
a bond source must name a bond that exists there.

A member is `{ role, species }`, where `role` is a `SpeciesRole` and `species` is
`{ id, label?, atoms, bonds?, declaredTorsions? }`. An atom is `{ id, element, formalCharge?,
lonePairs?, unpairedElectrons?, implicitHydrogens?, isotope? }`, all numeric fields defaulting
to 0. A bond is `{ id, a, b, order? }` with order defaulting to 1.

### Schema v2: annotations and declared torsions

Added so the corpus can say three things `CLAUDE.md` requires and v1 had no field for. Both
shapes are the chem-core types, not a parallel vocabulary.

A **declared torsion** on a species is `{ atoms: [a, b, c, d], degrees, justification }`, a
`DeclaredTorsion` from `chem-core/src/species.ts`. Exactly four atom ids, an angle in degrees in
the range [-180, 180], where 0 is syn periplanar and 180 is anti periplanar, and a justification
saying why the angle is what it is. The parser checks the count of atoms and that the angle is a
finite number. `conservation-periplanarity-declaration` checks everything else: that the four
atoms are a bonded chain in the declaring species, that the justification is not empty, and that
the angle is periplanar.

An **annotation** on a pathway is `{ kind, value, justification }`, an `AuthoredAnnotation` from
`chem-core/src/step.ts`. The kinds are `racemisation_ratio`, `conformational_justification`,
`rate_comparison`, `condition_note`, and `cip_label_source`. An annotation is a claim the author
asserts and the engine must never compute. Three checks require one of a particular kind in a
particular situation, and none of them reads what it says beyond checking it is not empty.
`condition_note` is required by nothing and may repeat; it is there so a fixture can record the
conditions a reader needs without pretending a check is watching.

Since the Phase 1 builder pass two, three of those checks also require an annotation to NAME the
site it is a claim about: the value and justification together must mention at least one atom id
or species id that is in the state. That is a rule about reference and not about content. It is
deliberately not a minimum length, which two arbitrary words would satisfy, and it is not a grade:
whether the sentence is true stays a human review gate. See `annotationGroundingViolations` in
`src/checks/conservation/authoring.ts`.

`value` and `justification` may be empty strings at the parser level, for the same reason a
spectator's justification may be: the negative controls for the empty case have to exist on
disk. The checks, not the parser, are what reject an empty one.

**Bumping the version is breaking on purpose.** A fixture still declaring `schemaVersion: 1` is
refused with `<root>.schemaVersion: is 1, this loader understands 2`, and every check in the
family reports that as a failure on that file. There is no silent upgrade: a v1 file read as v2
would be a mechanism with no torsion and no annotation, which is exactly what the new checks
exist to catch, and it would be read as an authoring gap rather than as a stale file.

A spectator declaration is `{ speciesId, reason, justification, declaredBy }`, where `reason`
is a `SpectatorReason`. `justification` and `declaredBy` may be empty strings at the parser
level so that the negative control for `conservation-spectator-declaration` can be written. The
check, not the parser, is what rejects an empty one.

### Rules the corpus is held to

Set in `src/checks/conservation/family.ts`:

- A **good** fixture must produce no violation from any of the twelve checks.
- A **broken** fixture must produce at least one violation from every check it names in
  `mustFail`, and **no** violation from any check it does not name. A negative control that
  does not fire is a check that is not proven to work. A violation that was not declared means
  the declaration is not describing the fixture.
- A check with no negative control anywhere in the corpus fails. Deleting the fixture that
  proves a check works does not quietly turn that check into decoration.
- An empty corpus fails.

Consequence worth stating plainly: `mustFail` is an exact list, not a wish. Where a fixture
names more than one check, the extra names are not sloppiness, they are the cascade written down
so an adversary can argue with it.

### Which cascades are unavoidable

These are properties of the arithmetic, not of any one fixture, and they are why six of the
broken fixtures below name more than one check.

- **A mass break is always an electron flow break.** A nuclide difference either lives in the
  explicit atom list, in which case `observedDeltas` reports an atom added or removed, or it
  lives in implicit hydrogen counts, in which case it is an `implicitHydrogens` mismatch, since
  no arrow can declare an implicit hydrogen delta. There is no third place for it to hide.
- **A charge break is always an electron flow break** whenever mass holds. Under a conserved
  nuclide multiset, `valenceElectronCount` is a fixed sum minus charge, so the two are the same
  equation seen from two sides. This is stated at the top of `charge.ts`.
- **A proton arriving from outside the multiset breaks mass as well**, and normally charge too.
  `proton-transfer.ts` says so in its own header. Check 5 earns its place by naming the cause,
  not by being independent.
- **An implicit hydrogen change cannot break mass alone while charge and valence both hold.**
  If every atom's declared charge agrees with its structure, removing one implicit hydrogen
  lowers that atom's bond order sum by one and therefore raises its derived formal charge by
  one. The multiset total stays put only if some nonbonding count moves the other way, which is
  why the S5 fixture below leaves an unpaired electron behind rather than simply deleting a
  hydrogen.
- **An unresolvable arrow endpoint breaks arrow legality as well as electron flow.**
  `conservation-electron-flow` must resolve every bond id before it can call `declaredDeltas`
  without throwing, and `conservation-arrow-legality` treats an arrow anchored to nothing as the
  first way an arrow can fail to be drawable. Both report it, so a fixture with an unresolvable
  endpoint names both. No fixture in the corpus currently has one. This overlap is deliberate
  and is argued at the top of `src/checks/conservation/arrow-legality.ts`: staying silent here to
  avoid a duplicate line would put a hole in the first legality rule.
- **Everything else about arrows is disjoint.** `conservation-electron-flow` asks whether the
  arrows TOGETHER account for the change between the two states, and never looks at one arrow on
  its own. `conservation-arrow-legality` asks whether EACH arrow is drawable, and never looks at
  the `to` state. Neither is a special case of the other, which is the point of the adversary
  fixture that has correct aggregate deltas and two impossible arrows.

## The corpus

Eighty `.fixture.json` files, thirty nine good and forty one broken, plus three `.oracle.json`
files and this README. That is eighty four files, which is the FIXTURE COUNT the suite prints,
since that number counts everything in this directory rather than only the conservation fixtures.
Every one of the twelve checks has at least one negative control.

Counts in the section headings below are from the pass that wrote them and were already stale
before the Phase 1 builder pass two: the two tables that follow are Phase 0's fixtures, the
mechanism corpus section is Phase 1's, and neither was rewritten when the adversary and builder
passes added files. The authoritative count is the FIXTURE COUNT line the suite prints on every
run. What is accurate below is which fixture proves what.

### Changed by the Phase 1 builder pass two

Five fixtures the Phase 1 adversary had to file as `good` because no check could be named as the
one that ought to catch them are now `broken`. Each keeps `known-limit` in its name so the
lineage is readable, and each carries, appended to its original note, a paragraph saying what
closes it and what is still open.

| Now | `mustFail` | What now catches it |
|---|---|---|
| `broken-known-limit-hydride-shift-mislabelled-a-proton-transfer` | step-identity | The hydrogen carries its own bonding pair, so the arrow pivots on the hydrogen. That is a hydride, and a step declared `proton_transfer` needs the acceptor to supply the pair. |
| `broken-known-limit-e2-torsion-and-reaction-centres-over-an-unrelated-backbone` | periplanarity, step-identity | Two authored fields drifting from the drawing at once. C1 and C4 are declared reaction centres that no arrow touches, and the declared torsion is not the H-C-C-LG quartet the arrows name. |
| `broken-known-limit-conformational-justification-that-names-nothing-in-the-state` | periplanarity | The justification `z` names no atom and no species, so it is not a claim about this molecule. Not a length rule. |
| `broken-known-limit-racemisation-ratio-that-names-nothing-in-the-state` | stereorandom | The same grounding rule on the SN1 ratio. Still nothing anywhere reads the ratio itself, which `docs/VERIFICATION.md` S1 forbids. |
| `broken-known-limit-rate-comparison-naming-a-route-the-engine-does-not-name` | rate-comparison | The competing route named has to be one `competingRoutesFor(sn2_center_strongly_hindered)` names, which is `carbocation_rearrangement`. `radical_halogenation` is not. |

Four fixtures were added as isolated negative controls, each differing from a green fixture in
one field so that exactly one rule fires:

| Fixture | Differs from | Rule it proves |
|---|---|---|
| `broken-step-identity-bromine-heterolysis-declared-a-bond-homolysis` | `good-br2-homolysis-with-single-electron-fishhook-arrows` | A kind that is radical by definition drawn with no fishhook anywhere. |
| `broken-step-identity-radical-abstraction-declared-a-proton-transfer` | `good-radical-chlorination-of-methane-propagation` step 1 | The mirror: fishhooks in a kind that is polar by definition. The one rule here with an exact chem-core cause, `radical_arrow_used_in_polar_step`. |
| `broken-step-identity-anti-periplanar-e2-declared-a-proton-transfer` | `good-e2-anti-periplanar-ethoxide-and-2-bromobutane` | A proton moves and a leaving group departs in the same barrier, which is an elimination. The adversary's own example of the wider gap. |
| `broken-step-identity-proton-transfer-declared-a-hydride-shift` | `good-deprotonation-of-methanol-by-hydroxide` | The hydride rule in the other direction: the acceptor supplied the pair, so the hydrogen moved as a proton. |

Two existing broken fixtures gained `conservation-step-identity` in `mustFail`, with a paragraph
on each saying why it is a second defect rather than a duplicate report:
`broken-arrow-legality-bond-overdrawn-by-two-arrows` and
`broken-arrow-legality-sink-bonds-an-atom-to-itself`. Both declare `bond_homolysis` and draw only
pair arrows.

Two `good-known-limit-` fixtures are unchanged and still green on purpose,
`good-known-limit-arrow-legality-departing-bond-pair-handed-directly-to-a-non-donating-nucleophile`
and `good-known-limit-spectator-role-and-reason-drift-across-three-spectators`. Neither is closed
by this pass and each note now says why. The first needs to know which end of a bond is the
electrophile, which is reactivity modelling; the second needs a rule about agreement between a
spectator's role, reason, and justification.

### Changed by the Phase 1 builder pass three

The second pass adversary filed four findings. Three were closed and one was adjudicated as a
human review gate. The suite went from eleven checks to twelve.

`conservation-step-elementarity` is the twelfth check. It groups a step's arrows so that two
arrows are together whenever they share an atom, transitively, then merges groups that come
within three bonds of each other in the `from` state, and fails when more than one group
survives. It is the only thing in the package that emits `step_not_elementary`, a cause chem-core
has carried since Phase 1 with nothing able to reach it. Its docstring lists what it deliberately
does not assert, and the first item on that list is the large one: a step with ONE connected
group of arrows is never questioned here, so a two step sequence drawn as one at the same centre
still passes.

| Fixture | Was | Now | What changed in the checks |
|---|---|---|---|
| `broken-known-limit-neopentyl-sn2-rate-comparison-evaded-by-authoring-the-reaction-centre-away-from-the-hindered-carbon` | good | broken, rate-comparison | `hinderedCentres` took its candidate carbons from `identity.reactionCenters`, an authored field, so writing the leaving group's id there hid the neopentyl pattern. The candidates are now the union of that field and the carbons the arrows name, derived by `heavySigmaDepartures`. Same move as periplanarity rule 1b, same reason. |
| `broken-known-limit-sn2-and-a-distant-unrelated-deprotonation-drawn-as-one-step` | good | broken, step-elementarity | An SN2 at one carbon and an unrelated deprotonation four bonds away, drawn as one step, with every other check correctly silent because both halves are individually correct chemistry. |
| `good-sn1-two-independent-captures-in-one-pathway-each-correctly-annotated` | good but the suite was RED on it | good and green | The check was wrong, not the fixture. `requiredAnnotationViolations` counted annotations per PATHWAY, so two independent SN1 captures each carrying their own correctly grounded ratio read as two claims about one cation. The scope is now the occurrence. |
| `good-known-limit-spectator-justification-contradicts-its-own-declared-reason` | good | good, and now says why it stays that way | Whether prose contradicts an enum is not mechanically decidable, and the token presence rule that was proposed detects an absent word rather than a contradiction. The note now states the human review gate instead. |

Three fixtures were added, two of them negative controls for a defect that had never been
written down:

| Fixture | Proves |
|---|---|
| `good-e2-two-independent-syn-periplanar-eliminations-each-with-its-own-conformational-justification` | The twin the adversary predicted in `conservation-periplanarity-declaration` was real. Two syn periplanar eliminations in two separate cages, each with its own justification, failed with "exactly one conformational_justification annotation on pathway ..., 2 of them" before the fix, and passes after it. |
| `broken-annotation-two-syn-periplanar-eliminations-sharing-one-conformational-justification` | The other direction of the same defect, which used to PASS: two syn eliminations and one justification between them, so the second cage was defended by nothing. |
| `broken-annotation-two-sn1-captures-sharing-one-racemisation-ratio` | The same false negative on the SN1 ratio: the tert-butyl capture is annotated, the butan-2-yl one, which is the one with a configuration to lose, is not. |

HOW AN ANNOTATION SAYS WHICH STEP IT IS ABOUT. `AuthoredAnnotation` carries `kind`, `value` and
`justification` and no pointer to a step, so the binding is by naming: the annotation writes the
step id in its value or its justification, exactly as the grounding rule already makes it write
an atom or species id. When a pathway has only ONE place requiring an annotation of that kind,
which is every such fixture in the corpus except the three above, the binding is implicit and
nothing needs to be written. The structural alternative, an `appliesTo` field on the annotation
plus a schema v3, is a chem-core change and is recorded in `authoring.ts` rather than made.

### Changed by the Phase 1 builder pass four

The third pass adversary filed four findings, one against the integrity mechanism itself and
three against the conservation family. All four are closed. The three that live in this
directory were filed `good` because that is what the suite said about them at the time, and all
three are now `broken`. Each keeps `known-limit` in its name so the lineage is readable, and each
note now carries a closing paragraph saying what catches it and what is still open. The check
count is unchanged at twelve: no new check was needed, two existing checks got a rule they were
missing, and one shared function had a scoping defect fixed structurally.

| Now | `mustFail` | What now catches it |
|---|---|---|
| `broken-known-limit-one-racemisation-ratio-annotation-naming-both-sn1-captures-satisfies-both-occurrences` | stereorandom | One annotation is one claim about exactly one occurrence. An annotation naming two occurrences is the claim for neither, so both captures report that the only sentence naming them is shared. |
| `broken-known-limit-acyl-substitution-addition-and-elimination-collapsed-into-one-connected-step` | step-elementarity | Rule B, new: no pair of atoms both loses bonding and gains bonding inside one step. Arrows a2 and a3 take the C2=O1 pi bond apart and put it back, and the state between them is the tetrahedral intermediate the file never writes down. |
| `broken-known-limit-sn2-at-a-secondary-carbon-directly-adjacent-to-a-quaternary-carbon-not-recognised-as-hindered` | rate-comparison | The steric model is now the geometry rather than the worked example: a carbon under attack with any carbon neighbour carrying three further carbons. The attacked carbon's own substituent count is reported and no longer gates the test. |

THE ANNOTATION BINDING RULE, THIRD AND STRUCTURAL VERSION. The scope defect in
`requiredAnnotationViolations` was fixed at pathway scope, then at occurrence scope, and the
third variant was that one annotation object was pushed onto every bound occurrence's claim list,
so a sentence naming two step ids satisfied the exactly-one rule at both. `authoring.ts` now
separates the annotations that NAME an occurrence from the annotation that is the CLAIM FOR it:
naming exactly one makes it the claim for that one, and naming two makes it the claim for
neither, because one authored sentence cannot be the answer at two places whose correct answers
differ. Nothing was consumed first-id-wins or nearest-wins; those position heuristics are still
rejected for silently picking a subject. The `conservation-periplanarity-declaration` twin is
closed by the same edit rather than a second one, since both checks state their requirement
through that one function, and it is verified end to end in
`tests/annotation-binding-is-one-claim-one-occurrence.test.ts` by merging the two committed
justifications of `good-e2-two-independent-syn-periplanar-eliminations-...` into one annotation
naming both cages. No fixture was added for it, so the fixture count did not move.

WHAT RULE B IN `conservation-step-elementarity` DOES NOT SAY. Condition 1 was not weakened and
was not touched, because connectivity is what a genuinely concerted step looks like. Rule B is a
separate question about the same arrows and it is one decidable signature of a round trip, not a
barrier model: a collapsed two step sequence whose two halves touch no common pair twice is still
missed. The general question, how many barriers a given array of arrows crosses, still needs a
model chem-core does not have.

WHAT THE WIDENED STERIC MODEL DOES NOT CATCH. The threshold of three further carbons on the
neighbour is unchanged, so beta branching short of quaternary, isobutyl for instance, still does
not fire. Alpha branching on its own still does not fire: a plain secondary or tertiary centre
with no quaternary carbon beside it is not this rule's business, and tertiary SN2 has its own
cause, `sn2_at_tertiary_center`, and its own rule still to be written.

### Good

| Fixture | What it proves |
|---|---|
| `good-deprotonation-of-methanol-by-hydroxide` | An explicit hydrogen proton transfer conserves everything, and the two arrows account for the whole structural change. |
| `good-protonation-of-acetone-by-hydronium` | Protonation does not conserve charge on the substrate alone, and does conserve it over the multiset. This is the modelling decision in CLAUDE.md working. |
| `good-heterolysis-of-protonated-tert-butanol` | An ionisation with one arrow, where an atom moves out of the substrate into a separate leaving group species, still balances. |
| `good-sn2-with-spectator-counterion` | A declared spectator that really does sit out changes no total, whether it is counted or not. |
| `good-br2-homolysis-with-single-electron-fishhook-arrows` | Two fishhooks out of one single bond move two electrons in total, which is exactly what the bond holds. The case that makes the arrow legality capacity rule a ceiling on the sum rather than a ban on two arrows sharing a source. |
| `good-hypervalent-phosphorus-addition-elimination-at-the-period-three-ceiling` | Phosphorus goes to twelve valence electrons and back over two steps. Proves the valence ceiling is per element rather than a flat octet, and is the only multi step pathway in the corpus. |

### Broken

| Fixture | `mustFail` | What it proves |
|---|---|---|
| `broken-valence-nitromethane-drawn-with-pentavalent-nitrogen` | valence | The octet ceiling fires on a period two nitrogen carrying ten valence electrons, with every conservation total intact. Isolates the octet arm from the formal charge arm, since each atom's declared charge still agrees with its own structure. |
| `broken-mass-methane-loses-a-hydrogen-that-lives-only-in-the-implicit-count` | mass, electron-flow, proton-transfer | `docs/VERIFICATION.md` S5. The explicit atom list is identical on both sides, so a mass check walking explicit atoms reports conservation and only the implicit hydrogen term sees the loss. Fires the S5 diagnostic line, which can only appear on a fixture where the naive implementation would have passed. Charge and valence stay green. |
| `broken-charge-tert-butyl-chloride-ionises-without-giving-the-pair-to-chlorine` | charge, electron-flow | The bonding pair is never handed to the leaving group, so the multiset charge goes from 0 to +2 with mass untouched and every atom internally consistent. The paired electron flow failure is the documented charge and electron identity. |
| `broken-electron-flow-sn2-drawn-without-the-leaving-group-arrow` | electron-flow | The fixture `BUILD-PROMPT.md` asks for: balances on mass and charge while violating electron bookkeeping. Correct products, correct totals, one missing arrow. The only fixture here that fails a single check while every conservation total is intact. |
| `broken-proton-transfer-acetone-protonated-with-no-acid-in-the-state` | mass, charge, electron-flow, proton-transfer | The acid written above the arrow instead of drawn. Exercises the imbalance arm of check 5: one hydrogen gained, none released by any species present, cause `proton_source_not_in_state`. The widest declared cascade in the corpus, and the note on the fixture explains each name. |
| `broken-proton-transfer-isobutylene-protonated-by-an-acid-declared-a-spectator` | mass, charge, proton-transfer, spectator-declaration | The same boundary rule from the other side. The acid is drawn and the chemistry is right; it is the declaration that is wrong, marking the acid bulk medium and so excluding it from the multiset. Exercises the spectator arm of check 5, which the acetone fixture cannot reach, because hydrogens gained and hydrogens released balance exactly. Electron flow stays green, so this also shows the deltas half of the family is not what catches a boundary violation. |
| `broken-spectator-counterion-excluded-without-a-justification` | spectator-declaration | The hygiene arm. Correct chemistry, correct totals, and an exclusion nobody can argue with later. This is the fixture `fixture-schema.ts` keeps `asString` rather than `asNonEmptyString` for. |
| `broken-spectator-declaration-hiding-a-reduced-sodium-counterion` | spectator-declaration, electron-flow | The attack arm, assertion 5. A well formed declaration hides a one electron reduction of the counterion. The participating members balance perfectly; put the spectator back and charge and valence electrons each move by one. Electron flow is declared because `observedDeltas` walks all members, spectators included, which is the reason the deltas half is not fooled even when the totals half is. |
| `broken-electron-flow-br2-homolysis-with-only-one-fishhook-arrow` | electron-flow | One fishhook where the correct drawing has two. The declared bonding electron delta is half the observed one, so the aggregate comparison fires. Arrow legality stays green on purpose: one fishhook out of a single bond is within what the bond holds, and it is the missing second arrow rather than the drawn first one that is wrong. |
| `broken-electron-flow-hidden-1-2-hydride-shift-with-globally-balanced-implicit-hydrogens` | electron-flow | A hydride moves between two carbons with no arrow at all, and the implicit hydrogen totals balance globally. Only the per atom `implicitHydrogens` term sees it, which is the quantity no arrow can declare, so the mismatch appears standing alone with cause `implicit_hydrogen_changed_without_arrow`. |

### Broken, added by the Phase 0 adversary

Each of these was filed as a finding the suite could not express, and each was closed by the
pass that followed. The note on every one of them records both halves: what the corpus used to
say about it, and what now catches it.

| Fixture | `mustFail` | What it proves |
|---|---|---|
| `broken-arrow-legality-sn2-with-swapped-arrows-producing-identical-declared-deltas` | arrow-legality | The negative control for check 7, and the fixture that argued it into existence. Correct SN2 structures, two individually impossible arrows chosen so their combined declared deltas are bit for bit identical to the correct pair's. Summation destroys per arrow information before `deltaMismatches` runs, so the aggregate check cannot see it and no work inside `deltas.ts` could have closed it. Arrow legality never looks at the `to` state and catches arrow `a2` on adjacency. It still does not catch `a1`, which the note explains. |
| `broken-valence-sn2-with-a-duplicated-species-id-silently-double-counted` | valence | Two physically distinct sodium cations sharing one species id. `findSpecies` and `findMember` see only the first, `conservedTotals` counts both, and the extra contribution cancels across the step so mass and charge pass by coincidence. The negative control for the species id uniqueness precondition, which sits next to `duplicateAtomIds` because it is the same failure one level up. |
| `broken-spectator-declaration-laundering-a-redox-transfer-through-two-swapped-counterions` | electron-flow, spectator-declaration | A one electron transfer between two declared spectators, hidden by giving the before and after form of each a different species id. Assertion 4 compares an id against itself and finds no counterpart to compare with; assertion 5 sums the spectator set and a transfer inside a set cancels within its own sum. Closed by assertion 6, which compares the spectator population as a multiset of canonical structures. |

## The Phase 1 mechanism corpus

`BUILD-PROMPT.md` Phase 1 requires "at least 30 authored mechanisms spanning substitution,
elimination, addition, and carbonyl chemistry". Thirty one were authored in one pass. All of
them are `kind: "good"`: the negative controls above are Phase 0's job and this pass added none,
so the count of fixtures naming each check in `mustFail` is unchanged.

Every one is real chemistry drawn the way a mechanism is drawn, with reagents, counterions, and
any participating solvent as members of the multiset rather than written over an arrow. Multi
step mechanisms are authored as multi step pathways: the longest is five steps.

Two conventions are worth knowing before reading any of them.

**Any hydrogen that moves is explicit.** `observedDeltas` compares implicit hydrogen counts per
atom id and no arrow can declare a change in one, so a proton drawn as part of an implicit count
appears to `conservation-electron-flow` as an unexplained change. Hydrogens that never move stay
implicit, which keeps the files readable.

**A proton always has a drawn donor and a drawn acceptor in the same state.** That is the
CLAUDE.md system boundary rule, and it is why several fixtures carry two water molecules with
different species ids: one attacks and one takes a proton later.

### Substitution, 8

| Fixture | What it covers |
|---|---|
| `good-sn2-hydroxide-displaces-bromide-from-bromoethane` | The reference primary SN2. Two arrows, one barrier, no intermediate. |
| `good-sn2-cyanide-displaces-iodide-from-iodomethane` | An ambident nucleophile attacking through carbon, with the nitrogen lone pair present and untouched. |
| `good-sn2-inversion-at-the-secondary-carbon-of-2-bromobutane` | SN2 on the secondary substrate where SN1 competes. Half of the competing pair. |
| `good-sn1-solvolysis-of-2-bromobutane-the-competing-route` | The other half, same molecule, three steps through the planar cation. |
| `good-sn1-solvolysis-of-tert-butyl-bromide-in-water` | The canonical SN1: heterolysis, capture, deprotonation. |
| `good-sn1-with-a-1-2-hydride-shift-from-2-bromo-3-methylbutane` | Rearrangement, with the migrating hydride explicit so the shift is visible to the arrow check. |
| `good-sn2-on-neopentyl-bromide-strongly-disfavoured-not-forbidden` | The graded chemistry case. Strongly disfavoured, roughly 10^-5 relative to ethyl, and not blocked. |
| `good-anchimerically-assisted-methyl-shift-ionisation-of-neopentyl-bromide` | The competing pathway the fixture above names, drawn as one concerted barrier rather than through a primary cation. |

### Elimination, 6

| Fixture | What it covers |
|---|---|
| `good-e2-anti-periplanar-ethoxide-and-2-bromobutane` | The reference E2, three arrows, anti periplanar. |
| `good-e2-syn-periplanar-in-a-conformationally-locked-norbornane` | Syn periplanar E2 in a cage that cannot reach the anti geometry. Flagged with an authored conformational justification, not rejected. |
| `good-e2-hofmann-orientation-with-tert-butoxide-on-2-bromobutane` | Same substrate, bulky base, less substituted alkene. Two correct products from one molecule. |
| `good-e1-dehydrohalogenation-of-tert-butyl-bromide-in-water` | E1 sharing its first step with SN1, arrow for arrow. |
| `good-e1-acid-catalysed-dehydration-of-tert-butanol` | Three steps, two proton transfers, and the reverse of the hydration fixture. |
| `good-e1cb-elimination-of-a-beta-hydroxy-ketone-to-an-enone` | The third elimination route: conjugate base first, leaving group second. |

### Addition, 8

| Fixture | What it covers |
|---|---|
| `good-bromine-addition-to-cis-2-butene-via-a-bromonium-ion` | CLAUDE.md reference fixture, electron bookkeeping half. |
| `good-bromine-addition-to-trans-2-butene-via-a-bromonium-ion` | The other reference fixture. Identical at this level of description, which is itself the finding. |
| `good-markovnikov-addition-of-hydrogen-chloride-to-2-methylpropene` | Markovnikov as a mechanism rather than as a rule. |
| `good-acid-catalysed-hydration-of-2-methylpropene` | Three steps and a catalytic cycle that closes. |
| `good-anti-markovnikov-radical-addition-of-hydrogen-bromide-to-propene` | Six fishhooks, and the capacity rule allowing two out of one bond. |
| `good-hydroboration-of-propene-in-one-concerted-four-centre-step` | One barrier, no intermediate, no charge, and an electron deficient boron that is not a valence failure. |
| `good-halohydrin-formation-from-propene-water-opening-a-bromonium` | The same bromonium opened by a different nucleophile. |
| `good-radical-chlorination-of-methane-propagation` | A chain that closes, with the chlorine radical regenerated. |

### Carbonyl, 9

| Fixture | What it covers |
|---|---|
| `good-cyanohydrin-formation-from-acetaldehyde` | Nucleophilic addition in its plainest form: attack, then protonation. |
| `good-hydride-transfer-from-borohydride-to-acetone` | Reduction, with the arrow starting on a bond rather than a lone pair. |
| `good-acid-catalysed-hydration-of-acetaldehyde-to-its-hydrate` | The same carbonyl under acid, with the order of events reversed. |
| `good-nucleophilic-acyl-substitution-of-acetyl-chloride-by-hydroxide` | Addition then elimination, with a real tetrahedral intermediate. |
| `good-enolate-formation-from-acetone-by-hydroxide` | Three arrows for what students draw as one. |
| `good-aldol-addition-of-the-acetone-enolate-to-acetaldehyde` | Carbon to carbon bond formation from the enolate's alpha carbon. |
| `good-acid-catalysed-keto-enol-tautomerisation-of-acetone` | Two steps, both proton transfers, and the acid route contrasted with the base route. |
| `good-acetal-formation-from-a-hemiacetal-via-an-oxocarbenium` | Four steps, three proton transfers. The proton transfer heavy fixture. |
| `good-imine-formation-from-acetaldehyde-and-methylamine` | Five steps, four proton transfers. The longest pathway in the corpus. |

### Oracle corpus files added in the same pass

These are `.oracle.json` rather than `.fixture.json`. They carry stereochemistry, which the v1
conservation fixture schema deliberately does not, and they are graded by RDKit through the
Python sidecar rather than by the seven conservation checks.

| File | What it covers |
|---|---|
| `bromine-addition-to-2-butene-racemic-against-meso.oracle.json` | The mechanism connecting each alkene to its product set, bromonium configuration included. cis gives an achiral meso bromonium and the racemic pair; trans gives a chiral bromonium and the single meso product. |
| `sn2-inversion-and-sn1-stereorandomness.oracle.json` | SN2 inversion as a pinned pair of CIP labels, and SN1 as the same planar cation running to both configurations with no ratio asserted anywhere. |

### Authored annotations, and the checks that grade them

Three things `CLAUDE.md` asks for used to live as prose in `expect.note`, where no check could
read them. Schema v2 carries them as data and three registered checks grade them.

| Requirement | Annotation kind | Check |
|---|---|---|
| Racemisation ratio on an SN1 | `racemisation_ratio` | `conservation-stereorandom-annotation` |
| Conformational justification on a syn periplanar E2 | `conformational_justification` | `conservation-periplanarity-declaration` |
| Rate comparison naming the competing pathway on neopentyl SN2 | `rate_comparison` | `conservation-disfavoured-rate-comparison` |
| The declared step kind and reaction centres agreeing with the arrows | none, `identity` is not an annotation | `conservation-step-identity` |

The eleventh and twelfth checks are not annotation checks and are listed here because they close
the same kind of hole. `conservation-step-elementarity` is the twelfth: it asks whether a step's
arrows can belong to one transition state at all, by grouping them where they share an atom and
failing when the groups end up more than three bonds apart. The eleventh: a field the parser checked for shape and no check ever compared against the chemistry.
It reads what the arrows and the two states describe and fails when the declared
`elementaryStep` contradicts it. It classifies nothing. Its docstring lists both the kinds it can
tell apart and the kinds it cannot, and the second list is the longer one on purpose.

The stereorandom check asserts that a ratio is PRESENT and never what its value is. Asserting
50:50 fails on correct chemistry, because ion pairing gives net inversion excess. See
`docs/VERIFICATION.md` S1.

Eight negative controls prove these fire, all prefixed `broken-annotation-`: an E2 at a gauche
dihedral, an E2 declaring no torsion, a torsion declared over atoms that are not a bonded chain,
a syn periplanar E2 with no justification, a neopentyl SN2 with no rate comparison, a rate
comparison naming no competing pathway, an SN1 with no racemisation ratio, and an SN1 whose ratio
value is empty.

### What this corpus still cannot say

Stereochemistry is absent from the conservation schema by design, argued at the top of
`fixture-schema.ts`. That is why the two Br2 fixtures are identical at this layer apart from the
substrate name, and why the racemic against meso distinction is asserted in
`bromine-addition-to-2-butene-racemic-against-meso.oracle.json` where RDKit grades it instead.

## Adding a fixture

1. Write real chemistry. A placeholder molecule proves nothing about a chemistry check.
2. Break exactly one thing on purpose. A fixture that fails four checks for four unrelated
   reasons cannot tell you which check caught what.
3. Run the suite. If a check fires that you did not declare, either the fixture is broken in a
   second way you did not intend, or the cascade is real and belongs in `mustFail` with a line
   in `note` saying why.
4. Never edit a check to make a fixture pass. That is the non-negotiable in CLAUDE.md, and it
   applies to checks written in the same session.
