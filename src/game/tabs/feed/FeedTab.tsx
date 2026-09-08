/**
 * The Feed tab. Two sections, per docs/DESIGN-GOALS.md ("Ours, not
 * Duolingo's") and the committed reference blueberry_r7-feed-v2_1788288479.png:
 *
 *   DAILY QUESTS   three rows on WHITE cards, each led by its own large motif
 *                  (a flask that fills, the cartoon flame, a fan of cards), a
 *                  pale track carrying a GREEN fill that runs into a chest, and
 *                  a number beside the bar so the bar is never the only carrier
 *                  of the reading. Everything derives from the LOCAL journal
 *                  through feedModel.ts; nothing is invented.
 *
 *   LAB MATES      other people's activity, which only a server can know. It
 *                  renders honestly not open, naming the Phase 6 server it
 *                  waits on: the SHAPE is drawn (berry avatars in three berry
 *                  colours, the toast-a-flask cheer at the end of each row) so
 *                  the student sees what this becomes, and no row pretends to
 *                  be a person.
 *
 * WHAT ATTEMPT 2 CHANGED, every line of it measured against the committed
 * image by a critic rather than argued here:
 *
 *   THE GREEN IS THE FILL, NOT THE TRACK. The build had a pale GREEN track
 *   under a green fill, so an untouched quest was the greenest thing on the
 *   screen and green read as "nothing done". That inverts DESIGN-GOALS line 17
 *   ("Green says you moved"). The track is a pale neutral now and the only
 *   green on a bar is the part that was earned.
 *
 *   THE CARDS ARE WHITE ON THE CREAM PAGE, separated by VALUE, with a soft
 *   warm hairline instead of the 2 px dark slate --bb-border the build drew. The
 *   image never draws a dark outline round these; the white is the separation.
 *
 *   THREE MOTIFS, NOT THREE COPIES OF ONE. See QuestMotif in feedModel.ts.
 *   At 56 px they are the row's colour anchor, which is what the image's icon
 *   column does and what an outlined 46 px monochrome flask did not.
 *
 *   THE CHEER IS A REAL CONTROL. It was an aria-hidden decoration, so the
 *   whole surface contained zero <button> elements: no press acknowledgement,
 *   no disabled state, no 44 px target. The honest not-open treatment of an
 *   action is a DISABLED control, not the absence of one, so it is a real
 *   disabled button carrying the reason in its accessible name.
 *
 * WHY THE QUEST BAR'S FILL IS THE GOAL GREEN AND WHY IT IS FILL ONLY.
 * DESIGN-GOALS: light green is the progress semantic everywhere, filled bars
 * included, and it is FILL ONLY. The fill here carries no text and no mark;
 * the reading beside it is the page's own ink on the card, and the track
 * carries the boundary ring, so the green is never the thing a reader has to
 * resolve at a floor it fails.
 *
 * THE CLOCK. The model takes `now` as an argument (LOG.md: the clock is part
 * of the surface). This component reads it once per journal change, so a
 * finished lesson moves the bars on return to the tab, and no timer redraws a
 * static screen.
 *
 * THE FEED IS NOT IN THE TAB BAR YET, and it is the one must-fix on this
 * surface this piece cannot land: `ALL_TABS` in app/routes.ts has no `feed`
 * entry, so `#/feed` does not parse and this component is unreachable in the
 * product. routes.ts and Shell.tsx are the INTEGRATOR's files. What they need
 * is exported below as FEED_TAB_REQUEST rather than described in a report.
 *
 * No mascot on this tab. Bloom appears once per screen where he appears at
 * all (sticker rule 10), and the berry avatars here are deliberately OTHER
 * berries, drawn small and flat, never the imported mark.
 */

import { useId, useMemo } from "react";
import { Pill } from "../../app/ui/Card";
import { useProgress } from "../../app/hooks";
import { FeedBackdrop } from "./FeedBackdrop";
import { feedModel, type QuestModel } from "./feedModel";
import "./feed.css";

