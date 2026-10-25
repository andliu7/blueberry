/**
 * The Design Bible's section 01 ("Mascot states and reactions"), one row per
 * state, as the gallery shows it: the Bible's name, what this repo did with
 * it, and the composition that draws it (BLOOM-STATES-SPEC.md, section 1).
 *
 * Data only, read by BerryGallery.tsx alone, so it ships in the gallery's lazy
 * chunk and never on the #/app first paint. A parked row carries its reason
 * and no demo, so the gallery says "parked" instead of drawing something the
 * app does not do.
 */

import type { BerryBehaviour } from "./berryBehaviour";
import type { BerryCostume } from "./berryCostume";
import type { BerryMood } from "./berryMood";
import type { BerryState } from "./berryState";

export type BibleSection = "A. Ambient" | "B. Answer reactions" | "C. Progression" | "D. Chemical" | "E. Costumes";

export interface BibleDemo {
  readonly mood?: BerryMood;
  readonly behaviour?: BerryBehaviour;
  readonly chain?: readonly BerryBehaviour[];
  readonly state?: BerryState;
  readonly costume?: BerryCostume;
}

export interface BibleRow {
  readonly section: BibleSection;
  /** The Bible's own name for the state. */
  readonly name: string;
  /** "built" draws `demo`; "parked" shows `note` as the reason. */
  readonly decision: "built" | "parked";
  /** Where it fires, or why it is parked. One sentence. */
  readonly note: string;
  readonly demo?: BibleDemo;
}

const row = (section: BibleSection, name: string, note: string, demo: BibleDemo): BibleRow =>
  Object.freeze({ section, name, decision: "built", note, demo: Object.freeze(demo) });
const parked = (section: BibleSection, name: string, note: string): BibleRow =>
  Object.freeze({ section, name, decision: "parked", note });

