import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Two suites, one runner.
 *
 * `packages/*` carries the engines and their own tests, which came across whole
 * from the game's repository. `src/game/test` is the app's suite, which tests
 * the pure layout, scene and scheduling layers; React components are judged by
 * eye and measured by the frame scripts, because asserting on JSX output tests
 * the implementation rather than the design.
 *
 * `environment: "node"` for the same reason: nothing here needs a DOM, and a
 * jsdom that nothing uses is a slower run and a bigger install.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/game/test/**/*.test.ts", "packages/*/test/**/*.test.ts"],
    environment: "node",
  },
});
