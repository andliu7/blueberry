import { useMemo, useRef, useState } from "react";
import { Editor, type ButtonsConfig } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { ketcherProvider, type Ketcher } from "ketcher-core";
import "ketcher-react/dist/index.css";
import "@/components/ui/ketcher-overrides.css";
import { pressClassName } from "../../app/ui/Press";

/**
 * The drawing canvas for a "Draw it" beat: the same Ketcher editor the site's
 * Write "Draw it" uses (src/components/ui/molecule-canvas.tsx), set up for a
 * lesson instead of a chemist's desk.
 *
 * WHY NOT MoleculeCanvas ITSELF. That component is the site's and takes no
 * toolbar settings. A student drawing one product needs bonds, atoms, charges,
 * erase and undo; the full toolbar also offers reaction arrows, R-groups,
 * S-groups, enhanced stereo, shapes, text and a monomer builder, which took
 * most of a 390px screen and were all wrong turns (round 1 critic). Ketcher
 * hides buttons through its own `buttons` prop, so this file renders the same
 * Editor with that list. The two hard-won settings from molecule-canvas.tsx are
 * kept and explained there: one struct service per editor (a shared one
 * deadlocks), and no macromolecules editor (its second mount crashes).
 *
 * DEFAULT EXPORT ON PURPOSE, so DrawBeatView can React.lazy it. This file pulls
 * in Ketcher and its Indigo WASM (about 19MB), which must only download when a
 * draw item is actually on screen, never with the lesson or the pathway.
 */

const HIDE = { hidden: true } as const;

/** Every tool a lesson drawing never needs. Names are Ketcher's ButtonName values. */
const LESSON_BUTTONS: ButtonsConfig = {
  arom: HIDE,
  dearom: HIDE,
  cip: HIDE,
  check: HIDE,
  analyse: HIDE,
  recognize: HIDE,
  miew: HIDE,
  settings: HIDE,
  help: HIDE,
  about: HIDE,
  fullscreen: HIDE,
  sgroup: HIDE,
  "reaction-plus": HIDE,
  arrows: HIDE,
  "reaction-mapping-tools": HIDE,
  "reaction-automap": HIDE,
  "reaction-map": HIDE,
  "reaction-unmap": HIDE,
  rgroup: HIDE,
  "rgroup-label": HIDE,
  "rgroup-fragment": HIDE,
  "rgroup-attpoints": HIDE,
  shape: HIDE,
  "shape-ellipse": HIDE,
  "shape-rectangle": HIDE,
  "shape-line": HIDE,
  text: HIDE,
  "enhanced-stereo": HIDE,
  "create-monomer": HIDE,
};

/** What the beat needs from the editor, so the beat never touches a Ketcher type. */
export interface DrawReader {
  /** Standard InChI of the canvas, "" when nothing is drawn, null when something is drawn but cannot be read. */
  readonly inchi: () => Promise<string | null>;
  /** The canvas as an SVG data URL, for "your drawing" beside the answer. Null if it cannot be drawn. */
  readonly picture: () => Promise<string | null>;
  /**
   * Any SMILES drawn by the same renderer and settings as `picture`, so the
   * answer card and the "Yours" card match in style and scale (round 2 critic:
   * the answer was the app's own figure at a different size).
   */
  readonly pictureOf: (smiles: string) => Promise<string | null>;
}

/**
 * The lesson's own keypad, two rows above the board. WHY (round 4): Ketcher's
 * own chrome (a left rail, a top bar, a template row) is a desktop editor
 * squeezed onto a phone. At 390px it left about 290x190px to draw in, showed
 * Eraser and Bond twice, hid the triple bond behind an unlabeled flyout, and
 * put the wedge and dash keys off the right edge of the screen, so a phone
 * student could not answer the two stereo items at all (round 3 critic).
 * draw.css now hides all of Ketcher's chrome and the board takes the whole
 * box; every key here presses Ketcher's own button by its data-testid, which
 * still works while that button is hidden, so Ketcher stays the only thing
 * that knows how to draw.
 *
 * A key is either a TOOL (it stays lit until another tool is picked) or an
 * ACTION (undo, clear: it fires once and the tool stays as it was).
 */
type ToolId = "single" | "double" | "triple" | "ring" | "wedge" | "dash" | "Br" | "O" | "N" | "plus" | "minus" | "erase";
type ActionId = "undo" | "clear";

interface Key {
  readonly id: ToolId | ActionId;
  /** What the key says. Bonds and the ring get a drawn mark instead (bondMark). */
  readonly label: string;
  /** What a screen reader says. */
  readonly name: string;
  /** Ketcher's data-testid for the button this key presses. */
  readonly testId: string;
  /** A bond type lives in Ketcher's bond flyout, which has to be opened first. */
  readonly inFlyout?: boolean;
  /** Only on the stereo items. */
  readonly stereoOnly?: boolean;
}

