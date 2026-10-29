/**
 * Projects view of the task board: each gauntlet loop is a project you can open. Inside, the
 * waves are nodes on a path; open a node to see its pieces, and a piece to see its goal, the bar
 * it is judged against, the rounds used and the biggest gap left.
 */
import { useEffect, useState } from "react";
import { PROJECTS, STATUS_LABEL, loadStatuses, nextStatus, nodeStatus, projectProgress, saveStatuses, type Piece, type PieceStatus, type StatusMap } from "./gauntletProjects";
import "./taskProjects.css";

function Dot({ status }: { status: PieceStatus }) {
  if (status === "done")
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="var(--bb-primary)" />
        <path d="M4.8 8.3 7 10.4l4.2-4.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (status === "doing")
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="#d98a00" strokeWidth="1.5" />
        <path d="M8 4a4 4 0 0 1 0 8z" fill="#d98a00" />
      </svg>
    );
  if (status === "stuck")
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="#d9480f" strokeWidth="1.5" />
        <path d="M8 4.8v3.6M8 10.6v.6" stroke="#d9480f" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="var(--bb-muted-foreground)" strokeWidth="1.5" strokeDasharray="2.2 2.2" />
    </svg>
  );
}

export default function TaskProjects() {
  const [statuses, setStatuses] = useState<StatusMap>(loadStatuses);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [pieceId, setPieceId] = useState<string | null>(null);
  useEffect(() => saveStatuses(statuses), [statuses]);

  const st = (x: Piece): PieceStatus => statuses[x.id] ?? x.status;
  const project = PROJECTS.find((x) => x.id === projectId) ?? null;

  if (!project) {
    return (
      <div className="tp">
        <p className="tp-hint">Each gauntlet loop is a project. Open one to walk its waves.</p>
        <ul className="tp-list">
          {PROJECTS.map((pr) => {
            const { done, total } = projectProgress(pr, st);
            return (
              <li key={pr.id}>
                <button
                  type="button"
                  className="tp-project"
                  onClick={() => {
                    setProjectId(pr.id);
                    setNodeId((pr.nodes.find((n) => nodeStatus(n, st) !== "done") ?? pr.nodes[0]!).id);
                    setPieceId(null);
                  }}
                >
                  <span className="tp-tag">Gauntlet loop</span>
                  <strong>{pr.title}</strong>
                  <span className="tp-sum">{pr.summary}</span>
                  <span className="tp-bar" aria-hidden>
                    <i style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </span>
                  <span className="tp-count">
                    {done} of {total} pieces won, {pr.nodes.length} nodes
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const node = project.nodes.find((n) => n.id === nodeId) ?? project.nodes[0]!;
  const { done, total } = projectProgress(project, st);
  return (
    <div className="tp">
      <button type="button" className="tp-back" onClick={() => setProjectId(null)}>
        All projects
      </button>
      <h3 className="tp-title">{project.title}</h3>
      <p className="tp-hint">
        {done} of {total} pieces won. Started {project.started}. Statuses are kept by hand on this device; the run's own record is documentation/OVERNIGHT-LOG.md.
      </p>

      <ol className="tp-path" aria-label="Nodes">
        {project.nodes.map((n, i) => {
          const s = nodeStatus(n, st);
          const won = n.pieces.filter((x) => st(x) === "done").length;
          return (
            <li key={n.id} className={`tp-node is-${s}${n.id === node.id ? " is-open" : ""}`}>
              <button type="button" aria-pressed={n.id === node.id} onClick={() => { setNodeId(n.id); setPieceId(null); }}>
                <span className="tp-node__dot">
                  <Dot status={s} />
                </span>
                <span className="tp-node__name">{n.title}</span>
                <span className="tp-node__count">
                  {won}/{n.pieces.length}
                </span>
              </button>
              {i < project.nodes.length - 1 ? <span className="tp-link" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>

      <section className="tp-panel" aria-label={node.title}>
        <p className="tp-detail">{node.detail}</p>
        <ul className="tp-pieces">
          {node.pieces.map((x) => {
            const s = st(x);
            const open = pieceId === x.id;
            return (
              <li key={x.id} className={`tp-piece is-${s}`}>
                <div className="tp-piece__row">
                  <button type="button" className="tp-status" title={`${STATUS_LABEL[s]}. Click to change`} aria-label={`${x.title}: ${STATUS_LABEL[s]}. Change status`} onClick={() => setStatuses((m) => ({ ...m, [x.id]: nextStatus(s) }))}>
                    <Dot status={s} />
                  </button>
                  <button type="button" className="tp-piece__title" aria-expanded={open} onClick={() => setPieceId(open ? null : x.id)}>
                    {x.title}
                  </button>
                  <span className="tp-state">{STATUS_LABEL[s]}</span>
                </div>
                {open ? (
                  <dl className="tp-more">
                    <dt>Goal</dt>
                    <dd>{x.goal}</dd>
                    <dt>Judged against</dt>
                    <dd>{x.bar}</dd>
                    <dt>Rounds used</dt>
                    <dd>{x.rounds ?? "Not run yet"}</dd>
                    <dt>Biggest gap</dt>
                    <dd>{x.gap ?? "None recorded"}</dd>
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
