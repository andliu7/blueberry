/**
 * DEV ONLY: the Unit 1 sign-off page, at #/signoff on `npm run dev`.
 *
 * One pool item at a time, drawn by the SAME views a student plays (the MCQ
 * runner, the sort ladder, the match board, the draw beat), so what the owner
 * approves is what ships. Beside it: the answer key, the explanation, the
 * provenance, and Approve / Send back with a comment. Verdicts save to
 * documentation/unit1-signoff.json through the dev server (vite.config.ts,
 * signoffStore), and to the browser only if that fails.
 *
 * Not in the production build: src/App.tsx names this module behind
 * `import.meta.env.DEV`, which is the literal `false` in a build, so the
 * bundler drops the import and never emits this chunk.
 *
 * It never flips a `placeholder` flag. Applying approvals is a separate step.
 *
 * Every kind in PoolItem (content/u1/types.ts) has a student view, so every
 * item renders for real; a kind added later falls to the `never` check in
 * ItemStage and fails the typecheck until it is given one.
 */
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";

import { canFail, type MasteryLevel } from "../beats/types";
import { U1_POOLS, U1_SORT_FIGURES } from "../content/u1";
import { pathwayNode } from "../demo/pathwayMap";
import { poolEntrySlide } from "../admin/slides";
import { browserStorage } from "../resume/lessonSave";
import { Press } from "../app/ui/Press";
import {
  SIGNOFF_FILE,
  loadVerdicts,
  nextOpen,
  reviewItems,
  saveVerdicts,
  setComment,
  setVerdict,
  summaryText,
  tally,
  type ReviewItem,
  type SavedTo,
  type Verdict,
  type Verdicts,
} from "./signoff";

import "../theme.css";
import "../beats/beat-chrome.css";
import "./signoff.css";

