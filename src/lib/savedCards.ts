/**
 * Cards a student made themselves, kept on their own machine.
 *
 * Deliberately localStorage and not the Sheet. A saved card is one person's
 * working, it is worth nothing to anybody else, and posting every attempt to a
 * shared spreadsheet would turn a private practice log into a public one. When
 * per-student accounts exist this can sync; until then, staying local is the
 * more honest default rather than a limitation.
 */

const KEY = "blueberry_saved_cards_v1";

export interface SavedCard {
  id: string;
  /** The reaction it came from, so the card can link back. */
  reactionId: string;
  front: string;
  back: string;
  /** The student's own drawing, as a molfile so coordinates survive. */
  molfile?: string;
  /** Canonical SMILES of what they drew, for comparison later. */
  smiles?: string;
  correct: boolean;
  at: string;
}

export function loadSavedCards(): SavedCard[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedCard[]) : [];
  } catch {
    // A corrupt value should cost the saved cards, not the page.
    return [];
  }
}

export function saveCard(card: Omit<SavedCard, "id" | "at">): SavedCard[] {
  const entry: SavedCard = {
    ...card,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
  };
  const all = [...loadSavedCards(), entry];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Quota, or storage disabled. The card is lost; the page carries on.
  }
  return all;
}

export function removeCard(id: string): SavedCard[] {
  const all = loadSavedCards().filter((c) => c.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* as above */
  }
  return all;
}