/**
 * The tab-bar icon, re-exported so an older import of it from this module
 * still resolves. THE TAB BAR MUST NOT USE THIS ONE: importing it from here is
 * a static import of the lazy chunk, which a bundler answers by hoisting the
 * whole Feed into the initial payload. Import from "./FeedIcon" instead; that
 * file's header carries the reasoning.
 */
export { NewspaperMark } from "./FeedIcon";

/**
 * WHAT THE INTEGRATOR NEEDS, as data rather than as a paragraph in a report.
 *
 * docs/DESIGN-GOALS.md, Header and tabs: "DECIDED 2026-09-01 at the
 * calibration gate: FIVE tabs (Path, Train, Cards, Feed, Me) ... The five-tab
 * goal images are now binding on tab count." app/routes.ts still carries the
 * superseded four, so this is the row it is missing and where it goes.
 * Exported rather than described so the integrator can paste a value, and so a
 * later reader can see the request was made from inside the code.
 */
export const FEED_TAB_REQUEST = Object.freeze({
  id: "feed",
  label: "Feed",
  short: "Feed",
  dataPhase: 5,
  placement: "nav",
  parent: "feed",
  /** After "cards" and before "me", which is the goal images' order. */
  after: "cards",
  /** The bar draws this on the first paint of every route, so import it from
   *  the cheap module and never from FeedTab.tsx. */
  iconModule: "./tabs/feed/FeedIcon",
  iconExport: "NewspaperMark",
} as const);

/* ------------------------------------------------------------- the glyphs -- */

/*
 * ILLUSTRATION LITERALS, in the same category as the mascot's frozen
 * MASCOT_PALETTE and the chest's gold: these are pictures of objects, not
 * chrome, so they are drawn in the object's own colours sampled from the
 * committed image rather than derived from a theme token. Every one of them is
 * a filled shape carrying a DARKER outline of its own family, which is how the
 * contrast audit's "a shape is one component" rule is satisfied without
 * darkening a fill the image draws bright (see DESIGN-TOKENS.md).
 */
/** The quest flask. Violet liquid in pale violet glass, per the image. */
const GLASS_TINT = "#efe9ff";
const LIQUID = "#9f75f5";
const LIQUID_DEEP = "#6d43cf";
/** The cartoon flame: bright body, the streak token as its boundary. */
const FLAME_BODY = "#ffa60e";
const FLAME_CORE = "#ffd166";
/** The card fan. */
const CARD_PINK = "#f6a7a0";
const CARD_VIOLET = "#b39ef2";
const CARD_PALE = "#f6efff";

const FLASK_BODY = "M10.6 4.5h2.8v5.1l4.9 8.1a1.6 1.6 0 0 1-1.4 2.4H7.1a1.6 1.6 0 0 1-1.4-2.4l4.9-8.1z";

/**
 * The quest flask, filling as progress. The liquid is a rect clipped to the
 * flask's inner body, its height the quest's own fraction, so the icon and the
 * bar under it always agree: both are drawn from the same number.
 *
 * THE GLASS CARRIES COLOUR AT ZERO, and that is the correction. An empty quest
 * used to draw an outline and nothing else, so on a fresh install all three
 * rows were the same colourless wireframe. The vessel is tinted violet and
 * rimmed in the deeper violet now, so the row reads as the XP row before any
 * liquid is in it, and the LIQUID stays the honest reading: a quest at zero
 * still shows an empty flask, because a flask with liquid in it at zero
 * progress would be the screen lying about the day.
 */
function QuestFlask({ fraction }: { readonly fraction: number }) {
  const clip = useId();
  // The inner body the liquid can occupy: from under the neck (y 10) to the
  // floor (y 19.4). Empty draws nothing rather than a zero-height sliver.
  const top = 10;
  const bottom = 19.4;
  const level = bottom - fraction * (bottom - top);
  return (
    <svg viewBox="0 0 24 24" className="feed-motif" aria-hidden focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d={FLASK_BODY} />
        </clipPath>
      </defs>
      <path d={FLASK_BODY} fill={GLASS_TINT} />
      {fraction > 0 ? (
        <g clipPath={`url(#${clip})`}>
          <rect x="3" y={level} width="18" height={bottom - level + 1} fill={LIQUID} />
          {/* One lighter facet on the surface, the house volume cue. */}
          <rect x="3" y={level} width="18" height="1.1" fill="#ffffff" fillOpacity="0.45" />
        </g>
      ) : null}
      <path d={FLASK_BODY} fill="none" stroke={LIQUID_DEEP} strokeWidth="1.7" strokeLinejoin="round" />
      <rect x="9.3" y="2.9" width="5.4" height="2.5" rx="1.25" fill={LIQUID_DEEP} />
    </svg>
  );
}

