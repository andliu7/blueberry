import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Vitest configuration for @blueberry/economy.
 *
 * Deliberately the same shape as packages/curriculum/vitest.config.ts, for the
 * reason that file gives: two configs solving the same problem two different
 * ways is how a test suite becomes something nobody wants to touch. This one is
 * shorter because the package has no workspace dependency to alias.
 *
 * Tests import src/ and not dist/, so a fresh clone can run them without a build
 * and so mutation testing, if it is ever pointed here, mutates what runs.
 *
 * The plugin maps a relative ".js" specifier back to the ".ts" beside it, and
 * only when that ".ts" exists. This package is NodeNext ESM, so its internal
 * imports carry the extension the emitted JavaScript will use, and Vite resolves
 * relative specifiers literally.
 */
function resolveNodeNextJsToTs(): Plugin {
  return {
    name: "economy-nodenext-js-to-ts",
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
    watch: false,
  },
});
