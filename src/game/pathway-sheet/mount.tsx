/**
 * The mount function the integrator wires. One call, one controller.
 *
 * TWO WAYS IN, ON PURPOSE. Inside the React tree the components themselves
 * (NodeSheet, Guidebook, exported from index.ts) are the preferred wiring:
 * the pathway already holds "which node is open" as state for the Charge
 * sheet, and a second React root inside a React app is a seam nobody needs.
 * This controller exists for the brief's other case: a host that wants the
 * whole surface behind one imperative handle (open, close, dispose) without
 * threading sheet state through its own tree.
 *
 * PATTERN NOTE, one line each, for the reader learning React:
 * - createRoot: makes this subtree its own React app inside the given DOM
 *   element; dispose() unmounts it.
 * - useSyncExternalStore: the built-in hook for subscribing a component to a
 *   plain JS store that changes outside React; it is what makes open() from
 *   imperative code re-render the sheet safely, even before first paint.
 *
 * VIEW FLOW. open(node) shows the sheet. The hamburger swaps to the built-in
 * guidebook overlay (the native modal dialog must close first: a modal makes
 * everything outside it inert, overlay included); Back returns to the sheet.
 * A caller that routes the guidebook itself passes onGuidebook and the swap
 * is theirs instead.
 */

import { useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { NodeSheet } from "./NodeSheet";
import { Guidebook } from "./Guidebook";
import { guidebookFor } from "./guidebookContent";
import type { SheetNode } from "./nodeSheetModel";

export interface NodeSheetHandlers {
  /** Practice START. Route this into the Charge sheet; the spend is not ours. */
  readonly onStart: (node: SheetNode) => void;
  /** The timed run. Only reachable once the model says the node is cleared. */
  readonly onChallenge: (node: SheetNode) => void;
  /**
   * The hamburger. Omitted, the controller shows its own guidebook overlay
   * built from guidebookFor(node); provided, the routing is the caller's.
   */
  readonly onGuidebook?: (node: SheetNode) => void;
  readonly reducedMotion?: boolean;
}

export interface NodeSheetController {
  /** Show the sheet for this node. Idempotent for the same node. */
  open(node: SheetNode): void;
  /** Close whatever is showing, sheet or guidebook. */
  close(): void;
  /** Unmount the surface entirely. The controller is dead afterwards. */
  dispose(): void;
}

type View =
  | { readonly kind: "closed" }
  | { readonly kind: "sheet"; readonly node: SheetNode }
  | { readonly kind: "guidebook"; readonly node: SheetNode };

const CLOSED: View = { kind: "closed" };

/** A minimal external store: current value, setter, change subscription. */
function createViewStore() {
  let view: View = CLOSED;
  const listeners = new Set<() => void>();
  return {
    get: (): View => view,
    set(next: View): void {
      view = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function SheetHost({
  store,
  handlers,
}: {
  readonly store: ReturnType<typeof createViewStore>;
  readonly handlers: NodeSheetHandlers;
}) {
  const view = useSyncExternalStore(store.subscribe, store.get, store.get);
  const reducedMotion = handlers.reducedMotion ?? false;
  const openGuidebook = handlers.onGuidebook ?? ((node: SheetNode) => store.set({ kind: "guidebook", node }));

  return (
    <>
      <NodeSheet
        node={view.kind === "sheet" ? view.node : null}
        onClose={() => {
          // Only the sheet's own dismissal closes the surface: the swap to
          // the guidebook also closes the dialog, and must not clear the view
          // it just set. Reading the store, not the render's view, keeps this
          // check current even when the dialog's close event lands late.
          if (store.get().kind === "sheet") store.set(CLOSED);
        }}
        onStart={handlers.onStart}
        onChallenge={handlers.onChallenge}
        onGuidebook={openGuidebook}
        reducedMotion={reducedMotion}
      />
      {view.kind === "guidebook" ? (
        <div className="gb-overlay">
          <Guidebook content={guidebookFor(view.node)} onBack={() => store.set({ kind: "sheet", node: view.node })} reducedMotion={reducedMotion} />
        </div>
      ) : null}
    </>
  );
}

export function mountNodeSheet(host: HTMLElement, handlers: NodeSheetHandlers): NodeSheetController {
  const store = createViewStore();
  const root = createRoot(host);
  root.render(<SheetHost store={store} handlers={handlers} />);
  return {
    open(node) {
      store.set({ kind: "sheet", node });
    },
    close() {
      store.set(CLOSED);
    },
    dispose() {
      store.set(CLOSED);
      root.unmount();
    },
  };
}