/**
 * The streak quest's flame. The product's one cartoon flame silhouette, drawn
 * BRIGHT the way the committed image and blueberry_spec-meter-states draw it
 * (#ffa60e over a deeper orange), with --streak as its BOUNDARY rather than as
 * its body. That pairing is what lets the image's bright orange ship without
 * dropping under the 3:1 an interface graphic owes: the contrast audit
 * collapses a shape's fill and its boundary to the better of the two, and
 * --streak #d94a06 is 3.64:1 on the page and 4.26:1 on the white card.
 *
 * IT IS THE MOTIF, NOT THE METER. The flame says which quest this is; the bar
 * under it says how the day is going. Drawing it dim while the day is still
 * open would be the streak-anxiety framing ECONOMY.md's mitigation set exists
 * to keep out of this product.
 */
function QuestFlame() {
  return (
    <svg viewBox="0 0 24 24" className="feed-motif" aria-hidden focusable="false">
      <path
        d="M12.6 1.2c-.4 2.9-2 4.3-3.4 5.6C7.2 8.6 4.8 11 4.8 15.2 4.8 19.1 8 22.2 12 22.2s7.2-3.1 7.2-7c0-2.8-1.2-4.7-2.6-6.2-.2 1.5-1 2.6-2.1 3 1-3.6-.6-8.2-1.9-10.8z"
        fill={FLAME_BODY}
        stroke="var(--streak)"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M12 10.4c1.9 1.9 3 3.4 3 5.1a3 3 0 0 1-6 0c0-1.6 1.1-3.2 3-5.1z" fill={FLAME_CORE} />
    </svg>
  );
}

/**
 * The answer-card fan. The reference draws this motif beside a "review cards"
 * quest; ours counts CORRECT ANSWERS, so the front card carries a check rather
 * than a deck mark. The fan, the pink front card and the violet behind it are
 * the image's; what the front card SAYS is our quest's.
 */