const BOND_ROW: readonly Key[] = [
  { id: "single", label: "", name: "Single bond", testId: "bond-single", inFlyout: true },
  { id: "double", label: "", name: "Double bond", testId: "bond-double", inFlyout: true },
  { id: "triple", label: "", name: "Triple bond", testId: "bond-triple", inFlyout: true },
  { id: "wedge", label: "", name: "Wedge bond, toward you", testId: "bond-up", inFlyout: true, stereoOnly: true },
  { id: "dash", label: "", name: "Dash bond, away from you", testId: "bond-down", inFlyout: true, stereoOnly: true },
  { id: "ring", label: "", name: "Six-membered ring", testId: "template-2" },
  { id: "erase", label: "Erase", name: "Eraser", testId: "erase" },
];

const ATOM_ROW: readonly Key[] = [
  { id: "Br", label: "Br", name: "Bromine", testId: "Br-button" },
  { id: "O", label: "O", name: "Oxygen", testId: "O-button" },
  { id: "N", label: "N", name: "Nitrogen", testId: "N-button" },
  { id: "plus", label: "+", name: "Plus charge", testId: "charge-plus" },
  { id: "minus", label: "−", name: "Minus charge", testId: "charge-minus" },
  { id: "undo", label: "Undo", name: "Undo", testId: "undo" },
  { id: "clear", label: "Clear", name: "Clear the board", testId: "clear-canvas" },
];

const ACTIONS: readonly string[] = ["undo", "clear"];

/** A drawn mark for the bond and ring keys: plain strokes in currentColor, so they take the key's ink. */
function bondMark(id: ToolId | ActionId) {
  const line = { stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", fill: "none" } as const;
  let body = null;
  if (id === "single") body = <path d="M4 18 20 6" {...line} />;
  if (id === "double") body = <path d="M3 15.5 17 5M7 19 21 8.5" {...line} />;
  if (id === "triple") body = <path d="M2.5 13.5 15.5 4M5 17 19 7M8.5 20.5 21.5 11" {...line} strokeWidth={2} />;
  if (id === "wedge") body = <path d="M3.5 20.5 17.5 4.5 21.5 8.5Z" fill="currentColor" stroke="currentColor" strokeWidth={1} strokeLinejoin="round" />;
  if (id === "dash") body = <path d="M5.5 17.5l1 1M9 14l2 2.2M12.4 10.6l2.8 3M15.8 7.2l3.6 4" {...line} strokeWidth={2} />;
  if (id === "ring") body = <path d="M12 3.5 19.4 7.75v8.5L12 20.5 4.6 16.25v-8.5Z" {...line} strokeLinejoin="round" />;
  if (body === null) return null;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false" role="presentation">
      {body}
    </svg>
  );
}

/** Ketcher's render settings for the board and both pictures. */
const LOOK = {
  // Skeletal style like the lesson's own figures: a label only on N, O, Br
  // and charged atoms, never "H3C" on a chain end.
  showHydrogenLabels: "Hetero",
  // No "Chiral" flag text in the corner of a wedged drawing.
  showStereoFlags: false,
};

/** One bond length for both pictures, so a small answer is not drawn tiny next to a big drawing. */
const PICTURE = { outputFormat: "svg", "bond-length": 32, "bond-length-unit": "px" } as const;

