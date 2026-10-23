/**
 * What the Messages tab says, as pure functions over the student's real local
 * state. No React here, so the copy is testable without a DOM.
 *
 * NO FAKE PEOPLE. There are two senders and both are honest about what they
 * are: Bloom, the mascot (documentation/MASCOT.md), and "Study reminders", a
 * read-only feed like the short-code threads on an iPhone. Every number a
 * message quotes is read from the journal or the deck store at render time;
 * nothing is invented and nothing is pretended to have been sent by a person.
 */

import { daysBetween, localDate, type EconomyEvent } from "@blueberry/economy";
import type { Reaction } from "@blueberry/curriculum";
import type { ChatMessage } from "@/components/ui/group-chat";
import { plural } from "@/lib/helpers";
import { answer, answerText, type AskState } from "../chat/askModel";

export type ThreadId = "bloom" | "reminders";

/** The blobatar seeds and display names. A seed never changes, or the face does. */
export const BLOOM = "bloom-the-blueberry";
export const BLOOM_TITLE = "Bloom";
export const REMINDERS = "study-reminders";
export const REMINDERS_TITLE = "Study reminders";
/** The reader's own seed in the bubble layout. Never drawn as a face. */
export const ME = "me";

export interface NudgeInput {
  readonly name: string | null;
  readonly streak: number;
  readonly todayCounted: boolean;
  readonly cardsDue: number;
  /** Title of the node the pathway's START tag is on; null when there is none. */
  readonly nextLesson: string | null;
  /** True once a course is picked. Without one there is no "next lesson". */
  readonly hasCourse: boolean;
}

/** Bloom's opening run for today: a greeting and three facts, in that order. */
export function bloomNudges(input: NudgeInput): readonly string[] {
  const lines: string[] = [input.name ? `Hi ${input.name}! Here is where you are today.` : "Hi! Here is where you are today."];

  if (input.streak === 0) lines.push("No streak yet. One lesson starts it.");
  else if (input.todayCounted) lines.push(`Day ${input.streak} of your streak is done. Nice work.`);
  else lines.push(`Your streak is at ${plural(input.streak, "day", "days")}. One lesson today keeps it going.`);

  lines.push(
    input.cardsDue === 0
      ? "No cards are due for review today."
      : `${plural(input.cardsDue, "card is", "cards are")} due for review today.`,
  );

  if (!input.hasCourse) lines.push("Pick a course on the Path tab and I will point you at your first lesson.");
  else if (input.nextLesson === null) lines.push("You have cleared every lesson on your path so far.");
  else lines.push(`Next up on your path: ${input.nextLesson}.`);

  return lines;
}

/**
 * Bloom's answer to anything the student types, from the SAME brain as Ask
 * Blueberry (chat/askModel.ts), so one question never gets two answers. A
 * reaction answer is kept as one line of text here (a bubble holds no card)
 * plus the question, so the thread can offer SEE IT DRAWN, which opens the
 * same answer as a card with structures in Ask Blueberry.
 */
export function bloomReply(
  question: string,
  state: AskState,
  topicLabel?: (reaction: Reaction) => string,
): { readonly text: string; readonly ask?: string } {
  const reply = answer(question, state, topicLabel);
  return reply.kind === "reaction" ? { text: answerText(reply), ask: question } : { text: reply.text };
}

/** The latest reminder hour and exam date the student set, from the journal. */
export function reminderSettings(journal: readonly EconomyEvent[]): {
  readonly hour: number | null;
  readonly examDate: string | null;
} {
  let hour: number | null = null;
  let examDate: string | null = null;
  for (const event of journal) {
    if (event.kind !== "settings") continue;
    if (event.reminderHour !== undefined) hour = event.reminderHour;
    if (event.examDate !== undefined) examDate = event.examDate;
  }
  return { hour, examDate };
}

export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve} ${suffix}`;
}

/** The read-only reminders thread. */
export function reminderLines(input: {
  readonly hour: number | null;
  readonly examDate: string | null;
  readonly today: string;
  readonly cardsDue: number;
}): readonly string[] {
  const lines: string[] = [];
  if (input.hour !== null) lines.push(`Your daily study reminder is set for ${hourLabel(input.hour)}.`);
  lines.push("Reminders show up in this thread for now. Texts and push notifications are not switched on yet.");
  if (input.examDate !== null) {
    const left = daysBetween(input.today, input.examDate);
    if (left > 0) lines.push(`Exam in ${plural(left, "day", "days")}.`);
    else if (left === 0) lines.push("Exam day. Good luck!");
  }
  if (input.cardsDue > 0) lines.push(`Today: ${plural(input.cardsDue, "card", "cards")} to review.`);
  return lines;
}

/** One message the student or Bloom wrote, as the local store keeps it. */
export interface StoredMessage {
  readonly from: "me" | "bloom";
  readonly text: string;
  /** ISO timestamp. */
  readonly at: string;
  /** On a Bloom reaction answer: the question it answered, for SEE IT DRAWN. */
  readonly ask?: string;
}

export function timeLabel(iso: string, now: number, tz: string): string {
  const ms = Date.parse(iso);
  const time = new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  if (localDate(ms, tz) === localDate(now, tz)) return `Today ${time}`;
  const day = new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });
  return `${day}, ${time}`;
}

/**
 * The Bloom thread in reading order: anything stored before today, then
 * today's nudges (derived fresh, so they always quote today's numbers), then
 * today's stored messages. The nudges are never stored, which is why a number
 * in them can never go stale.
 */
export function bloomThread(
  stored: readonly StoredMessage[],
  nudges: readonly string[],
  now: number,
  tz: string,
): ChatMessage[] {
  const today = localDate(now, tz);
  const toChat = (message: StoredMessage): ChatMessage => ({
    name: message.from === "me" ? ME : BLOOM,
    title: message.from === "me" ? "You" : BLOOM_TITLE,
    text: message.text,
    time: timeLabel(message.at, now, tz),
  });
  const before = stored.filter((message) => localDate(Date.parse(message.at), tz) !== today);
  const after = stored.filter((message) => localDate(Date.parse(message.at), tz) === today);
  const nudgeRun: ChatMessage[] = nudges.map((text, index) => ({
    name: BLOOM,
    title: BLOOM_TITLE,
    text,
    // Only the first message of a run shows its time, so one label is enough.
    time: index === 0 ? "Today" : undefined,
  }));
  // Like Messages, a time label only where the conversation paused: a message
  // within 15 minutes of the one before it carries none.
  const label = (list: readonly StoredMessage[]): ChatMessage[] =>
    list.map((message, index) => {
      const chat = toChat(message);
      const previous = list[index - 1];
      const close = previous !== undefined && Date.parse(message.at) - Date.parse(previous.at) < 15 * 60 * 1000;
      return close ? { ...chat, time: undefined } : chat;
    });
  return [...label(before), ...nudgeRun, ...label(after)];
}
