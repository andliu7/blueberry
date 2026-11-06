/**
 * The hexagon key sheet, a development surface at #/app/gallery/hex.
 *
 * Every key in every state, pressed and unpressed, at real size, on the real
 * game ground, so the piece can be judged in one place before it rolls out.
 * Lazy-loaded from App.tsx like the other galleries.
 *
 * Round 3 (3 Nov judges): the ring lives on round keys and path nodes only,
 * 64px and up, drawn as a thin skeletal benzene with the glyph kept 6px clear
 * of every bond. Text keys stay the rounded .btn3d, one family with the
 * answer rows, and the sheet shows them together so that agreement is
 * checkable.
 *
 * Opening it turns the opt-in look on for this page load (forceHexLook), so
 * the path nodes below wear the ring exactly as the pathway would.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Press, type PressVariant } from "./Press";
import { ChipPress } from "../../beats/ChipPress";
import { AnswerTray } from "../../beats/AnswerTray";
import { GuessOptions } from "../../beats/primerParts";
import { forceHexLook } from "./hexLook";
import { glyphClearance, hexHeight, hexPath, kekuleLines, linesPath, ringLayout, ringPath } from "./hexGeometry";
import { HexNodeFace, HexNodeLip } from "../../tabs/pathway/HexNode";
import "../../tabs/pathway/pathway.css";
import "../../beats/preview.css";

forceHexLook(true);

function Cell({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="bb-eyebrow">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, note, children }: { readonly title: string; readonly note?: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-bb-border bg-bb-card p-5">
      <div className="flex flex-col gap-1">
        <h2 className="bb-h2 text-bb-foreground">{title}</h2>
        {note ? <p className="text-sm text-bb-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/* Icons for the round keys: flat, filled, in the key's ink. */
