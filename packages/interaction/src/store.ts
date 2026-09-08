/**
 * A tiny store around the reducer, for shells that want one.
 *
 * The reducer is the real deliverable and a shell can use it directly. This is
 * here because both shells will otherwise write the same twenty lines, and they
 * will write them differently.
 *
 * THE PATTERN, NAMED: this is an external store, the shape React's
 * `useSyncExternalStore` hook expects: `subscribe(listener)` returning an
 * unsubscribe function, plus `getSnapshot()` returning an immutable value that
 * changes identity when the state changes. React Native uses the same hook. It
 * is the boring, well maintained way to hold state that lives outside React
 * without a global, and it is why nothing in this package imports React.
 *
 * Effects are handed to a callback rather than performed here, because buzzing a
 * phone and calling a grader are platform jobs.
 */

import type { InteractionEnvironment } from "./geometryPort.js";
import {
  createInteractionState,
  reduce,
  type InteractionEvent,
  type InteractionState,
  type Transition,
} from "./machine.js";
import type { InteractionEffect } from "./effects.js";
import type { InteractionNotice } from "./notices.js";
import type { ShapeDraft } from "./shapes/index.js";

export interface InteractionStoreOptions {
  readonly initialDraft: ShapeDraft;
  readonly environment: InteractionEnvironment;
  readonly onEffect?: (effect: InteractionEffect) => void;
  readonly onNotice?: (notice: InteractionNotice) => void;
}

export interface InteractionStore {
  dispatch(event: InteractionEvent): Transition;
  getSnapshot(): InteractionState;
  subscribe(listener: () => void): () => void;
}

export function createInteractionStore(options: InteractionStoreOptions): InteractionStore {
  let state = createInteractionState(options.initialDraft);
  const listeners = new Set<() => void>();

  return {
    dispatch(event: InteractionEvent): Transition {
      const transition = reduce(state, event, options.environment);
      const changed = transition.state !== state;
      state = transition.state;

      for (const item of transition.notices) options.onNotice?.(item);
      for (const effect of transition.effects) options.onEffect?.(effect);

      if (changed) {
        for (const listener of listeners) listener();
      }
      return transition;
    },
    getSnapshot(): InteractionState {
      return state;
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