// The same lazy views PracticeRunner uses, so the heavy ones (Ketcher for draw)
// load only when an item of that kind comes up.
const McqRunner = lazy(() => import("../beats/mcq/McqRunner").then((m) => ({ default: m.McqRunner })));
const SortBeatView = lazy(() => import("../beats/sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const KeqTypedQuestion = lazy(() => import("../energy/KeqTypedQuestion").then((m) => ({ default: m.KeqTypedQuestion })));
const NmrProductQuestion = lazy(() => import("../tabs/spectra/NmrProductQuestion").then((m) => ({ default: m.NmrProductQuestion })));
const MatchBoard = lazy(() => import("../beats/match/MatchBoard").then((m) => ({ default: m.Board })));
const DrawBeatView = lazy(() => import("../beats/draw/DrawBeatView").then((m) => ({ default: m.DrawBeatView })));

/** The rung a practice run plays an item at (PracticeRunner's levelOf), so it looks the way it does in a run. */
function levelOf(levels: readonly MasteryLevel[]): MasteryLevel {
  return levels.find((level) => canFail(level)) ?? levels[0] ?? 1;
}

function titleOf(node: string): string {
  if (node === "u1-exam") return "Unit 1 exam items";
  return pathwayNode(node)?.title ?? node;
}

/** True when a key press belongs to a text box or the structure editor, not to the page. */
function typingInto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return true;
  return target.closest(".draw-beat__editor") !== null;
}

const SAVED_LINE: Record<SavedTo, string> = {
  file: `Saved to ${SIGNOFF_FILE}`,
  browser: "Dev server did not save, kept in this browser only",
  nowhere: "Not saved: no dev server and no browser storage",
};

export default function SignoffPage() {
  const items = useMemo(() => reviewItems(U1_POOLS, titleOf), []);
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Verdicts>({});
  const [loaded, setLoaded] = useState(false);
  const [savedTo, setSavedTo] = useState<SavedTo | null>(null);
  // Comments typed before a verdict exists. The file's shape needs a verdict on
  // every row, so a comment waits here until A or S is pressed.
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  // Bumped to replay the item: it goes into the view's `key`, and a new key is
  // React's way to throw a component's state away and mount it fresh.
  const [replay, setReplay] = useState(0);
  const [copied, setCopied] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement | null>(null);

  // Load once on mount, then open on the first item with no verdict.
  useEffect(() => {
    void loadVerdicts(fetch, browserStorage()).then(({ verdicts: found, from }) => {
      setVerdicts(found);
      setSavedTo(from);
      setIndex(Math.max(0, nextOpen(items, found, 0)));
      setLoaded(true);
    });
  }, [items]);

  // Save after every change, 300 ms after the last one, so typing a comment is
  // one write per pause rather than one per key.
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      void saveVerdicts(verdicts, fetch, browserStorage()).then(setSavedTo);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [verdicts, loaded]);

  const item = items[index];
  const row = item === undefined ? undefined : verdicts[item.id];
  const comment = item === undefined ? "" : (row?.comment ?? drafts[item.id] ?? "");
  const counts = tally(items, verdicts);

  const go = (to: number) => {
    setIndex(Math.min(Math.max(to, 0), items.length - 1));
    setReplay(0);
  };

  const decide = (verdict: Verdict) => {
    if (item === undefined) return;
    setVerdicts(setVerdict(verdicts, item.id, verdict, comment, new Date().toISOString()));
    // Approve moves on. Send back stays and puts the cursor in the comment box,
    // because a send-back is only useful with its reason.
    if (verdict === "approve") go(index + 1);
    else commentRef.current?.focus();
  };

  const editComment = (text: string) => {
    if (item === undefined) return;
    if (row === undefined) setDrafts({ ...drafts, [item.id]: text });
    else setVerdicts(setComment(verdicts, item.id, text, new Date().toISOString()));
  };

  const copy = async () => {
    const text = summaryText(items, verdicts, new Date().toISOString().slice(0, 10));
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused (an unfocused tab, say): print it so it can still be copied by hand.
      console.log(text);
      window.alert("The clipboard refused. The text is in the console.");
    }
  };

  // The keyboard. An effect with NO dependency list runs after every render, so
  // the listener is swapped each time and always sees the current item and
  // verdicts (the cleanup removes the previous one). Cheap for one listener.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (typingInto(event.target)) return;
      // Arrow keys inside the item belong to it (the ladder moves cards with them).
      const inStage = event.target instanceof HTMLElement && event.target.closest(".signoff__stage") !== null;
      const key = event.key.toLowerCase();
      if (key === "a") decide("approve");
      else if (key === "s") decide("send-back");
      else if (key === "j" || (!inStage && (key === "arrowright" || key === "arrowdown"))) go(index + 1);
      else if (key === "k" || (!inStage && (key === "arrowleft" || key === "arrowup"))) go(index - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (item === undefined) {
    return (
      <div className="bb-game signoff">
        <p className="signoff__empty">No Unit 1 items found in src/game/content/u1/.</p>
      </div>
    );
  }

  const slide = poolEntrySlide(item.entry, "produce");
  const verdictClass = row === undefined ? "" : ` signoff__verdict--${row.verdict}`;

  return (
    <div className="bb-game signoff">
      <header className="signoff__bar">
        <h1 className="signoff__title">Unit 1 sign-off</h1>
        <p className="signoff__count" aria-live="polite">
          <strong>
            {index + 1} / {items.length}
          </strong>
          <span>
            {counts.approved} approved, {counts.sentBack} sent back, {counts.open} to go
          </span>
        </p>
        <p className="signoff__saved">{loaded ? (savedTo === null ? "" : SAVED_LINE[savedTo]) : "Loading verdicts"}</p>
        <Press variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy for Claude"}
        </Press>
      </header>

      <div className="signoff__body">
        <div className="beat-runner signoff__stage">
          <ItemStage item={item} replayKey={`${item.id}:${replay}`} onReplay={() => setReplay(replay + 1)} />
        </div>

        <aside className="signoff__panel" aria-label="Sign-off">
          <p className="signoff__meta">
            <code>{item.id}</code>
            <span>
              {item.entry.item.kind} in {item.nodeTitle} ({item.node})
            </span>
          </p>

          <p className={`signoff__verdict${verdictClass}`}>
            {row === undefined ? "No verdict yet" : row.verdict === "approve" ? "Approved" : "Sent back"}
          </p>

          <div className="signoff__actions">
            <Press variant="success" onClick={() => decide("approve")} aria-keyshortcuts="A">
              Approve (A)
            </Press>
            <Press variant="secondary" onClick={() => decide("send-back")} aria-keyshortcuts="S">
              Send back (S)
            </Press>
          </div>

          <label className="signoff__label" htmlFor="signoff-comment">
            Comment
          </label>
          <textarea
            id="signoff-comment"
            ref={commentRef}
            className="signoff__comment"
            rows={3}
            value={comment}
            placeholder="What is wrong, or what to change"
            onChange={(event) => editComment(event.target.value)}
            onKeyDown={(event) => {
              // Escape hands the keyboard back to the page, so A, S, J and K work again.
              if (event.key === "Escape") event.currentTarget.blur();
            }}
          />

          <div className="signoff__nav">
            <Press variant="ghost" size="sm" onClick={() => go(index - 1)} disabled={index === 0}>
              Previous (K)
            </Press>
            <Press variant="ghost" size="sm" onClick={() => go(nextOpen(items, verdicts, index + 1))} disabled={counts.open === 0}>
              Next to review
            </Press>
            <Press variant="ghost" size="sm" onClick={() => go(index + 1)} disabled={index === items.length - 1}>
              Next (J)
            </Press>
          </div>
          <p className="signoff__hint">A approve and next. S send back, then type why; Esc leaves the box. J/K or arrows move.</p>

          <section className="signoff__key">
            <h2>Answer key</h2>
            <ul>
              {slide.answer.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {slide.choices !== undefined ? (
              <>
                <h2>Options</h2>
                <ul>
                  {slide.choices.map((choice) => (
                    <li key={choice.id} className={choice.correct ? "is-correct" : undefined}>
                      {choice.correct ? "Right: " : ""}
                      {choice.text}
                      {choice.why === undefined ? null : <span className="signoff__why">{choice.why}</span>}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h2>Explanation</h2>
            <p>{item.entry.explanation}</p>
            {item.entry.conditions === undefined ? null : (
              <>
                <h2>Conditions</h2>
                <p>{item.entry.conditions}</p>
              </>
            )}
            <h2>Provenance</h2>
            <p className="signoff__provenance">{item.entry.provenance}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

/**
 * The item as a student meets it in an in-a-row run (PracticeRunner.tsx):
 * same views, same rung, same figures. Finishing it (Continue) replays it
 * rather than moving on, because moving on is the reviewer's call, not the item's.
 */
function ItemStage({ item, replayKey, onReplay }: { readonly item: ReviewItem; readonly replayKey: string; readonly onReplay: () => void }) {
  const pool = item.entry.item;
  const noop = () => {};
  let view;
  switch (pool.kind) {
    case "mcq":
      view = (
        <McqRunner key={replayKey} node={item.node} level={levelOf(pool.beat.levels)} beats={[pool.beat]} onExit={onReplay} onDone={onReplay} />
      );
      break;
    case "sort":
      view = (
        <SortBeatView
          key={replayKey}
          content={pool.content}
          level={levelOf(pool.content.beat.levels)}
          figures={U1_SORT_FIGURES[item.id]}
          onResult={noop}
          onContinue={onReplay}
        />
      );
      break;
    case "match":
      view = <MatchBoard key={replayKey} spec={pool.board} onComplete={noop} onContinue={onReplay} />;
      break;
    case "draw":
      view = <DrawBeatView key={replayKey} beat={pool.beat} level={levelOf(pool.beat.levels)} onResult={noop} onContinue={onReplay} />;
      break;
    case "keqTyped":
      view = <KeqTypedQuestion key={replayKey} question={pool.question} onResult={noop} onContinue={onReplay} />;
      break;
    case "nmrProduct":
      view = <NmrProductQuestion key={replayKey} question={pool.question} onResult={noop} onContinue={onReplay} />;
      break;
    default: {
      // A new PoolItem kind with no view here fails the typecheck on this line.
      const unknown: never = pool;
      return <pre className="signoff__raw">{JSON.stringify(unknown, null, 2)}</pre>;
    }
  }
  // MCQ owns its own scroller and action bar; the others take the gutter, as in PracticeRunner.
  return (
    <div className={`beat-runner__stage${pool.kind === "mcq" ? "" : " beat-runner__stage--gutter"}`}>
      <Suspense fallback={<p role="status">Loading the item.</p>}>{view}</Suspense>
    </div>
  );
}
