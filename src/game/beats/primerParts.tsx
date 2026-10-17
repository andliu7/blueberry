/**
 * The pieces the priming preview (LessonPreview.tsx) and the end-of-lesson
 * recap (LessonRecap.tsx) share (U1-P2 round 4):
 *
 *   GuessOptions  the opening guess's options, drawn as on the question screen
 *   MapChain      the lesson's ideas as a small concept map: a node per idea,
 *                 the joining words on the link between two nodes
 *   MapBuilder    the same map with gaps, rebuilt from chips at the end
 *
 * The preview SHOWS the map (the frame for what is coming). The recap asks the
 * student to REBUILD it after the lesson, when the order is something they can
 * reason out rather than guess.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { pathwayNode } from "../demo/pathwayMap";
import { StructureFigure } from "../onboarding/StructureFigure";
import { McqVisualCard } from "./mcq/McqVisualCard";
import { mcqOptionTiles, mcqVisualFor } from "./mcq/mcqFigures";
import { OptionMark } from "./mcq/OptionMark";
import { mapPoolOrder, viaWords, type LessonPriming } from "./priming";

/**
 * Captions break between words, never inside a name: a plain hyphen is a line
 * break opportunity, so "1,4-dichlorobut-2-ene" split as "1,4-dichlorobut-2- /
 * ene". U+2011 is a hyphen the browser will not break at.
 */
export function unbrokenName(name: string): string {
  return name.replace(/-/g, "‑");
}

/**
 * The pool prompts write "Br2" and "Cl2" in plain text. The preview's own
 * heading writes Br₂, so on the same screen the prompt is shown with the same
 * subscript. Only a halogen followed by a lone 2 is touched.
 */
export function halogenSubscripts(text: string): string {
  return text.replace(/\b(Br|Cl|I|F|X)2\b/g, "$1₂");
}

/**
 * Focus an element once the app is live. On a cold load the app sits under
 * the boot loader with #root inert, and focus() on an inert element does
 * nothing, so this waits for the loader to lift (index.html clears `inert`).
 */
export function focusWhenLive(target: HTMLElement | null): () => void {
  const root = document.getElementById("root");
  const focus = () => target?.focus({ preventScroll: true });
  if (root === null || !root.inert) {
    focus();
    return () => {};
  }
  const watch = new MutationObserver(() => {
    if (root.inert) return;
    watch.disconnect();
    focus();
  });
  watch.observe(root, { attributes: true, attributeFilter: ["inert"] });
  return () => watch.disconnect();
}

/** The same four looks the question screen's options wear (McqBeatView.tsx). */
function optionState(checked: boolean, isAnswer: boolean, isPicked: boolean): string {
  if (!checked) return isPicked ? "picked" : "rest";
  if (isAnswer) return "answer";
  return isPicked ? "chosen" : "other";
}

/* ------------------------------------------------------------------ */
/* The guess's options                                                 */
/* ------------------------------------------------------------------ */

