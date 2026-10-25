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
 *
 * THE BIBLE PASS, added 2026-10-24 (BLOOM-STATES-SPEC.md, section 5). Every
 * mood, every behaviour with a replay button, the answer reactions live on
 * their stage, the progression beats, and one row per Design Bible state with
 * what this repo decided (bloomBible.ts). A reduced-motion switch at the top
 * passes `reducedMotion` to every berry and `data-reduced` to every stage, so
 * the still poses can be judged without changing the OS setting.
 */

import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { Berry } from "./Berry";
import { BloomHintRing, BloomStage } from "./BloomStage";
import { useBerryReactions } from "./useBerryReactions";
import { CHARRED_LINE, type ReactionOutcome } from "./berryReaction";
import { BIBLE_ROWS, type BibleSection } from "./bloomBible";
import { BloomLessonComplete, BloomUnitComplete } from "./progression/BloomLessonComplete";
import { BERRY_STATES, STATE_SHAPE, type BerryState } from "./berryState";
import {
  BERRY_COSTUMES,
  BERRY_SURFACES,
  costumeForSurface,
  NOTIFICATION_COSTUME,
  type BerryCostume,
} from "./berryCostume";
import { BERRY_MOODS, type BerryMood } from "./berryMood";
import { BEHAVIOURS, type BerryBehaviour } from "./berryBehaviour";

// Lazy in the app (Hud.tsx), lazy here too: it is the one rare screen.
const BloomLevelUp = lazy(() => import("./progression/BloomLevelUp"));

// mascot.css is already imported once by theme.css, which is the app's single
// stylesheet entry. Importing it again here would emit a duplicate CSS chunk.

const SIZES = [40, 96, 160] as const;

/** A few moods rather than all thirteen, chosen to span the range of the face. */
const SAMPLE_MOODS: readonly BerryMood[] = ["curious", "happy", "thinking", "sad", "stressed"];

/** Every behaviour, read off the table so a new one shows up here by itself. */
const ALL_BEHAVIOURS = Object.keys(BEHAVIOURS) as BerryBehaviour[];

const OUTCOMES: readonly { readonly outcome: ReactionOutcome; readonly label: string }[] = [
  { outcome: "correct", label: "Correct" },
  { outcome: "wrong", label: "Wrong" },
  { outcome: "wrongAgain", label: "Wrong again" },
  { outcome: "nearMiss", label: "Near miss" },
];

const SECTIONS: readonly BibleSection[] = ["A. Ambient", "B. Answer reactions", "C. Progression", "D. Chemical", "E. Costumes"];

const BUTTON = "press min-h-11 rounded-xl border border-bb-border bg-bb-card px-4 text-scale-sm font-semibold text-bb-foreground";

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

/**
 * The answer reactions, live: the same hook and stage a lesson uses, driven by
 * buttons. Three in a row of Correct is the combo 3; keep going for 5 and 8.
 * Three misses char the berry and the next Correct clears it with the puff.
 */
function ReactionLab({ reduced }: { readonly reduced: boolean }) {
  const bloom = useBerryReactions(reduced, "leanIn");
  const [thinking, setThinking] = useState(false);
  const charred = bloom.berry.state === "charred";
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {OUTCOMES.map(({ outcome, label }) => (
          <button key={outcome} type="button" className={BUTTON} onClick={() => bloom.react(outcome)}>
            {label}
          </button>
        ))}
        <label className="flex items-center gap-2 text-scale-sm text-bb-foreground">
          <input type="checkbox" checked={thinking} onChange={(event) => setThinking(event.target.checked)} />
          Thinking, 15s quiet
        </label>
        <span className="relative inline-flex">
          <button type="button" className={BUTTON}>
            Hint
          </button>
          <BloomHintRing ringKey={bloom.hintKey} reducedMotion={reduced} />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-10">
        {[40, 56, 96].map((size) => (
          <Cell key={size} label={`${size}px, the same reaction`}>
            <BloomStage {...bloom.stage} reducedMotion={reduced} thinking={thinking}>
              <Berry {...bloom.berry} sizePx={size} reducedMotion={reduced} />
            </BloomStage>
          </Cell>
        ))}
      </div>
      {charred ? <p className="mt-2 text-scale-sm text-bb-muted-foreground">{CHARRED_LINE}</p> : null}
    </>
  );
}

