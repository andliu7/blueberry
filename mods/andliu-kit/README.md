# andliu-kit

A Claude Code mod that draws a band above the prompt in the blueberry palette
(`--bb-primary` `#6d5ae0`, ink `#472ab4`):

- **Crab progress.** While a turn runs, a crab walks a track. Its eyes show the
  role: scout (Read, Grep, Glob, web), builder (Edit, Write), engineer (Bash),
  captain (Agent), thinker (no tool yet). The line also shows elapsed seconds
  and tool-call count. There is no percent, because Claude does not know how
  far along a turn is.
- **Cache readout.** After each turn: hit rate, tokens read and written, time
  since the turn. After an hour idle it warns the cache is likely cold and
  estimates the tokens a re-send would write. The hour is a guess, since an
  API key defaults to five minutes.
- `/andliu` hides or shows the band.

It only reads session events. No network, no files.

## Install

In a terminal Claude Code session:

```
/plugin install andliu-kit --marketplace andliu7/blueberry
```

Answer `y` to add the marketplace and pick the user scope, so it loads in every
session. This works once the branch carrying `.claude-plugin/marketplace.json`
is on the repo's default branch. Turn it off with `/plugin`.

## Not included

A `/skin andliu` theme for tool rows and diffs. That belongs to the third-party
claude-skins mod, which this mod does not extend.
