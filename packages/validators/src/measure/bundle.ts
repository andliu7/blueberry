import { REPO_ROOT } from "../paths.ts";
import { gzippedByteLength } from "./gzip.ts";

/**
 * Bundling built output, once, so every budget gate scores the same way.
 *
 * Three deliberate choices, each of which changes the number:
 *
 *   bundle: true      The ceilings in CLAUDE.md are on what a student downloads, and a
 *                     student downloads a bundle. tsc emits fifteen loose ES modules;
 *                     gzipping those separately and adding them up is not the number,
 *                     because gzip's window spans the whole file and per-file framing is
 *                     counted fifteen times.
 *
 *   minify: true      Same reason. Nothing ships unminified.
 *
 *   treeShaking:false Conservative on purpose. The chem-core ceiling is on the package,
 *                     not on one consumer's slice of it. Tree shaking from the barrel
 *                     entry would score whatever that entry happens to re-export today
 *                     and would quietly shrink the measured size when a consumer's usage
 *                     changes, which is the wrong direction for a ceiling. It also keeps
 *                     the purity walk honest: a module that reaches React must not be
 *                     able to vanish from the graph because nothing imported its symbol.
 *
 * The bundler is esbuild. It IS now declared, in EXTERNAL_DATA in src/integrity.ts, with
 * the role `no-data` and the argument for that role written out there. It is still not in
 * this package's package.json dependencies, which is a separate and real gap: it resolves
 * from the root node_modules as a transitive dependency of vitest. That gap is reported to
 * the orchestrator rather than papered over here, because package.json is outside this
 * work's scope and adding a dependency changes the lockfile. If esbuild cannot be resolved,
 * this module says so and the calling check fails. It never falls back to an estimate.
 */

/** The subset of esbuild's metafile this repository reads. */
export interface MetafileImport {
  readonly path: string;
  readonly kind: string;
  readonly external?: boolean;
  readonly original?: string;
}

export interface MetafileInput {
  readonly bytes: number;
  readonly imports: readonly MetafileImport[];
}

export interface MetafileOutput {
  readonly bytes: number;
  readonly entryPoint?: string;
}

export interface Metafile {
  readonly inputs: Readonly<Record<string, MetafileInput>>;
  readonly outputs: Readonly<Record<string, MetafileOutput>>;
}

interface EsbuildOutputFile {
  readonly contents: Uint8Array;
  readonly text: string;
  readonly path: string;
}

interface EsbuildMessage {
  readonly text: string;
  readonly location: { readonly file: string; readonly line: number } | null;
}

interface EsbuildResult {
  readonly outputFiles?: readonly EsbuildOutputFile[];
  readonly metafile?: Metafile;
  readonly errors: readonly EsbuildMessage[];
}

interface EsbuildModule {
  build(options: Record<string, unknown>): Promise<EsbuildResult>;
}

export type BundleOutcome =
  | {
      readonly kind: "measured";
      /** Repo relative path of the entry, as it appears in metafile.inputs. */
      readonly entryInput: string;
      readonly rawBytes: number;
      readonly gzipBytes: number;
      /** The minified bundle text, for the DOM global scan. Comments are already gone. */
      readonly code: string;
      readonly metafile: Metafile;
    }
  | {
      readonly kind: "bundler-absent";
      readonly detail: string;
    }
  | {
      readonly kind: "build-failed";
      readonly messages: readonly string[];
    };

export interface BundleRequest {
  /** Absolute path to a built JavaScript entry point. */
  readonly entryPointAbsolute: string;
  /**
   * Specifiers esbuild must not try to resolve.
   *
   * Every banned package goes in here. If `react` were left resolvable and were not
   * installed, esbuild would fail the whole build with "Could not resolve react" and the
   * purity gate would report a build error instead of an import chain. Marking it
   * external means the import is recorded in the metafile with its specifier intact and
   * the walk can print the chain that reaches it, whether or not the package exists on
   * disk. Detection must not depend on the offending package being installed.
   */
  readonly external: readonly string[];
  /**
   * Minify before weighing. Default true, because nothing ships unminified and every
   * ceiling in CLAUDE.md is on shipped bytes.
   *
   * The game route gate passes false: it does not weigh esbuild's output at all, it
   * weighs the chunk files Vite already emitted and only uses the metafile for the
   * graph. Re-minifying already-minified chunks would cost time and change nothing.
   */
  readonly minify?: boolean;
}