export default function DrawEditor({
  stereo,
  start,
  onReady,
  onEdit,
}: {
  /** Show the wedge and dash keys (the stereo items only). */
  readonly stereo: boolean;
  /** A SMILES to put on the board before it goes live (DrawBeat.start). */
  readonly start?: string;
  readonly onReady: (reader: DrawReader) => void;
  /** Called when a press on the board itself ends (a tap or a drag drew there), so the beat knows the student has drawn. CHECK waits for it. */
  readonly onEdit?: () => void;
}) {
  // One provider per editor instance (see molecule-canvas.tsx for the deadlock a shared one caused).
  const structServiceProvider = useMemo(() => new StandaloneStructServiceProvider(), []);
  // A ref is React's handle on the real DOM node (here the editor's wrapper),
  // used to press Ketcher's own buttons from the keypad.
  const box = useRef<HTMLDivElement | null>(null);
  // Which tool key is lit. The board opens on the single bond.
  const [tool, setTool] = useState<ToolId>("single");

  /**
   * One of Ketcher's own buttons, by test id. Looked up inside `.Ketcher-root`,
   * the small-molecule editor: the wrapper also holds Ketcher's hidden
   * macromolecule editor, which has its own "undo" and "clear-canvas" earlier
   * in the page, and pressing those does nothing to this board.
   */
  const find = (testId: string) => {
    const root = box.current?.querySelector<HTMLElement>(".Ketcher-root") ?? box.current;
    return root?.querySelector<HTMLElement>(`[data-testid="${testId}"]`) ?? null;
  };

  /**
   * Press a bond type that lives in Ketcher's bond flyout. The flyout only
   * exists while open, and pressing the bond key opens it (or, when another
   * tool is active, first selects the bond tool), so press until the wanted
   * type is there, then pick it. Resolves once it has been picked.
   */
  const pickBond = (testId: string) =>
    new Promise<void>((done) => {
      let tries = 0;
      const step = () => {
        const wanted = find(testId);
        if (wanted !== null) {
          wanted.click();
          done();
          return;
        }
        if (tries++ >= 6) {
          console.warn("[draw] could not open the bond list for", testId);
          done();
          return;
        }
        find("bonds")?.click();
        window.setTimeout(step, 150);
      };
      step();
    });

  const press = (key: Key) => {
    if (ACTIONS.includes(key.id)) {
      find(key.testId)?.click();
      return;
    }
    setTool(key.id as ToolId);
    if (key.inFlyout) void pickBond(key.testId);
    else find(key.testId)?.click();
  };

  const row = (keys: readonly Key[]) =>
    keys
      .filter((k) => stereo || !k.stereoOnly)
      .map((k) => {
        const lit = tool === k.id;
        const mark = bondMark(k.id);
        return (
          <button
            key={k.id}
            type="button"
            className={`${pressClassName({ variant: lit ? "primary" : "secondary", size: "sm" })} draw-beat__tool`}
            aria-label={k.name}
            title={k.name}
            aria-pressed={ACTIONS.includes(k.id) ? undefined : lit}
            data-tool={k.id}
            onClick={() => press(k)}
          >
            {mark ?? k.label}
          </button>
        );
      });

  /**
   * Put this editor back in Ketcher's registry if it has fallen out. WHY: in
   * dev, React StrictMode runs every effect twice, and Ketcher's App effect
   * cleanup deletes the editor from ketcherProvider without adding it back.
   * The board still draws, but every read (InChI, SMILES, picture) then
   * throws "couldnt find ketcher instance", which showed as "the board is
   * empty" on a full drawing in about half the round 4 runs.
   */
  const registered = (ketcher: Ketcher) => {
    try {
      ketcherProvider.getKetcher(ketcher.id);
    } catch {
      ketcherProvider.addKetcherInstance(ketcher);
    }
    return ketcher;
  };

  const reader = (ketcher: Ketcher): DrawReader => {
    const draw = async (structure: string) => {
      try {
        // No backgroundColor: Indigo rejects "#ffffff" ("cannot recognize as a
        // color"); the tray card behind the image is white already (draw.css).
        const blob = await registered(ketcher).generateImage(structure, PICTURE);
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(await blob.text())}`;
      } catch (error) {
        console.warn("[draw] could not picture the structure", error);
        return null;
      }
    };
    return {
      inchi: async () => {
        // Indigo throws on an empty canvas, which is "nothing drawn", not a
        // miss. It can also throw once on a real drawing (seen in round 4: a
        // full wedged diester came back as "the board is empty"), so a throw
        // is retried once, and only a board with no SMILES is called empty.
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            return await registered(ketcher).getInchi();
          } catch (error) {
            console.warn("[draw] could not read the board as InChI", error);
            await new Promise((wait) => window.setTimeout(wait, 300));
          }
        }
        try {
          return (await ketcher.getSmiles()).trim() === "" ? "" : null;
        } catch {
          return "";
        }
      },
      // Through SMILES, not the molfile: Indigo then lays the drawing out the
      // same way it lays out the answer, so the two cards differ only where
      // the structures do.
      picture: async () => draw(await registered(ketcher).getSmiles()),
      pictureOf: draw,
    };
  };

  return (
    <>
      <div className="draw-beat__tools" role="toolbar" aria-label="Drawing tools">
        <div className="draw-beat__tool-row">{row(BOND_ROW)}</div>
        <div className="draw-beat__tool-row">{row(ATOM_ROW)}</div>
      </div>
      <div className="draw-beat__editor" ref={box} onPointerUp={onEdit}>
        <Editor
          staticResourcesUrl=""
          structServiceProvider={structServiceProvider}
          buttons={LESSON_BUTTONS}
          disableMacromoleculesEditor
          errorHandler={(message: string) => console.error("[ketcher]", message)}
          onInit={(ketcher: Ketcher) => {
            try {
              ketcher.editor.setOptions(JSON.stringify(LOOK));
            } catch (error) {
              // An older or newer Ketcher without these options still draws, just with its default labels.
              console.warn("[draw] could not set the board's look", error);
            }
            // CHECK goes live only after the bond tool is really on, so the
            // first tap always draws (round 2: one early tap drew nothing).
            // Ketcher draws its toolbar a moment after onInit, hence the wait.
            // A starting structure goes on first, so the board never goes live empty
            // and then fills under the student's finger.
            window.setTimeout(() => {
              void (async () => {
                if (start !== undefined) {
                  try {
                    await registered(ketcher).setMolecule(start);
                  } catch (error) {
                    console.warn("[draw] could not put the starting structure on the board", error);
                  }
                }
                await pickBond("bond-single");
                onReady(reader(ketcher));
              })();
            }, 300);
          }}
        />
      </div>
    </>
  );
}
