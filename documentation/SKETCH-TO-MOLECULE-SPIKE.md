# Sketch to molecule: research spike

Queue item 16, second half. Research only: no code, no model shipped. Written
23 Oct 2026, alongside the scratchpad that shipped beside the Ketcher editor on
the "Draw it" screen (`src/game/beats/trace/ScratchpadCanvas.tsx`).

The question: could the student's finger or Pencil sketch on the scratchpad be
turned into a close molecule in the editor, so they fix a structure instead of
building it key by key?

## What "close" means here

Whatever reads the sketch produces a STARTING structure, loaded into Ketcher
for the student to check and fix. It is never graded straight from the sketch.
CHECK keeps grading only what is on the editor board, through the InChI path
that already exists (`beats/draw/grade.ts`).

That is the rule `recognise.ts` already argues for the freehand beat: a misread
must never mark a right answer wrong. A recogniser that is right nine times in
ten is useful as a head start and unacceptable as a grader.

## What is already in the repo

- `src/game/beats/trace/recognise.ts` turns strokes plus element taps from a
  palette into a `Graph` (vertices, edges, bond orders). It is tested
  (`traceRecognise.test.ts`, 60 tests) and unreachable from the UI today.
- `ketcher-standalone` carries Indigo as WASM inside the lazy editor chunk. It
  can load a molfile (`setMolecule`) and lay it out.
- Ketcher's own "recognize" button (Imago) needs a remote Indigo service. It is
  hidden in `LESSON_BUTTONS` (`beats/draw/DrawEditor.tsx`).
- Neither `@rdkit/rdkit` (the JS build) nor any image recognition model is
  installed.

Sizes below are what the projects report or what is unknown. Nothing in this
document was downloaded or measured.

## The options

### (A) In-house stroke to graph, then Ketcher

| | |
|---|---|
| What it is | `recognise.ts` (exists) plus a new Graph to V2000 molfile serialiser, handed to Ketcher's `setMolecule` and layout |
| Input it expects | Strokes as point lists, not an image; elements placed from a palette, not handwritten |
| Hand-drawn input | Built for it, but for a drawing style close to bonds: one stroke per bond or chain, corners as vertices. Free doodles and handwritten letters are out of scope by design |
| Size | No model weight. The serialiser is a few hundred lines; Indigo is already in the editor's lazy chunk |
| Licence | Our own code (repo licence); Ketcher and Indigo are already shipped under Apache-2.0 |
| Where it runs | In the browser |
| Offline | Yes |
| Fit for the 400 KB first paint | Good: all of it sits behind the existing React.lazy editor chunk, nothing reaches `#/app` first open |
| Limits | No handwritten letters, no wedges or dashes, and the scratchpad would need a palette (or a "convert" step with element taps) to name heteroatoms |

### (B) DECIMER, hand-drawn model

| | |
|---|---|
| What it is | EfficientNetV2 encoder plus Transformer decoder, image to SMILES, TensorFlow. The DECIMER Image Transformer repo has a "hand-drawn model" section (Zenodo DOI 10.5281/zenodo.10781330) |
| Input it expects | A raster image of one structure |
| Hand-drawn input | Has a dedicated hand-drawn model; check its published accuracy on student-quality sketches before trusting it |
| Size | Not stated in the README. The spike brief quoted about 1.2 GB for the V2 checkpoints; not verified here |
| Licence | MIT, per the GitHub repo. Check the Zenodo record's licence for the weights separately |
| Where it runs | A Python server with TensorFlow |
| Offline | No, at any plausible size there is no browser path |
| Fit for the 400 KB first paint | Only as a server call; nothing ships to the client |

### (C) MolScribe

| | |
|---|---|
| What it is | Swin Transformer encoder plus a graph decoder that predicts atoms, coordinates and bonds; PyTorch (the example imports `torch`) |
| Input it expects | A raster image of one structure |
| Hand-drawn input | The README reports no hand-drawn benchmark: synthetic (Indigo, ChemDraw), realistic (CLEF, UOB, USPTO, Staker, ACS) and perturbed sets only. Expect it to be weaker on sketches than (B) until tested |
| Size | Checkpoint `swin_base_char_aux_1m680k.pth`; size not stated in the README, read it from the release before planning |
| Licence | MIT, per the GitHub repo |
| Where it runs | A Python server with PyTorch |
| Offline | No |
| Fit for the 400 KB first paint | Only as a server call |
| Plus | Predicts atom coordinates, so the editor could keep the student's layout instead of relaying it out |

### (D) OSRA

| | |
|---|---|
| What it is | Rule-based optical structure recognition, C++ |
| Input it expects | Scanned or printed structure images |
| Hand-drawn input | Weak: built for clean print |
| Size | Native binary plus dependencies; not measured |
| Licence | GPL. Linking it into the client would bind the client to GPL; as a separate server process that is a smaller question, but still an owner question |
| Where it runs | A server |
| Offline | No |
| Fit | Poor |

### (E) Imago (Ketcher's own "recognize")

| | |
|---|---|
| What it is | EPAM's structure recognition, behind Ketcher's recognize button through a remote Indigo service |
| Input it expects | An image of a printed structure |
| Hand-drawn input | Weak |
| Size | Server side; not measured |
| Licence | Apache-2.0 as stated in the brief; check the current Imago LICENSE before relying on it |
| Where it runs | A remote Indigo service we would have to host |
| Offline | No |
| Fit | Poor: the integration is free (the button exists) but the recognition is the wrong kind |

### (F) Commercial APIs

| | |
|---|---|
| What it is | Paid recognition services, for example Mathpix, which reads handwritten chemistry |
| Input it expects | An image or stroke data |
| Hand-drawn input | Likely the strongest of the list on real handwriting; not tested here |
| Size | None on the client |
| Licence | Commercial terms, per call |
| Where it runs | The vendor's servers |
| Offline | No |
| Fit | Technically easy, but every call sends a student's ink to a third party. That is a privacy and cost decision for the owner, not an engineering one |

### (G) RDKit cleanup after any of the above

Not a recogniser: a step that runs after one. Sanitise, valence-check and
canonicalise the guess before it reaches Ketcher, and drop it with a "could not
read that sketch" note if it fails. It keeps a broken guess (a five-bond carbon,
an open valence) off the board. In the browser that means either Indigo's own
checks (already loaded) or adding RDKit's JS build to the lazy chunk; on a
server it is the Python RDKit the repo already uses for authoring.

## Recommendation

1. Prototype (A) first. It is offline, adds no weight to the first open, reuses
   tested code, and keeps the head-start-never-grader rule easy to hold. The
   work: a Graph to molfile serialiser with a test that round-trips through
   RDKit (the chemistry rule), a "Send to editor" key on the scratchpad, and an
   element palette or tap step on the scratchpad so heteroatoms are named.
2. Treat (B) DECIMER, or (C) MolScribe after a hand-drawn test, as a
   server-side follow-up only if the owner wants free handwriting. Either needs
   a hosted Python service and a privacy decision.
3. Whatever reads the sketch, run (G) before loading the result.
4. Skip (D) and (E): wrong kind of input. (F) only on an explicit owner yes.

## Owner decisions still open

- Does the scratchpad stay scratch paper only, or should it gain a "Send to
  editor" key at all? Adding one changes it from "never read" to "read on
  request".
- If yes: is (A)'s drawing style (bonds as strokes, elements from a palette)
  acceptable, or is free handwriting the requirement?
- If free handwriting: is hosting a Python recognition server acceptable, and
  may student sketches leave the device (to our server, or to a vendor as in
  (F))?
