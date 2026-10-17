import { useRef, useState } from "react";
import type { Ketcher } from "ketcher-core";
import { MoleculeCanvas } from "@/components/ui/molecule-canvas";
import { Loader } from "@/components/ui/loader";
import { sameStructure } from "@/lib/checkAnswer";

/**
 * Write's "Draw it" (owner, 2026-10-16): draw the product instead of typing its name.
 *
 * Marked the way the reaction draw page marks (ReactionDrawPage.tsx): the drawing and
 * the card's `product` SMILES go through the same canonicaliser, so the verdict is about
 * the structure, never the string. The product comes from the carbonyl generator, which
 * canonicalises it with RDKit; it is never typed from a name.
 *
 * Default export so StudyModes can React.lazy it: this file imports Ketcher (about 19MB
 * of WASM), which must stay out of the download for anyone who only types.
 */
export default function WriteDraw({
  expected,
  onChecked,
  disabled,
}: {
  expected: string;
  /** True for the same structure. Called once per Check. */
  onChecked: (ok: boolean) => void;
  /** After a check, until the student moves on. */
  disabled: boolean;
}) {
  const ketcherRef = useRef<Ketcher | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "checking" | "error">("loading");

  const check = async () => {
    const ketcher = ketcherRef.current;
    if (!ketcher) return;
    setState("checking");
    const result = await sameStructure(ketcher, expected);
    if ("error" in result) {
      setState("error");
      return;
    }
    setState("ready");
    onChecked(result.ok);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rv-draw overflow-hidden rounded-2xl border-2 border-[var(--site-border)] bg-white">
        {/* Height reserved so nothing jumps when the editor finishes loading. */}
        <MoleculeCanvas
          className="h-[360px] w-full"
          onReady={(k) => {
            ketcherRef.current = k;
            setState("ready");
          }}
        />
      </div>
      {state === "error" && (
        <p className="text-sm text-[var(--site-quiet)]">The drawing could not be read. Check that it is one structure.</p>
      )}
      {!disabled && (
        <div>
          <button type="button" className="rv-btn" onClick={() => void check()} disabled={state === "loading" || state === "checking"}>
            {state === "checking" ? <Loader variant="dots" size="sm" text="Checking" /> : state === "loading" ? "Loading the editor" : "Check drawing"}
          </button>
        </div>
      )}
    </div>
  );
}
