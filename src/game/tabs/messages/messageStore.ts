/**
 * The Bloom thread's history, kept on this device only.
 *
 * Same store shape as the deck and progress stores (getSnapshot + subscribe),
 * so the tab reads it with useSyncExternalStore and cannot tear. Storage is
 * wrapped in try/catch everywhere: a private window or blocked storage still
 * gets a working thread for the session, it just does not survive a reload.
 */

import type { StoredMessage } from "./messagesModel";

const STORAGE_KEY = "blueberry.messages.v1";
/** A local log, not an archive: the oldest fall off past this. */
const MAX_KEPT = 200;

export interface MessageSource {
  getSnapshot(): readonly StoredMessage[];
  subscribe(listener: () => void): () => void;
  append(message: StoredMessage): void;
  reset(): void;
}

/**
 * THE DELIVERY SEAM. This is the one place real delivery plugs in later.
 *
 * Today `localOnly` delivers nothing: a message lives in this browser and
 * nowhere else. When texts or push notifications are switched on, replace it
 * with a transport that calls a Supabase Edge Function (supabase.functions
 * .invoke), and let THAT function talk to Twilio (SMS) or post to an ntfy topic
 * (push). The phone number, the Twilio credentials and the ntfy topic live in
 * the Edge Function's secrets, never in a VITE_ variable and never in this
 * repo, because anything in the client ships in the public bundle.
 */
export interface MessageTransport {
  deliver(message: StoredMessage): Promise<void>;
}

export const localOnly: MessageTransport = {
  deliver: async () => {
    /* nothing leaves the device yet; see the note above */
  },
};

function isStored(value: unknown): value is StoredMessage {
  if (typeof value !== "object" || value === null) return false;
  const x = value as Record<string, unknown>;
  return (
    (x.from === "me" || x.from === "bloom") &&
    typeof x.text === "string" &&
    typeof x.at === "string" &&
    (x.ask === undefined || typeof x.ask === "string")
  );
}

function load(storage: Storage | null): readonly StoredMessage[] {
  if (storage === null) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isStored) : [];
  } catch {
    return [];
  }
}

function defaultStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalMessages(
  storage: Storage | null = defaultStorage(),
  transport: MessageTransport = localOnly,
): MessageSource {
  let messages = load(storage);
  const listeners = new Set<() => void>();

  function commit(next: readonly StoredMessage[]): void {
    messages = next;
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep the session copy */
    }
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => messages,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    append(message) {
      commit([...messages, message].slice(-MAX_KEPT));
      // Only what the student wrote goes to the transport; Bloom's replies are
      // local copy. Fire and forget: the local log is the source of truth.
      if (message.from === "me") void transport.deliver(message).catch(() => undefined);
    },
    reset() {
      commit([]);
    },
  };
}

export const messages: MessageSource = createLocalMessages();
