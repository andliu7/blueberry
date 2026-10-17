import { MoleculeCanvas } from "@/components/ui/molecule-canvas";

/**
 * The drawing canvas for a "Draw it" beat: the site's Ketcher editor
 * (MoleculeCanvas, the same one Write's "Draw it" uses), wrapped so the beat
 * never touches a Ketcher type.
 *
 * DEFAULT EXPORT ON PURPOSE, so DrawBeatView can React.lazy it. This file pulls
 * in Ketcher and its Indigo WASM (about 19MB), which must only download when a
 * draw item is actually on screen, never with the lesson or the pathway.
 */

/** What the beat needs from the editor: the canvas as an InChI. */
export interface DrawReader {
  /** Standard InChI of the canvas, or "" when nothing readable is drawn. */
  readonly inchi: () => Promise<string>;
}

export default function DrawEditor({ onReady }: { readonly onReady: (reader: DrawReader) => void }) {
  return (
    <MoleculeCanvas
      className="draw-beat__editor"
      onReady={(ketcher) =>
        onReady({
          inchi: async () => {
            try {
              return await ketcher.getInchi();
            } catch {
              // Indigo throws on an empty canvas; that is "nothing drawn", not a miss.
              return "";
            }
          },
        })
      }
    />
  );
}
