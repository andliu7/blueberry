export {};

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: () => Promise<void>;
      tex?: Record<string, unknown>;
    };
  }
}
