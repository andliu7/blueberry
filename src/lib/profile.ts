import { useSyncExternalStore } from "react";

/**
 * Who you are on the site, as distinct from who Google says you are.
 *
 * Google settles *identity*: it proves an email belongs to whoever is holding
 * the browser. It does not know you are an undergraduate, and the name it hands
 * over is one string that may or may not split the way you would split it. So
 * that part is asked for here and kept here.
 *
 * Held in localStorage for the same reason ratings and notes are: there is no
 * account server yet. When there is one, this is the shape that gets sent to
 * it, and the key is versioned so a change of shape can be migrated rather than
 * silently misread.
 */

const KEY = "blueberry_profile_v1";

export const STUDENT_LEVELS = [
  { id: "high-school", label: "High school" },
  { id: "undergraduate", label: "Undergraduate" },
  { id: "graduate", label: "Graduate" },
  { id: "postgraduate", label: "Postgraduate" },
  { id: "other", label: "Other" },
] as const;

export type StudentLevel = (typeof STUDENT_LEVELS)[number]["id"];

export interface Profile {
  firstName: string;
  lastName: string;
  /** A display handle. Not a login: nothing authenticates against this. */
  username: string;
  level: StudentLevel | "";
}

export const EMPTY_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  username: "",
  level: "",
};

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      firstName: typeof parsed.firstName === "string" ? parsed.firstName : "",
      lastName: typeof parsed.lastName === "string" ? parsed.lastName : "",
      username: typeof parsed.username === "string" ? parsed.username : "",
      level: STUDENT_LEVELS.some((l) => l.id === parsed.level)
        ? (parsed.level as StudentLevel)
        : "",
    };
  } catch {
    // A corrupt or unreadable entry is not worth taking the page down for.
    return EMPTY_PROFILE;
  }
}

/**
 * A stable snapshot, swapped wholesale on change.
 *
 * `useSyncExternalStore` compares by identity, so handing back a freshly parsed
 * object each call would re-render forever.
 */
let current: Profile = typeof localStorage === "undefined" ? EMPTY_PROFILE : read();
const listeners = new Set<() => void>();

export const profileStore = {
  get: () => current,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  save(next: Profile) {
    current = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Private browsing and a full quota both land here. The value is still
      // live in memory for this sitting, which is better than throwing.
    }
    for (const listener of listeners) listener();
  },
};

export function useProfile(): Profile {
  return useSyncExternalStore(profileStore.subscribe, profileStore.get, () => EMPTY_PROFILE);
}

/** Whether there is enough here to call it filled in. */
export function profileComplete(profile: Profile) {
  return Boolean(profile.firstName.trim() && profile.lastName.trim() && profile.level);
}
