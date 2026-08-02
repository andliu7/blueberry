export {};

declare global {
  interface Window {
    MathJax?: {
      /** Omit `elements` to typeset the whole document, or pass a subtree to scope it. */
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      /** Forgets that these elements were typeset, so they are scanned again. */
      typesetClear?: (elements?: HTMLElement[]) => void;
      tex?: Record<string, unknown>;
    };
  }
}
