/**
 * The mistake bank: every question a student missed in a lesson, kept so it
 * can be offered back as practice.
 *
 * Owner, 29 Oct: "Mistakes are not being saved. After every lesson, evaluate
 * the mistakes, save them, and offer them back as practice."
 *
 * Same contract as app/progress.ts and cards/store.ts, in the same words:
 * localStorage is a RENDERING CACHE and an offline draft, never an
 * entitlement and never the record of record. Phase 6 syncs it behind this
 * same interface. It is an external store (subscribe plus getSnapshot) and a
 * snapshot is REPLACED on every write, never mutated, so useSyncExternalStore
 * sees the change. Capped so a semester cannot grow an unbounded blob.
 *
 * WHAT IS KEPT: one row per question, not per miss. Missing the same question
 * again bumps `misses` and reopens it; answering it right in practice closes
 * it (`fixedAt`) but keeps the row, so the why the student gave survives.
 */

export type MistakeKind = "mcq" | "draw";

/** The four honest reasons, in the order the practice screen offers them. */
export const WHY_OPTIONS = [
  { id: "mixed-up", label: "I mixed up two ideas" },
  { id: "dont-know", label: "I did not know this yet" },
  { id: "rushed", label: "I rushed or slipped" },
  { id: "guessed", label: "I guessed" },
] as const;

export type WhyId = (typeof WHY_OPTIONS)[number]["id"];

export function whyLabel(id: WhyId): string {
  return WHY_OPTIONS.find((option) => option.id === id)?.label ?? "";
}

export interface BankedMistake {
  /** `${kind}:${id}`, the row's identity. */
  readonly key: string;
  readonly id: string;
  readonly kind: MistakeKind;
  /** The pathway node the question belongs to. */
  readonly node: string;
  /** ISO 8601, the latest miss. */
  readonly at: string;
  readonly misses: number;
  /** The student's own reason, from the last practice miss. Null until given. */
  readonly why: WhyId | null;
  /** ISO 8601 when practice got it right, or null while it is open. */
  readonly fixedAt: string | null;
}

export interface MistakeSnapshot {
  readonly entries: readonly BankedMistake[];
}

export interface MissedQuestion {
  readonly id: string;
  readonly kind: MistakeKind;
  readonly node: string;
}

export interface MistakeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const MISTAKE_KEY = "blueberry.mistakes.bank.v1";
export const MISTAKE_CAP = 200;

export const keyFor = (kind: MistakeKind, id: string): string => `${kind}:${id}`;

export function openMistakes(snapshot: MistakeSnapshot): readonly BankedMistake[] {
  return snapshot.entries.filter((entry) => entry.fixedAt === null);
}

/** Pure: fold a lesson's misses into the entries. Newest miss goes last. */
export function withMisses(entries: readonly BankedMistake[], missed: readonly MissedQuestion[], at: string, cap = MISTAKE_CAP): readonly BankedMistake[] {
  let next = [...entries];
  for (const question of missed) {
    const key = keyFor(question.kind, question.id);
    const found = next.find((entry) => entry.key === key);
    const row: BankedMistake = {
      key,
      id: question.id,
      kind: question.kind,
      node: question.node,
      at,
      misses: (found?.misses ?? 0) + 1,
      why: found?.why ?? null,
      fixedAt: null,
    };
    next = [...next.filter((entry) => entry.key !== key), row];
  }
  return next.slice(-cap);
}

function parse(raw: string | null): readonly BankedMistake[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (row): row is BankedMistake =>
        typeof row === "object" && row !== null && typeof (row as BankedMistake).key === "string" && typeof (row as BankedMistake).id === "string" && typeof (row as BankedMistake).node === "string",
    );
  } catch {
    return [];
  }
}

export interface MistakeBank {
  getSnapshot(): MistakeSnapshot;
  subscribe(listener: () => void): () => void;
  /** After a lesson: save what it missed. Safe to call with nothing. */
  record(missed: readonly MissedQuestion[]): void;
  setWhy(key: string, why: WhyId): void;
  markFixed(key: string): void;
  clear(): void;
}

export function createMistakeBank(storage: MistakeStorage | null, now: () => string = () => new Date().toISOString()): MistakeBank {
  let snapshot: MistakeSnapshot = { entries: storage === null ? [] : safeRead(storage) };
  const listeners = new Set<() => void>();

  function safeRead(store: MistakeStorage): readonly BankedMistake[] {
    try {
      return parse(store.getItem(MISTAKE_KEY));
    } catch {
      return [];
    }
  }
  function commit(entries: readonly BankedMistake[]): void {
    snapshot = { entries };
    try {
      storage?.setItem(MISTAKE_KEY, JSON.stringify(entries));
    } catch {
      // Storage can be full or blocked; the bank is never load-bearing.
    }
    listeners.forEach((listener) => listener());
  }
  const patch = (key: string, change: Partial<BankedMistake>) => {
    if (!snapshot.entries.some((entry) => entry.key === key)) return;
    commit(snapshot.entries.map((entry) => (entry.key === key ? { ...entry, ...change } : entry)));
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    record(missed) {
      if (missed.length === 0) return;
      commit(withMisses(snapshot.entries, missed, now()));
    },
    setWhy: (key, why) => patch(key, { why }),
    markFixed: (key) => patch(key, { fixedAt: now() }),
    clear: () => commit([]),
  };
}

function browserStore(): MistakeStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** The one bank the app reads and writes. */
export const mistakeBank: MistakeBank = createMistakeBank(browserStore());
