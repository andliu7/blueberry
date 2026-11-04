/**
 * The Unit 0 "Bonds and formal charge" figure: ShellAtom with three atoms to
 * switch between (C in methane, N in ammonium, O in hydroxide). The atoms,
 * their bonds, lone pairs and RDKit formal charges are ATOM_PRESETS, generated
 * by scripts/gen_shell_atom.py. Lazy-loaded by beats/StoryScene.tsx.
 */
import { useState } from "react";

import { ShellAtom } from "./ShellAtom";
import { ATOM_PRESETS } from "./shellModel.generated";

export function ShellAtomExplorer({ reducedMotion = false }: { readonly reducedMotion?: boolean }) {
  const [at, setAt] = useState(0);
  const preset = ATOM_PRESETS[at]!;
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Pick an atom">
        {ATOM_PRESETS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={i === at}
            onClick={() => setAt(i)}
            className={`min-h-11 rounded-full border-2 px-4 text-scale-sm font-semibold ${
              i === at ? "border-bb-primary bg-bb-primary text-bb-primary-foreground" : "border-bb-border bg-bb-card text-bb-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <ShellAtom key={preset.id} z={preset.z} bonding={preset} reducedMotion={reducedMotion} label={preset.label} />
    </div>
  );
}

export default ShellAtomExplorer;
