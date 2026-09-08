/**
 * The problem browser: the pathway map's 192 nodes as the trainer's picker.
 *
 * This replaced a flat chip row that had grown to sixteen chips over three
 * lines and would have reached eighty-six. The map is the navigation the
 * owner's own PDF designed: units in teaching order, each node badged
 * spine / branch / gate / boss, playable nodes tappable, the rest shown as
 * the authoring queue they are. The header carries the coverage count read
 * from the data itself, so this surface is also the campaign's scoreboard.
 */

import { useMemo, useState } from "react";
import { PATHWAY_UNITS, coverage, type PathwayNode, type PlayableLink } from "../../demo/pathwayMap";

const KIND_BADGE: Record<string, { label: string; className: string }> = {
  spine: { label: "SPINE", className: "bg-good text-white" },
  branch: { label: "BRANCH", className: "bg-not-requested-soft text-not-requested border border-not-requested/40" },
  gate: { label: "GATE", className: "bg-bb-primary/15 text-bb-primary" },
  boss: { label: "BOSS", className: "bg-bb-foreground text-bb-background" },
};

export function ProblemBrowser({ currentTitle, onPick }: { readonly currentTitle: string; readonly onPick: (link: PlayableLink) => void }) {
  const [open, setOpen] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const score = useMemo(() => coverage(), []);

  const pick = (node: PathwayNode) => {
    if (node.playable === undefined) return;
    onPick(node.playable);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="press mt-2 inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-bb-border bg-bb-card px-4 text-scale-sm font-semibold text-bb-foreground"
        onPointerDown={() => setOpen(true)}
        title="Browse every problem on the pathway map"
      >
        <span aria-hidden>🗺</span>
        {currentTitle}
        <span className="text-scale-xs font-normal text-bb-muted-foreground">· change</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Choose a problem" onPointerDown={() => setOpen(false)}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-2 border-bb-border bg-bb-card" onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-bb-border p-4">
              <div>
                <h3 className="text-scale-lg font-semibold text-bb-foreground">The pathway map</h3>
                <p className="text-scale-xs text-bb-muted-foreground">
                  {score.playable} of {score.total} nodes playable · spine {score.spinePlayable} of {score.spineTotal}
                </p>
              </div>
              <button type="button" className="press min-h-11 min-w-11 rounded-full border border-bb-border bg-bb-card font-semibold" aria-label="Close" title="Close" onPointerDown={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {PATHWAY_UNITS.map((unit) => {
                const playableCount = unit.nodes.filter((node) => node.playable !== undefined).length;
                const expanded = expandedUnit === unit.id;
                return (
                  <section key={unit.id} className="mb-2">
                    <button
                      type="button"
                      className="press flex w-full items-center justify-between rounded-xl border border-bb-border bg-bb-card px-4 py-3 text-left"
                      aria-expanded={expanded}
                      onPointerDown={() => setExpandedUnit(expanded ? null : unit.id)}
                    >
                      <div>
                        <h4 className="text-scale-sm font-semibold text-bb-foreground">{unit.title}</h4>
                        <p className="text-scale-xs text-bb-muted-foreground">{unit.note}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-scale-xs font-semibold text-bb-muted-foreground">
                        {playableCount > 0 ? `${playableCount} playable` : "queued"}
                      </span>
                    </button>
                    {expanded ? (
                      <ol className="mt-1 flex flex-col gap-1 pl-2">
                        {unit.nodes.map((node) => {
                          const badge = KIND_BADGE[node.kind] ?? { label: "NODE", className: "bg-bb-muted text-bb-foreground" };
                          const playable = node.playable !== undefined;
                          return (
                            <li key={node.id}>
                              <button
                                type="button"
                                disabled={!playable}
                                className={
                                  "press flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left " +
                                  (playable ? "border border-bb-primary/30 bg-bb-primary/5 hover:bg-bb-primary/10" : "opacity-55")
                                }
                                onPointerDown={() => pick(node)}
                                title={playable ? `Play: ${node.title}` : "Authoring queued"}
                              >
                                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                                <span>
                                  <span className="block text-scale-sm font-medium text-bb-foreground">{node.title}</span>
                                  <span className="block text-scale-xs text-bb-muted-foreground">{node.blurb}</span>
                                  {!playable ? <span className="block text-scale-xs italic text-bb-muted-foreground">authoring queued</span> : null}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
