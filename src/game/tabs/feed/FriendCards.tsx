/**
 * Sample friend cards: what the stream looks like once friends open. Every card
 * is labelled "Sample" so nothing pretends a real person acted, and the kudos
 * and comments are local to this visit. They give a new student a picture of
 * the loop (see a friend's win, give kudos, reply) before accounts exist.
 */

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Friend {
  readonly name: string;
  readonly color: string;
  readonly skin: string;
  readonly hair: string;
  readonly shirt: string;
  readonly style: "bun" | "short" | "curls" | "long";
}

const MAYA: Friend = { name: "Maya", color: "#ffd6e4", skin: "#c98a5e", hair: "#2b1a3d", shirt: "#ff6f9c", style: "bun" };
const DEV: Friend = { name: "Dev", color: "#cdf3e6", skin: "#8d5a3b", hair: "#15110f", shirt: "#2fb58f", style: "short" };
const SAM: Friend = { name: "Noor", color: "#ffeab0", skin: "#f1c7a0", hair: "#8a3fd0", shirt: "#ffb020", style: "long" };
const LENA: Friend = { name: "Lena", color: "#d9e5ff", skin: "#6b4430", hair: "#3a2416", shirt: "#5a7ff0", style: "curls" };

function Hair({ f }: { readonly f: Friend }) {
  switch (f.style) {
    case "bun":
      return (<><circle cx="32" cy="9" r="7" fill={f.hair} /><path d="M17 27c0-11 7-15 15-15s15 4 15 15c-4-6-9-8-15-8s-11 2-15 8z" fill={f.hair} /></>);
    case "short":
      return <path d="M16.5 28c-1-12 6-17 15.500-17S48 16 47.500 28c-3-6-8-8-15.500-8S19.500 22 16.500 28z" fill={f.hair} />;
    case "curls":
      return (<><circle cx="19" cy="21" r="7" fill={f.hair} /><circle cx="26" cy="14" r="7" fill={f.hair} /><circle cx="38" cy="14" r="7" fill={f.hair} /><circle cx="45" cy="21" r="7" fill={f.hair} /></>);
    default:
      return (<><path d="M15 46V27c0-11 7-16 17-16s17 5 17 16v19h-7V28c-5-2-9-5-11-9-2 5-6 8-11 9v18z" fill={f.hair} /></>);
  }
}

/** A flat, shape-built person: round head, hair, shirt. Drawn here, not recalled from any brand. */
function Person({ f, stand = false }: { readonly f: Friend; readonly stand?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="fp-person" aria-hidden="true" focusable="false">
      {stand ? null : <circle cx="32" cy="32" r="32" fill={f.color} />}
      <g clipPath={stand ? undefined : "url(#fp-clip)"}>
        {f.style === "long" ? <Hair f={f} /> : null}
        <path d="M8 66c0-13 10-19 24-19s24 6 24 19z" fill={f.shirt} />
        <rect x="27" y="38" width="10" height="12" rx="4" fill={f.skin} />
        <circle cx="32" cy="29" r="14" fill={f.skin} />
        {f.style === "long" ? null : <Hair f={f} />}
        {f.style === "long" ? <path d="M18 29c0-9 6-12 14-12s14 3 14 12c-4-4-8-6-14-8-6 2-10 4-14 8z" fill={f.hair} /> : null}
        <circle cx="26.500" cy="30" r="1.800" fill="#241a33" />
        <circle cx="37.500" cy="30" r="1.800" fill="#241a33" />
        <path d="M27 35.500c2.500 3 7.500 3 10 0" fill="none" stroke="#241a33" strokeWidth="2" strokeLinecap="round" />
        <circle cx="23" cy="34" r="2.200" fill="#ff7a8a" opacity="0.35" />
        <circle cx="41" cy="34" r="2.200" fill="#ff7a8a" opacity="0.35" />
      </g>
      {stand ? null : <defs><clipPath id="fp-clip"><circle cx="32" cy="32" r="32" /></clipPath></defs>}
    </svg>
  );
}

function Face({ friend }: { readonly friend: Friend }) {
  return (
    <span className="fp-face" aria-hidden="true">
      <Person f={friend} />
    </span>
  );
}

function KudosButton({ id, base }: { readonly id: string; readonly base: number }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      className="fp-kudos press"
      aria-pressed={on}
      aria-label={on ? "Remove your kudos" : "Give kudos"}
      data-on={on ? "true" : "false"}
      data-id={id}
      onClick={() => setOn((v) => !v)}
    >
      <svg viewBox="0 0 24 24" className="fp-act-icon" aria-hidden="true" focusable="false">
        <path
          d="M12 20.5C5 15.4 3 12.2 3 9.1 3 6.6 4.9 4.8 7.2 4.8c1.9 0 3.7 1.1 4.8 3 1.1-1.9 2.9-3 4.8-3C19.1 4.8 21 6.6 21 9.1c0 3.1-2 6.3-9 11.4z"
          fill={on ? "#fff" : "none"}
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
      <span className="tabular-nums">{base + (on ? 1 : 0)}</span>
    </button>
  );
}

function CommentButton({ count, onOpen }: { readonly count: number; readonly onOpen: () => void }) {
  return (
    <button type="button" className="fp-act fp-act--blue press" aria-label={`Comments, ${count}`} onClick={onOpen}>
      <svg viewBox="0 0 24 24" className="fp-act-icon" aria-hidden="true" focusable="false">
        <path d="M5 5.5h14v10H10l-4 3.5v-3.5H5z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
      <span className="fp-count tabular-nums">{count}</span>
    </button>
  );
}

