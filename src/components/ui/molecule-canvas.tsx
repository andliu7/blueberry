import { useMemo, useRef } from "react";
import { Editor } from "ketcher-react";
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import type { Ketcher } from "ketcher-core";
import "ketcher-react/dist/index.css";

/**
 * The drawing surface, copied from `mechanism_trainer/src/components/
 * MoleculeCanvas.tsx`.
 *
 * Both hard-won comments below came from real failures there and are kept
 * verbatim, because both would otherwise be rediscovered the expensive way.
 *
 * Note for whoever imports this: it drags in Ketcher, which is roughly 19MB of
 * WASM. It must only ever be reached through a lazy route. Importing it from a
 * page a student opens to read a deck would put that download in front of
 * everyone, for a feature most of them are not using right now.
 */
export function MoleculeCanvas({
  onReady,
  className,
}: {
  onReady?: (ketcher: Ketcher) => void;
  className?: string;
}) {
  const ketcherRef = useRef<Ketcher | null>(null);

  /**
   * One provider per editor, created once per instance.
   *
   * It started at module scope, shared by every editor on the page, on the
   * reasoning that each provider spins up an Indigo WASM engine and one is
   * cheaper than three. That deadlocked: with three editors sharing it,
   * `setMolecule` on the first never resolved and never rejected, and the box
   * sat on its loading spinner forever. The engine is not reentrant across
   * editors.
   *
   * `useMemo` rather than module scope keeps the original point — one per
   * component, not one per render — without the sharing that broke it.
   */
  const structServiceProvider = useMemo(() => new StandaloneStructServiceProvider(), []);

  return (
    <div className={className}>
      <Editor
        staticResourcesUrl=""
        structServiceProvider={structServiceProvider}
        /**
         * No macromolecules, for two reasons and the second is the important one.
         *
         * Nothing in this course is a peptide or a nucleotide, so the RNA / DNA /
         * PEP / Molecules switcher is four wrong turns presented as options.
         *
         * It was also crashing the page. Confirming a step mounts the next
         * editor, and the second mount threw "Cannot read properties of
         * undefined (reading 'events')" out of Ketcher's own `EditorEvents`,
         * which took the whole problem page into the error boundary. That
         * component belongs to the macromolecules editor, which is initialised
         * lazily and is not ready for a second instance. Turning the subsystem
         * off removes the component doing the reading.
         */
        disableMacromoleculesEditor
        errorHandler={(message: string) => console.error("[ketcher]", message)}
        onInit={(ketcher: Ketcher) => {
          ketcherRef.current = ketcher;
          onReady?.(ketcher);
        }}
      />
    </div>
  );
}

export default MoleculeCanvas;