export default function BerryGallery({ reducedMotion }: { readonly reducedMotion: boolean }) {
  // Starts at the OS setting; the switch overrides it for this page only.
  const [reduced, setReduced] = useState(reducedMotion);
  // One replay counter per behaviour, so each button replays only its own berry.
  const [replays, setReplays] = useState<Readonly<Partial<Record<BerryBehaviour, number>>>>({});
  // Bumping these keys remounts the celebration, so it plays again from the top.
  const [lessonKey, setLessonKey] = useState(0);
  const [unitKey, setUnitKey] = useState(0);
  const [bibleKey, setBibleKey] = useState(0);
  const [levelUp, setLevelUp] = useState(false);
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
          {reduced ? " Reduced motion is on, so every state is showing its static frame." : ""}
        </p>
        <label className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-bb-border bg-bb-card px-3 text-scale-sm font-semibold text-bb-foreground">
          <input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} />
          Reduced motion (the still poses)
        </label>
      </header>

      <div className="mx-auto mt-6 grid max-w-6xl gap-6">
        <Panel title="Every mood" note="The face alone, at 40px and 96px. 40px is where an answer reaction must still read.">
          <div className="flex flex-wrap gap-4">
            {BERRY_MOODS.map((option) => (
              <figure key={option} className="flex w-36 flex-col items-center gap-2" data-gallery-mood={option}>
                <div className="flex h-28 items-end gap-2">
                  <Berry mood={option} sizePx={40} reducedMotion={reduced} className="shrink-0" />
                  <Berry mood={option} sizePx={96} reducedMotion={reduced} className="shrink-0" />
                </div>
                <figcaption className="text-scale-xs text-bb-muted-foreground">{option}</figcaption>
              </figure>
            ))}
          </div>
        </Panel>

        <Panel title="Every behaviour" note="Each with its own replay. Ambient ones loop; the rest play once and settle.">
          <div className="flex flex-wrap gap-4">
            {ALL_BEHAVIOURS.map((name) => (
              <figure key={name} className="flex w-40 flex-col items-center gap-2" data-gallery-behaviour={name}>
                <div className="flex h-32 items-end gap-2">
                  <Berry behaviour={name} behaviourKey={replays[name] ?? 0} sizePx={40} reducedMotion={reduced} className="shrink-0" />
                  <Berry behaviour={name} behaviourKey={replays[name] ?? 0} sizePx={96} reducedMotion={reduced} className="shrink-0" />
                </div>
                <figcaption className="text-scale-xs text-bb-muted-foreground">
                  {name} <span className="opacity-70">({BEHAVIOURS[name].family})</span>
                </figcaption>
                <button
                  type="button"
                  className={BUTTON}
                  onClick={() => setReplays((r) => ({ ...r, [name]: (r[name] ?? 0) + 1 }))}
                >
                  Replay
                </button>
              </figure>
            ))}
          </div>
        </Panel>

        <Panel
          title="Answer reactions, live"
          note="The hook and stage every grading surface uses. Correct three, five and eight times for the combos; miss three times to char him."
        >
          <ReactionLab reduced={reduced} />
        </Panel>

        <Panel title="Progression" note="Lesson complete (with the XP chip and the diamond catch), unit complete, and the level up with its hat.">
          <div className="flex flex-wrap items-start gap-10">
            <div className="flex flex-col items-center gap-3">
              <BloomLessonComplete key={lessonKey} reducedMotion={reduced} xp={15} diamonds={3}>
                <p className="text-scale-lg font-bold text-bb-foreground">Lesson complete</p>
                <p className="text-scale-sm text-bb-foreground">5 of 6 right.</p>
              </BloomLessonComplete>
              <button type="button" className={BUTTON} onClick={() => setLessonKey((k) => k + 1)}>
                Replay lesson complete
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <BloomUnitComplete key={unitKey} reducedMotion={reduced} costume="referee" />
              <button type="button" className={BUTTON} onClick={() => setUnitKey((k) => k + 1)}>
                Replay unit complete
              </button>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button type="button" className={BUTTON} onClick={() => setLevelUp(true)}>
                Play level up
              </button>
              <p className="max-w-56 text-scale-xs text-bb-muted-foreground">
                The hat joke plays once per stage on this device, as in the app.
              </p>
            </div>
          </div>
          {levelUp ? (
            <Suspense fallback={null}>
              <BloomLevelUp
                renderBerry={(props) => <Berry {...props} />}
                toStage={2}
                fromBadge="Lv 1"
                toBadge="Lv 2"
                reducedMotion={reduced}
                onDone={() => setLevelUp(false)}
              />
            </Suspense>
          ) : null}
        </Panel>

        <Panel
          title="The Design Bible, section 01"
          note="One row per Bible state: built ones drawn as the app composes them, parked ones with the reason."
        >
          <button type="button" className={BUTTON} onClick={() => setBibleKey((k) => k + 1)}>
            Replay every row
          </button>
          {SECTIONS.map((section) => (
            <div key={section} className="mt-4">
              <h3 className="text-scale-base font-semibold text-bb-foreground">{section}</h3>
              <ul className="mt-2 grid gap-2 md:grid-cols-2">
                {BIBLE_ROWS.filter((r) => r.section === section).map((r) => (
                  <li key={r.name} className="flex items-center gap-3 rounded-xl border border-bb-border p-2" data-bible-row={r.decision}>
                    <span className="flex w-28 shrink-0 items-end justify-center gap-1">
                      {r.demo === undefined ? (
                        <span className="text-scale-xs font-bold uppercase text-bb-muted-foreground">parked</span>
                      ) : (
                        <>
                          <Berry {...r.demo} behaviourKey={bibleKey} sizePx={40} reducedMotion={reduced} />
                          <Berry {...r.demo} behaviourKey={bibleKey} sizePx={56} reducedMotion={reduced} />
                        </>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-scale-sm font-semibold text-bb-foreground">{r.name}</span>
                      <span className="block text-scale-xs text-bb-muted-foreground">
                        {r.decision === "parked" ? "Parked. " : ""}
                        {r.note}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>
        <Panel
          title="Every state, at the three shipping sizes"
          note="40px is the tab rail and the notification thumbnail, 96px the in-lesson companion, 160px the reward moment."
        >
          <div className="flex flex-wrap gap-6">
            {BERRY_STATES.map((state) => (
              <figure key={state} className="flex w-[360px] max-w-full flex-col items-center gap-3 rounded-xl border border-bb-border p-3">
                {/* h-56 and pb-6, not h-44: the excited state's photon rises a third of a berry above the head and its glow spills below, and this row scrolls sideways, which clips it vertically too. */}
                <div className="flex h-56 w-full items-end justify-center gap-3 overflow-x-auto pb-6">
                  {SIZES.map((size) => (
                    <Berry
                      key={size}
                      state={state}
                      mood={mood}
                      behaviour={behaviour}
                      behaviourKey={behaviourKey}
                      chargeLevel={charge}
                      reducedMotion={reduced}
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
                {ALL_BEHAVIOURS.map((option) => (
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
              onClick={() => setTransient("charred")}
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
                  reducedMotion={reduced}
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
                      reducedMotion={reduced}
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
