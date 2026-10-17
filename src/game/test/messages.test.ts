import { describe, expect, it } from "vitest";
import {
  BLOOM,
  ME,
  bloomNudges,
  bloomReply,
  bloomThread,
  hourLabel,
  reminderLines,
  timeLabel,
  type NudgeInput,
} from "../tabs/messages/messagesModel";
import { createLocalMessages, type MessageTransport } from "../tabs/messages/messageStore";

const base: NudgeInput = {
  name: "Sam",
  streak: 3,
  todayCounted: false,
  cardsDue: 4,
  nextLesson: "Nucleophilic addition",
  hasCourse: true,
};

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("Bloom's nudges quote the real state", () => {
  it("names the streak, the cards due and the next lesson", () => {
    const lines = bloomNudges(base);
    expect(lines[0]).toContain("Sam");
    expect(lines).toContain("Your streak is at 3 days. One lesson today keeps it going.");
    expect(lines).toContain("4 cards are due for review today.");
    expect(lines).toContain("Next up on your path: Nucleophilic addition.");
  });

  it("says so plainly when there is nothing to quote", () => {
    const lines = bloomNudges({ ...base, name: null, streak: 0, cardsDue: 0, hasCourse: false, nextLesson: null });
    expect(lines).toContain("No streak yet. One lesson starts it.");
    expect(lines).toContain("No cards are due for review today.");
    expect(lines.at(-1)).toMatch(/Pick a course/);
  });

  it("answers with the same brain as Ask Blueberry, so one question gets one answer", async () => {
    const { answer, answerText } = await import("../tabs/chat/askModel");
    const ask = { ...base, xpToday: 0 };
    const pcc = bloomReply("what is PCC for?", ask);
    expect(pcc.text).toBe(answerText(answer("what is PCC for?", ask)));
    expect(pcc.text).not.toMatch(/can't read/);
    expect(pcc.ask).toBe("what is PCC for?");
    const next = bloomReply("What should I study next?", ask);
    expect(next.text).toContain("Nucleophilic addition");
    expect(next.ask).toBeUndefined();
  });

  it("puts today's nudges after older history and before today's messages", () => {
    const now = Date.parse("2026-10-16T15:00:00Z");
    const thread = bloomThread(
      [
        { from: "me", text: "old", at: "2026-10-14T12:00:00Z" },
        { from: "me", text: "new", at: "2026-10-16T14:00:00Z" },
      ],
      ["hello", "streak"],
      now,
      "UTC",
    );
    expect(thread.map((m) => m.text)).toEqual(["old", "hello", "streak", "new"]);
    expect(thread[0]!.name).toBe(ME);
    expect(thread[1]!.name).toBe(BLOOM);
  });
});

describe("message times follow the zone they are given", () => {
  it("labels 14:15 UTC as 10:15 AM in New York", () => {
    const now = Date.parse("2026-10-16T14:15:00Z");
    expect(timeLabel("2026-10-16T14:15:00Z", now, "America/New_York")).toBe("Today 10:15 AM");
  });

  it("keeps a 9 PM New York message on its own day", () => {
    const now = Date.parse("2026-10-17T01:30:00Z");
    const thread = bloomThread([{ from: "me", text: "late", at: "2026-10-17T01:00:00Z" }], ["hello"], now, "America/New_York");
    expect(thread.map((m) => m.text)).toEqual(["hello", "late"]);
    expect(thread[1]!.time).toBe("Today 9:00 PM");
  });
});

describe("the reminders thread", () => {
  it("states the reminder hour and the exam countdown", () => {
    const lines = reminderLines({ hour: 19, examDate: "2026-10-20", today: "2026-10-16", cardsDue: 0 });
    expect(lines[0]).toBe("Your daily study reminder is set for 7 PM.");
    expect(lines).toContain("Exam in 4 days.");
    expect(lines.some((line) => /not switched on yet/.test(line))).toBe(true);
  });

  it("formats midnight and noon", () => {
    expect(hourLabel(0)).toBe("12 AM");
    expect(hourLabel(12)).toBe("12 PM");
  });
});

describe("the local message store", () => {
  it("keeps what the student typed across a reload of the store", () => {
    const storage = memoryStorage();
    const first = createLocalMessages(storage);
    first.append({ from: "me", text: "hi Bloom", at: "2026-10-16T10:00:00Z" });
    const second = createLocalMessages(storage);
    expect(second.getSnapshot().map((m) => m.text)).toEqual(["hi Bloom"]);
  });

  it("hands only the student's own messages to the delivery seam", () => {
    const sent: string[] = [];
    const transport: MessageTransport = { deliver: async (m) => void sent.push(m.text) };
    const store = createLocalMessages(memoryStorage(), transport);
    store.append({ from: "me", text: "mine", at: "2026-10-16T10:00:00Z" });
    store.append({ from: "bloom", text: "reply", at: "2026-10-16T10:00:01Z" });
    expect(sent).toEqual(["mine"]);
  });

  it("survives storage that throws", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } } as unknown as Storage;
    const store = createLocalMessages(broken);
    store.append({ from: "me", text: "still here", at: "2026-10-16T10:00:00Z" });
    expect(store.getSnapshot()).toHaveLength(1);
  });
});
