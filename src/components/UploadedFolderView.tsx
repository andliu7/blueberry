import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FolderPlus, FolderOpen, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { ButtonHoldAndRelease } from "@/components/ui/hold-and-release-button";
import { MOTIF_VIEWBOX, motifMarkup } from "@/data/testimonialArt";
import { deckCount, deckHref, type Deck } from "@/data/types";
import { reviewedCount } from "@/lib/progress";
import { postToAppsScript } from "@/lib/appsScript";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { forgetDeck, forgetShelf, rememberShelf, fileDeck } from "@/lib/useDecks";

/**
 * The Uploaded folder, which is the only one anyone can rearrange.
 *
 * The other two groups are fixed: their decks are in the repository and their
 * shape is a decision, not a preference. This one holds whatever has been
 * uploaded, so it gets sub-folders and the controls to manage them.
 *
 * Every control here is hidden unless someone is signed in, and that is a
 * courtesy rather than a defence. The bundle is static and anyone can edit it,
 * so the buttons prove nothing; the allowlist in Apps Script is what actually
 * decides, and it re-checks the token on every one of these calls.
 */
export function UploadedFolderView({
  decks,
  shelves,
  searching,
}: {
  decks: Deck[];
  shelves: string[];
  /** A search is running, so the empty states should say so. */
  searching: boolean;
}) {
  const reduce = useReducedMotion();
  const { user } = useGoogleAuth();
  const manage = Boolean(user);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newShelf, setNewShelf] = useState("");

  /**
   * Decks under their folder, then everything loose.
   *
   * Folders come from `shelves` rather than from the decks, so one you have just
   * made and not filled yet still gets a heading. A deck whose shelf is not in
   * the list falls through to loose, which matches what the store already did to
   * it and means no deck can be filed somewhere with nothing to open.
   */
  const { shelved, loose } = useMemo(() => {
    const bins = new Map<string, Deck[]>(shelves.map((s) => [s, []]));
    const rest: Deck[] = [];
    for (const deck of decks) {
      const bin = deck.shelf ? bins.get(deck.shelf) : undefined;
      if (bin) bin.push(deck);
      else rest.push(deck);
    }
    return { shelved: [...bins.entries()], loose: rest };
  }, [decks, shelves]);

  const call = async (
    key: string,
    type: "addShelf" | "deleteShelf" | "setDeckShelf" | "deleteDeck",
    payload: Record<string, unknown>,
    onDone: () => void,
  ) => {
    if (!user) return;
    setBusy(key);
    setError("");
    const body = await postToAppsScript(type, { idToken: user.idToken, ...payload });
    setBusy(null);
    if (body.ok) onDone();
    else
      setError(
        body.error === "unreachable"
          ? "Could not reach the deck endpoint."
          : (body.error ?? "The server refused that."),
      );
  };

  const renderDeck = (deck: Deck, i: number) => (
    <motion.div
      key={deck.id}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 6) * 0.06, duration: 0.4, ease: "easeOut" }}
      className="flex h-full flex-col"
    >
      <GlassCard
        href={deckHref(deck)}
        title={deck.title}
        description={deck.blurb}
        meta={`${deckCount(deck)} cards`}
        cta="Start studying"
        from={deck.from}
        to={deck.to}
        motifMarkup={motifMarkup(deck.motif)}
        motifViewBox={MOTIF_VIEWBOX}
        progress={{ reviewed: reviewedCount(deck.id), total: deckCount(deck) }}
      />

      {manage && (
        <div className="mt-2 flex items-center gap-2 px-1">
          {/* Moving a deck is a select rather than a drag. Drag and drop would
              need a keyboard path built alongside it to be usable at all, and a
              select already has one. */}
          <select
            value={deck.shelf ?? ""}
            disabled={busy === `move-${deck.id}`}
            onChange={(e) => {
              const next = e.target.value || undefined;
              void call("move-" + deck.id, "setDeckShelf", { id: deck.id, shelf: next ?? "" }, () =>
                fileDeck(deck.id, next),
              );
            }}
            className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            <option value="">No folder</option>
            {shelves.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <ButtonHoldAndRelease
            onConfirm={() =>
              void call("del-" + deck.id, "deleteDeck", { id: deck.id }, () => forgetDeck(deck.id))
            }
            holdDuration={1400}
            label="Delete"
            holdingLabel="Hold…"
            className="h-7 min-w-0 shrink-0 px-2 text-[0.7rem]"
          />
        </div>
      )}
    </motion.div>
  );

  return (
    <div>
      {manage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = newShelf.trim();
            if (!name) return;
            void call("add-shelf", "addShelf", { name }, () => {
              rememberShelf(name);
              setNewShelf("");
            });
          }}
          className="mb-8 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/60 p-3 dark:border-stone-800 dark:bg-stone-900/60"
        >
          <FolderPlus className="h-4 w-4 shrink-0 text-slate-400 dark:text-stone-500" />
          <input
            value={newShelf}
            onChange={(e) => setNewShelf(e.target.value)}
            placeholder="New folder name"
            maxLength={60}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
          />
          <button
            type="submit"
            disabled={busy === "add-shelf" || newShelf.trim() === ""}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy === "add-shelf" ? "Adding…" : "Add folder"}
          </button>
        </form>
      )}

      {error && (
        <p className="mb-6 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {shelved.map(([name, inside]) => (
        <section key={name} className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="title-face flex items-center gap-2 text-xl text-slate-900 dark:text-stone-100">
              <FolderOpen className="h-4 w-4 text-slate-400 dark:text-stone-500" />
              {name}
            </h2>
            <span className="font-mono text-xs text-slate-400 dark:text-stone-500">
              {inside.length} {inside.length === 1 ? "deck" : "decks"}
            </span>
            {manage && (
              <ButtonHoldAndRelease
                onConfirm={() =>
                  void call("del-shelf-" + name, "deleteShelf", { name }, () => forgetShelf(name))
                }
                holdDuration={1400}
                label="Delete folder"
                holdingLabel="Hold…"
                className="ml-auto h-7 min-w-0 px-2 text-[0.7rem]"
              />
            )}
          </div>

          {inside.length === 0 ? (
            // Says what will happen to it, because an empty folder plus a delete
            // button reads as a warning that the decks would go too.
            <p className="rounded-xl border border-dashed border-slate-300 px-5 py-6 text-sm text-slate-500 dark:border-stone-700 dark:text-stone-400">
              Nothing filed here yet. Use the dropdown under any deck below to move it in.
            </p>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2">{inside.map(renderDeck)}</div>
          )}
        </section>
      ))}

      {(loose.length > 0 || shelved.length === 0) && (
        <section>
          {shelved.length > 0 && (
            <h2 className="title-face mb-4 text-xl text-slate-900 dark:text-stone-100">
              Not in a folder
            </h2>
          )}
          {loose.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-stone-700 dark:text-stone-400">
              {searching
                ? "No decks in this folder match that search."
                : "Nothing here yet. Decks published from a .txt file land in this folder."}
            </p>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2">{loose.map(renderDeck)}</div>
          )}
        </section>
      )}

      {!manage && (
        <p className="mt-8 text-xs text-slate-400 dark:text-stone-500">
          Sign in from the ticket below to add, move or remove decks here.
        </p>
      )}
    </div>
  );
}

export default UploadedFolderView;
