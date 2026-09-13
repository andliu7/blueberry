/**
 * The decision point, presented.
 *
 * THE MOMENT IS ALCHEMIE'S; THE FORK IS OURS. In the bar's corpus a decision
 * point is a screen state: the canvas darkens, the spectators grey out, the
 * bonds that just changed stay lit, and the student is told they can undo
 * or continue. No routes are ever listed. This layer keeps the darkening,
 * because it is the right way to say "stop, this intermediate matters", and
 * then draws what Alchemie leaves in the student's head: the routes out of
 * the intermediate, as a fork in the same reaction-path language the unit
 * trail uses. One node for where you are, an arm to each route, a puck
 * naming it. The student picks a direction; the canvas then loads that
 * route and the arrows are drawn as on any step.
 *
 * WHAT IT NEVER SHOWS: which arm wins. The conditions line is the whole
 * question. The reason each route wins or loses is copy for the verdict,
 * after the student has committed.
 */

import { useTheme } from "../../../app/hooks";
import { chooserOrder } from "./forkModel";
import type { ForkRoute, StepFork } from "./question";

const W = 340;
const HERE_X = 48;
const PUCK_X = 176;
const ROW = 60;

export function ForkChooser({ fork, onChoose }: { readonly fork: StepFork; readonly onChoose: (route: ForkRoute) => void }) {
  const routes = chooserOrder(fork.routes);
  const height = ROW * routes.length + 24;
  const cy = height / 2;
  const yOf = (i: number) => 12 + ROW / 2 + ROW * i;
  // HOW THE SCREEN DARKENS, per theme. A tint laid OVER the molecule darkens
  // the labels along with the ground, which keeps dark-on-light labels
  // readable (light theme, black 20 percent: small H labels near 4.7:1). In
  // dark theme the same tint pulls light labels down toward a dark ground and
  // any amount of it drops the H labels under 4.5:1, so there this layer stays
  // clear and TrainerScreen darkens the workbench UNDER the molecule instead.
  const dark = useTheme() === "dark";
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-between gap-3 p-4 pt-5"
      style={{ background: dark ? "transparent" : "rgb(0 0 0 / 0.2)" }}
      data-fork-chooser
      role="group"
      aria-label="Decision point: choose a route"
    >
      <span
        className="inline-flex items-center gap-1.5 rounded-full border-2 bg-bb-card px-4 py-1.5 text-scale-sm font-bold"
        style={{ borderColor: "var(--bb-primary)", color: "var(--bb-foreground)" }}
      >
        ⑂ Decision point
      </span>
      <p className="max-w-xs rounded-full bg-bb-card px-4 py-1 text-center font-mono text-scale-xs font-semibold leading-snug text-bb-foreground">
        {fork.conditions}
      </p>
      <div className="flex-1" />
      {/* The fork: the SVG draws the node and the arms; each puck is a real button laid over the arm's end at the same fractions. */}
      <div className="relative w-full max-w-xs" style={{ aspectRatio: `${W} / ${height}` }}>
        <svg viewBox={`0 0 ${W} ${height}`} className="absolute inset-0 h-full w-full" aria-hidden>
          {routes.map((route, i) => (
            <path
              key={`arm-${route.id}`}
              d={`M ${HERE_X} ${cy} C ${HERE_X + 60} ${cy}, ${PUCK_X - 60} ${yOf(i)}, ${PUCK_X} ${yOf(i)}`}
              fill="none"
              stroke="var(--bb-muted-foreground)"
              strokeWidth={6}
              strokeLinecap="round"
            />
          ))}
          <circle cx={HERE_X} cy={cy} r={22} fill="var(--bb-card)" stroke="var(--bb-primary)" strokeWidth={3} />
          <text x={HERE_X} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--bb-foreground)">
            here
          </text>
        </svg>
        {routes.map((route, i) => (
          <button
            key={route.id}
            type="button"
            className="press absolute min-h-11 -translate-y-1/2 rounded-full border-2 border-bb-border bg-bb-card px-4 text-left text-scale-sm font-semibold text-bb-foreground"
            style={{ left: `${(PUCK_X / W) * 100}%`, top: `${(yOf(i) / height) * 100}%`, maxWidth: "36%" }}
            data-fork-route={route.id}
            onClick={() => onChoose(route)}
          >
            {route.label}
          </button>
        ))}
      </div>
    </div>
  );
}
