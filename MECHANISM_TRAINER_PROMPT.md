# Mechanism Trainer — starting prompt

Copy everything below the line into a **new, empty repository**, in plan mode.
Not into Blueberry. The reason is in the "Where this lives" section — it is a
decision already made on evidence, and reopening it will cost you a repository.

Before you paste: fill in the one bracketed line under **Look and feel**. Take
three screenshots first — ChemDraw's arrow tool, SciFinder's editor, Notability's
pen settings — put them in `refs/`, and name them in that line. Everything else
is ready to go.

---

# Project: interactive organic chemistry mechanism trainer

## Who I am

I'm a CS student taking Organic Chemistry II. Python and Java I know well. My
React and TypeScript are weak: I can read code and follow along, but I can't
write idiomatic React from scratch yet, and I don't reliably know which patterns
are normal and which are exotic.

I want to understand this codebase, not accumulate diffs I can't maintain. Treat
me like a junior developer you're mentoring:

- Explain the *why* of a structural decision before you write the code for it.
- When you use a React pattern I've probably not seen — refs, context, portals,
  `useSyncExternalStore`, custom hooks, render props — say so in one line and
  say what it's for.
- If I ask for something that's a bad idea, tell me it's a bad idea and why,
  then tell me what you'd do instead. Don't just build it.
- Prefer boring and well-maintained over clever. I have to debug this alone at
  1am before an exam.

## What I'm building

A web app for practising organic chemistry mechanisms. The core loop: show a
student a starting material and reagents, have them draw the mechanism —
including curved electron-pushing arrows — to reach the product, then check the
answer.

Features, roughly in priority order:

1. **Molecule canvas.** Draw and edit structures. Wrapping an existing editor,
   emphatically not building one from scratch.
2. **Periodic table sidebar.** Click or drag an element onto the canvas to place
   an atom.
3. **Curved arrow tool.** Electron-pushing arrows between atoms, bonds and lone
   pairs, with draggable Bézier control points.
4. **Freehand annotation.** Notability-style pen with pressure, working with an
   Apple Pencil on an iPad.
5. **Problem mode.** Load a synthesis problem, student draws each step, the app
   grades it.
6. **Progress map.** A skill tree of reaction types, in the spirit of a Bloons TD
   upgrade path — what's unlocked, what's mastered.

## Where this lives, and why it is not in my other project

I have an existing site, Blueberry, a CHEM 242 flashcard app in React 19 + Vite +
Tailwind. This trainer is deliberately a **separate repository**. Two measured
reasons, so you don't try to talk me out of it:

**Ketcher is enormous.** I installed it into Blueberry to check:
`ketcher-standalone/dist/main.js` is **15.5 MB** and `ketcher-react` a further
**3.1 MB**, because standalone mode inlines the entire Indigo WASM engine.
Blueberry's heaviest existing chunk is 890 kB and I already had to make that lazy.

**Blueberry commits its build output to git.** `docs/` is not in `.gitignore`,
84 commits already touch it, and because Vite content-hashes filenames, every
build writes brand-new blobs that never delta-compress — `.git` is 34 MB against
a packed size of 862 KiB. Adding ~19 MB per deploy to that would be permanent and
only fixable by rewriting history.

So, for this repo, from the first commit:

- **Never commit build output.** `dist/` in `.gitignore` on day one.
- **Deploy via a GitHub Actions workflow** that builds on push. Not a committed
  folder. This is a ten-minute setup now and a genuinely painful migration later.
- **Every heavy thing goes behind `React.lazy` + `Suspense`** with a real loading
  state, not a blank rectangle. "Loading chemistry engine…" beats nothing when
  someone is waiting several seconds on wifi.

## Libraries I think I want — argue with me

I've done some reading. Tell me where I'm wrong.

**Molecule canvas: Ketcher** (`ketcher-react` + `ketcher-core` +
`ketcher-standalone`, Apache 2.0). Closest open-source thing to the ChemDraw and
SciFinder feel. Imports and exports Molfile, SDF, SMILES, SMARTS, InChI, CDXML.
Handles reactions, stereochemistry, R/S and E/Z. Standalone mode runs Indigo in
WASM so there's no backend. Verified: 3.14.0 installs and builds clean against
React 19, no polyfills, no `--legacy-peer-deps`. The one peer warning is
`miew-react`, its optional 3D viewer, which still wants React 18 and isn't needed.

The alternative is **Kekule.js** (MIT) — lighter, more hackable, with a
`Kekule.Editor.Composer` widget. I want you to compare these two properly and
recommend one, with the tradeoff stated rather than the pick asserted. The axis I
care about: how much of the internals I'd need to reach into for feature 3.

**Grading: `@rdkit/rdkit`** (WASM). Not for drawing. Canonical SMILES comparison,
so a correct product drawn upside-down and mirrored still counts. This is what
makes problem mode work at all.

