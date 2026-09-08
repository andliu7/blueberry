import fs from "node:fs/promises";
import path from "node:path";

import { REPO_ROOT } from "../paths.ts";
import { GAME_ROUTE_BANNED } from "./banned.ts";
import { bundleForMeasurement } from "./bundle.ts";
import { gzippedByteLength } from "./gzip.ts";
import { findBannedReach, followStaticEdgesOnly, type BannedReach } from "./import-graph.ts";
import {
  BUDGET_SUBJECTS_MANIFEST,
  classifyWebAppSubject,
  readBudgetSubjectsManifest,
  type SubjectClassification,
} from "./subject.ts";

/**
 * Measuring the game route's initial payload and its Ketcher isolation.
 *
 * One module, two gates, because both answer the same underlying question: which files
 * does a student download before any dynamic import resolves. The size gate weighs that
 * set. The isolation gate asks whether Ketcher or RDKit is in it.
 *
 * How the initial set is determined, and why not some easier way:
 *
 *   The graph comes from an esbuild metafile over the already emitted chunks, walked
 *   with static edges only. A dynamic import is a boundary, which is precisely the
 *   Ketcher rule: "lazy only, must never be reachable from the game route's initial
 *   chunk". Following dynamic edges would score the lazy chunk as initial and make the
 *   correct architecture look like a violation.
 *
 *   The bytes come from the emitted files on disk, gzipped one file at a time and
 *   summed. Not from esbuild's re-bundle. Two reasons: the emitted files are what the
 *   server actually serves, and each is a separate HTTP response that a server
 *   compresses separately, so per file gzip is both the realistic number and the
 *   conservative one. Concatenating first and gzipping once would report a smaller
 *   figure than the student downloads, which is the wrong direction for a ceiling.
 *
 *   Guessing the entry chunk by filename is refused. apps/web publishes
 *   dist/budget-subjects.json naming it. See subject.ts for that contract and for why a
 *   heuristic is not acceptable here.
 *
 * appRoot is a parameter rather than a constant so budget-gate-self-test.ts can drive
 * this against synthetic app directories in all three subject states. A measurement path
 * that only ever runs against a subject that does not exist yet is untested code.
 */

export const WEB_APP_ROOT = path.join(REPO_ROOT, "apps", "web");

export interface InitialChunk {
  /** Path relative to the app's dist directory. */
  readonly file: string;
  readonly rawBytes: number;
  readonly gzipBytes: number;
}

export type WebAppOutcome =
  | { readonly kind: "subject-absent"; readonly classification: SubjectClassification }
  | { readonly kind: "subject-unbuilt"; readonly classification: SubjectClassification }
  | { readonly kind: "manifest-missing"; readonly classification: SubjectClassification }
  | {
      readonly kind: "manifest-malformed";
      readonly detail: string;
      readonly classification: SubjectClassification;
    }
  | { readonly kind: "entry-missing"; readonly entryFile: string }
  | { readonly kind: "bundler-absent"; readonly detail: string }
  | { readonly kind: "build-failed"; readonly messages: readonly string[] }
  | {
      readonly kind: "measured";
      readonly entryFile: string;
      readonly initialChunks: readonly InitialChunk[];
      readonly totalGzipBytes: number;
      /** Banned packages reached over static edges. Any entry here is a violation. */
      readonly bannedReach: readonly BannedReach[];
      /** Chunks the manifest declared lazy, echoed back so the report can name them. */
      readonly declaredLazyChunks: readonly string[];
      /** Extra initial assets, such as CSS, that the manifest did not declare. */
      readonly additionalAssetsDeclared: boolean;
    };

/**
 * Externals for the walk.
 *
 * Ketcher and RDKit are marked external so that a bare specifier surviving in emitted
 * output is reported as an import chain rather than as an unresolved module. Detection
 * must not depend on the offending package being installed, for the same reason as in
 * bundle.ts.
 */
const WEB_APP_EXTERNALS: readonly string[] = [
  "ketcher-core",
  "ketcher-react",
  "ketcher-standalone",
  "@rdkit/rdkit",
];

