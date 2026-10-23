/**
 * The glossary page, at #/app/glossary (owner items 14 and 27).
 *
 * One search box, a row of section chips (Shorthands, Names, pKa, Reactions)
 * and a functional group picker over one list of entries. Everything on it
 * comes from glossaryModel.ts; this file only lays it out.
 *
 * Lazy (App.tsx), so its data never lands in the #/app first load.
 *
 * React patterns used here, one line each:
 *   - useSyncExternalStore reads the pKa settings store, so the numbers shown
 *     are the student's own table and update if they change it elsewhere;
 *   - useMemo keeps the entry list and the filtered list from being rebuilt on
 *     every keystroke unless what they depend on changed;
 *   - useDeferredValue lets the search box stay responsive while a long list
 *     re-renders behind it.
 */
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { hrefForGlossary, hrefForTab } from "../app/routes";
import { navigate } from "../app/useHashRoute";
import { GuideMol } from "../guide/GuideMol";
import type { GuideFigure } from "../guide/types";
import { formatPka, pkaSettings } from "../settings/pka";
import {
  FAMILY_LABELS,
  SECTION_LABELS,
  filterEntries,
  glossaryEntries,
  sectionCounts,
  type GlossaryEntry,
  type GlossarySection,
  type ReactionEntry,
} from "./glossaryModel";
import { GLOSSARY_DATA } from "./glossary.generated";
import type { FamilyId } from "./types";
import "./glossary.css";

const SECTIONS: readonly GlossarySection[] = ["shorthands", "names", "pka", "reactions", "mine"];

/** How a pKa number's source reads to a student. */
const PKA_SOURCE_WORDS = {
  course_ladder: "Course pKa sheet",
  reagent_reference: "Reagent reference",
  standard_reference: "Textbook value",
} as const;

function Mol({ figure, label }: { readonly figure: GuideFigure; readonly label: string }) {
  // --w is the drawing's own width in units; glossary.css turns it into px.
  return (
    <figure className="gl-mol" style={{ ["--w" as string]: figure.w }} role="img" aria-label={label}>
      <GuideMol figure={figure} />
    </figure>
  );
}

/** The award badge a student's own definition will carry. Drawn, not an emoji. */
function AwardBadge() {
  return (
    <span className="gl-award" title="Your own definition">
      <svg viewBox="0 0 24 24" aria-hidden focusable="false">
        <circle cx="12" cy="9" r="6" fill="currentColor" />
        <path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5" fill="currentColor" />
      </svg>
      Yours
    </span>
  );
}

function FamilyTags({ families }: { readonly families: readonly FamilyId[] }) {
  if (families.length === 0) return null;
  return (
    <ul className="gl-tags" aria-label="Functional groups">
      {families.map((family) => (
        <li key={family} className="gl-tag">
          {FAMILY_LABELS[family]}
        </li>
      ))}
    </ul>
  );
}

function ReactionCard({ entry }: { readonly entry: ReactionEntry }) {
  return (
    <>
      <h3 className="gl-card__title">{entry.title}</h3>
      {entry.from !== "" ? (
        <p className="gl-card__route">
          {entry.from} <span aria-label="becomes">→</span> {entry.to}
        </p>
      ) : null}
      {entry.reagents !== "" ? <p className="gl-card__text">{entry.reagents}</p> : null}
      <p className="gl-card__source">{entry.source === "curriculum" ? "In Blueberry's lessons" : "From the reagent reference"}</p>
    </>
  );
}