export const BIBLE_ROWS: readonly BibleRow[] = Object.freeze([
  row("A. Ambient", "Idle breathe", "Every ambient berry; shipped timings kept (spec section 7, Q1).", { mood: "curious", behaviour: "idle" }),
  row("A. Ambient", "Blink and glance", "The seeded glance looks off every 3 to 6s while idle.", { mood: "curious", behaviour: "idle" }),
  row("A. Ambient", "Bored, 20s no input", "Path Bloom sighs once after 20s quiet, then looks at you.", { mood: "sleepy", behaviour: "sigh" }),
  row("A. Ambient", "Peek during a mechanism problem", "The trainer berry peeks up on mount, then leans in at the canvas. Focused, not the spec's curious: the trainer keeps its working face (trainerOpening).", { mood: "focused", behaviour: "peek", chain: ["leanIn"] }),
  row("A. Ambient", "Return greet (replaces dormant)", "The Feed's Welcome back card: peek, then wave. No sad frame.", { mood: "happy", behaviour: "peek", chain: ["wave"] }),
  parked("A. Ambient", "Dormant, 7+ days", "No days-away signal, and dust reads as a guilt trip for leaving. The return greet is the friendly half."),
  parked("A. Ambient", "Zen focus, timed quiz", "Nothing in the app is timed."),

  row("B. Answer reactions", "Correct", "MCQ tray, sort, match, synthesis, trainer (after the sheet's 200ms rise, spec Q8), LessonPlayer.", { mood: "happy", behaviour: "squash", chain: ["bounce"] }),
  row("B. Answer reactions", "Combo 3 / 5 / 8", "Bounce x2 / x3 / x4 with sparkles; confetti at 8; capped there.", { mood: "excited", behaviour: "bounce", chain: ["bounce", "bounce"] }),
  row("B. Answer reactions", "Near miss", "Only where a grader yields one: the trainer and LessonPlayer.", { mood: "thinking", behaviour: "leanIn" }),
  row("B. Answer reactions", "Wrong", "Sad for 900ms, then curious and leaning in (spec section 7, Q2).", { mood: "sad", behaviour: "squash" }),
  row("B. Answer reactions", "Wrong again, hint offer", "A second miss on the same item (MCQ recycle, sort Try again): leans in, no sad beat; the tray's Why? (or the sort's headline) gets the hint ring.", { mood: "curious", behaviour: "leanIn" }),
  row("B. Answer reactions", "Thinking, 15s mid-item", "The MCQ bar berry after 15s without a press, with a floating lone pair.", { mood: "thinking", behaviour: "idle" }),
  row("B. Answer reactions", "Oxidized, third miss", "Charred and comic, no cough; the next right answer clears it.", { mood: "sad", behaviour: "stressed", state: "charred" }),
  row("B. Answer reactions", "Reduced, after oxidized", "The puff on the stage wrapper when the char clears.", { mood: "happy", behaviour: "squash", chain: ["bounce"] }),
  parked("B. Answer reactions", "Panic, last 10s timed", "Timed mode only, and there is no timed mode."),

  row("C. Progression", "XP pop", "The Hud pop, and \"+N XP\" off Bloom on the lesson-complete screen.", { mood: "cheer", behaviour: "celebrate" }),
  row("C. Progression", "Diamond catch", "Lesson complete and the chest: the diamond lands on Bloom's head.", { mood: "curious", behaviour: "wideEyed" }),
  row("C. Progression", "Lesson complete", "BeatRunner's reward slot; Continue live by 1500ms.", { mood: "cheer", behaviour: "celebrate" }),
  row("C. Progression", "Unit complete, quiz passed", "ExamEnd: proud, the trophy, 40 pieces of confetti.", { mood: "proud", behaviour: "celebrate", costume: "referee" }),
  row("C. Progression", "Level up", "The Hud's stage change, lazy; the hat joke once per stage.", { mood: "proud", behaviour: "celebrate" }),
  row("C. Progression", "Streak lit", "After the lesson reward on the clear that made today count.", { mood: "excited", behaviour: "bounce" }),
  row("C. Progression", "Streak saved by a rest day", "The streak screen's rest-day note, after the fact; the hero holds the flame alone.", { mood: "calm", behaviour: "wave" }),
  parked("C. Progression", "Streak at risk", "Notification art only; a worried Bloom in app is the anxiety loop the economy avoids."),
  parked("C. Progression", "Streak lost", "No grief beat. A restart is an ordinary Streak lit at day 1."),

  row("D. Chemical", "Protonated", "Acid and base, leaving-group lessons (berryTopicState.ts).", { mood: "curious", state: "protonated" }),
  row("D. Chemical", "Carbocation", "SN1, E1 and rearrangement lessons.", { mood: "stressed", state: "carbocation" }),
  row("D. Chemical", "Radical", "Radical halogenation lessons.", { mood: "excited", state: "radical" }),
  row("D. Chemical", "Resonance", "Delocalization lessons and resonance beats.", { mood: "curious", state: "resonance" }),
  row("D. Chemical", "Mind blown, first resonance", "The first resonance beat a learner meets, once per device.", { mood: "excited", behaviour: "wideEyed", state: "resonance" }),
  row("D. Chemical", "Aromatic", "Aromaticity lessons. Deeply smug.", { mood: "proud", state: "aromatic" }),
  row("D. Chemical", "Charged", "The Hud's Charge panel and the Charge gate; the halo is the charge level.", { mood: "happy", state: "charged" }),
  row("D. Chemical", "Deprotonated", "pKa, enolate and phenoxide lessons. Cool blue, a lone pair, a level mouth.", { mood: "calm", state: "deprotonated" }),
  row("D. Chemical", "Excited state", "UV-Vis and photochemical [2+2] lessons. Glows, hums, drops back with a photon.", { mood: "curious", state: "excitedState" }),
  row("D. Chemical", "Enantiomers", "R/S, racemic and asymmetric lessons. Mirror twins, R and S.", { mood: "curious", state: "enantiomers" }),
  row("D. Chemical", "Solvated", "The zwitterion lesson. A water shell, idle motion at half speed.", { mood: "curious", state: "solvated" }),
  parked("D. Chemical", "Nucleophile", "Needs an arrow-arm on the trainer canvas, which no one owns in this run."),

  row("E. Costumes", "Goggles and lab coat", "Reaction lessons; goggles down while working.", { mood: "focused", costume: "labcoat" }),
  row("E. Costumes", "Tweed and pointer", "Concept lessons.", { mood: "curious", costume: "tweed" }),
  row("E. Costumes", "Trench and loupe", "Spectroscopy and structure lessons.", { mood: "thinking", costume: "trench" }),
  row("E. Costumes", "Backpack and map", "Branch lessons off the spine.", { mood: "happy", costume: "backpack" }),
  row("E. Costumes", "Whistle and stripes", "Unit quizzes and test-out; cheers only at the end.", { mood: "focused", costume: "referee" }),
  row("E. Costumes", "Cape", "The leaderboard, only when the student places.", { mood: "proud", costume: "cape" }),
  row("E. Costumes", "Nightcap", "Notification art only, never in app.", { mood: "sleepy", costume: "nightcap" }),
  parked("E. Costumes", "Seasonal skins", "No cosmetic shop or inventory exists yet."),
]);
