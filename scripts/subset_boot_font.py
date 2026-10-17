# Builds the tiny font the game's boot loader draws its count and wordmark in.
#
# Why: the loader paints before any stylesheet or bundle has arrived, so Nunito
# (which rides the site CSS and the game chunk) is not there yet and the count
# would first draw in a fallback face and then swap. This pins Nunito's
# variable wght axis at 900 and keeps only the glyphs the loader shows (the ten
# digits and the letters of "blueberry"), about 2 kB, small enough to inline in
# index.html as a data URI so it is there on the first frame.
#
# Source: @fontsource-variable/nunito (Nunito, SIL Open Font License 1.1,
# https://github.com/googlefonts/nunito). Needs fontTools with brotli support.
#
# Usage (from the repo root):
#   python scripts/subset_boot_font.py node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2 boot-font.b64
# then paste the base64 into the @font-face "Boot Nunito" src in index.html.
import base64
import io
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src, out = sys.argv[1], sys.argv[2]
font = instancer.instantiateVariableFont(TTFont(src), {"wght": 900})
options = subset.Options()
options.flavor = "woff2"
options.layout_features = ["kern", "tnum"]
options.name_IDs = ["*"]
options.notdef_outline = False
subsetter = subset.Subsetter(options)
subsetter.populate(text="0123456789bluery")
subsetter.subset(font)
buffer = io.BytesIO()
font.flavor = "woff2"
font.save(buffer)
with open(out, "w") as handle:
    handle.write(base64.b64encode(buffer.getvalue()).decode())
print(len(buffer.getvalue()), "bytes")
