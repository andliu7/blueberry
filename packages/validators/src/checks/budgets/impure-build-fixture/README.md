# Deliberately broken fixture: a chem-core build that reaches React

`BUILD-PROMPT.md`, Phase 0, names four broken fixtures that must exist before anything else
begins. This is the fourth one:

> a `chem-core` build that transitively reaches React, so the purity gate is shown to fire

It is a build-level fixture rather than a chemistry one, so it lives with the budget gates rather
than in `packages/validators/fixtures/`. Keeping it out of that directory is deliberate: the CLI
counts every file under `fixtures/` as part of the chemistry corpus, and inflating that count with
JavaScript modules would corrupt the one number `chem-validator` leads its report with.

## What these files are

Emitted-JavaScript-shaped ES modules. They are what `tsc -b` would have written if somebody had
imported React into `chem-core`. They are not TypeScript, they are not compiled by `tsc` (the
package's `tsconfig.json` includes `src/**/*.ts` only), and nothing in the shipping graph imports
them. `packages/chem-core/package.json` is untouched, and React is not installed anywhere in this
repository.

That last point matters and is the reason the analyser marks every banned package `external`
before bundling. Detection must not depend on the offending package being installed, or the gate
would report "could not resolve react" on a clean machine and an import chain only on a machine
where somebody had already made the mistake.

## The graph, and what each part proves

```
index.js
  |- geometry.js
  |    `- arrow-overlay.js  -> import "react"        banned import, depth 3
  |                         -> document.createElement  DOM host global
  `- labels.js              -> import "three"        second rule, shorter chain

orphan-renderer.js          -> import "react-dom"    reachable from nothing
```

- **`arrow-overlay.js`** is the required React reach. It is three levels down from the entry, so a
  gate that only inspected the entry file would miss it. It also touches `document`, which no
  import-graph walk can see, which is why `measure/dom-globals.ts` exists as a separate half.
- **`labels.js`** reaches `three`. Two distinct rules firing in one run proves the walk reports
  every banned package rather than stopping at the first.
- **`orphan-renderer.js`** imports `react-dom` and is imported by nothing. The walk does not reach
  it and therefore does not see its violation. That is not a bug being tolerated, it is the exact
  blind spot the `uninspected` coverage finding exists to declare out loud. The self test asserts
  that the orphan is reported as uninspected, so the day a real orphan appears in
  `packages/chem-core/dist/` the gate says "I did not inspect this" instead of "clean".

## How to see it fire

```
node --experimental-strip-types packages/validators/src/checks/budgets/demo-purity-failure.ts
```

The same analysis runs inside `budget-gate-self-test.ts` on every `npm run validate`, and that
check fails the suite if this fixture ever comes back clean.
