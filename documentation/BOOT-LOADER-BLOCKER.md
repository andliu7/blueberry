# The game's front door has no home in the site

Reported 2026-09-08. One test fails and is deliberately left failing.

`src/game/test/bootLoader.test.ts` cannot load: it reads `index.html` next to
the app, and inside this site there is no such file.

## What the contract was

The game's loader is split across two files on purpose. `apps/web/index.html` in
the game's own repository drew the boot layer as static markup, because it has
to paint before any JavaScript runs; `src/app/Loader.tsx` then adopts it by id
and drives it. Nothing in the type system connects those two, so that test is
the missing edge: rename `#boot-word` in the markup and you would get a loader
whose word never changes, a capture that still passes, and no compiler error.

## Why it cannot simply be moved

`Loader.tsx` looks the element up at MODULE SCOPE:

    const bootLayer = document.getElementById("boot");

That runs when the module is evaluated, before React renders anything, so markup
rendered by `GamePage` would arrive too late to be adopted. And putting the
markup in the site's own `index.html` is worse: it would paint on every page of
the site, including the ones that have nothing to do with the game.

## What is true today

The loader degrades safely. `bootLayer === null` makes every function return
early, which is why the game renders correctly at `#/app` with zero page errors.
What is lost is the reveal: the front door simply does not appear, and the
Suspense boundary around the lazy `GamePage` chunk covers the load instead.

## The decision

Whether the game keeps a pre-paint front door now that it is a route inside a
larger app, rather than an application that owns its own document. The premise
has genuinely changed: "paint before any JavaScript runs" cannot mean anything
for a lazily-loaded route, because JavaScript is already running.

Three ways out, none of them free:

1. **Retire the front door inside the site.** Suspense already covers the chunk.
   The loader code and this test would go together, deliberately, in one commit
   that says so.
2. **Re-home the markup in `GamePage`** and change `Loader.tsx` to find its
   element on mount instead of at module scope. Keeps the reveal, costs a real
   change to a file the gauntlet has already judged.
3. **Keep both**, with the markup in the site's `index.html` behind a check for
   the game route. Cheapest to write and the worst to live with: the site's
   shell would carry the game's furniture.

The test stays failing until this is answered. Adjusting it to pass would be
adjusting a validator to fit a build, which this repository does not do.
