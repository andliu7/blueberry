# documentation

Written documentation lives here rather than in `docs/`, and that is not a
preference.

`docs/` is GitHub Pages' publish target. `scripts/publish.mjs` does an `rmSync`
on it and then copies `dist/` in, so anything written there survives exactly
until the next `npm run publish:site`. It is also in `.gitignore`, which means a
file put there is not tracked and disappears without a diff to show for it.

So: build output goes to `docs/`, prose goes here.

## Where this came from

Most of these files arrived with the game when its code moved into this
repository. `CLAUDE-blueberry-game.md` is that project's own instruction file,
kept under a distinct name so it cannot be mistaken for this repository's; it is
the authoritative product spec for the game, and where it disagrees with a code
comment, it wins.

## What deliberately did NOT come with them

`docs/reference/` in the game's repository is **833MB across 2,022 files**: the
Alchemie captures, the competitor screenshots, the Mobbin sets. It stays there.

That is the same reasoning `INHERITED-DECISIONS.md` D1 already records for why
the game was a new application rather than a folder inside the existing one, and
it is about repository size rather than taste. A critic or an author who needs a
reference capture reads it from `blueberry_game/docs/reference/`, which remains
the archive for exactly that.

So a path of the form `docs/reference/...` written inside any file here points
into that repository, not into this one.
