import { useMemo, useState } from "react";
import { useDecks } from "@/lib/useDecks";
import { DECK_GROUPS, deckCount, type DeckGroupId } from "@/data/types";
import { DeckSearch } from "@/components/ui/deck-search";
import { PageHeader } from "@/components/ui/page-header";
import { SITE_CONTAINER } from "@/components/ui/site-nav";
import { DeckUploadTicket } from "@/components/DeckUploadTicket";
import { UploadedFolderView } from "@/components/UploadedFolderView";
import { FeedbackButton } from "@/components/FeedbackButton";
import { DeckTile } from "@/components/review/DeckTile";
import { matchedDeckIds, searchDecks } from "@/lib/searchDecks";
import { cardsWord } from "@/lib/reviewProgress";
import "@/components/review/review.css";

/**
 * One folder's decks on their own page, at `#/folder/<id>` (SITE-REPLAN.md phase 7).
 *
 * The tiles of one folder, the same tiles Review shows, with the link up to Review above
 * the title. Every tile sinks on press. The folder's own address is kept, so a shared
 * link to a folder still opens it.
 */
export function FolderPage({ groupId }: { groupId: DeckGroupId }) {
  // Same shape as Review: the page owns the query and runs the search, so the box is
  // only a box. See `DeckSearch` for why it stopped doing this itself.
  const [query, setQuery] = useState("");

  const group = DECK_GROUPS.find((g) => g.id === groupId);
  const { decks: allDecks, shelves } = useDecks();
  const all = useMemo(() => allDecks.filter((d) => (d.group ?? "lab") === groupId), [allDecks, groupId]);
  const hits = useMemo(() => searchDecks(all, query), [all, query]);
  const matched = useMemo(() => (query.trim().length >= 2 ? matchedDeckIds(hits) : null), [query, hits]);
  const decks = matched ? all.filter((d) => matched.has(d.id)) : all;

  if (!group) return null;
  const cards = all.reduce((n, d) => n + deckCount(d), 0);

  return (
    <main className="min-h-screen pb-8">
      <div className={SITE_CONTAINER}>
        <PageHeader
          back={{ href: "#/study-decks", label: "Review" }}
          title={group.title}
          subtitle={
            <>
              <p>{group.blurb}</p>
              <p className="mt-1 text-sm">
                {all.length} {all.length === 1 ? "deck" : "decks"} · {cardsWord(cards)}
              </p>
            </>
          }
        />

        <DeckSearch value={query} onChange={setQuery} hits={hits} />

        {/* Uploaded is the one folder anyone can rearrange, so it draws itself:
            sub-folders, and the controls to manage them when signed in. */}
        {groupId === "uploaded" ? (
          <UploadedFolderView decks={decks} shelves={shelves} searching={Boolean(matched)} />
        ) : (
          <div className="rv-grid mt-6">
            {decks.map((d) => (
              <DeckTile key={d.id} deck={d} />
            ))}
          </div>
        )}

        <DeckUploadTicket />
        <FeedbackButton />
      </div>
    </main>
  );
}

export default FolderPage;
