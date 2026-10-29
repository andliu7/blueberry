/**
 * The celebration pages as data: one entry per moment, each with its own
 * Bloom reaction, one headline, one plain line and up to three stat tiles.
 * Drawings of states on fixed numbers, not derived chemistry or money.
 * Voice (blueberry voice.md): no countdowns, no guilt, one exclamation mark at most.
 */
import type { BerryMood } from "../mascot/berryMood";
import type { BerryBehaviour } from "../mascot/berryBehaviour";

export type CelebrationId = "lesson" | "perfect" | "unit" | "comeback" | "level" | "first" | "miss" | "streak" | "league";
export type HeroKind = "ring" | "crown" | "unit" | "sun" | "medal" | "flame" | "cards";
export type TileTone = "gold" | "green" | "blue" | "violet";

export interface CelebrationTile {
  readonly label: string;
  readonly value: string;
  readonly tone: TileTone;
}

export interface Celebration {
  readonly id: CelebrationId;
  readonly chip: string;
  readonly mood: BerryMood;
  readonly behaviour: BerryBehaviour;
  readonly sparkles: boolean;
  /** The page wash: a soft tint at the top fading to the ground. */
  readonly wash: "violet" | "gold" | "green" | "blue" | "calm";
  readonly title: string;
  readonly line: string;
  readonly tiles: readonly CelebrationTile[];
  readonly cta: string;
  /** The milestone drawn as an object around Bloom, and the number that counts up on it. */
  readonly hero: HeroKind;
  readonly count: { readonly from: number; readonly to: number; readonly prefix: string; readonly suffix: string };
  /** Bloom size and offset inside the 256 unit hero box, so the object stays the hero. */
  readonly bloom: { readonly size: number; readonly x: number; readonly y: number };
}

export const CELEBRATIONS: readonly Celebration[] = [
  {
    id: "lesson", chip: "Lesson", mood: "happy", behaviour: "bounce", sparkles: true, wash: "violet",
    title: "Lesson complete",
    line: "You can tell an SN1 from an SN2 now.",
    tiles: [
      { label: "Total XP", value: "25", tone: "gold" },
      { label: "Good", value: "88%", tone: "green" },
      { label: "Time", value: "3:12", tone: "blue" },
    ],
    cta: "Collect",
    hero: "ring", count: { from: 0, to: 25, prefix: "+", suffix: " XP" }, bloom: { size: 150, x: 0, y: 4 },
  },
  {
    id: "perfect", chip: "Perfect", mood: "proud", behaviour: "celebrate", sparkles: true, wash: "gold",
    title: "Not one slip",
    line: "Every answer right on the first try.",
    tiles: [
      { label: "Total XP", value: "40", tone: "gold" },
      { label: "Perfect", value: "100%", tone: "green" },
      { label: "Time", value: "2:41", tone: "blue" },
    ],
    cta: "Collect",
    hero: "crown", count: { from: 0, to: 40, prefix: "+", suffix: " XP" }, bloom: { size: 140, x: 0, y: 14 },
  },
  {
    id: "unit", chip: "New unit", mood: "excited", behaviour: "celebrate", sparkles: true, wash: "green",
    title: "Unit 2 is open",
    line: "Substitution is done. Next up, elimination.",
    tiles: [
      { label: "Lessons", value: "7 of 7", tone: "green" },
      { label: "Gems", value: "+50", tone: "violet" },
      { label: "Total XP", value: "180", tone: "gold" },
    ],
    cta: "Start Unit 2",
    hero: "unit", count: { from: 1, to: 2, prefix: "Unit ", suffix: "" }, bloom: { size: 112, x: 62, y: 62 },
  },
  {
    id: "comeback", chip: "Comeback", mood: "shy", behaviour: "wave", sparkles: false, wash: "calm",
    title: "Good to see you",
    line: "Three days away. Your cards kept your place.",
    tiles: [
      { label: "Cards due", value: "12", tone: "violet" },
      { label: "Streak", value: "1", tone: "gold" },
      { label: "Time", value: "5 min", tone: "blue" },
    ],
    cta: "Pick up where I left off",
    hero: "sun", count: { from: 0, to: 1, prefix: "", suffix: " day" }, bloom: { size: 140, x: 0, y: 22 },
  },
  {
    id: "level", chip: "Level up", mood: "cheer", behaviour: "bounce", sparkles: true, wash: "blue",
    title: "Level 6",
    line: "Your sixth level. Bloom did a small dance.",
    tiles: [
      { label: "Level", value: "6", tone: "violet" },
      { label: "Total XP", value: "600", tone: "gold" },
      { label: "Next level", value: "150 XP", tone: "blue" },
    ],
    cta: "Continue",
    hero: "medal", count: { from: 5, to: 6, prefix: "Level ", suffix: "" }, bloom: { size: 104, x: 70, y: 70 },
  },
  {
    id: "first", chip: "First today", mood: "curious", behaviour: "wideEyed", sparkles: false, wash: "gold",
    title: "First one today",
    line: "That is today's streak day counted.",
    tiles: [
      { label: "Streak", value: "12", tone: "gold" },
      { label: "Total XP", value: "20", tone: "gold" },
      { label: "Good", value: "92%", tone: "green" },
    ],
    cta: "Keep going",
    hero: "flame", count: { from: 11, to: 12, prefix: "", suffix: " day streak" }, bloom: { size: 120, x: 0, y: 26 },
  },
  {
    id: "miss", chip: "Missed one", mood: "sad", behaviour: "sigh", sparkles: false, wash: "calm",
    title: "That one was tricky",
    line: "Most people miss it the first time. It comes back in your review.",
    tiles: [
      { label: "Total XP", value: "10", tone: "gold" },
      { label: "Got right", value: "5 of 8", tone: "green" },
      { label: "To review", value: "3", tone: "violet" },
    ],
    cta: "Review the three",
    hero: "cards", count: { from: 0, to: 3, prefix: "", suffix: " to review" }, bloom: { size: 130, x: 0, y: -18 },
  },
  {
    id: "streak", chip: "Streak 30", mood: "proud", behaviour: "celebrate", sparkles: true, wash: "gold",
    title: "30 days in a row",
    line: "A month of chemistry, one day at a time.",
    tiles: [
      { label: "Streak", value: "30", tone: "gold" },
      { label: "Total XP", value: "20", tone: "gold" },
      { label: "Good", value: "92%", tone: "green" },
    ],
    cta: "Keep going",
    hero: "flame", count: { from: 29, to: 30, prefix: "", suffix: " day streak" }, bloom: { size: 120, x: 0, y: 26 },
  },
  {
    id: "league", chip: "League", mood: "excited", behaviour: "celebrate", sparkles: true, wash: "blue",
    title: "You moved up a league",
    line: "Your week of XP put you near the top.",
    tiles: [
      { label: "League", value: "2", tone: "violet" },
      { label: "This week", value: "340 XP", tone: "gold" },
      { label: "Place", value: "3rd", tone: "blue" },
    ],
    cta: "Continue",
    hero: "medal", count: { from: 1, to: 2, prefix: "League ", suffix: "" }, bloom: { size: 104, x: 70, y: 70 },
  },
];
