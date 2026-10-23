/**
 * Reaction search: the lookup a student actually performs the night before an
 * exam, by reagent, reactant class, product class or name, for a reaction
 * whose name they do not know.
 *
 * The search function is the curriculum package's own (searchReactions), so
 * the matching rules that the reaction database check verifies are the rules
 * a student gets. This tab only renders matches and says which axis matched,
 * because "this came up because you typed PCC" teaches more than a bare row.
 *
 * The query lives in the URL (#/search/PCC) so a search can be shared and so
 * the back button works. Typing updates the hash with replaceState rather
 * than pushState, or every keystroke would be a history entry.
 *
 * LOOK (X7, 2026-10-16): a chunky field, Bloom coaching in a speech bubble
 * when there is nothing to show, tap-to-try chips coloured by search axis,
 * and outlined result cards whose tags reuse those same axis colours.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { searchKey, searchReactions, topicDefinition, type MatchAxis, type Reaction } from "@blueberry/curriculum";
import { hrefForTab } from "../../app/routes";
import { pressClassName } from "../../app/ui/Press";
import { BloomAvatar } from "../social/BloomAvatar";
import { SEARCH_SUGGESTIONS } from "./searchSuggestions";
import "./search.css";
import { plural } from "@/lib/helpers";

const AXIS_LABEL: Record<MatchAxis, string> = {
  name: "Name",
  reagent: "Reagent",
  class: "Class",
};

/** The shape-built magnifier, same stroke weight as the tab icons. */
function MagnifierIcon() {
  return (
    <svg className="sr-field__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="3" />
      <path d="M15.5 15.5 20 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SuggestionChips({ onPick }: { readonly onPick: (query: string) => void }) {
  return (
    <div className="sr-groups">
      {SEARCH_SUGGESTIONS.map((group) => (
        <section key={group.axis}>
          <h2 className="sr-group__title">{group.title}</h2>
          <div className="sr-chips">
            {group.queries.map((query) => (
              <button key={query} type="button" className={`sr-chip sr-chip--${group.axis}`} onClick={() => onPick(query)}>
                {query}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ReactionCard({
  reaction,
  matchedOn,
  queryKey,
}: {
  readonly reaction: Reaction;
  readonly matchedOn: readonly MatchAxis[];
  readonly queryKey: string;
}) {
  const topic = topicDefinition(reaction.topic);
  return (
    <article className="sr-card">
      <div className="sr-tags" aria-label="Matched by">
        {matchedOn.map((axis) => (
          <span key={axis} className={`sr-tag sr-tag--${axis}`}>
            {AXIS_LABEL[axis]}
          </span>
        ))}
      </div>
      <h3 className="sr-card__name">{reaction.name}</h3>
      <p className="sr-card__what">{reaction.transformation}</p>
      <dl className="sr-facts">
        <div className="sr-fact">
          <dt>Reagents</dt>
          <dd>
            {reaction.reagents.map((slot, index) => (
              <span key={index} className="sr-token">
                <span className="sr-token__role">{slot.role}:</span>
                {slot.anyOf.map((token, at) => (
                  <span key={token}>
                    {at > 0 ? " / " : ""}
                    {/* The token the student typed is lit, so they see WHY it matched. */}
                    <span className={searchKey(token) === queryKey ? "sr-hit" : undefined}>{token}</span>
                  </span>
                ))}
              </span>
            ))}
          </dd>
        </div>
        {reaction.conditions.length > 0 ? (
          <div className="sr-fact">
            <dt>Conditions</dt>
            <dd>{reaction.conditions.map((condition) => condition.value).join(", ")}</dd>
          </div>
        ) : null}
        {reaction.aliases.length > 0 ? (
          <div className="sr-fact">
            <dt>Also called</dt>
            <dd>{reaction.aliases.join(", ")}</dd>
          </div>
        ) : null}
      </dl>
      {reaction.note !== undefined ? <p className="sr-note">{reaction.note}</p> : null}
      <div className="sr-card__foot">
        <a href={hrefForTab("courses", reaction.course, reaction.topic)} className={pressClassName({ variant: "secondary", size: "sm" })}>
          Practice {topic.label}
        </a>
      </div>
    </article>
  );
}

export default function SearchTab({ query: initial }: { readonly query: string }) {
  const [query, setQuery] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => searchReactions(query), [query]);
  const queryKey = searchKey(query);

  // The tab stays mounted when only the hash changes (a shared #/app/search/PCC
  // link opened while search is already on screen), so follow the prop.
  useEffect(() => {
    setQuery(initial);
  }, [initial]);

  const run = (next: string) => {
    setQuery(next);
    history.replaceState(null, "", hrefForTab("search", next));
  };

  const pick = (next: string) => {
    run(next);
    window.scrollTo({ top: 0 });
  };

  const clear = () => {
    run("");
    inputRef.current?.focus();
  };

  return (
    <div className="sr">
      <div className="sr-field">
        <MagnifierIcon />
        <input
          ref={inputRef}
          type="search"
          value={query}
          autoFocus
          onChange={(event) => run(event.currentTarget.value)}
          placeholder="PCC, ketone, Grignard..."
          aria-label="Search reactions by reagent, class or name"
          className="sr-input"
          enterKeyHint="search"
        />
        {query !== "" ? (
          <button type="button" className="sr-clear" aria-label="Clear search" onClick={clear}>
            <ClearIcon />
          </button>
        ) : null}
      </div>

      {query.trim() === "" ? (
        <>
          <div className="sr-coach">
            <BloomAvatar size="lg" />
            <p className="sr-bubble">
              Forgot a reaction's name? Type what you do know.
              <span className="sr-bubble__sub">A reagent from the board, what you start with, or what you need.</span>
            </p>
          </div>
          <SuggestionChips onPick={pick} />
        </>
      ) : matches.length === 0 ? (
        <>
          <div className="sr-coach" role="status">
            <BloomAvatar size="lg" />
            <p className="sr-bubble">
              Nothing for &ldquo;{query.trim()}&rdquo; yet.
              <span className="sr-bubble__sub">Try a reagent formula like NaBH4, or a class like ketone.</span>
            </p>
          </div>
          <SuggestionChips onPick={pick} />
        </>
      ) : (
        <>
          <p className="sr-count" role="status">
            {plural(matches.length, "reaction", "reactions")}
          </p>
          <ul className="sr-list">
            {matches.map((match) => (
              <li key={match.reaction.id}>
                <ReactionCard reaction={match.reaction} matchedOn={match.matchedOn} queryKey={queryKey} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