function QuestCards() {
  return (
    <svg viewBox="0 0 24 24" className="feed-motif" aria-hidden focusable="false">
      <g stroke="var(--bb-foreground)" strokeWidth="1.1" strokeLinejoin="round">
        <rect x="3.4" y="7.4" width="9.6" height="13.4" rx="1.9" fill={CARD_PALE} transform="rotate(-16 8.2 14.1)" />
        <rect x="7.2" y="5.6" width="9.6" height="13.4" rx="1.9" fill={CARD_VIOLET} transform="rotate(-4 12 12.3)" />
        <rect x="11.4" y="6.2" width="9.6" height="13.4" rx="1.9" fill={CARD_PINK} transform="rotate(11 16.2 12.9)" />
      </g>
      {/* The check, on the front card, in the goal green as a FILL under a dark
          mark: the tick is the page's progress ink over a green disc, never a
          green hairline. */}
      <g transform="rotate(11 16.2 12.9)">
        <circle cx="16.2" cy="12.9" r="3.6" fill="var(--progress)" />
        <path
          d="M14.4 12.9 15.8 14.4 18.1 11.5"
          fill="none"
          stroke="var(--progress-ink)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/**
 * The chest a quest bar runs into. Drawn state, not a payout: see feedModel.
 *
 * GOLD WITH A DARK OUTLINE, which is what the committed image draws. Nothing
 * here carries text, so nothing here is a contrast pair; the outline is what
 * makes the shape legible on either theme's card.
 */
const CHEST_GOLD = "#f2b632";
const CHEST_GOLD_DEEP = "#d18f16";
const CHEST_OUTLINE = "#5f3c12";

function ChestMark({ open }: { readonly open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="feed-chest" data-open={open ? "true" : "false"} aria-hidden focusable="false">
      <g stroke={CHEST_OUTLINE} strokeWidth="1.5" strokeLinejoin="round">
        {/* The lid, a half round; the base under it; one band across the seam. */}
        <path d="M3.4 10.4V9A4.6 4.6 0 0 1 8 4.4h8A4.6 4.6 0 0 1 20.6 9v1.4z" fill={CHEST_GOLD} />
        <path d="M3.4 11.6h17.2v5.6a2.4 2.4 0 0 1-2.4 2.4H5.8a2.4 2.4 0 0 1-2.4-2.4z" fill={CHEST_GOLD} />
        <path d="M3.4 10.4h17.2v1.2H3.4z" fill={CHEST_GOLD_DEEP} />
      </g>
      {/* The latch, cut out in the card's own colour so the shape is one
          component in both themes, with the keyhole punched through it. */}
      <rect
        x="10.2"
        y="8.8"
        width="3.6"
        height="5.4"
        rx="1.2"
        fill="var(--quest-card)"
        stroke={CHEST_OUTLINE}
        strokeWidth="1.3"
      />
      <circle cx="12" cy="11.5" r="0.85" fill={CHEST_OUTLINE} />
    </svg>
  );
}

/* -------------------------------------------------------- the lab mates --- */

/**
 * THREE BERRIES, AND EVERY ONE OF THEM HAS A FACE AND A LEAF.
 *
 * The critic's finding, and it is the difference between a mascot family and
 * three coloured blobs: every berry in the committed image has two eyes, a
 * smile and a leafy green crown. Ours had a plain disc with a highlight, and
 * the two cluster berries wore a 4 by 4 green SQUARE where a stem should be.
 * A square is what a missing glyph looks like.
 *
 * THEY ARE NOT THE MASCOT and none of this is drawn from BlueberryMark. D4
 * says the mascot is imported and never redrawn; these are OTHER berries, lab
 * mates rather than Bloom, so they are deliberately flatter, smaller and
 * simpler. The shared vocabulary is the face and the leaf, which is what makes
 * them read as the same product's characters.
 *
 * ONE FACE AND ONE CROWN, DRAWN ONCE. The three bodies differ; the eyes, the
 * smile and the leaves do not, so they are two components placed on each
 * berry, which is also why they cannot drift apart later.
 */
const LEAF_GREEN = "#5cb85c";
const LEAF_DEEP = "#2f7d33";
const EYE_INK = "#1b2140";

function BerryFace({ cx, cy, scale = 1 }: { readonly cx: number; readonly cy: number; readonly scale?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <ellipse cx="-4.2" cy="-1.4" rx="2.5" ry="2.9" fill="#ffffff" />
      <ellipse cx="4.2" cy="-1.4" rx="2.5" ry="2.9" fill="#ffffff" />
      <circle cx="-3.8" cy="-0.8" r="1.45" fill={EYE_INK} />
      <circle cx="4.6" cy="-0.8" r="1.45" fill={EYE_INK} />
      <path d="M-3.4 4a4.7 4.7 0 0 0 6.8 0" fill="none" stroke={EYE_INK} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

/** The leafy crown. Two leaves off a short stem, never a square. */
function BerryCrown({ cx, cy }: { readonly cx: number; readonly cy: number }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <path d="M0 1.4V-2.6" stroke={LEAF_DEEP} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M-0.6-1.2c-1.5-2.9-4.4-3.7-6.4-3.3-.2 2.3 1.4 4.8 3.9 5.4 1.1.2 2.1 0 2.5-.4z" fill={LEAF_GREEN} />
      <path d="M0.6-1.2c1.5-2.9 4.4-3.7 6.4-3.3.2 2.3-1.4 4.8-3.9 5.4-1.1.2-2.1 0-2.5-.4z" fill={LEAF_DEEP} />
    </g>
  );
}

function BlueberryAvatar() {
  return (
    <svg viewBox="0 0 32 32" className="feed-avatar" aria-hidden focusable="false">
      <circle cx="16" cy="18.5" r="11.4" fill="#3d63f5" stroke="#2231a8" strokeWidth="1.2" />
      <ellipse cx="10.6" cy="13" rx="3.4" ry="2.3" fill="#ffffff" fillOpacity="0.32" transform="rotate(-28 10.6 13)" />
      <BerryCrown cx={16} cy={8} />
      <BerryFace cx={16} cy={18.5} />
    </svg>
  );
}

function ClusterBody({ fill, rim }: { readonly fill: string; readonly rim: string }) {
  return (
    <g stroke={rim} strokeWidth="1.1" fill={fill}>
      <circle cx="10.4" cy="14.6" r="4.3" />
      <circle cx="21.6" cy="14.6" r="4.3" />
      <circle cx="7.8" cy="21" r="4.3" />
      <circle cx="24.2" cy="21" r="4.3" />
      <circle cx="11.9" cy="25.8" r="4.3" />
      <circle cx="20.1" cy="25.8" r="4.3" />
      <circle cx="16" cy="19.6" r="5.3" />
    </g>
  );
}

function RaspberryAvatar() {
  return (
    <svg viewBox="0 0 32 32" className="feed-avatar" aria-hidden focusable="false">
      <ClusterBody fill="#e05070" rim="#a52c4c" />
      <BerryCrown cx={16} cy={9.4} />
      <BerryFace cx={16} cy={19.6} scale={0.9} />
    </svg>
  );
}

function BlackberryAvatar() {
  return (
    <svg viewBox="0 0 32 32" className="feed-avatar" aria-hidden focusable="false">
      <ClusterBody fill="#5b3a86" rim="#3a2159" />
      <BerryCrown cx={16} cy={9.4} />
      <BerryFace cx={16} cy={19.6} scale={0.9} />
    </svg>
  );
}

/**
 * The toast-a-flask cheer: a raised, tipped flask with the cheer's fizz.
 *
 * IT IS THE QUEST FLASK, TIPPED, and that is the point rather than an economy
 * of drawing: the committed reference draws one piece of glassware in this
 * product and uses it twice on this screen, held upright to show a quest
 * filling and raised at an angle to cheer. Same vessel, same violet liquid,
 * same lip; the rotation and the radiating cheer strokes are the difference.
 *
 * THE FIZZ IS STROKES, NOT DOTS. The reference draws short lines radiating off
 * the flask's shoulder, which is the comic-book mark for a thing being raised;
 * three dots beside it read as bubbles escaping, which is the opposite motion.
 */
function ToastFlask() {
  const body = "M10.4 5.4h3.2v4.6l4.4 7.3a1.5 1.5 0 0 1-1.3 2.3H7.3a1.5 1.5 0 0 1-1.3-2.3l4.4-7.3z";
  return (
    <svg viewBox="0 0 24 24" className="feed-toast" aria-hidden focusable="false">
      <g transform="rotate(20 12 15)">
        <path d={body} fill={LIQUID} />
        <path d={body} fill="none" stroke={LIQUID_DEEP} strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="9.2" y="3.9" width="5.6" height="2.2" rx="1.1" fill={LIQUID_DEEP} />
      </g>
      <g stroke={FLAME_BODY} strokeWidth="1.9" strokeLinecap="round">
        <path d="M18.6 4.4 20.6 2.6M20.4 7.6 22.6 6.6M17.4 8.2 18.6 6.6" />
      </g>
    </svg>
  );
}

/**
 * The cheer, as a real DISABLED control.
 *
 * The honest not-open treatment of an ACTION is a disabled control, not the
 * absence of a control: the student sees the affordance, sees that it is not
 * live, and reads why in its accessible name. Drawing the flask with no button
 * round it meant the whole Feed contained zero <button> elements, so there was
 * no press to acknowledge, no disabled state to read and no 44 px target to
 * hit. This is 44 by 44 from the Budgets table and carries `.press`, so the
 * day the friends server lands, dropping `disabled` is the entire change and
 * the press contract is already satisfied.
 */
function ToastButton() {
  return (
    <button
      type="button"
      className="press feed-toast-btn"
      disabled
      aria-label="Toast this clear. Opens when the friends server arrives in Phase 6."
      title="Opens with the friends server"
    >
      <ToastFlask />
    </button>
  );
}

/* --------------------------------------------------------------- the rows -- */

function QuestRow({ quest }: { readonly quest: QuestModel }) {
  return (
    <li
      className="feed-quest"
      data-quest={quest.id}
      data-motif={quest.motif}
      data-done={quest.done ? "true" : "false"}
      aria-label={`${quest.label}: ${quest.reading}${quest.done ? ", done" : ""}`}
    >
      {/* Only the flask reads the fraction. The other two are motifs and say
          WHICH quest this is; the bar beneath says how it is going. */}
      <span className="feed-quest-icon" aria-hidden>
        {quest.motif === "flask" ? (
          <QuestFlask fraction={quest.fraction} />
        ) : quest.motif === "flame" ? (
          <QuestFlame />
        ) : (
          <QuestCards />
        )}
      </span>
      <div className="feed-quest-body">
        <div className="feed-quest-top">
          <span className="feed-quest-label">{quest.label}</span>
          <span className="feed-quest-reading">{quest.reading}</span>
        </div>
        <div className="feed-quest-track" aria-hidden>
          <span className="feed-quest-fill" style={{ width: `${Math.round(quest.fraction * 100)}%` }} />
          <ChestMark open={quest.done} />
        </div>
      </div>
    </li>
  );
}

const LAB_MATE_SHAPES = [
  { key: "blueberry", Avatar: BlueberryAvatar, width: "9rem" },
  { key: "raspberry", Avatar: RaspberryAvatar, width: "11rem" },
  { key: "blackberry", Avatar: BlackberryAvatar, width: "8rem" },
] as const;

/* ---------------------------------------------------------------- the tab -- */

export default function FeedTab() {
  const snapshot = useProgress();
  // Re-read the clock when the journal moves, not on a timer: the bars are
  // day totals, and the one thing that changes them mid visit is an event.
  const model = useMemo(() => feedModel(snapshot.journal, new Date().toISOString()), [snapshot.journal]);

  return (
    <div
      className="feed-page"
      data-feed-done={model.doneCount}
      data-feed-streak={model.snapshot.streak.todayCounted ? "true" : "false"}
    >
      {/* The composed ground, per BACKGROUND DOCTRINE and the committed
          reference. Behind everything, decorative, and placed by a table
          rather than scattered (backdropProps.ts). */}
      <FeedBackdrop />
      <div className="feed-column mx-auto flex max-w-2xl flex-col gap-5 p-4 md:p-6">
        <section aria-label={`Daily quests, fresh each day. ${model.doneCount} of ${model.quests.length} done`}>
          {/* Heading alone, the way the image draws it. The "fresh each day"
              line that used to sit under it is in the accessible name above:
              on a phone it occupied exactly the band a backdrop prop drifts
              through, and the image goes from heading straight to cards. */}
          <h2 className="feed-heading">Daily Quests</h2>
          <ul className="feed-quests">
            {model.quests.map((quest) => (
              <QuestRow key={quest.id} quest={quest} />
            ))}
          </ul>
        </section>

        <section aria-label="Lab mates">
          <div className="feed-heading-row">
            <h2 className="feed-heading">Lab mates</h2>
            <Pill>Phase 6 data</Pill>
          </div>
          {/* The section's SHAPE, with no invented people in it: a berry
              avatar, the row a name and a clear will fill, and the
              toast-a-flask cheer on the row's end as a disabled control. The
              same honesty device LeaderboardsTab gives its standings. */}
          <div className="feed-panel">
            <ol className="feed-mates" aria-label="What a lab mate's row will look like">
              {LAB_MATE_SHAPES.map(({ key, Avatar, width }) => (
                <li key={key} className="feed-mate">
                  <Avatar />
                  <span className="skeleton feed-mate-line" style={{ maxWidth: width }} aria-hidden />
                  <ToastButton />
                </li>
              ))}
            </ol>
          </div>
          <p className="feed-note">
            Lab mates are other students, and other students live on the friends server, which
            arrives in Phase 6. Nothing here is made up in the meantime: these rows are the shape
            this takes, and the tipped flask is how you will toast a lab mate&apos;s clear.
          </p>
        </section>
      </div>
    </div>
  );
}
