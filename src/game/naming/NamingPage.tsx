/**
 * Naming and acid-base, at #/app/naming.
 *
 * A reading page, in the order a student uses it: how a name is built, the
 * priority table with one worked example per group (highest first), the rules
 * for the endings and numbers, then acid-base with pKa reasoning. A single
 * button at the bottom adds the whole set to the Cards tab.
 *
 * Structures are RDKit's (guide/nmGuide.figures.ts), pKa numbers come from the
 * student's own table, and the words are in namingContent.ts. Lazy (App.tsx),
 * so none of it lands in the first load.
 *
 * React patterns used here, one line each:
 *   - useSyncExternalStore reads the pKa settings store, so the numbers shown
 *     follow the student's table;
 *   - useMemo keeps the card list from being rebuilt on every render.
 */
import { useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";

import { Press } from "../app/ui/Press";
import { hrefForTab } from "../app/routes";
import { navigate } from "../app/useHashRoute";
import { decks } from "../cards/store";
import { GuideMol } from "../guide/GuideMol";
import { pkaSettings } from "../settings/pka";
import { ACID_BASE, ACID_BASE_RULE, ARIO, ARIO_INTRO, PREFIX_ONLY, PRIORITY, RULES, type PriorityRow } from "./namingContent";
import { NAMING_DECK_ID, fillPka, focusMol, namingCards, namingDeck, panelsFor } from "./namingModel";
import "../guide/guide.css";
import "../glossary/glossary.css";
import "./naming.css";

function Drawing({ keyId, label }: { readonly keyId: string; readonly label: string }) {
  const mol = focusMol(keyId);
  if (mol === null) return null;
  return (
    <figure className="nm-mol" style={{ "--w": mol.figure.w } as CSSProperties} role="img" aria-label={label}>
      <GuideMol figure={mol.figure} />
    </figure>
  );
}

/** A whole reaction row (acid + base to conjugate base + water), left to right. */
function Equation({ keyId }: { readonly keyId: string }) {
  const panels = panelsFor(keyId);
  return (
    <div className="nm-eq" role="img" aria-label={panels.map((p) => (p.kind === "mol" ? (p.name ?? "structure") : p.kind === "plus" ? "plus" : p.kind === "arrow" ? "gives" : p.kind === "resonance" ? "resonance form" : p.kind === "beats" ? "is more acidic than" : "")).join(" ")}>
      {panels.map((panel, at) => {
        if (panel.kind === "mol")
          return (
            <span key={at} className="nm-eq__mol" style={{ "--w": panel.figure.w } as CSSProperties}>
              <GuideMol figure={panel.figure} />
              {panel.name !== undefined && <span className="nm-eq__name">{panel.name}</span>}
            </span>
          );
        if (panel.kind === "plus")
          return (
            <span key={at} className="nm-eq__op" aria-hidden>
              +
            </span>
          );
        if (panel.kind === "arrow")
          return (
            <span key={at} className="nm-eq__arrow" aria-hidden>
              <span className="nm-eq__over">{panel.over}</span>
              <svg viewBox="0 0 40 12">
                <path d="M2 6h34M30 1.5 37 6l-7 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          );
        if (panel.kind === "resonance")
          return (
            <span key={at} className="nm-eq__op" aria-hidden>
              {"↔"}
            </span>
          );
        if (panel.kind === "beats")
          return (
            <span key={at} className="nm-eq__op" aria-hidden>
              {">"}
            </span>
          );
        return null;
      })}
    </div>
  );
}

function GroupCard({ row, rank }: { readonly row: PriorityRow; readonly rank: number | null }) {
  const name = focusMol(row.key)?.name ?? "";
  return (
    <li className="nm-group">
      <Drawing keyId={row.key} label={`Structure of ${name}`} />
      <div className="nm-group__body">
        <p className="nm-group__label">
          {rank !== null && <span className="nm-rank">{rank}</span>}
          {row.label}
        </p>
        <p className="nm-group__name">{name}</p>
        <p className="nm-group__ends">
          <span>
            Ending <b>{row.ending}</b>
          </span>
          <span>
            As a prefix <b>{row.prefix}</b>
          </span>
        </p>
        <p className="nm-group__note">{row.note}</p>
      </div>
    </li>
  );
}

export default function NamingPage() {
  const settings = useSyncExternalStore(pkaSettings.subscribe, pkaSettings.getSnapshot, pkaSettings.getSnapshot);
  const cards = useMemo(() => namingCards(settings), [settings]);
  const [added, setAdded] = useState(false);

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else navigate(hrefForTab("pathway"));
  }

  function study() {
    // createDeck leaves an existing deck alone and saveCard is keyed by card id,
    // so pressing this twice adds nothing and keeps every review state.
    decks.createDeck(namingDeck());
    for (const card of cards) decks.saveCard(card, NAMING_DECK_ID);
    setAdded(true);
    navigate(hrefForTab("cards", "deck", NAMING_DECK_ID));
  }

  return (
    <div className="gl-page ug-overlay nm-page">
      <div className="gl-bar">
        <div className="gl-bar__in">
          <button type="button" className="gl-back bb-back-disc" aria-label="Back" onClick={goBack}>
            <svg viewBox="0 0 24 24" aria-hidden focusable="false">
              <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="gl-bar__title">Naming and acid-base</h1>
        </div>
      </div>

      <main className="gl-main nm-main">
        <section className="nm-sec" aria-labelledby="nm-built">
          <h2 id="nm-built" className="nm-h">
            How a name is built
          </h2>
          <p className="nm-p">Every name is the same four parts, read from the structure in this order.</p>
          <ol className="nm-parts">
            <li>
              <b>Prefixes</b>
              <span>every group that is not the primary one, with numbers, in alphabetical order</span>
            </li>
            <li>
              <b>Root</b>
              <span>the longest chain or ring that holds the primary group</span>
            </li>
            <li>
              <b>an, en or yn</b>
              <span>single, double or triple bonds in that chain</span>
            </li>
            <li>
              <b>Ending</b>
              <span>the primary group: the highest one on the table below</span>
            </li>
          </ol>
          <p className="nm-p nm-eg">
            <span className="nm-eg__pre">3-bromo-4-hydroxy</span>
            <span className="nm-eg__root">benz</span>
            <span className="nm-eg__end">oic acid</span>
          </p>
          <Drawing keyId="nm-ring-acid" label="Structure of 3-bromo-4-hydroxybenzoic acid" />
        </section>

        <section className="nm-sec" aria-labelledby="nm-priority">
          <h2 id="nm-priority" className="nm-h">
            Which group is primary
          </h2>
          <p className="nm-p">Highest on this list wins and gives the ending. Everything below it on the list is named as a prefix. One worked example for each, top to bottom.</p>
          <ol className="nm-groups">
            {PRIORITY.map((row, at) => (
              <GroupCard key={row.key} row={row} rank={at + 1} />
            ))}
          </ol>
          <h3 className="nm-h3">Always a prefix</h3>
          <p className="nm-p">These have no ending, so they never win.</p>
          <ul className="nm-groups">
            {PREFIX_ONLY.map((row) => (
              <GroupCard key={row.key} row={row} rank={null} />
            ))}
          </ul>
        </section>

        <section className="nm-sec" aria-labelledby="nm-rules">
          <h2 id="nm-rules" className="nm-h">
            The rules, in order
          </h2>
          <ol className="nm-rules">
            {RULES.map((rule) => (
              <li key={rule.id} className="nm-rule">
                <h3 className="nm-h3">{rule.title}</h3>
                <p className="nm-p">{rule.text}</p>
                <Drawing keyId={rule.key} label={`Structure of ${focusMol(rule.key)?.name ?? ""}`} />
                <p className="nm-rule__name">{focusMol(rule.key)?.name}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="nm-sec" aria-labelledby="nm-ab">
          <h2 id="nm-ab" className="nm-h">
            Acid-base, with the pKa reasoning
          </h2>
          <p className="nm-p nm-callout">{ACID_BASE_RULE}</p>
          <p className="nm-p nm-small">The pKa numbers are from your own pKa table in Settings, so they match the Glossary.</p>
          {ACID_BASE.map((topic) => (
            <article key={topic.key} className="nm-topic">
              <h3 className="nm-h3">{topic.title}</h3>
              <Equation keyId={topic.key} />
              <p className="nm-p">{fillPka(topic.text, settings)}</p>
            </article>
          ))}
        </section>

        <section className="nm-sec" aria-labelledby="nm-ario">
          <h2 id="nm-ario" className="nm-h">
            Why the numbers differ: A, R, I, O
          </h2>
          <p className="nm-p nm-callout">{ARIO_INTRO}</p>
          {ARIO.map((topic) => (
            <article key={topic.key} className="nm-topic">
              <h3 className="nm-h3">{topic.title}</h3>
              <Equation keyId={topic.key} />
              <p className="nm-p">{fillPka(topic.text, settings)}</p>
            </article>
          ))}
        </section>
      </main>

      <div className="nm-dock">
        <div className="nm-dock__in">
          <Press variant="primary" size="md" block onClick={study}>
            {added ? "Opening your cards" : `Study these as ${cards.length} cards`}
          </Press>
        </div>
      </div>
    </div>
  );
}
