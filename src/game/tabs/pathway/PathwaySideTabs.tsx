/**
 * The side tabs on the Path screen: Path, Challenges, Shop. Same shape as
 * Duolingo's Quests and Shop tabs: one strip, three equal tabs with an icon
 * each, the open one underlined and tinted. All three live inside the Path
 * screen, so Shop reads as a sibling and keeps the strip. Train stays in the
 * bar until the owner swaps it for Shop.
 */
import { useEffect, useRef, type ReactNode } from "react";
import type { EconomyEvent } from "@blueberry/economy";
import { useProgress } from "../../app/hooks";
import { DiamondMark } from "../../app/ui/HudIcons";
import { dailyQuestRows } from "../feed/feedModel";
import { CHALLENGE_SPECS, deriveChallenges } from "./challengesModel";
import "./pathSideTabs.css";

export type PathSide = "path" | "challenges" | "shop";

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const ICONS: Record<PathSide, ReactNode> = {
  path: svg(<path d="M6 20c0-6 12-4 12-10a4 4 0 0 0-8 0M6 20h.01M18 6h.01" />),
  challenges: svg(<path d="M5 21V4m0 0h12l-2.5 4L17 12H5" />),
  shop: svg(<path d="M5 8h14l-1 12H6L5 8Zm4 0V7a3 3 0 0 1 6 0v1" />),
};
const TABS: readonly { id: PathSide; label: string; href: string }[] = [
  { id: "path", label: "Path", href: "#/app/pathway" },
  { id: "challenges", label: "Challenges", href: "#/app/pathway/challenges" },
  { id: "shop", label: "Shop", href: "#/app/pathway/shop" },
];

export function PathSideTabs({ active }: { readonly active: PathSide }) {
  const ref = useRef<HTMLElement>(null);
  /* The strip sticks UNDER the shell header (z-10), not behind it. The header's
     height moves with the safe area and the HUD, so it is measured. The strip's
     own height is published as --pside-h so the Path unit rail can sit below it. */
  useEffect(() => {
    const header = document.querySelector("[data-app-header]");
    const nav = ref.current;
    if (nav === null || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const read = () => {
      nav.style.top = `${Math.round(header?.getBoundingClientRect().height ?? 0)}px`;
      root.style.setProperty("--pside-h", `${Math.round(nav.getBoundingClientRect().height)}px`);
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(nav);
    if (header !== null) observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--pside-h");
    };
  }, []);
  return (
    <nav ref={ref} className="pside" aria-label="Path sections">
      {TABS.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          className={`pside__tab press${tab.id === active ? " pside__tab--on" : ""}`}
          aria-current={tab.id === active ? "page" : undefined}
          data-pside={tab.id}
        >
          {ICONS[tab.id]}
          <span>{tab.label}</span>
        </a>
      ))}
    </nav>
  );
}

function Bar({ have, need, label }: { readonly have: number; readonly need: number; readonly label: string }) {
  const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 0;
  return (
    <span className="pbar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={need} aria-valuenow={have}>
      <span className="pbar__fill" style={{ width: `${pct}%` }} />
      <span className="pbar__text">
        {have} / {need}
      </span>
    </span>
  );
}

function ChestMark({ done }: { readonly done: boolean }) {
  const edge = done ? "#9a9a9a" : "#8a5a14";
  return (
    <svg viewBox="0 0 48 40" width="44" height="36" aria-hidden focusable="false" className="pchest" data-done={done ? "true" : undefined}>
      <rect x="4" y="16" width="40" height="22" rx="4" fill={done ? "#c4c4c4" : "#d9922b"} stroke={edge} strokeWidth="2.5" />
      <path d="M4 20a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v1H4z" fill={done ? "#d6d6d6" : "#f2b84b"} stroke={edge} strokeWidth="2.5" />
      <rect x="20" y="20" width="8" height="10" rx="2" fill="#fff" stroke={edge} strokeWidth="2" />
    </svg>
  );
}

/** Today's quests (real ones, from the economy) above the challenge road. */
export function ChallengesPath() {
  const snapshot = useProgress();
  const journal: readonly EconomyEvent[] = snapshot.journal;
  const stops = deriveChallenges(journal);
  const quests = dailyQuestRows(snapshot.economy);
  const doneCount = stops.filter((stop) => stop.state === "done").length;
  const next = stops.find((stop) => stop.state === "current");
  const allDone = doneCount === stops.length;
  return (
    <div className="pchal">
      <section aria-labelledby="pq-h">
        <h2 id="pq-h" className="pchal__h">
          Daily quests
        </h2>
        <ul className="pq">
          {quests.map((quest) => (
            <li key={quest.id} className="pq__row" data-done={quest.done ? "true" : undefined}>
              <span className="pq__text">
                <strong>{quest.label}</strong>
                <Bar have={quest.progress} need={quest.target} label={quest.label} />
              </span>
              <span className="pq__prize" title="Each finished quest earns a chest">
                <ChestMark done={quest.done} />
                <span className="pq__gem">
                  <DiamondMark className="h-4 w-4" />5
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pc-h">
        <h2 id="pc-h" className="pchal__h">
          Challenge path
          <span className="pchal__count">
            {doneCount} of {stops.length}
          </span>
        </h2>
        {next ? (
          <div className="pnext">
            <span className="pnext__eyebrow">Up next</span>
            <strong>{next.title}</strong>
            <span>{next.blurb}</span>
            <Bar have={next.have} need={next.need} label={next.title} />
          </div>
        ) : null}
        <ol className="pchal__road" aria-label="Challenges">
          {stops.map((stop, at) => (
            <li
              key={stop.id}
              className="pchal__row"
              data-challenge-state={stop.state}
              style={{ marginInlineStart: `${[0, 2.5, 4, 2.5][at % 4]}rem` }}
            >
              <span className="pchal__chip" aria-hidden>
                {stop.state === "done" ? "✓" : at + 1}
              </span>
              <span className="pchal__text">
                <strong>{stop.title}</strong>
                {stop.state === "locked" ? (
                  <span>Opens after the one before it.</span>
                ) : (
                  <>
                    <span>{stop.blurb}</span>
                    {stop.state === "current" ? <Bar have={stop.have} need={stop.need} label={stop.title} /> : null}
                  </>
                )}
              </span>
            </li>
          ))}
          <li className="pchal__row pchal__row--prize" data-challenge-state={allDone ? "done" : "locked"}>
            <span className="pchal__cup" aria-hidden>
              <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 4h10v5a5 5 0 0 1-10 0V4Zm0 2H4v1a3 3 0 0 0 3 3m10-4h3v1a3 3 0 0 1-3 3M12 14v4m-4 2h8" />
              </svg>
            </span>
            <span className="pchal__text">
              <strong>Challenge cup</strong>
              <span>{allDone ? "Every challenge done." : `Finish all ${CHALLENGE_SPECS.length} to earn it.`}</span>
            </span>
          </li>
        </ol>
      </section>
    </div>
  );
}
