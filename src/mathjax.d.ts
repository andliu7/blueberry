export {};

declare global {
  interface Window {
    MathJax?: {
      /** Omit `elements` to typeset the whole document, or pass a subtree to scope it. */
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      tex?: Record<string, unknown>;
    };
  }
}
