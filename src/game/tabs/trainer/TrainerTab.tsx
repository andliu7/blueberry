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

import { useEffect, useRef, useState } from "react";
import { hashParam, hrefForLesson, hrefForTab } from "../../app/routes";
import { navigate } from "../../app/useHashRoute";
import { progress } from "../../app/progress";
import type { MechanismBeat, ResonanceBeat } from "../../beats/types";
import { economyKindFor, pathwayNodeForPlayable, type PlayableLink } from "../../demo/pathwayMap";
import type { NodeKind as EconomyNodeKind } from "@blueberry/economy";
import { questionForBeat, type TrainerQuestion } from "./engine/question";
import { TrainerScreen } from "./engine/TrainerScreen";
import { ProblemBrowser } from "./ProblemBrowser";

type Selection = Pick<MechanismBeat, "kind" | "play"> | Pick<ResonanceBeat, "kind" | "resonanceId">;

/**
 * What a win on the question in hand banks, or null when it banks nothing.
 *
 * DERIVED WHEN THE QUESTION IS PICKED, not when it is won, because that is the
 * only moment this tab knows WHERE the question came from. The pathway spends
 * charge against the map NODE ("u5-williamson") while the deep link carries the
 * PLAYABLE ("williamson"), and `kind` is read from the same `economyKindFor` the
 * charge gate priced the entry with, so the row paid and the row cleared cannot
 * drift apart.
 */
interface ClearTarget {
  readonly nodeId: string;
  readonly kind: EconomyNodeKind;
  readonly spine: boolean;
}

/** A question on screen, and the clear it may bank. */
interface Picked {
  readonly question: TrainerQuestion;
  readonly clear: ClearTarget | null;
}

function pick(selection: Selection): TrainerQuestion | null {
  return questionForBeat(selection);
}

/**
 * A question from a pathway link, with the node it clears attached.
 *
 * The node lookup can come back empty and that is not an error: a hand-typed or
 * bookmarked link can name an authored question that no map node points at. It
 * plays; it just banks nothing, the same as free practice below.
 */
function fromPathway(selection: Selection, kind: PlayableLink["kind"], id: string): Picked | null {
  const question = pick(selection);
  if (question === null) return null;
  const node = pathwayNodeForPlayable(kind, id);
  const link = node?.playable;
  if (node === null || link === undefined) return { question, clear: null };
  return {
    question,
    clear: { nodeId: node.id, kind: economyKindFor(node.kind, link), spine: node.kind === "spine" },
  };
}

/**
 * A question picked in the browser below: FREE PRACTICE, which banks nothing.
 *
 * The browser lists the same map nodes, so a node could be found for it. It
 * deliberately is not: a pick here never passed the charge gate, so nothing was
 * spent, and paying a first clear out for it would mint diamonds and unlock the
 * units downstream for free. Practice is free in both directions.
 */
function freePractice(question: TrainerQuestion | null): Picked | null {
  return question === null ? null : { question, clear: null };
}

/**
 * The deep link, read WHEN ASKED rather than when this module loads, so a
 * reload shows the question in the live URL and not the one that happened to
 * load the bundle. hashParam checks the hash first and the legacy search
 * string second, so links already in a student's history still resolve.
 * Null when the hash carries no link, or one that names nothing authored.
 */
function deepLinkPick(): Picked | null {
  const reaction = hashParam("reaction");
  if (reaction !== null) return fromPathway({ kind: "mechanism", play: { kind: "reaction", id: reaction } }, "reaction", reaction);
  const sequence = hashParam("sequence");
  if (sequence !== null) return fromPathway({ kind: "mechanism", play: { kind: "sequence", id: sequence } }, "sequence", sequence);
  // "hunt" in the URL, `resonance` in the data. Both ends have said so since the
  // link was first built; PathwayTab.hrefForPlayable writes the one and
  // questionForBeat reads the other.
  const hunt = hashParam("hunt");
  if (hunt !== null) return fromPathway({ kind: "resonance", resonanceId: hunt }, "resonance", hunt);
  return null;
}

export interface TrainerTabProps {
  readonly reducedMotion: boolean;
}

export function TrainerTab({ reducedMotion }: TrainerTabProps) {
  const [picked, setPicked] = useState<Picked | null>(deepLinkPick);
  /**
   * Which node ids this mounted tab has already banked, so one finished run can
   * never append twice. Copied from BeatRunner's `bankedFor` discipline and for
   * its reason: the journal is append-only and every balance is derived from it,
   * so `clearNode` returning 0 diamonds on a replay is not enough. A set rather
   * than one id because a student can walk several nodes without this tab
   * unmounting, and each of those first clears is real.
   */
  const banked = useRef<Set<string>>(new Set());

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
      const next = deepLinkPick();
      if (next !== null) setPicked(next);
    };
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  const leave = () => {
    setPicked(null);
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
        setPicked(freePractice(pick({ kind: "mechanism", play: link })));
        return;
      case "resonance":
        setPicked(freePractice(pick({ kind: "resonance", resonanceId: link.id })));
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

  /**
   * THE WIN, BANKED. `onSolved` fires once, on Continue from the last step's
   * win, before onExit, which is the trainer's equivalent of the reward phase
   * BeatRunner banks on.
   *
   * `clear === null` is free practice and it deliberately records NOTHING. A
   * question opened from the browser below never passed the charge gate, so a
   * clear there would mint first-clear diamonds and unlock the nodes downstream
   * for free. Same for a hand-typed link that no map node points at.
   *
   * `flawless` is NOT passed, and that is the honest answer rather than a
   * missing feature: TrainerScreen grades every check but reports no miss
   * upward, so this tab cannot tell a clean run from a fourth attempt. The
   * store's default is false. `stepsInOneSitting` it can answer, because this
   * tab always mounts the screen at step 0 and the student walks every step of
   * the question before Continue reaches here.
   */
  const bank = (target: ClearTarget, steps: number) => {
    if (banked.current.has(target.nodeId)) return;
    banked.current.add(target.nodeId);
    progress.clearNode(target.nodeId, target.kind, { stepsInOneSitting: steps, spine: target.spine });
  };

  if (picked !== null) {
    const { question, clear } = picked;
    // Keyed on the question so a hashchange to another node builds a fresh
    // screen over the new step rather than carrying the old one's state.
    return (
      <TrainerScreen
        key={question.id}
        question={question}
        onSolved={clear === null ? undefined : () => bank(clear, question.steps.length)}
        onExit={leave}
        reducedMotion={reducedMotion}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-10 md:p-6">
      <h1 className="bb-title-face text-scale-2xl font-bold text-bb-foreground">Train</h1>
      <ProblemBrowser onPick={openPlayable} />
    </div>
  );
}
