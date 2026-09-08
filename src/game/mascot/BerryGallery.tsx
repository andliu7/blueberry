/**
 * The mascot gallery. Development surface, reachable at #/gallery/berry.
 *
 * WHY IT EXISTS AND WHY IT IS NOT A TAB. Four axes that compose (mood,
 * behaviour, state, costume) have 13 x 10 x 8 x 7 combinations, and the only
 * honest way to judge a combination is to look at it beside its neighbours at
 * the sizes it actually ships at. A critic comparing this against a reference
 * capture needs one page holding all of it; a student needs none of it. So it
 * is a route the tab bar does not list and App.tsx loads behind React.lazy,
 * which keeps every byte of it out of the game route's initial chunk exactly
 * the way Shell.tsx keeps the other tabs out (see that file's header comment:
 * the trainer is the one static import because the payload gate weighs the
 * entry chunk as "the game route").
 *
 * The three sizes are the three the product uses: 40px is the tab rail and the
 * notification thumbnail, 96px is the in-lesson companion, 160px is the reward
 * moment. A costume that stops reading at 40px has failed, and the only way to
 * find that out is to render it at 40px next to the other two.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Berry } from "./Berry";
import { BERRY_STATES, STATE_SHAPE, type BerryState } from "./berryState";
import {
  BERRY_COSTUMES,
  BERRY_SURFACES,
  costumeForSurface,
  NOTIFICATION_COSTUME,
  type BerryCostume,
} from "./berryCostume";
import { BERRY_MOODS, type BerryMood } from "./berryMood";
import type { BerryBehaviour } from "./berryBehaviour";

// mascot.css is already imported once by theme.css, which is the app's single
// stylesheet entry. Importing it again here would emit a duplicate CSS chunk.

const SIZES = [40, 96, 160] as const;

/** A few moods rather than all thirteen, chosen to span the range of the face. */
const SAMPLE_MOODS: readonly BerryMood[] = ["curious", "happy", "thinking", "sad", "stressed"];

const SAMPLE_BEHAVIOURS: readonly BerryBehaviour[] = [
  "idle",
  "leanIn",
  "squash",
  "bounce",
  "celebrate",
  "stressed",
];