/** One entry, drawn the same on this page and in the Cards tab's peek sheet (GlossaryPeek.tsx). */
export function EntryCard({ entry, focused }: { readonly entry: GlossaryEntry; readonly focused: boolean }) {
  const className = `gl-card${focused ? " gl-card--focus" : ""}`;
  switch (entry.kind) {
    case "shorthand": {
      const { shorthand, usedIn } = entry;
      const shown = usedIn.slice(0, 3);
      return (
        <article id={`gl-${entry.id}`} className={`${className} gl-card--art`}>
          <Mol figure={shorthand.figure} label={`Structure of ${shorthand.full}`} />
          <div className="gl-card__body">
            <h3 className="gl-card__title">
              {shorthand.short}
              <span className="gl-card__kind">{shorthand.kind}</span>
            </h3>
            <p className="gl-card__full">{shorthand.full}</p>
            <p className="gl-card__text">{shorthand.use}</p>
            {shown.length > 0 ? (
              <p className="gl-card__source">
                Used in: {shown.join(", ")}
                {usedIn.length > shown.length ? ` and ${usedIn.length - shown.length} more` : ""}
              </p>
            ) : null}
          </div>
        </article>
      );
    }
    case "compound":
      return (
        <article id={`gl-${entry.id}`} className={`${className} gl-card--stack`}>
          <Mol figure={entry.compound.figure} label={`Structure of ${entry.compound.name}`} />
          <div className="gl-card__body">
            <h3 className="gl-card__title gl-card__title--name">{entry.compound.name}</h3>
            <dl className="gl-parts">
              {entry.parts.map((part) => (
                <div key={part.text} className="gl-part">
                  <dt>{part.text}</dt>
                  <dd>{part.means}</dd>
                </div>
              ))}
            </dl>
            {entry.compound.ring !== undefined ? (
              <p className="gl-card__ring">
                On a ring: {entry.compound.ring.group} is an{" "}
                {entry.compound.ring.effect.endsWith(", activating") ? "EDG" : "EWG"}, {entry.compound.ring.effect}.{" "}
                {/* A hash route, not a bare #id: the app routes on the hash. */}
                <a href={hrefForGlossary("rule-ewg-edg")}>Why</a>
              </p>
            ) : null}
            <FamilyTags families={entry.families} />
          </div>
        </article>
      );
    case "note":
      return (
        <article id={`gl-${entry.id}`} className={className}>
          <h3 className="gl-card__title">{entry.title}</h3>
          <p className="gl-card__text">{entry.text}</p>
          {entry.drawings !== undefined ? (
            <ul className="gl-rings">
              {entry.drawings.map((ring) => (
                <li key={ring.name} className="gl-ring">
                  <Mol figure={ring.figure} label={`Structure of ${ring.name}`} />
                  <span className="gl-ring__name">{ring.name}</span>
                  <span className="gl-ring__effect">
                    {ring.effect === "edg"
                      ? "EDG: activating, o/p"
                      : ring.effect === "ewg"
                        ? "EWG: deactivating, meta"
                        : "Halogen: deactivating, o/p"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      );
    case "pka":
      return (
        <article id={`gl-${entry.id}`} className={`${className} gl-card--art`}>
          <Mol figure={entry.example.figure} label={`Example: ${entry.rung.label}`} />
          <div className="gl-card__body">
            <h3 className="gl-card__title">{entry.rung.label}</h3>
            <p className="gl-pka">
              pKa <strong>{formatPka(entry.rung.value)}</strong>
            </p>
            <p className="gl-card__source">
              {entry.rung.origin === "override"
                ? "Your own value"
                : entry.rung.origin === "preset"
                  ? (entry.rung.presetLabel ?? "Your table")
                  : PKA_SOURCE_WORDS[entry.rung.source]}
            </p>
          </div>
        </article>
      );
    case "reaction":
      return (
        <article id={`gl-${entry.id}`} className={className}>
          <ReactionCard entry={entry} />
        </article>
      );
    case "personal":
      return (
        <article id={`gl-${entry.id}`} className={`${className} gl-card--mine`}>
          <h3 className="gl-card__title">
            {entry.definition.term} <AwardBadge />
          </h3>
          <p className="gl-card__text">{entry.definition.definition}</p>
        </article>
      );
  }
}

/**
 * Reactions grouped under the family they start from, in the owner's order.
 * With a family picked, everything shown is filed under that one heading,
 * since it is every way in and out of it.
 */
function ReactionGroups({
  entries,
  focus,
  picked,
}: {
  readonly entries: readonly ReactionEntry[];
  readonly focus: string | null;
  readonly picked: FamilyId | null;
}) {
  return (
    <>
      {GLOSSARY_DATA.families.map((family) => {
        const here = entries.filter((entry) => (picked ?? entry.families[0] ?? entry.into[0]) === family);
        if (here.length === 0) return null;
        return (
          <section key={family} className="gl-group" aria-labelledby={`gl-fam-${family}`}>
            <h3 id={`gl-fam-${family}`} className="gl-group__title">
              {FAMILY_LABELS[family]} <span className="gl-group__count">{here.length}</span>
            </h3>
            {here.map((entry) => (
              <EntryCard key={entry.id} entry={entry} focused={entry.id === focus} />
            ))}
          </section>
        );
      })}
    </>
  );
}

export default function GlossaryPage({
  entry,
  reducedMotion,
}: {
  readonly entry: string | null;
  readonly reducedMotion: boolean;
}) {
  // The third argument is the server snapshot (the node tests render to a string); it is the same store.
  const settings = useSyncExternalStore(pkaSettings.subscribe, pkaSettings.getSnapshot, pkaSettings.getSnapshot);
  // Personal definitions plug in here once a store exists (types.ts,
  // PersonalDefinitionSource). Until then the list is empty and no Mine chip shows.
  const entries = useMemo(() => glossaryEntries(settings, []), [settings]);
  const counts = useMemo(() => sectionCounts(entries), [entries]);

  const [query, setQuery] = useState("");
  const [section, setSection] = useState<GlossarySection | "all">("all");
  const [family, setFamily] = useState<FamilyId | null>(null);
  const deferredQuery = useDeferredValue(query);

  const shown = useMemo(
    () => filterEntries(entries, { query: deferredQuery, section, family }),
    [entries, deferredQuery, section, family],
  );

  // A deep link (#/app/glossary/<id>) scrolls to its entry once it is drawn.
  useEffect(() => {
    if (entry === null) return;
    const target = document.getElementById(`gl-${entry}`);
    target?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [entry, reducedMotion]);

  function goBack() {
    // Back where the student came from; a cold deep link has nowhere to go
    // back to, so it lands on the path.
    if (window.history.length > 1) window.history.back();
    else navigate(hrefForTab("pathway"));
  }

  const chips = SECTIONS.filter((id) => counts[id] > 0);
  const reactions = shown.filter((item): item is ReactionEntry => item.kind === "reaction");
  const others = shown.filter((item) => item.kind !== "reaction");

  return (
    <div className="gl-page">
      <div className="gl-bar">
        <div className="gl-bar__in">
          <button type="button" className="gl-back bb-back-disc" aria-label="Back" onClick={goBack}>
            <svg viewBox="0 0 24 24" aria-hidden focusable="false">
              <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="gl-bar__title">Glossary</h1>
        </div>
      </div>

      <main className="gl-main">
        <div className="gl-tools">
          <label className="gl-search">
            <span className="gl-search__label">Search the glossary</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="PCC, acetophenone, phenol, ester..."
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <div className="gl-chips" role="group" aria-label="Show">
            <button type="button" className="gl-chip" aria-pressed={section === "all"} onClick={() => setSection("all")}>
              All
            </button>
            {chips.map((id) => (
              <button key={id} type="button" className="gl-chip" aria-pressed={section === id} onClick={() => setSection(id)}>
                {SECTION_LABELS[id]} <span className="gl-chip__count">{counts[id]}</span>
              </button>
            ))}
          </div>

          <label className="gl-family">
            <span>Functional group</span>
            <select value={family ?? ""} onChange={(event) => setFamily(event.target.value === "" ? null : (event.target.value as FamilyId))}>
              <option value="">Any</option>
              {GLOSSARY_DATA.families.map((id) => (
                <option key={id} value={id}>
                  {FAMILY_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="gl-count" aria-live="polite">
          {shown.length === 0 ? "Nothing matches. Try a shorter word." : `${shown.length} ${shown.length === 1 ? "entry" : "entries"}`}
        </p>

        {SECTIONS.filter((id) => id !== "reactions").map((id) => {
          const here = others.filter((item) => item.section === id);
          if (here.length === 0) return null;
          return (
            <section key={id} className="gl-section" aria-labelledby={`gl-sec-${id}`}>
              <h2 id={`gl-sec-${id}`} className="gl-section__title">
                {SECTION_LABELS[id]}
              </h2>
              {id === "pka" ? <p className="gl-section__lede">Lower pKa, stronger acid. Most acidic first.</p> : null}
              {here.map((item) => (
                <EntryCard key={item.id} entry={item} focused={item.id === entry} />
              ))}
            </section>
          );
        })}

        {reactions.length > 0 ? (
          <section className="gl-section" aria-labelledby="gl-sec-reactions">
            <h2 id="gl-sec-reactions" className="gl-section__title">
              Reactions
            </h2>
            <p className="gl-section__lede">Filed under the group they start from.</p>
            <ReactionGroups entries={reactions} focus={entry} picked={family} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
