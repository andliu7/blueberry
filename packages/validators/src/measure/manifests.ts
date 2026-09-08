import fs from "node:fs/promises";
import path from "node:path";

import { REPO_ROOT } from "../paths.ts";

/**
 * Reading every workspace manifest's dependency lists.
 *
 * This is the one part of the "@rdkit/rdkit never ships" rule that is measurable before
 * apps/web exists. An import graph assertion needs built output and there is none yet.
 * A dependency declaration needs nothing, and it catches the realistic way the violation
 * arrives, which is somebody running `npm install @rdkit/rdkit` because the WASM build
 * looked like the fast path for canonical SMILES.
 *
 * It is a manifest check, not an import graph check, and the failures it emits say so.
 * It does not replace gate 3, it is the part of gate 3 that can be armed today.
 */

export interface DeclaredDependency {
  /** Repo relative path of the manifest, forward slashes. */
  readonly manifest: string;
  /** dependencies, devDependencies, peerDependencies, or optionalDependencies. */
  readonly section: string;
  readonly name: string;
  readonly range: string;
}

const SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

function toRepoRelative(absolute: string): string {
  return path.relative(REPO_ROOT, absolute).split(path.sep).join("/");
}

async function listChildDirectories(parent: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(parent, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
      .map((entry) => path.join(parent, entry.name));
  } catch {
    return [];
  }
}

/**
 * Every manifest this repository owns.
 *
 * Derived from the workspace globs in the root package.json, `packages/*` and `apps/*`,
 * rather than hardcoded, so a package added later is covered without anyone remembering
 * to add it here.
 */
export async function findWorkspaceManifests(): Promise<string[]> {
  const roots = [
    REPO_ROOT,
    ...(await listChildDirectories(path.join(REPO_ROOT, "packages"))),
    ...(await listChildDirectories(path.join(REPO_ROOT, "apps"))),
  ];

  const manifests: string[] = [];
  for (const root of roots) {
    const candidate = path.join(root, "package.json");
    try {
      await fs.stat(candidate);
      manifests.push(candidate);
    } catch {
      // No manifest here. An empty apps/ directory is the normal Phase 0 state.
    }
  }
  return manifests;
}

export async function readDeclaredDependencies(): Promise<DeclaredDependency[]> {
  const declared: DeclaredDependency[] = [];

  for (const manifestPath of await findWorkspaceManifests()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch {
      // A manifest that will not parse is not this check's finding to report, and
      // guessing at its contents would be worse than saying nothing about it. npm
      // itself will fail loudly on the same file.
      continue;
    }
    if (typeof parsed !== "object" || parsed === null) continue;
    const manifest = parsed as Record<string, unknown>;

    for (const section of SECTIONS) {
      const block = manifest[section];
      if (typeof block !== "object" || block === null) continue;
      for (const [name, range] of Object.entries(block as Record<string, unknown>)) {
        declared.push({
          manifest: toRepoRelative(manifestPath),
          section,
          name,
          range: typeof range === "string" ? range : String(range),
        });
      }
    }
  }

  return declared;
}
