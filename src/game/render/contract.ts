/**
 * The renderer contract: one props interface, two renderers.
 *
 * MoleculeSvg (2D, the default for everything) and Scene3D (three, for the
 * questions 2D cannot answer) are both React components of exactly this props
 * type. The demo route can swap one for the other without either knowing. That
 * interchangeability is the Phase 4 deliverable the interface exists to prove,
 * and it is also what keeps the eventual Expo renderer honest: a third
 * implementation of the same props.
 *
 * Design decisions worth knowing:
 *
 *   - The renderer does NOT own a clock. `progress` is a number from 0 (the
 *     step's `from` state) to 1 (its `to` state), and whoever composes the
 *     renderer drives it (the demo uses a requestAnimationFrame hook). A
 *     renderer that owned time could not be scrubbed, could not respect
 *     reduced motion from outside, and could not be frame-measured without
 *     reaching inside it.
 *
 *   - The scene geometry arrives precomputed (`buildStepScene`), so a render
 *     is a pure projection of props to pixels. All chemistry stays in the
 *     MechanismStep; all placement stays in the StepScene.
 *
 *   - `reducedMotion` is a prop, not a media query read inside the renderer,
 *     so the composing surface decides policy once and every renderer obeys
 *     the same answer.
 */

import type { ComponentType } from "react";
import type { AtomId, MechanismStep } from "@blueberry/chem-core";
import type { StepScene } from "./layout/stepScene";

export interface MechanismRenderProps {
  /** The real chem-core step: states, arrows, identity. Chemistry, no pixels. */
  readonly step: MechanismStep;
  /** Precomputed placement and tween data. Pixels, no chemistry decisions. */
  readonly scene: StepScene;
  /** 0 renders the from state, 1 the to state, between animates the step. */
  readonly progress: number;
  /** True: render the representative static frame, no motion. */
  readonly reducedMotion: boolean;
  readonly selectedAtomIds?: readonly AtomId[];
  /**
   * Fires on pointer down, not click, because the press acknowledgement
   * contract in CLAUDE.md starts the moment the finger lands.
   */
  readonly onAtomPointerDown?: (atomId: AtomId) => void;
}

export type MechanismRenderer = ComponentType<MechanismRenderProps>;

/**
 * The frame both renderers show under prefers-reduced-motion: mid-step, arrows
 * fully drawn, forming bond visibly underway. A student who cannot watch the
 * animation still sees THAT the step happens and what moves, which is the
 * sibling repo's standard: freeze to a representative frame, never remove the
 * state.
 */
export const REDUCED_MOTION_FRAME = 0.55;
