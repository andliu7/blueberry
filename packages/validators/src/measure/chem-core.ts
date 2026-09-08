import fs from "node:fs/promises";
import path from "node:path";

import { REPO_ROOT } from "../paths.ts";
import { CHEM_CORE_BANNED } from "./banned.ts";
import { bundleForMeasurement, type BundleOutcome } from "./bundle.ts";

/**
 * chem-core's built output, located and bundled once per process.
 *
 * Two checks read this, the size gate and the purity gate, and they must read the same
 * bytes. If each bundled independently they could disagree, and a report where the size
 * gate and the purity gate describe different builds is not evidence about either.
 *
 * The entry point is resolved from chem-core's own package.json exports map rather than
 * hardcoded as dist/index.js. That map is the contract a consumer resolves through, so
 * it is the thing whose size and purity the budget is actually about. If someone changes
 * the exports map, this follows them.
 */

export const CHEM_CORE_ROOT = path.join(REPO_ROOT, "packages", "chem-core");

export type EntryResolution =
  | { readonly kind: "ok"; readonly absolute: string; readonly source: string }
  | { readonly kind: "unresolved"; readonly detail: string };

export async function resolveChemCoreEntry(): Promise<EntryResolution> {
  const manifestPath = path.join(CHEM_CORE_ROOT, "package.json");
  let manifest: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return { kind: "unresolved", detail: `${manifestPath} is not a JSON object` };
    }
    manifest = parsed as Record<string, unknown>;
  } catch (error) {
    return { kind: "unresolved", detail: `cannot read ${manifestPath}: ${String(error)}` };
  }

  const exportsField = manifest["exports"];
  let relative: string | null = null;
  let source = "";

  if (typeof exportsField === "object" && exportsField !== null) {
    const root = (exportsField as Record<string, unknown>)["."];
    if (typeof root === "string") {
      relative = root;
      source = 'exports["."]';
    } else if (typeof root === "object" && root !== null) {
      const fallback = (root as Record<string, unknown>)["default"];
      if (typeof fallback === "string") {
        relative = fallback;
        source = 'exports["."].default';
      }
    }
  }
  if (relative === null && typeof manifest["main"] === "string") {
    relative = manifest["main"];
    source = "main";
  }
  if (relative === null) {
    return {
      kind: "unresolved",
      detail: `${manifestPath} declares neither exports["."] nor main, so there is no entry to measure`,
    };
  }

  const absolute = path.resolve(CHEM_CORE_ROOT, relative);
  try {
    await fs.stat(absolute);
  } catch {
    return {
      kind: "unresolved",
      detail:
        `${source} points at ${relative}, which does not exist. chem-core has not been ` +
        `built. Run \`npm run build\` from the repository root. Nothing was measured.`,
    };
  }

  return { kind: "ok", absolute, source };
}

/** Every emitted JavaScript module in chem-core's dist, repo relative, sorted. */
export async function listChemCoreDistModules(): Promise<string[]> {
  const distDir = path.join(CHEM_CORE_ROOT, "dist");
  const collected: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        collected.push(path.relative(REPO_ROOT, absolute).split(path.sep).join("/"));
      }
    }
  };

  await walk(distDir);
  collected.sort();
  return collected;
}

/**
 * Everything the purity gate marks external so esbuild never has to resolve it.
 *
 * Derived from the ban list rather than written twice. A package added to
 * CHEM_CORE_BANNED and not to this list would make the build fail with "Could not
 * resolve" instead of reporting the import chain, which is a worse failure message for
 * the same underlying violation.
 */
export const CHEM_CORE_EXTERNALS: readonly string[] = [
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "react-is",
  "react-native",
  "scheduler",
  "three",
  "@react-three/fiber",
  "@react-three/drei",
  "@rdkit/rdkit",
  "ketcher-core",
  "ketcher-react",
  "ketcher-standalone",
  "jsdom",
  "happy-dom",
  "linkedom",
  "cheerio",
];

/**
 * What measureChemCore can return.
 *
 * Spelled out rather than written as `BundleOutcome | EntryResolution`, because that
 * union would carry EntryResolution's "ok" variant into every caller's switch. A caller
 * that narrowed away "unresolved" would still be holding a possible "ok" with no bytes
 * on it, and the compiler would be right to complain. The three failure kinds are kept
 * distinct on purpose: not built, no bundler, and build failed are three different
 * problems with three different fixes.
 */
export type ChemCoreMeasurement =
  | BundleOutcome
  | { readonly kind: "unresolved"; readonly detail: string };

let cached: Promise<ChemCoreMeasurement> | null = null;

/**
 * Bundle chem-core once. Subsequent callers get the same result object.
 *
 * Returns the EntryResolution failure directly when there is nothing to bundle, so the
 * caller can distinguish "chem-core is not built" from "the bundler is missing" from
 * "the build failed". Those are three different problems with three different fixes and
 * collapsing them into one message costs someone an afternoon.
 */
export function measureChemCore(): Promise<ChemCoreMeasurement> {
  cached ??= (async (): Promise<ChemCoreMeasurement> => {
    const entry = await resolveChemCoreEntry();
    if (entry.kind === "unresolved") return entry;
    return await bundleForMeasurement({
      entryPointAbsolute: entry.absolute,
      external: CHEM_CORE_EXTERNALS,
    });
  })();
  return cached;
}

/** The ban list the purity gate applies, re-exported so checks import one module. */
export { CHEM_CORE_BANNED };