let cachedEsbuild: EsbuildModule | null = null;
let cachedEsbuildError: string | null = null;

async function loadEsbuild(): Promise<EsbuildModule | { readonly error: string }> {
  if (cachedEsbuild !== null) return cachedEsbuild;
  if (cachedEsbuildError !== null) return { error: cachedEsbuildError };
  try {
    // LITERAL SPECIFIER, ON PURPOSE. This line used to read `const specifier = "esbuild"`
    // followed by `import(specifier)`, to keep typecheck working on a machine where
    // esbuild is absent. The cost of that was invisibility: `scanImports` in integrity.ts
    // cannot read a specifier that is not in the text, so esbuild appeared in no census,
    // and the shape hid ANY package pulled in that way, not only this one. The fourth pass
    // adversary filed it. The scanner now refuses a non literal specifier outright, so the
    // honest fix is at the call site rather than a bigger regex.
    //
    // What that trades: typecheck now needs esbuild's own declarations to resolve. It
    // arrives with vitest, a root devDependency, so `npm install` always brings it. The
    // cast through `unknown` is unchanged and the shape actually used is EsbuildModule
    // above, so nothing here depends on esbuild's types being right.
    const loaded = (await import("esbuild")) as unknown as EsbuildModule;
    if (typeof loaded.build !== "function") {
      cachedEsbuildError = "esbuild resolved but has no build() function";
      return { error: cachedEsbuildError };
    }
    cachedEsbuild = loaded;
    return loaded;
  } catch (error) {
    cachedEsbuildError = error instanceof Error ? error.message : String(error);
    return { error: cachedEsbuildError };
  }
}

export async function bundleForMeasurement(request: BundleRequest): Promise<BundleOutcome> {
  const esbuild = await loadEsbuild();
  if ("error" in esbuild) {
    return {
      kind: "bundler-absent",
      detail:
        `esbuild could not be loaded: ${esbuild.error}. ` +
        `No bundle was produced and no size was measured. esbuild is not declared in ` +
        `packages/validators/package.json and currently resolves only as a transitive ` +
        `dependency of vitest from the root node_modules.`,
    };
  }

  let result: EsbuildResult;
  try {
    result = await esbuild.build({
      // Absolute working directory, so metafile keys are repo relative no matter who
      // invoked the validator or from where. paths.ts makes the same point about roots.
      absWorkingDir: REPO_ROOT,
      entryPoints: [request.entryPointAbsolute],
      bundle: true,
      minify: request.minify ?? true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      treeShaking: false,
      legalComments: "none",
      metafile: true,
      write: false,
      logLevel: "silent",
      external: [...request.external],
    });
  } catch (error) {
    const messages =
      typeof error === "object" && error !== null && "errors" in error
        ? ((error as { errors: readonly EsbuildMessage[] }).errors ?? []).map(
            (message) =>
              `${message.location === null ? "" : `${message.location.file}:${message.location.line}: `}${message.text}`,
          )
        : [error instanceof Error ? error.message : String(error)];
    return { kind: "build-failed", messages: messages.length > 0 ? messages : ["unknown build error"] };
  }

  const output = result.outputFiles?.[0];
  const metafile = result.metafile;
  if (output === undefined || metafile === undefined) {
    return { kind: "build-failed", messages: ["esbuild produced no output file or no metafile"] };
  }

  const entryInput = Object.values(metafile.outputs).find(
    (candidate) => candidate.entryPoint !== undefined,
  )?.entryPoint;
  if (entryInput === undefined) {
    return { kind: "build-failed", messages: ["esbuild metafile names no entry point"] };
  }

  return {
    kind: "measured",
    entryInput,
    rawBytes: output.contents.byteLength,
    gzipBytes: gzippedByteLength(output.contents),
    code: output.text,
    metafile,
  };
}