**Curved arrows: nothing off the shelf.** This is custom SVG — a quadratic or
cubic Bézier from a source to a target with a `marker-end` arrowhead and
draggable control points, on a layer above the molecule canvas.

**Freehand: `perfect-freehand`** for stroke geometry, plus the PointerEvent API —
`pointerType === 'pen'`, `e.pressure`, and `touch-action: none` for palm
rejection. That combination is what makes a stylus feel right.

**Dragging atoms: `dnd-kit`,** or `react-konva` if we want canvas-level hit
detection instead of DOM.

**Progress map and any mindmap: `@xyflow/react`** (React Flow). Custom nodes,
custom edge paths, pan, zoom, minimap. Add `dagre` or `elkjs` for auto-layout, or
hand-place nodes for a skill tree. The locked/unlocked glow is custom nodes plus
an animation library.

One thing I want stated plainly in your plan so I stop confusing them: an
**npm library** ships inside my bundle and reaches my users; a **Claude Skill**
is markdown that changes how you work while I code and cannot put UI in my app;
an **MCP server** is a tool you can call at runtime. No skill will give me a
molecule editor.

## Look and feel

[REPLACE ME — e.g. "See `refs/chemdraw-toolbar.png` and `refs/notability-pen.png`.
I want the information density of ChemDraw with the visual calm of Linear.app:
generous whitespace, one accent colour, no gradients, no drop shadows." Put real
screenshots in `refs/` and name them here.]

## Technical constraints

- React + TypeScript + Vite + Tailwind. Zustand for state.
- Mouse, trackpad, touch and stylus all first-class. **iPad Safari is a target,
  not an afterthought** — check it early, not at the end.
- No backend for v1. Client-side only, persisted to IndexedDB.
- I'm on **Windows PowerShell 5.1**. `&&` is a parse error, `curl` is aliased to
  `Invoke-WebRequest` so real curl is `curl.exe`, and `rm -rf` / `cp -r` are
  `Remove-Item -Recurse -Force` / `Copy-Item -Recurse`. Put this in `CLAUDE.md`
  in the repo so it stops being a recurring correction.

## What I want from you in plan mode

Before writing any code:

1. **Ask me clarifying questions** about anything ambiguous above. I'd rather
   answer five questions now than get the wrong architecture.

2. **Recommend the molecule canvas library** and justify it against the
   alternative. Show me the tradeoff, not just the conclusion.

3. **Propose a data model.** How are a molecule, an arrow, a freehand stroke and
   a mechanism step represented so they can coexist on one canvas and serialize
   together? This is the decision I'm most worried about getting wrong, because
   it's the one I can't cheaply change later.

4. **Break the build into phases where each phase ends in something I can click
   on.** Phase 1 should be the smallest thing that proves the hardest assumption
   — see below.

5. **Tell me which parts are risky** or might not work at all, and what the
   fallback is for each.

## The assumption I think will break

Curved arrows and freehand strokes live on an SVG layer above Ketcher, not inside
it. So an arrow has to stay anchored to **atom 7**, not to **pixel (240, 180)**,
when the student drags the molecule across the canvas.

Phase 1 should be an ugly throwaway spike that proves exactly this and nothing
else: render Ketcher, subscribe to `ketcher.editor.subscribe('change', ...)`,
pull live atom coordinates out, and keep a plain SVG dot glued to one specific
carbon while I drag the structure around.

If that works, most of the rest is assembly. If Ketcher doesn't expose atom
positions in a way I can hook into, the architecture is wrong and I need to know
in week one, not in November.

Don't write implementation code yet. I want to review and push back on the plan.

---

## Notes for me, not part of the prompt

**Getting images to Claude Code.** The only method that always works is a
committed `refs/` folder referenced by path: *"look at `refs/chemdraw-toolbar.png`"*.
Dragging a file onto the terminal window and Ctrl+V both work in some terminals
and not others. The VS Code integrated terminal is the same PowerShell as the
standalone one, so there's no correctness difference — but it's easier for
pasting screenshots and for running the dev server in a split pane, which is
worth something on a project this visual.

Claude Code cannot generate images. Original mockups have to come from a photo of
paper, an Excalidraw export, or a paid image API.

**Useful workflow:** screenshot the real tool, annotate it in Paint with red
boxes, save to `refs/`, then say *"build the toolbar to match
`refs/toolbar-annotated.png`, specifically the boxed region."*

**Worth setting up early:** a browser automation MCP server, so Claude can
screenshot your running dev server and see its own output. On a project that is
almost entirely visual, that closes the feedback loop enormously.

**The chemistry skills already installed** (`chem-vis`, `rdkit`, `datamol`,
`matplotlib`, `scientific-visualization`) generate structure images and analysis
*for you, while you work*. They are for making problem sets and diagrams. They
put nothing into the app. One trap found by testing: asking `chem-vis` for a
molecule by common name can return the wrong structure — "vanillin acetate"
resolved to a mixture of vanillin and acetic acid. Use SMILES or IUPAC names, and
look at what comes out.