export function GuessOptions({
  questionId,
  options,
  correctOptionId,
  picked,
  locked,
  checked,
  showVisual,
  onPick,
}: {
  readonly questionId: string;
  readonly options: readonly { readonly id: string; readonly text: string }[];
  readonly correctOptionId: string;
  readonly picked: string | null;
  /** Taps do nothing: the guess is locked in (preview) or already marked (recap). */
  readonly locked: boolean;
  /** Show right and wrong on the options. Only the recap does. */
  readonly checked: boolean;
  readonly showVisual: boolean;
  readonly onPick?: (optionId: string) => void;
}) {
  const visual = showVisual ? mcqVisualFor(questionId) : null;
  // Drawn options when the question has them, as on the question screen.
  const tiles = mcqOptionTiles(
    questionId,
    options.map((option) => option.id),
  );
  return (
    <>
      {visual !== null ? <McqVisualCard visual={visual} /> : null}
      {/* aria-pressed buttons, the same pattern as the question screen's
          options. Once locked, a tap does nothing. */}
      <div
        role="group"
        aria-label="Your guess"
        className={tiles === null ? "primer-guess__options" : "option-tiles primer-guess__tiles"}
        data-count={options.length}
      >
        {options.map((option) => {
          const state = optionState(checked, option.id === correctOptionId, picked === option.id);
          const tile = tiles?.[option.id];
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (!locked) onPick?.(option.id);
              }}
              aria-pressed={picked === option.id}
              aria-disabled={locked || undefined}
              // The option's own words are its name; the drawing and the short
              // caption are for the eye, so nothing is read twice.
              aria-label={tile === undefined ? undefined : option.text}
              data-state={state}
              className={tile === undefined ? "option-card primer-guess__option text-scale-base" : "option-tile primer-guess__option"}
            >
              {tile === undefined ? (
                <span>{option.text}</span>
              ) : (
                <>
                  <StructureFigure figure={tile.figure} className="option-tile__figure" />
                  <span className="option-tile__caption" aria-hidden>
                    {unbrokenName(tile.name ?? option.text)}
                  </span>
                </>
              )}
              <OptionMark state={state} />
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The concept map                                                     */
/* ------------------------------------------------------------------ */

/**
 * The lesson's ideas as a vertical concept map: the last lesson at the top,
 * then for each idea a link (an arrow down with its joining words) and a node.
 * Read top to bottom it is one sentence, and each link's words sit between
 * the two nodes they join, so nothing reads as belonging to the wrong row.
 *
 * `shown` is how many nodes are filled in. With `gaps`, every node after
 * those is drawn as an empty slot, links and joining words included, so the
 * student rebuilding it reads the sentence's skeleton and reasons which idea
 * fits where; the next slot to fill is marked. Without it, the map stops at
 * `shown`.
 */
export function MapChain({
  priming,
  shown,
  gaps,
  openingVia,
}: {
  readonly priming: LessonPriming;
  readonly shown: number;
  readonly gaps: boolean;
  /** The words on the first link, from the last lesson to the first idea. */
  readonly openingVia: string;
}) {
  const bridgeTitle =
    priming.bridge.node === null ? priming.bridge.title : `Last lesson: ${pathwayNode(priming.bridge.node)?.title ?? ""}`;
  return (
    <ol className="primer-chain">
      {/* The chain starts from what the student already has: the last lesson. */}
      <li className="primer-chain__bridge">
        <span className="primer-chain__badge primer-chain__badge--back" aria-hidden="true">
          <BackMark />
        </span>
        <span className="primer-chain__card">
          <span className="primer-chain__eyebrow">{bridgeTitle}</span>
          <span className="primer-chain__note">{priming.bridge.text}</span>
        </span>
      </li>
      {priming.ideas.map((idea, index) => {
        if (!gaps && index >= shown) return null;
        const filled = index < shown;
        const via = idea.via === undefined ? openingVia : viaWords(idea.via);
        return (
          <li
            key={`${idea.label}-${index}`}
            className="primer-chain__step"
            data-filled={filled || undefined}
            data-next={index === shown || undefined}
            style={{ "--i": index } as CSSProperties}
          >
            <span className="primer-chain__link">
              <span className="primer-chain__line" aria-hidden="true" />
              <span className="primer-chain__via">{via}</span>
            </span>
            <span className="primer-chain__node">
              <span className="primer-chain__badge" aria-hidden="true">
                {index + 1}
              </span>
              {filled ? (
                <span className="primer-chain__chip">{idea.label}</span>
              ) : (
                <span className="primer-chain__gap">
                  <span aria-hidden="true">?</span>
                  <span className="sr-only">gap</span>
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The map rebuilt at the end of the lesson. `placed` counts the ideas already
 * in the chain, which are always the first `placed` ones, so that one number
 * is the whole build state.
 */
export function MapBuilder({
  priming,
  reducedMotion,
  onBuilt,
}: {
  readonly priming: LessonPriming;
  readonly reducedMotion: boolean;
  readonly onBuilt: () => void;
}) {
  const ideas = priming.ideas;
  const [placed, setPlaced] = useState(0);
  // The chip the student just tapped out of turn, and how many misses so far.
  // The count's parity picks one of two identical shake animations, so tapping
  // the same wrong chip twice shakes it twice without remounting the button
  // (a remount would drop keyboard focus).
  const [miss, setMiss] = useState<{ readonly index: number; readonly count: number } | null>(null);
  const [said, setSaid] = useState("");
  const poolRef = useRef<HTMLDivElement>(null);
  const done = placed === ideas.length;
  const order = mapPoolOrder(ideas);

  // Focus the first idea chip when the builder appears, so a keyboard user can
  // build it at once. Re-queried because the chips are buttons inside the pool.
  useEffect(() => focusWhenLive(poolRef.current?.querySelector("button") ?? null), []);

  const tap = (index: number) => {
    if (index === placed) {
      const next = placed + 1;
      setPlaced(next);
      setMiss(null);
      setSaid(next === ideas.length ? "Map rebuilt." : `${ideas[index].label}, placed.`);
      if (next === ideas.length) onBuilt();
      // Keep focus in the pool: the tapped chip is gone, so move to the first one left.
      requestAnimationFrame(() => {
        const first = poolRef.current?.querySelector("button");
        if (first instanceof HTMLElement) first.focus({ preventScroll: true });
      });
      return;
    }
    setMiss((before) => ({ index, count: (before?.count ?? 0) + 1 }));
    setSaid(
      placed === 0
        ? "Not that one yet. Which idea did the lesson open with?"
        : `Not that one yet. Read the link: "${ideas[placed - 1].label}" ${viaWords(ideas[placed].via ?? "")} what?`,
    );
  };

  return (
    <section className="primer-map" aria-labelledby="primer-map-label">
      <h3 id="primer-map-label" className="lesson-preview__label">
        Rebuild the map
      </h3>
      <p className="primer-map__ask">You saw this map before the lesson. Read the links, then tap the ideas back in, top to bottom.</p>

      <MapChain priming={priming} shown={placed} gaps openingVia="The lesson opened with" />

      {/* The dock: the chips to place and what the last tap said. It sticks to
          the bottom of the scroller (preview.css), so the word bank stays in
          reach while the map above it scrolls, as a word bank does. */}
      <div className="primer-dock">
        {done ? (
          <p className="primer-build__done">
            <DoneMark />
            Map rebuilt. That is the lesson in one line.
          </p>
        ) : (
          <div ref={poolRef} role="group" aria-label="Ideas to place" className="primer-pool">
            {order
              .filter((index) => index >= placed)
              .map((index, slot) => (
                <button
                  key={`${ideas[index].label}-${index}`}
                  type="button"
                  className="primer-pool__chip"
                  data-miss={miss?.index === index ? (miss.count % 2 === 0 ? "b" : "a") : undefined}
                  style={{ "--i": slot } as CSSProperties}
                  onClick={() => tap(index)}
                >
                  {ideas[index].label}
                </button>
              ))}
          </div>
        )}
        <p className="primer-build__say" aria-live="polite" data-motion={reducedMotion ? "reduced" : "full"}>
          {done ? "" : said}
        </p>
      </div>
    </section>
  );
}

/** A small curved back arrow for the "last lesson" link. */
function BackMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}

/** A tick for "map built". */
export function DoneMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}

/** A padlock for "locked in". */
export function LockMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