function Panel({ title, note, children }: { readonly title: string; readonly note?: string; readonly children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-bb-border bg-bb-card p-4">
      <h2 className="text-scale-lg font-semibold text-bb-foreground">{title}</h2>
      {note !== undefined ? <p className="mt-1 text-scale-sm text-bb-muted-foreground">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Cell({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <figure className="flex w-40 flex-col items-center gap-2">
      <div className="flex h-44 w-full items-end justify-center">{children}</div>
      <figcaption className="text-center text-scale-xs text-bb-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export default function BerryGallery({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const [charge, setCharge] = useState(1);
  const [mood, setMood] = useState<BerryMood>("curious");
  const [behaviour, setBehaviour] = useState<BerryBehaviour>("idle");
  const [behaviourKey, setBehaviourKey] = useState(0);
  // The worked example of recoverMs: a state belongs to whoever set it, so the
  // OWNER clears it on the shape's own timer. Berry.tsx never runs this clock.
  const [transient, setTransient] = useState<BerryState>("neutral");

  useEffect(() => {
    const recoverMs = STATE_SHAPE[transient].recoverMs;
    if (recoverMs === null) return;
    const timer = window.setTimeout(() => setTransient("neutral"), recoverMs);
    return () => window.clearTimeout(timer);
  }, [transient]);

  return (
    <div className="min-h-dvh bg-bb-background p-4 md:p-8">
      <header className="mx-auto max-w-6xl">
        <h1 className="bb-title-face text-scale-2xl font-semibold text-bb-foreground">Bloom, all four axes</h1>
        <p className="mt-2 max-w-3xl text-scale-sm text-bb-muted-foreground">
          Mood is a face, behaviour is a motion, state is what the berry is made of, and a costume is
          what it is wearing. They compose. Development surface, not a tab: see docs/MASCOT.md.
          {reducedMotion ? " Reduced motion is on, so every state is showing its static frame." : ""}
        </p>
      </header>

      <div className="mx-auto mt-6 grid max-w-6xl gap-6">
        <Panel
          title="Every state, at the three shipping sizes"
          note="40px is the tab rail and the notification thumbnail, 96px the in-lesson companion, 160px the reward moment."
        >
          <div className="flex flex-wrap gap-6">
            {BERRY_STATES.map((state) => (
              <figure key={state} className="flex w-[360px] max-w-full flex-col items-center gap-3 rounded-xl border border-bb-border p-3">
                <div className="flex h-44 w-full items-end justify-center gap-3 overflow-x-auto">
                  {SIZES.map((size) => (
                    <Berry
                      key={size}
                      state={state}
                      mood={mood}
                      behaviour={behaviour}
                      behaviourKey={behaviourKey}
                      chargeLevel={charge}
                      reducedMotion={reducedMotion}
                      sizePx={size}
                      className="shrink-0"
                    />
                  ))}
                </div>
                <figcaption className="text-center text-scale-sm font-semibold text-bb-foreground">
                  {state}
                  <span className="block text-scale-xs font-normal text-bb-muted-foreground">
                    badge {STATE_SHAPE[state].badge ?? "none"}, halo {STATE_SHAPE[state].haloKind}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Panel>

        <Panel title="Compose it" note="The same controls a lesson would drive. Every combination below is live.">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-scale-sm text-bb-foreground">
              Mood
              <select
                className="min-h-11 rounded-lg border border-bb-border bg-bb-card px-2 text-bb-foreground"
                value={mood}
                onChange={(event) => setMood(event.target.value as BerryMood)}
              >
                {BERRY_MOODS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-scale-sm text-bb-foreground">
              Behaviour
              <select
                className="min-h-11 rounded-lg border border-bb-border bg-bb-card px-2 text-bb-foreground"
                value={behaviour}
                onChange={(event) => {
                  setBehaviour(event.target.value as BerryBehaviour);
                  setBehaviourKey((key) => key + 1);
                }}
              >
                {SAMPLE_BEHAVIOURS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-scale-sm text-bb-foreground">
              Charge {Math.round(charge * 100)}%
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(charge * 100)}
                onChange={(event) => setCharge(Number(event.target.value) / 100)}
                aria-label="Charge level, drives the charged halo thickness"
              />
            </label>
            <button
              type="button"
              className="press min-h-11 rounded-xl border border-bb-border bg-bb-card px-4 text-scale-sm font-semibold text-bb-foreground"
              onPointerDown={() => setTransient("charred")}
            >
              Play charred, recovers in {STATE_SHAPE.charred.recoverMs}ms
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-6">
            {SAMPLE_MOODS.map((sample) => (
              <Cell key={sample} label={`${sample} + ${transient}`}>
                <Berry
                  mood={sample}
                  behaviour={behaviour}
                  behaviourKey={behaviourKey}
                  state={transient}
                  chargeLevel={charge}
                  reducedMotion={reducedMotion}
                  sizePx={96}
                  className="shrink-0"
                />
              </Cell>
            ))}
          </div>
        </Panel>

        <Panel
          title="Every costume"
          note="Cosmetic only: a costume never changes a mood, a behaviour or a state. Read the 40px column first."
        >
          <div className="flex flex-wrap gap-6">
            {BERRY_COSTUMES.map((costume: BerryCostume) => (
              <figure key={costume} className="flex w-[360px] max-w-full flex-col items-center gap-3 rounded-xl border border-bb-border p-3">
                <div className="flex h-44 w-full items-end justify-center gap-3 overflow-x-auto">
                  {SIZES.map((size) => (
                    <Berry
                      key={size}
                      costume={costume}
                      mood={mood}
                      behaviour="idle"
                      reducedMotion={reducedMotion}
                      sizePx={size}
                      className="shrink-0"
                    />
                  ))}
                </div>
                <figcaption className="text-center text-scale-sm font-semibold text-bb-foreground">
                  {costume}
                  {costume === NOTIFICATION_COSTUME ? (
                    <span className="block text-scale-xs font-normal text-bb-muted-foreground">
                      notification art only, never in app
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </Panel>

        <Panel title="Surface to costume" note="What costumeForSurface returns for every surface it knows.">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-scale-sm text-bb-foreground md:grid-cols-3">
            {BERRY_SURFACES.map((surface) => (
              <li key={surface} className="flex justify-between gap-3 border-b border-bb-border py-1">
                <span>{surface}</span>
                <span className="text-bb-muted-foreground">{costumeForSurface(surface)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
