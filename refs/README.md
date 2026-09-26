# refs

Screenshots and sketches to point Claude Code at.

Referencing a committed file by path is the only way of showing Claude an image
that works every time. Dragging a file onto the terminal window and pasting with
Ctrl+V both work in some terminals and not others; a path in the repo always
works, in any of them, and it keeps working next week when you have forgotten
which screenshot you meant.

So: put the image here, commit it, and write the path in the prompt.

> Build the toolbar to match `refs/chemdraw-toolbar.png`, specifically the
> boxed region on the left.

Annotate before you save. A red box drawn in Paint around the one control you
mean is worth several paragraphs describing it, and it removes the guesswork
about which part of a busy screenshot you were pointing at.

Claude Code cannot generate images. Originals have to come from a photograph of
paper, an Excalidraw export, or a paid image API.

## Cutting a screenshot down before Claude reads it

A full screenshot costs about 1,500 to 2,000 tokens every time it is read, and
most prompts are about one panel of it. `scripts/imgcut.py` (Pillow, plus OpenCV
for `regions`) cuts it first:

```sh
pip install -r scripts/requirements.txt
python scripts/imgcut.py info    refs/toolbar.png            # size and token cost, no read
python scripts/imgcut.py peek    refs/toolbar.png            # ~300-token preview, grid in real pixels
python scripts/imgcut.py crop    refs/toolbar.png 700 80 1100 600   # X Y W H off that grid
python scripts/imgcut.py regions refs/toolbar.png            # auto-find panels, cut each
```

Cuts land in `.imgcut/`, which is gitignored. Commit the original here, not the cuts.
