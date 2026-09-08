# documentation

Written documentation lives here rather than in `docs/`, and that is not a
preference.

`docs/` is GitHub Pages' publish target. `scripts/publish.mjs` does an `rmSync`
on it and then copies `dist/` in, so anything written there survives exactly
until the next `npm run publish:site`. It is also in `.gitignore`, which means a
file put there is not tracked and disappears without a diff to show for it.

So: build output goes to `docs/`, prose goes here.