async function fileBytes(absolute: string): Promise<Uint8Array | null> {
  try {
    return await fs.readFile(absolute);
  } catch {
    return null;
  }
}

export async function measureGameRoute(appRoot: string = WEB_APP_ROOT): Promise<WebAppOutcome> {
  const classification = await classifyWebAppSubject(appRoot);
  if (classification.state === "absent") return { kind: "subject-absent", classification };
  if (classification.state === "unbuilt") return { kind: "subject-unbuilt", classification };

  const manifest = await readBudgetSubjectsManifest(appRoot);
  if (manifest.kind === "missing") return { kind: "manifest-missing", classification };
  if (manifest.kind === "malformed") {
    return { kind: "manifest-malformed", detail: manifest.detail, classification };
  }

  const distDir = classification.distDir;
  const entryAbsolute = path.resolve(distDir, manifest.manifest.gameRouteEntry);
  if ((await fileBytes(entryAbsolute)) === null) {
    return { kind: "entry-missing", entryFile: manifest.manifest.gameRouteEntry };
  }

  const bundled = await bundleForMeasurement({
    entryPointAbsolute: entryAbsolute,
    external: WEB_APP_EXTERNALS,
    // The emitted chunks are already minified by the app's own build, and their on disk
    // bytes are what gets weighed. Re-minifying would cost time and change no number.
    minify: false,
  });

  if (bundled.kind === "bundler-absent") return { kind: "bundler-absent", detail: bundled.detail };
  if (bundled.kind === "build-failed") {
    return { kind: "build-failed", messages: bundled.messages };
  }

  const bannedReach = findBannedReach(
    bundled.metafile,
    bundled.entryInput,
    GAME_ROUTE_BANNED,
    followStaticEdgesOnly,
  );

  // The initial set is every emitted file the static walk reached. metafile input keys
  // are repo relative because absWorkingDir is the repo root, so they resolve back to
  // real files without any guessing about the working directory.
  const reached = new Set<string>([bundled.entryInput]);
  const queue: string[] = [bundled.entryInput];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) continue;
    const input = bundled.metafile.inputs[current];
    if (input === undefined) continue;
    for (const record of input.imports) {
      if (!followStaticEdgesOnly(record.kind)) continue;
      if (record.external === true) continue;
      if (bundled.metafile.inputs[record.path] === undefined) continue;
      if (reached.has(record.path)) continue;
      reached.add(record.path);
      queue.push(record.path);
    }
  }

  const declaredAssets = manifest.manifest.additionalInitialAssets ?? [];
  const initialChunks: InitialChunk[] = [];

  for (const repoRelative of [...reached].sort()) {
    const absolute = path.resolve(REPO_ROOT, repoRelative);
    const bytes = await fileBytes(absolute);
    // A metafile input with no file behind it is a virtual module from a plugin. It has
    // no download cost of its own because its bytes are inside a file already counted.
    if (bytes === null) continue;
    initialChunks.push({
      file: path.relative(distDir, absolute).split(path.sep).join("/"),
      rawBytes: bytes.byteLength,
      gzipBytes: gzippedByteLength(bytes),
    });
  }

  for (const asset of declaredAssets) {
    const absolute = path.resolve(distDir, asset);
    const bytes = await fileBytes(absolute);
    if (bytes === null) continue;
    initialChunks.push({
      file: asset,
      rawBytes: bytes.byteLength,
      gzipBytes: gzippedByteLength(bytes),
    });
  }

  return {
    kind: "measured",
    entryFile: manifest.manifest.gameRouteEntry,
    initialChunks,
    totalGzipBytes: initialChunks.reduce((sum, chunk) => sum + chunk.gzipBytes, 0),
    bannedReach,
    declaredLazyChunks: manifest.manifest.lazyChunks,
    additionalAssetsDeclared: declaredAssets.length > 0,
  };
}

export { BUDGET_SUBJECTS_MANIFEST };