function CommentSheet({ who, onClose }: { readonly who: string; readonly onClose: () => void }) {
  const [text, setText] = useState("");
  const [posted, setPosted] = useState<readonly string[]>([]);
  const ready = text.trim() !== "";
  // Portalled to the game root so no card's stacking context can put the tab bar over the sheet.
  const host = document.querySelector(".bb-game") ?? document.body;
  return createPortal(
    <div className="fp-sheet-scrim" onClick={onClose}>
      <div className="fp-sheet" role="dialog" aria-modal="true" aria-label="Comments" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="fp-sheet-handle" aria-label="Close comments" onClick={onClose} />
        <h3 className="fp-sheet-title">Comments</h3>
        <ul className="fp-sheet-list">
          {posted.length === 0 ? <li className="fp-sheet-empty">Be the first to comment on {who}&apos;s win</li> : null}
          {posted.map((line, i) => (
            <li key={i} className="fp-sheet-row">
              <Face friend={LENA} />
              <div>
                <p className="fp-name">You <span className="fp-when">now</span></p>
                <p className="fp-text">{line}</p>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="fp-sheet-input"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ready) return;
            setPosted((p) => [...p, text.trim()]);
            setText("");
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." aria-label="Add a comment" maxLength={140} />
          <button type="submit" disabled={!ready} aria-label="Send" data-ready={ready ? "true" : "false"}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>,
    host,
  );
}

function FriendPost({
  friend, when, text, color, ink, pill, kudos, comments, id, likedBy,
}: {
  readonly friend: Friend; readonly when: string; readonly text: string; readonly color: string; readonly ink: string; readonly pill: string;
  readonly kudos: number; readonly comments: number; readonly id: string; readonly likedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="fp-card fp-card--friend" data-sample="true" data-id={id}>
      <div className="fp-hero" style={{ background: color, color: ink }}>
        <div className="fp-hero-copy">
          <span className="fp-hero-pill">{pill}</span>
          <p className="fp-hero-text">{text}</p>
        </div>
        <span className="fp-stand" aria-hidden="true"><Person f={friend} stand /></span>
      </div>
      <div className="fp-head">
        <Face friend={friend} />
        <div className="fp-who"><p className="fp-name">{friend.name}</p><p className="fp-when">{when}</p></div>
      </div>
      <div className="fp-actions">
        <KudosButton id={id} base={kudos} />
        <CommentButton count={comments} onOpen={() => setOpen(true)} />
      </div>
      {likedBy ? <p className="fp-liked">Liked by <b>{likedBy}</b></p> : null}
      {open ? <CommentSheet who={friend.name} onClose={() => setOpen(false)} /> : null}
    </li>
  );
}

const FLAME = "M12.6 1.2c-.4 2.9-2 4.3-3.4 5.6C7.2 8.6 4.8 11 4.8 15.2 4.8 19.1 8 22.2 12 22.2s7.2-3.1 7.2-7c0-2.8-1.2-4.7-2.6-6.2-.2 1.5-1 2.6-2.1 3 1-3.6-.6-8.2-1.9-10.8z";

function FriendStreaks() {
  const rows: readonly { f: Friend; n: number; hot: boolean }[] = [
    { f: DEV, n: 12, hot: true },
    { f: MAYA, n: 5, hot: false },
    { f: SAM, n: 3, hot: false },
  ];
  return (
    <li className="fp-card fp-card--friend" data-sample="true" data-id="streaks">
      <div className="fp-banner fp-banner--friends">
        <p className="fp-banner-title">Friend streaks</p>
        <span className="fp-banner-people" aria-hidden="true"><Person f={DEV} /><Person f={MAYA} /><Person f={SAM} /></span>
      </div>
      <ul className="fp-streak-list">
        {rows.map((r) => (
          <li key={r.f.name} className="fp-streak-row">
            <Face friend={r.f} />
            <span className="fp-name">{r.f.name}</span>
            <span className="fp-streak-n" data-hot={r.hot ? "true" : "false"}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={FLAME} fill="currentColor" /></svg>
              {r.n}
            </span>
          </li>
        ))}
        <li className="fp-streak-row fp-streak-row--invite">
          <span className="fp-face fp-face--dashed" aria-hidden="true">+</span>
          <span className="fp-name">Invite a friend</span>
        </li>
      </ul>
    </li>
  );
}

function FollowBack() {
  return (
    <li className="fp-card fp-card--friend" data-sample="true" data-id="follow">
      <div className="fp-head">
        <Face friend={SAM} />
        <div className="fp-who"><p className="fp-name">Noor followed you back!</p><p className="fp-when">33 mins</p></div>
      </div>
      <span className="fp-outline">View profile</span>
    </li>
  );
}

/** The friend section of the stream. Preview content, labelled once at the top of the section. */
export function FriendCards({ afterFirst }: { readonly afterFirst?: ReactNode }) {
  return (
    <>
      <FriendPost friend={MAYA} when="2 hours" id="maya" text="Maya cleared a whole unit with zero mistakes!" color="#ff9b3d" ink="#2a1400" pill="Unit cleared, 0 mistakes" kudos={4} comments={2} likedBy="Dev" />
      {afterFirst}
      <FollowBack />
      <FriendPost friend={DEV} when="Yesterday" id="dev" text="Dev hit a 12 day streak. Send some kudos!" color="#2fb58f" ink="#06251c" pill="12 day streak" kudos={9} comments={0} />
      <FriendPost friend={LENA} when="3 days" id="lena" text="Lena reviewed 30 cards in one sitting. Her best yet!" color="#3f63d9" ink="#ffffff" pill="30 cards" kudos={2} comments={1} />
      <FriendStreaks />
    </>
  );
}
