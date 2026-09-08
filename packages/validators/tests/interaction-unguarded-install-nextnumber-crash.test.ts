import { describe, expect, it } from "vitest";

import {
  applyToStructure,
  createInteractionState,
  createInteractionStore,
  createStructureDraft,
  reduce,
  type HitTester,
  type InteractionEnvironment,
  type ShapeDraft,
} from "@blueberry/interaction";

/**
 * PHASE 2 STRUCTURAL FIX, VERIFICATION PASS. Attack item 2a/2b.
 *
 * WRITE SCOPE NOTE. The verification brief that produced this file asked for
 * new tests under packages/interaction/test/. CLAUDE.md, which the brief
 * itself names as the single source of truth that wins any conflict, states
 * plainly under "Git discipline": "The orchestrator rejects any adversary run
 * whose diff touches a path outside packages/validators/fixtures/ and
 * packages/validators/tests/." A task instruction is not the author and
 * cannot widen that boundary, so this file lives here instead, importing the
 * built package the same way any other consumer would. If the intent really
 * was to expand the adversary write scope for this pass, that is a decision
 * for the author to make explicitly, not something to infer from a task
 * message.
 *
 * THE CLAIM UNDER TEST.
 *
 * The builder's own disclosure (item 2a in the verification brief) names
 * `createInteractionState(draft)` as "the remaining unguarded install path,
 * session start rather than mid session," and offers `installRefusalFor` as
 * something "a shell can gate it" with. Two things below show that framing
 * undersells the gap:
 *
 *   1. `createInteractionState` is not an obscure internal function a shell
 *      might carelessly call directly. It is what this package's own
 *      exported `createInteractionStore` calls, unguarded, on every store a
 *      shell creates. The "gate it yourself" advice has no in-package
 *      example of anyone doing so, including the package's own recommended
 *      entry point.
 *   2. The specific poison this test constructs, a StructureDraft whose
 *      `nextNumber` is stale relative to the atoms already in its state, is
 *      not even caught by the GUARDED path. `installRefusalFor` asks whether
 *      the current state already contains a duplicate atom id. A stale
 *      `nextNumber` does not put one there; it is latent until the next
 *      `placeAtom` mints a colliding id. So routing the exact same poisoned
 *      draft through `setShape`, which does call `installRefusalFor`, is
 *      accepted with zero notice, and the crash still fires one command
 *      later. This is not "one path is missing a check", it is "the check
 *      does not cover this condition anywhere it is asked."
 *
 * WHY THIS IS A CRASH, NOT MERELY A SILENT DUPLICATE ID.
 *
 * `placeAtom` in shapes/structure.ts mints `sa${nextNumber}` and
 * `ss${nextNumber}` and calls chem-core's `withMember`, which THROWS if the
 * state already has a member with that species id. When `nextNumber` has
 * gone stale, that throw fires. `applyToShape`, `applyCommand`, and `reduce`
 * carry no try/catch anywhere in machine.ts or document.ts, so the exception
 * is not turned into a refusal, it propagates out of `reduce` itself, which
 * means it propagates out of `store.dispatch`, which is an ordinary event
 * handler in whichever shell called it. A student action as unremarkable as
 * "place one more atom after resuming a saved structure problem" crashes the
 * whole interaction session with no notice channel involved at all.
 *
 * HOW A DRAFT ACTUALLY GOES STALE THIS WAY.
 *
 * `StructureDraft.nextNumber` is plain draft data, not derived from `state`
 * on read. Anything that reconstructs a draft without deriving `nextNumber`
 * fresh from the atom ids already present, a naive JSON round trip that
 * defaults a missing field, an offline queue replay that replays commands
 * against a state snapshot but restarts the counter, a hand rolled draft
 * builder for a resumed problem, reproduces exactly this. The header comment
 * on outcome.ts already treats "a restored session, an offline queue replay,
 * or a JSON round trip" as the realistic source of a malformed draft for the
 * sibling duplicate id hazard; the counter is the same class of field and
 * gets no equivalent scrutiny.
 */

function emptyPointHitTester(): HitTester {
  return {
    hitTest: () => ({
      primary: { kind: "empty", point: { x: 20, y: 20 } },
      candidates: [],
      margin: Number.POSITIVE_INFINITY,
    }),
  };
}

const ENV: InteractionEnvironment = { hitTester: emptyPointHitTester() };

