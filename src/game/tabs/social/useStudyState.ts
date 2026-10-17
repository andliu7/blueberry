/**
 * Everything the social tabs say about the student, read from the real local
 * stores: streak, XP, cards due and the next lesson on the path. Messages,
 * Ask Blueberry and the Feed all speak from this one hook so they can never
 * disagree about where the student is.
 */

import { useMemo } from "react";
import { localDate } from "@blueberry/economy";
import { useProgress } from "../../app/hooks";
import { decks } from "../../cards/store";
import { useDeckSnapshot } from "../../cards/ui/useDeck";
import { dueTodayCount } from "../../cards/scheduler";
import { isSuspended } from "../../cards/types";
import { PATHWAY_UNITS, pathwayNode } from "../../demo/pathwayMap";
import { deriveMapPathway } from "../pathway/pathwayState";
import { deviceZone, reminderSettings, type NudgeInput } from "../messages/messagesModel";

export function useStudyState() {
  const snapshot = useProgress();
  const deckSnapshot = useDeckSnapshot(decks);
  const now = Date.now();
  // useMemo: only re-derive the path when the journal changes, not per keystroke.
  const nextLesson = useMemo(() => {
    if (snapshot.course !== "orgo_2") return null;
    const id = deriveMapPathway(PATHWAY_UNITS, snapshot.journal).currentNodeId;
    return id === null ? null : (pathwayNode(id)?.title ?? null);
  }, [snapshot.course, snapshot.journal]);
  const cardsDue = useMemo(
    () => dueTodayCount(Object.values(deckSnapshot.review).filter((state) => !isSuspended(state)), new Date()),
    [deckSnapshot.review],
  );
  const input: NudgeInput = {
    name: snapshot.displayName,
    streak: snapshot.economy.streak.current,
    todayCounted: snapshot.economy.streak.todayCounted,
    cardsDue,
    nextLesson,
    hasCourse: snapshot.course !== null,
  };
  // Message times use the device's zone, as a phone does. The economy's zone
  // is "UTC" until the journal has an event, which put a fresh student's
  // messages four hours off in New York. The exam countdown keeps the economy's
  // zone so it agrees with the Me tab to the day.
  const tz = deviceZone();
  const reminders = reminderSettings(snapshot.journal);
  return {
    input,
    tz,
    now,
    today: localDate(now, snapshot.economy.tz),
    reminders,
    xpTotal: snapshot.economy.xp.total,
    xpToday: snapshot.economy.xp.today,
    goalXp: snapshot.economy.xp.goalXp,
  };
}
