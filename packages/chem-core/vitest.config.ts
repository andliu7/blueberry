import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Vitest configuration for chem-core.
 *
 * WHY THE TESTS IMPORT src/ AND NOT dist/.
 *
 * Mutation testing rewrites the TypeScript sources and then runs the test command. A
 * test that imports the built package would execute the pre-mutation JavaScript in
 * dist/, every mutant would survive, and the score would be a measurement of nothing.
 * So every test file here imports ../src/... directly.
 *
 * WHY THE PLUGIN BELOW EXISTS.
 *
 * chem-core is NodeNext ESM, so its internal imports are written with the .js extension
 * that the emitted JavaScript will use: `import ... from "./ids.js"`. That file does not
 * exist next to the source, and Vite resolves relative specifiers literally, so loading
 * src/index.ts under Vite fails on the first internal import. The plugin maps a relative
 * .js specifier back to the .ts file sitting beside it, and only when that .ts actually
 * exists, so nothing else in resolution changes.
 *
 * This is the boring published workaround for NodeNext sources under Vite. The
 * alternatives were changing chem-core's module resolution, which is a build contract,
 * or testing the build output, which defeats the point. Neither is worth it for eleven
 * lines.
 */
function resolveNodeNextJsToTs(): Plugin {
  return {
    name: "chem-core-nodenext-js-to-ts",
    enforce: "pre",
    resolveId(source, importer) {
      if (importer === undefined) return null;
      if (!source.startsWith(".")) return null;
      if (!source.endsWith(".js")) return null;
      const candidate = `${path.resolve(path.dirname(importer), source).slice(0, -3)}.ts`;
      return existsSync(candidate) ? candidate : null;
    },
  };
}

export default defineConfig({
  plugins: [resolveNodeNextJsToTs()],
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Stryker runs this project many times over. Reporters that redraw are noise in a
    // mutation log, and the default watcher must never engage in CI.
    watch: false,
  },
});
