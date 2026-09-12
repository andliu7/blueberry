/**
 * The Train tab: the question database at rest, the trainer engine once a
 * question is picked.
 *
 * AT REST it is one heading over the pathway-map browser and nothing else:
 * the map's units in teaching order, their playable nodes, the coverage
 * count as the header. The app's tab bar stays under it as on any tab.
 *
 * WITH A QUESTION PICKED it renders engine/TrainerScreen. The screen is
 * fixed and full-viewport by construction, so it covers the tab bar without
 * this file knowing the bar exists, and it owns the canvas, the verdict, the
 * replay and the mascot. Nothing here forks any of that: what the Train tab
 * needs and the screen lacks goes into the question data or stays in this
 * file, never into engine/.
 *
 * WHERE A PICK COMES FROM, three places, all of them existing addresses:
 *   the deep link   ?reaction=<id>, ?sequence=<id>, ?hunt=<id> inside the
 *                   hash, the three names PathwayTab.hrefForPlayable builds
 *   a hashchange    the same link arriving while this tab is already on
 *                   screen (one map node to the next, no remount)
 *   the browser     a node picked in the list below
 * Leaving the screen replaces the deep link with the bare tab address, so a
 * reload or a Back lands on the list, not back in the stage.
 *
 * THE SELECTION IS A BEAT. beats/types.ts declares `mechanism` and
 * `resonance` BUILT because this tab is where they play, and
 * beatCoverage.test.ts holds this file to that claim. So a selection is typed
 * on those two beats' own shapes rather than on a private triple that
 * restates them: a mechanism beat plays a reaction or a sequence entry, a
 * resonance beat plays a hunt entry, and questionForBeat resolves either.
 */

import { useEffect, useState } from "react";
import { hashParam, hrefForLesson, hrefForTab } from "../../app/routes";
import { navigate } from "../../app/useHashRoute";
import type { MechanismBeat, ResonanceBeat } from "../../beats/types";
import type { PlayableLink } from "../../demo/pathwayMap";
import { questionForBeat, type TrainerQuestion } from "./engine/question";
import { TrainerScreen } from "./engine/TrainerScreen";
import { ProblemBrowser } from "./ProblemBrowser";

type Selection = Pick<MechanismBeat, "kind" | "play"> | Pick<ResonanceBeat, "kind" | "resonanceId">;

/**
 * The deep link, read WHEN ASKED rather than when this module loads, so a
 * reload shows the question in the live URL and not the one that happened to
 * load the bundle. hashParam checks the hash first and the legacy search
 * string second, so links already in a student's history still resolve.
 * Null when the hash carries no link, or one that names nothing authored.
 */
function pick(selection: Selection): TrainerQuestion | null {
  return questionForBeat(selection);
}

function deepLinkQuestion(): TrainerQuestion | null {
  const reaction = hashParam("reaction");
  if (reaction !== null) return pick({ kind: "mechanism", play: { kind: "reaction", id: reaction } });
  const sequence = hashParam("sequence");
  if (sequence !== null) return pick({ kind: "mechanism", play: { kind: "sequence", id: sequence } });
  const hunt = hashParam("hunt");
  if (hunt !== null) return pick({ kind: "resonance", resonanceId: hunt });
  return null;
}

export interface TrainerTabProps {
  readonly reducedMotion: boolean;
}

export function TrainerTab({ reducedMotion }: TrainerTabProps) {
  const [question, setQuestion] = useState<TrainerQuestion | null>(deepLinkQuestion);

  /**
   * Follow a deep link that arrives while the trainer is ALREADY on screen.
   *
   * Going from the pathway to a mechanism mounts this component fresh, so the
   * initialiser above covers the common path. Going from one mechanism to
   * another does not: the route is still "trainer", React keeps the instance,
   * and only the hash moves. Without this the student would press a different
   * node and stay on the one they were already doing.
   *
   * It only ever applies a link that RESOLVES, so a hash carrying no deep link
   * (the plain "#/trainer" of the tab bar, or the one `leave` writes) leaves
   * the student where they are rather than snapping them anywhere.
   */
  useEffect(() => {
    const follow = () => {
      const next = deepLinkQuestion();
      if (next !== null) setQuestion(next);
    };
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  const leave = () => {
    setQuestion(null);
    // Replace, never push: navigate() assigns the hash and adds a history
    // entry, so a Back after leaving would land on the deep link and the
    // follower above would put the student straight back into the stage.
    window.history.replaceState(null, "", hrefForTab("trainer"));
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  /**
   * A node picked in the browser, sent where that node actually lives. A BEAT
   * is not a mechanism: it is an MCQ, a matching board, a ladder or a
   * synthesis gap, and BeatRunner plays it at "#/lesson/<node>", exactly as
   * PathwayTab.hrefForPlayable routes it. The switch is exhaustive on purpose
   * and the default asserts `never`, so a fifth PlayableLink kind is a compile
   * error here rather than a silent redirect to the last branch.
   */
  const openPlayable = (link: PlayableLink) => {
    switch (link.kind) {
      case "reaction":
      case "sequence":
        setQuestion(pick({ kind: "mechanism", play: link }));
        return;
      case "resonance":
        setQuestion(pick({ kind: "resonance", resonanceId: link.id }));
        return;
      case "beat":
        navigate(hrefForLesson(link.id));
        return;
      default: {
        const unreachable: never = link;
        throw new Error(`unhandled playable kind: ${JSON.stringify(unreachable)}`);
      }
    }
  };

  if (question !== null) {
    // Keyed on the question so a hashchange to another node builds a fresh
    // screen over the new step rather than carrying the old one's state.
    return <TrainerScreen key={question.id} question={question} onExit={leave} reducedMotion={reducedMotion} />;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-10 md:p-6">
      <h1 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">Train</h1>
      <ProblemBrowser onPick={openPlayable} />
    </div>
  );
}