const ICON: Record<string, ReactNode> = {
  play: <svg viewBox="0 0 24 24" aria-hidden><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  star: <svg viewBox="0 0 24 24" aria-hidden><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>,
  back: <svg viewBox="0 0 24 24" aria-hidden><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

/** A large drawing of one ring, for the legend. */
function Legend({ set, title, note }: { readonly set: "a" | "b" | null; readonly title: string; readonly note: string }) {
  const r = 34;
  const h = hexHeight(r);
  return (
    <figure className="flex flex-col items-center gap-2 text-center">
      <svg viewBox={`-4 -4 ${2 * r + 8} ${h + 8}`} width="96" height="88" role="img" aria-label={title}>
        <path d={ringPath(r, h / 2, r)} fill="none" stroke="var(--bb-foreground)" strokeWidth="2.5" strokeLinejoin="round" />
        {set ? (
          <path d={linesPath(kekuleLines(r, h / 2, r, set, 6, 0.14))} fill="none" stroke="var(--bb-foreground)" strokeWidth="2.5" strokeLinecap="round" />
        ) : null}
      </svg>
      <figcaption className="flex flex-col gap-0.5">
        <strong className="text-bb-foreground">{title}</strong>
        <span className="text-sm text-bb-muted-foreground">{note}</span>
      </figcaption>
    </figure>
  );
}

/** A path node exactly as the pathway draws it with the look on, not pressable here. */
function NodeSample({ state, aromatic, children }: { readonly state: string; readonly aromatic: boolean; readonly children?: ReactNode }) {
  return (
    <span className={`path-node path-node--${state} hx-node`} aria-hidden>
      <HexNodeLip />
      <span className="path-node__face">
        <HexNodeFace aromatic={aromatic} />
        {children}
      </span>
    </span>
  );
}

const BULB = (
  <svg viewBox="0 0 24 24" aria-hidden>
    <path d="M12 3a6.5 6.5 0 0 0-3.8 11.8c.5.4.8 1 .8 1.6V17h6v-.6c0-.6.3-1.2.8-1.6A6.5 6.5 0 0 0 12 3z" fill="var(--node-glyph)" />
    <rect x="9" y="18.2" width="6" height="2.6" rx="1.3" fill="var(--node-glyph)" />
  </svg>
);

const TEXT_VARIANTS: readonly { variant: PressVariant; label: string }[] = [
  { variant: "primary", label: "Continue" },
  { variant: "success", label: "Check" },
  { variant: "secondary", label: "Review" },
  { variant: "danger", label: "Reset deck" },
];

const ROUND: readonly { variant: PressVariant; icon: ReactNode; name: string; title: string }[] = [
  { variant: "primary", icon: ICON.play, name: "Start", title: "Primary: benzene" },
  { variant: "success", icon: ICON.check, name: "Done", title: "Success: benzene" },
  { variant: "secondary", icon: ICON.back, name: "Back", title: "Secondary: cyclohexane" },
];

/* Sample rows for the layout only: no question is asked here, nothing is checked. */
const OPTIONS = [
  { id: "a", text: "First answer" },
  { id: "b", text: "Second answer" },
  { id: "c", text: "Third answer" },
];

export default function HexGallery() {
  const [presses, setPresses] = useState(0);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<string | null>("b");
  useEffect(() => {
    if (!busy) return;
    const id = window.setTimeout(() => setBusy(false), 2400);
    return () => window.clearTimeout(id);
  }, [busy]);
  const count = () => setPresses((n) => n + 1);
  const hexPreview = hexPath(20, hexHeight(20) / 2, 20);
  const sizes = [64, 72, 88];

  return (
    <div className="bb-ground min-h-dvh px-4 py-8 md:px-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="bb-eyebrow">Blueberry design system</p>
          <h1 className="bb-h-display text-bb-foreground">Hexagon keys</h1>
          <p className="text-bb-muted-foreground">
            The ring is for round keys and path nodes: a benzene drawn on the face (a 2px ring of single bonds set in from
            the edge, three double bonds inside it), its double bonds moving one place round the ring when you press. Text keys stay rounded, one family with the answer rows. Presses so far:{" "}
            <strong>{presses}</strong>
          </p>
        </header>

        <Section title="What the ring says" note="Both Kekulé structures are the same molecule, benzene, drawn two ways (resonance). A press swaps one structure for the other in place: the ring and the icon stay still, only the double bonds move one place. Pressing never turns it into anything else.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Legend set="a" title="At rest" note="Benzene, Kekulé structure 1" />
            <Legend set="b" title="Pressed" note="Benzene, Kekulé structure 2" />
            <Legend set={null} title="Secondary, locked" note="Cyclohexane, no double bonds" />
            <figure className="flex flex-col items-center gap-2 text-center">
              <svg viewBox="-2 -2 44 39" width="96" height="88" aria-hidden>
                <path d={hexPreview} fill="var(--btn-disabled)" />
                <path d={ringPath(20, hexHeight(20) / 2, 15)} fill="none" stroke="var(--btn-disabled-ink)" strokeOpacity="0.45" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <figcaption className="flex flex-col gap-0.5">
                <strong className="text-bb-foreground">Disabled</strong>
                <span className="text-sm text-bb-muted-foreground">A faded cyclohexane, flat, no lip</span>
              </figcaption>
            </figure>
          </div>
        </Section>

        <Section title="Round keys" note="A regular hexagon, 64px across or more. Hold one down: the face drops by its lip and the double bonds move onto the other Kekulé structure.">
          {ROUND.map(({ variant, icon, name, title }) => (
            <div key={variant} className="flex flex-col gap-2">
              <h3 className="font-display text-sm font-extrabold text-bb-foreground">{title}</h3>
              <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-4">
                <Cell label="Rest">
                  <Press variant={variant} hex aria-label={name} onClick={count}>{icon}</Press>
                </Cell>
                <Cell label="Pressed">
                  <Press variant={variant} hex pressed aria-label={name} onClick={count}>{icon}</Press>
                </Cell>
                <Cell label="Disabled">
                  <Press variant={variant} hex disabled aria-label={name}>{icon}</Press>
                </Cell>
                <Cell label="Loading">
                  <Press variant={variant} hex busy aria-label={name}>{icon}</Press>
                </Cell>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-5">
            {sizes.map((d) => {
              const r = d / 2;
              const glyph = Math.round(d * 0.3);
              return (
                <Cell key={d} label={`${d} by ${Math.round(hexHeight(r))}, ${glyphClearance(r, glyph).toFixed(0)}px clear`}>
                  <Press variant="primary" hex aria-label="Star" style={{ ["--hx-d" as string]: `${d / 16}rem` }} onClick={count}>{ICON.star}</Press>
                </Cell>
              );
            })}
          </div>
          <Press variant="primary" hex busy={busy} aria-label="Press to see loading" onClick={() => setBusy(true)}>{ICON.play}</Press>
        </Section>

        <Section title="Path nodes at real size" note={`80 across. Done, current (resonating slowly), open, locked. The glyph is 24px, ${glyphClearance(40, 24).toFixed(0)}px clear of the bonds (ringLayout allows up to ${ringLayout(40).glyph}).`}>
          <div className="flex flex-wrap items-end gap-6">
            <Cell label="Done"><NodeSample state="done" aromatic>{ICON.check}</NodeSample></Cell>
            <Cell label="Current"><NodeSample state="current" aromatic>{BULB}</NodeSample></Cell>
            <Cell label="Open"><NodeSample state="open" aromatic>{BULB}</NodeSample></Cell>
            <Cell label="Locked"><NodeSample state="locked" aromatic={false}>{BULB}</NodeSample></Cell>
          </div>
          <div className="path-side" style={{ position: "static", width: "auto", transform: "none", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", gap: "1.5rem" }}>
            <Cell label="Side quest, open"><NodeSample state="open" aromatic>{BULB}</NodeSample></Cell>
            <Cell label="Side quest, locked"><NodeSample state="locked" aromatic={false}>{BULB}</NodeSample></Cell>
          </div>
          <Cell label="Current, with its START card (rest, then held down)">
            <div className="path-row flex w-full flex-col gap-6" style={{ ["--wind" as string]: 0, padding: 0 }}>
              <div className="flex justify-center"><NodeSample state="current" aromatic>{BULB}</NodeSample></div>
              <div className="hx-pop">
                <p className="hx-pop__eyebrow">Step 2 of 18</p>
                <p className="hx-pop__title">Rank carbocation stability</p>
                <button type="button" className="btn3d btn3d--block hx-pop__start" onClick={count}>Start</button>
              </div>
              <div className="hx-pop">
                <p className="hx-pop__eyebrow">Step 2 of 18</p>
                <p className="hx-pop__title">Rank carbocation stability</p>
                <button type="button" className="btn3d btn3d--block hx-pop__start is-pressed" onClick={count}>Start</button>
              </div>
            </div>
          </Cell>
        </Section>

        <Section title="Text keys" note="Rounded, with a lip: the same corner, rim and lip as the answer rows, so a lesson screen has one family. A hexagon stretched to a word's width reads as a price tag, not a ring.">
          {TEXT_VARIANTS.map(({ variant, label }) => (
            <div key={variant} className="grid grid-cols-2 items-start gap-4 sm:grid-cols-4">
              <Cell label="Rest">
                <Press variant={variant} onClick={count}>{label}</Press>
              </Cell>
              <Cell label="Pressed">
                <Press variant={variant} pressed onClick={count}>{label}</Press>
              </Cell>
              <Cell label="Disabled">
                <Press variant={variant} disabled>{label}</Press>
              </Cell>
              <Cell label="Loading">
                <Press variant={variant} busy className="whitespace-nowrap">{label}</Press>
              </Cell>
            </div>
          ))}
        </Section>

        <Section title="The answer moment" note="Answer rows over the lesson footer, one family: SKIP and CHECK share the rows' corner and lip, and the footer's edges meet the rows' edges.">
          <div className="flex flex-col gap-3">
            <GuessOptions questionId="hex-gallery" options={OPTIONS} correctOptionId="b" picked={picked} locked={false} checked={false} showVisual={false} onPick={setPicked} />
            <Cell label={picked === null ? "Nothing picked" : "Ready"}>
              <div className="primer-foot flex w-full gap-3">
                <ChipPress variant="quiet" className="primer-foot__skip" onClick={() => setPicked(null)}>Skip</ChipPress>
                <ChipPress className="flex-1" disabled={picked === null} onClick={count}>Check</ChipPress>
              </div>
            </Cell>
            <Cell label="Both held down">
              <div className="primer-foot flex w-full gap-3">
                <ChipPress variant="quiet" className="primer-foot__skip is-pressed">Skip</ChipPress>
                <ChipPress className="flex-1 is-pressed">Check</ChipPress>
              </div>
            </Cell>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <AnswerTray tone="right" title="Nice!" combo={3} actionLabel="Continue" onAction={count}>
              <p>The tray docks in the footer's place; its key is the same rounded family.</p>
            </AnswerTray>
          </div>
        </Section>
      </div>
    </div>
  );
}
