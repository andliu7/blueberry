import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Vitest configuration for @blueberry/interaction.
 *
 * Deliberately the same shape as packages/chem-core/vitest.config.ts. Two
 * configs that solve the same problem two different ways is how a test suite
 * becomes something nobody wants to touch.
 *
 * WHY THE TESTS IMPORT src/ AND NOT dist/.
 *
 * Same reason chem-core gives: mutation testing rewrites the TypeScript sources
 * and then runs the test command, so a test importing the built package would
 * execute pre-mutation JavaScript and every mutant would survive.
 *
 * WHY chem-core IS ALIASED TO ITS SOURCE.
 *
 * `@blueberry/chem-core` resolves through node_modules to `dist/index.js`, which
 * only exists after a build. That makes `npm test` in a fresh clone fail for a
 * reason that has nothing to do with the tests. Pointing the alias at the source
 * removes the ordering dependency, and the resolver plugin below lets that source
 * load at all.
 *
 * WHY THE PLUGIN EXISTS.
 *
 * Both packages are NodeNext ESM, so their internal imports carry the `.js`
 * extension the emitted JavaScript will use. Vite resolves relative specifiers
 * literally and those `.js` files do not exist next to the sources. The plugin
 * maps a relative `.js` specifier back to the `.ts` beside it, and only when that
 * `.ts` actually exists, so nothing else in resolution changes.
 */
function resolveNodeNextJsToTs(): Plugin {
  return {
    name: "interaction-nodenext-js-to-ts",
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
  resolve: {
    alias: {
      "@blueberry/chem-core": path.resolve(import.meta.dirname, "../chem-core/src/index.ts"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    watch: false,
  },
});
