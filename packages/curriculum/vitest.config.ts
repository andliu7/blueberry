import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Vitest configuration for @blueberry/curriculum.
 *
 * Deliberately a copy of packages/interaction/vitest.config.ts, for the reason
 * that file gives: two configs solving the same problem two different ways is
 * how a test suite becomes something nobody wants to touch. The three comments
 * below are the same three, restated so this file can be read on its own.
 *
 * Tests import src/ and not dist/, so a fresh clone can run them without a build
 * and so mutation testing, if it is ever pointed here, mutates what runs.
 *
 * `@blueberry/chem-core` is aliased to its source for the same reason: the
 * package specifier resolves to dist/index.js, which only exists after a build.
 *
 * The plugin maps a relative ".js" specifier back to the ".ts" beside it, and
 * only when that ".ts" exists. Both packages are NodeNext ESM, so their internal
 * imports carry the extension the emitted JavaScript will use, and Vite resolves
 * relative specifiers literally.
 */
function resolveNodeNextJsToTs(): Plugin {
  return {
    name: "curriculum-nodenext-js-to-ts",
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