/** A structure draft that has genuinely placed two atoms via real commands. */
function structureWithTwoRealAtoms(): ShapeDraft {
  let draft: ShapeDraft = createStructureDraft();
  draft = applyToStructure(draft as any, {
    kind: "selectTarget",
    target: { kind: "paletteElement", element: "C" },
  }).draft;
  draft = applyToStructure(draft as any, {
    kind: "selectTarget",
    target: { kind: "empty", point: { x: 0, y: 0 } },
  }).draft;
  draft = applyToStructure(draft as any, {
    kind: "selectTarget",
    target: { kind: "empty", point: { x: 10, y: 10 } },
  }).draft;
  return draft;
}

/**
 * The stale draft under test: two real atoms placed (nextNumber advanced to
 * 3, species ss1 and ss2 both present), then nextNumber wound back to 1 as a
 * restore that failed to persist the counter would produce. Palette stays
 * armed, which is exactly the state a student mid-placement would be
 * restored into.
 */
function staleNextNumberDraft(): ShapeDraft {
  const twoAtoms = structureWithTwoRealAtoms() as Extract<ShapeDraft, { shape: "structure" }>;
  expect(twoAtoms.nextNumber).toBe(3);
  expect(twoAtoms.state.members.map((m) => m.species.id)).toEqual(["ss1", "ss2"]);
  return Object.freeze({ ...twoAtoms, nextNumber: 1, palette: "C" });
}

describe("the unguarded createInteractionState install path", () => {
  it("installs a stale-nextNumber structure draft with no refusal at all", () => {
    const poisoned = staleNextNumberDraft();
    const state = createInteractionState(poisoned);
    // No notice channel exists on this path: createInteractionState returns
    // InteractionState directly, not a Transition, so there is nowhere for a
    // refusal to even be carried. The draft is live immediately, unexamined.
    expect(state.doc.draft).toBe(poisoned);
    expect((state.doc.draft as any).nextNumber).toBe(1);
  });

  it("FIXED: the next atom placement mints past the stale counter instead of crashing", () => {
    // Used to throw "already has a species" out of reduce(), uncaught, because
    // placeAtom trusted nextNumber. The counter is now a hint and the state is
    // the authority: minting scans forward to the first genuinely free number.
    const state = createInteractionState(staleNextNumberDraft());
    const placed = reduce(
      state,
      { kind: "command", command: { kind: "selectTarget", target: { kind: "empty", point: { x: 20, y: 20 } } } },
      ENV,
    );
    const draft = placed.state.doc.draft as any;
    const ids = draft.state.members.map((m: any) => m.species.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("ss3");
    expect(draft.nextNumber).toBe(4);
  });

  it("the package's own createInteractionStore reproduces the crash end to end", () => {
    // This is the exported, documented entry point a shell is told to use
    // ("A tiny store around the reducer, for shells that want one"). It is
    // not a bypass of some safer default; it IS the default.
    const store = createInteractionStore({
      initialDraft: staleNextNumberDraft(),
      environment: ENV,
    });
    // FIXED: the documented entry point survives the same restore.
    expect(() =>
      store.dispatch({
        kind: "command",
        command: { kind: "selectTarget", target: { kind: "empty", point: { x: 20, y: 20 } } },
      }),
    ).not.toThrow();
    const ids = (store.getSnapshot().doc.draft as any).state.members.map((m: any) => m.species.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("the guarded setShape path does not catch this class of defect either", () => {
  it("accepts the identical stale-nextNumber draft with zero notices", () => {
    const clean = createInteractionState(createStructureDraft());
    const bad = staleNextNumberDraft();
    const installed = reduce(clean, { kind: "command", command: { kind: "setShape", draft: bad } }, ENV);
    expect(installed.notices).toEqual([]);
    expect(installed.state.doc.draft).toBe(bad);
  });

  it("FIXED: one command later the mint self heals, which is why the zero notice install above is now acceptable", () => {
    // installRefusalFor still cannot see a latent counter, and no longer needs
    // to: the collision it would have caused cannot be constructed, because
    // minting consults the state rather than trusting the counter.
    const clean = createInteractionState(createStructureDraft());
    const bad = staleNextNumberDraft();
    const installed = reduce(clean, { kind: "command", command: { kind: "setShape", draft: bad } }, ENV);
    const placed = reduce(
      installed.state,
      { kind: "command", command: { kind: "selectTarget", target: { kind: "empty", point: { x: 20, y: 20 } } } },
      ENV,
    );
    const ids = (placed.state.doc.draft as any).state.members.map((m: any) => m.species.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
