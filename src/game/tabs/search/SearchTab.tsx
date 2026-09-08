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
 */

import { useMemo, useState } from "react";
import { searchReactions, topicDefinition, type MatchAxis, type Reaction } from "@blueberry/curriculum";
import { Card, Pill } from "../../app/ui/Card";
import { hrefForTab } from "../../app/routes";

const AXIS_LABEL: Record<MatchAxis, string> = {
  name: "by name",
  reagent: "by reagent",
  class: "by substrate or product class",
};

function ReactionRow({ reaction, matchedOn }: { readonly reaction: Reaction; readonly matchedOn: readonly MatchAxis[] }) {
  const topic = topicDefinition(reaction.topic);
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-scale-base font-semibold">{reaction.name}</h3>
        <div className="flex gap-1">
          {matchedOn.map((axis) => (
            <Pill key={axis} tone="primary">
              {AXIS_LABEL[axis]}
            </Pill>
          ))}
        </div>
      </div>
      <p className="text-scale-sm text-bb-foreground">{reaction.transformation}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-scale-xs text-bb-muted-foreground">
        <dt className="font-semibold">Reagents</dt>
        <dd>{reaction.reagents.map((slot) => `${slot.role}: ${slot.anyOf.join(" / ")}`).join("; ")}</dd>
        {reaction.conditions.length > 0 ? (
          <>
            <dt className="font-semibold">Conditions</dt>
            <dd>{reaction.conditions.map((condition) => condition.value).join(", ")}</dd>
          </>
        ) : null}
        <dt className="font-semibold">Topic</dt>
        <dd>
          <a href={hrefForTab("courses", reaction.course, reaction.topic)} className="font-semibold text-bb-primary underline">
            {topic.label}
          </a>
        </dd>
        {reaction.aliases.length > 0 ? (
          <>
            <dt className="font-semibold">Also called</dt>
            <dd>{reaction.aliases.join(", ")}</dd>
          </>
        ) : null}
      </dl>
      {reaction.note !== undefined ? <p className="text-scale-xs text-bb-muted-foreground">{reaction.note}</p> : null}
    </Card>
  );
}

export default function SearchTab({ query: initial }: { readonly query: string }) {
  const [query, setQuery] = useState(initial);
  const matches = useMemo(() => searchReactions(query), [query]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <label className="flex flex-col gap-1">
        <span className="text-scale-sm font-semibold text-bb-muted-foreground">Reagent, reactant, product, or name</span>
        <input
          value={query}
          autoFocus
          onChange={(event) => {
            const next = event.currentTarget.value;
            setQuery(next);
            history.replaceState(null, "", hrefForTab("search", next));
          }}
          placeholder="e.g. PCC, NaBH4, alkyl halide, Grignard"
          aria-label="Search reactions"
          className="min-h-12 rounded-xl border border-bb-input bg-bb-card px-4 text-scale-base"
        />
      </label>

      {query.trim() === "" ? (
        <p className="text-scale-sm text-bb-muted-foreground">
          Type what you know. A reagent you saw on the board, the class of thing you start with,
          the class of thing you need. The name is what you get back.
        </p>
      ) : matches.length === 0 ? (
        <p className="text-scale-sm text-bb-muted-foreground">Nothing matched &quot;{query}&quot;. Try a reagent formula or a class like &quot;ketone&quot;.</p>
      ) : (
        <>
          <p className="text-scale-xs text-bb-muted-foreground">
            {matches.length} reaction{matches.length === 1 ? "" : "s"}
          </p>
          <ul className="flex flex-col gap-3">
            {matches.map((match) => (
              <li key={match.reaction.id}>
                <ReactionRow reaction={match.reaction} matchedOn={match.matchedOn} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
