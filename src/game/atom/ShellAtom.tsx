/**
 * An atom drawn as concentric shells around a nucleus, every electron a dot on
 * its shell that a student can tap, click or reach by keyboard to open a small
 * card: which shell, core or valence, and, when the atom sits in a molecule,
 * whether that electron is in a bond (to what) or part of a lone pair.
 *
 * Adapted from the "OrbitTimeline" component the owner pasted on 3 Nov (nodes
 * orbiting a core, a card on click, a growth intro, reduced motion), rebuilt
 * for chemistry rather than pasted: the electron counts come from the shell
 * rule in shellModel.ts, checked against RDKit, and the bonding comes from the
 * caller (ATOM_PRESETS in shellModel.generated.ts is read from RDKit).
 *
 * Motion: each shell turns slowly, pauses while a card is open, and does not
 * move at all under reduced motion. Every electron is a 44px button.
 * Lazy-load this file: the Unit 0 scene card does (beats/StoryScene.tsx).
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { describeElectron, formalChargeParts, placeElectrons, shellCounts, SHELL_SYMBOLS, type AtomBonding } from "./shellModel";
import "./shell-atom.css";

/** Ring radius as a percent of the stage, innermost to outermost. */
function ringRadii(n: number): number[] {
  if (n === 1) return [30];
  const inner = 17;
  const outer = 34;
  return Array.from({ length: n }, (_, i) => inner + (i * (outer - inner)) / (n - 1));
}

/** Where a bond's partner label sits, as a percent radius. */
const LABEL_R = 46;

export interface ShellAtomProps {
  /** Atomic number. Must be one shellModel.ts supports. */
  readonly z: number;
  /** The atom in a molecule. Without it, the neutral free atom is drawn. */
  readonly bonding?: AtomBonding;
  readonly reducedMotion?: boolean;
  /** Names the figure for a screen reader, e.g. "N in ammonium". */
  readonly label?: string;
}

export function ShellAtom({ z, bonding, reducedMotion = false, label }: ShellAtomProps) {
  const symbol = SHELL_SYMBOLS[z] ?? "?";
  const shells = shellCounts(z);
  const radii = ringRadii(shells.length);
  const { electrons, bonds } = useMemo(() => placeElectrons(z, bonding), [z, bonding]);
  const [open, setOpen] = useState<string | null>(null);
  // A new atom closes the card: the electron it described is gone.
  useEffect(() => setOpen(null), [z, bonding]);
  const picked = electrons.find((e) => e.id === open) ?? null;
  const card = picked === null ? null : describeElectron(symbol, picked);
  const valence = shells.length;
  const fc = bonding === undefined ? null : formalChargeParts(z, bonding);

  useEffect(() => {
    if (open === null) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cls = ["shell-atom", reducedMotion ? "shell-atom--still" : "", open !== null ? "shell-atom--paused" : ""].filter(Boolean).join(" ");

  return (
    <figure className={cls} aria-label={label ?? `${symbol}, shell model`}>
      <div className="shell-atom__stage">
        {radii.map((r, i) => {
          const shell = i + 1;
          const isValence = shell === valence;
          const mine = electrons.filter((e) => e.shell === shell);
          const ringStyle = { "--r": `${r}%`, "--turn": `${70 + i * 25}s`, "--delay": `${i * 90}ms` } as CSSProperties;
          return (
            <div key={shell} className={`shell-atom__shell${isValence ? " shell-atom__shell--valence" : ""}`} style={ringStyle}>
              <div className="shell-atom__ring" aria-hidden />
              <div className="shell-atom__spin">
                {isValence
                  ? bonds.map((b) => (
                      <div key={b.id} className="shell-atom__arm" style={{ transform: `rotate(${b.angle}deg)` }} aria-hidden>
                        <span className={`shell-atom__stub shell-atom__stub--${b.order}`} style={{ top: `${50 - LABEL_R + 4}%`, height: `${LABEL_R - 4 - r - 2}%` }} />
                        <span className="shell-atom__partner" style={{ top: `${50 - LABEL_R}%` }}>
                          <span style={{ transform: `rotate(${-b.angle}deg)` }}>
                            <span className="shell-atom__upright">{b.to}</span>
                          </span>
                        </span>
                      </div>
                    ))
                  : null}
                {mine.map((e) => {
                  const what = e.role === "core" ? "core" : e.role === "bond" ? `in a bond to ${e.partner}` : e.role === "lone" ? "in a lone pair" : "valence";
                  return (
                    <div key={e.id} className="shell-atom__arm" style={{ transform: `rotate(${e.angle}deg)` }}>
                      <button
                        type="button"
                        className={`shell-atom__e shell-atom__e--${e.role}${open === e.id ? " is-open" : ""}`}
                        style={{ top: `${50 - r}%` }}
                        aria-label={`Electron in shell ${e.shell}, ${what}`}
                        aria-expanded={open === e.id}
                        aria-controls="shell-atom-card"
                        onClick={() => setOpen(open === e.id ? null : e.id)}
                      >
                        <span className="shell-atom__dot" aria-hidden />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="shell-atom__nucleus" aria-hidden>
          <span className="shell-atom__symbol">{symbol}</span>
          <span className="shell-atom__z">{z}+</span>
        </div>
      </div>

      <figcaption className="shell-atom__legend">
        <span>
          <span className="shell-atom__key shell-atom__key--core" aria-hidden /> core
        </span>
        <span>
          <span className="shell-atom__key shell-atom__key--valence" aria-hidden /> valence
        </span>
        <span className="shell-atom__counts">Shells: {shells.join(", ")}</span>
      </figcaption>

      {fc !== null ? (
        <p className="shell-atom__fc">
          {fc.lead} <span className="shell-atom__nowrap">{fc.sum}</span>
        </p>
      ) : null}

      <div id="shell-atom-card" className="shell-atom__card" aria-live="polite" hidden={card === null}>
        {card !== null ? (
          <>
            <div className="shell-atom__card-head">
              <p className="shell-atom__card-title">{card.heading}</p>
              <button type="button" className="shell-atom__close" onClick={() => setOpen(null)} aria-label="Close">
                <span aria-hidden>×</span>
              </button>
            </div>
            <p>{card.body}</p>
            <p className="shell-atom__honest">A shell model: real electrons sit in orbitals, which Unit 1 uses.</p>
          </>
        ) : null}
      </div>
      {card === null ? <p className="shell-atom__hint">Tap an electron to see what it is doing.</p> : null}
    </figure>
  );
}

export default ShellAtom;
