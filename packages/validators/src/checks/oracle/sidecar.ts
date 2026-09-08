import { spawn } from "node:child_process";

import { PACKAGE_ROOT } from "../../paths.ts";
import { SIDECAR_PATH } from "./corpus.ts";
import {
  ORACLE_PROTOCOL,
  ORACLE_VERSION,
  type OracleRequest,
  type OracleResponse,
} from "./payload.ts";

/**
 * Spawning packages/validators/python/oracle_sidecar.py.
 *
 * ONE PROCESS PER RUN, NOT ONE PER STATE.
 *
 * CONTRACT.md's request carries a list of states, so the whole corpus goes over in a
 * single stdin write. Python starts in roughly a second on Windows once RDKit is
 * imported, and the analysis of one small molecule is under a millisecond, so per state
 * spawning would make the oracle's cost the interpreter's startup multiplied by the
 * corpus size. run.ts memoises this call so the process is spawned once for the whole
 * suite and all five oracle checks read the same response.
 *
 * MISSING PYTHON, MISSING RDKIT, AND A CRASHED SIDECAR ARE FAILURES, NEVER SKIPS.
 *
 * This is the single most important property of this file. An oracle that cannot run and
 * reports green is worse than no oracle, because the suite then claims chem-core has been
 * graded against a reference implementation when nothing graded anything. There is no
 * code path here that returns a passing result, and no environment variable that disables
 * the oracle. Every way this can go wrong produces a `failed` with the raw evidence
 * attached: exit code, stderr, and the first part of whatever landed on stdout.
 *
 * The interpreter is `python`, overridable with BLUEBERRY_PYTHON for a machine where the
 * RDKit environment is not the default one. An override that does not work is still a
 * loud failure; it cannot be used to make the oracle disappear.
 */

/** Interpreter used when BLUEBERRY_PYTHON is not set. */
export const DEFAULT_PYTHON = "python";

/**
 * Hard ceiling on the sidecar. A hung process must not hang CI forever.
 *
 * The whole corpus round trips in under two seconds on the development machine, so this
 * is three orders of magnitude of headroom and a timeout means something is genuinely
 * wrong rather than that the corpus grew.
 */
export const SIDECAR_TIMEOUT_MS = 120_000;

/** stderr is quoted back on failure. Long tracebacks are cut at the end, not the start. */
const MAX_STDERR_LINES = 40;
const MAX_STDOUT_QUOTE = 600;

export interface SidecarOk {
  readonly kind: "ok";
  readonly response: OracleResponse;
  readonly interpreter: string;
  readonly durationMs: number;
}

export interface SidecarFailed {
  readonly kind: "failed";
  /** One line naming what went wrong. Goes in a CheckFailure `actual`. */
  readonly summary: string;
  /** Raw evidence, one entry per line, printed under the summary. */
  readonly detail: readonly string[];
}

export type SidecarOutcome = SidecarOk | SidecarFailed;

export function interpreterPath(): string {
  const override = process.env["BLUEBERRY_PYTHON"];
  return override !== undefined && override.trim() !== "" ? override : DEFAULT_PYTHON;
}

function tailLines(text: string, limit: number): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim() !== "");
  if (lines.length <= limit) return lines;
  return [`... ${lines.length - limit} earlier line(s) omitted`, ...lines.slice(-limit)];
}

interface RawRun {
  readonly spawnError: NodeJS.ErrnoException | null;
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly durationMs: number;
}

function spawnSidecar(interpreter: string, request: OracleRequest): Promise<RawRun> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    // No shell. A shell would reinterpret the path on Windows and would also mean the
    // request could be affected by shell quoting, which it must never be.
    const child = spawn(interpreter, [SIDECAR_PATH], {
      cwd: PACKAGE_ROOT,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, SIDECAR_TIMEOUT_MS);

    const finish = (raw: Omit<RawRun, "durationMs">): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...raw, durationMs: performance.now() - startedAt });
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      finish({
        spawnError: error as NodeJS.ErrnoException,
        code: null,
        signal: null,
        stdout,
        stderr,
        timedOut,
      });
    });

    child.on("close", (code, signal) => {
      finish({ spawnError: null, code, signal, stdout, stderr, timedOut });
    });

    // A write error here is an EPIPE from a sidecar that died before reading stdin. The
    // close handler above reports the real cause, so this callback only has to not throw.
    child.stdin.on("error", () => undefined);
    child.stdin.end(JSON.stringify(request), "utf8");
  });
}

function looksLikeMissingRdkit(stderr: string): boolean {
  return /ModuleNotFoundError: No module named ['"]rdkit/.test(stderr);
}

/**
 * Send one request, get one response, or a `failed` naming exactly what went wrong.
 *
 * Every branch below is a way the oracle can fail to be an oracle, and each one is
 * reported rather than absorbed.
 */
export async function callSidecar(request: OracleRequest): Promise<SidecarOutcome> {
  const interpreter = interpreterPath();
  const raw = await spawnSidecar(interpreter, request);
  const stderrLines = tailLines(raw.stderr, MAX_STDERR_LINES);
  const invocation = `${interpreter} ${SIDECAR_PATH}`;

  if (raw.spawnError !== null) {
    const code = raw.spawnError.code ?? "unknown";
    const isMissing = code === "ENOENT";
    return {
      kind: "failed",
      summary: isMissing
        ? `python interpreter ${JSON.stringify(interpreter)} was not found on PATH`
        : `could not start ${JSON.stringify(interpreter)}: ${code}`,
      detail: [
        `invocation: ${invocation}`,
        `spawn error: ${raw.spawnError.message}`,
        ...(isMissing
          ? [
              "CLAUDE.md, Environment: Python 3 with RDKit is required for the validator suite.",
              "Set BLUEBERRY_PYTHON to the interpreter that has RDKit if it is not `python`.",
              "The oracle does not skip. Until an interpreter is reachable, every oracle check fails.",
            ]
          : []),
        ...stderrLines,
      ],
    };
  }

  if (raw.timedOut) {
    return {
      kind: "failed",
      summary: `the sidecar did not answer within ${SIDECAR_TIMEOUT_MS} ms and was killed`,
      detail: [
        `invocation: ${invocation}`,
        `states sent: ${request.states.length}`,
        ...stderrLines,
      ],
    };
  }

  if (raw.code !== 0 || raw.signal !== null) {
    const missingRdkit = looksLikeMissingRdkit(raw.stderr);
    return {
      kind: "failed",
      summary: missingRdkit
        ? `RDKit is not importable by ${JSON.stringify(interpreter)}`
        : `the sidecar exited ${raw.code === null ? `on signal ${raw.signal}` : `with code ${raw.code}`}`,
      detail: [
        `invocation: ${invocation}`,
        ...(missingRdkit
          ? [
              "CLAUDE.md, Environment: Python 3 with RDKit is required for the validator suite.",
              "D3 in docs/INHERITED-DECISIONS.md makes RDKit the oracle that grades chem-core.",
              "Without it nothing grades chem-core, so the oracle checks fail rather than pass.",
            ]
          : []),
        ...(raw.stdout.trim() === ""
          ? ["stdout: empty, so no response was produced at all"]
          : [`stdout (first ${MAX_STDOUT_QUOTE} chars): ${raw.stdout.slice(0, MAX_STDOUT_QUOTE)}`]),
        ...(stderrLines.length > 0 ? ["stderr:", ...stderrLines] : ["stderr: empty"]),
      ],
    };
  }

  if (raw.stdout.trim() === "") {
    return {
      kind: "failed",
      summary: "the sidecar exited 0 but wrote nothing to stdout",
      detail: [`invocation: ${invocation}`, ...stderrLines],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.stdout);
  } catch (error) {
    return {
      kind: "failed",
      summary: "the sidecar wrote something that is not JSON to stdout",
      detail: [
        `invocation: ${invocation}`,
        `parse error: ${(error as Error).message}`,
        `stdout (first ${MAX_STDOUT_QUOTE} chars): ${raw.stdout.slice(0, MAX_STDOUT_QUOTE)}`,
        ...stderrLines,
      ],
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      kind: "failed",
      summary: "the sidecar response is not a JSON object",
      detail: [`invocation: ${invocation}`, `got: ${typeof parsed}`],
    };
  }

  const response = parsed as OracleResponse;

  if (response.protocol !== ORACLE_PROTOCOL || response.version !== ORACLE_VERSION) {
    return {
      kind: "failed",
      summary:
        `response speaks ${JSON.stringify(response.protocol)} v${response.version}, ` +
        `this bridge speaks ${JSON.stringify(ORACLE_PROTOCOL)} v${ORACLE_VERSION}`,
      detail: [
        `invocation: ${invocation}`,
        "CONTRACT.md: bump `version` on any incompatible change and reject a version you do not understand rather than guessing.",
      ],
    };
  }

  if (response.fatal !== null && response.fatal !== undefined) {
    return {
      kind: "failed",
      summary: `the sidecar refused the request: ${response.fatal}`,
      detail: [
        `invocation: ${invocation}`,
        `states sent: ${request.states.length}`,
        "A fatal means the payload did not match CONTRACT.md, so no state was analysed.",
      ],
    };
  }

  if (typeof response.rdkitVersion !== "string" || response.rdkitVersion.trim() === "") {
    return {
      kind: "failed",
      summary: "the response carries no rdkitVersion",
      detail: [
        `invocation: ${invocation}`,
        "An oracle that cannot say which RDKit answered is not a reference implementation.",
      ],
    };
  }

  const selfTest = response.selfTest;
  if (selfTest === undefined || selfTest === null || !Array.isArray(selfTest.cases)) {
    return {
      kind: "failed",
      summary: "the response carries no self test",
      detail: [
        `invocation: ${invocation}`,
        "CONTRACT.md: the self test runs on every invocation through the same code path as real input.",
      ],
    };
  }

  if (selfTest.passed !== true || selfTest.cases.some((one) => one.passed !== true)) {
    const broken = selfTest.cases.filter((one) => one.passed !== true);
    return {
      kind: "failed",
      summary: `the sidecar self test failed ${broken.length} of ${selfTest.cases.length} case(s)`,
      detail: [
        `invocation: ${invocation}`,
        `rdkit ${response.rdkitVersion}, python ${response.pythonVersion}`,
        ...broken.map(
          (one) => `  ${one.name}: expected ${one.expected}, actual ${String(one.actual)}`,
        ),
        "CONTRACT.md: a wrong convention makes every descriptor result wrong in the same",
        "direction, which is the failure a green suite would otherwise hide. No descriptor",
        "result from this run is trustworthy, so every oracle check fails.",
      ],
    };
  }

  if (!Array.isArray(response.states)) {
    return {
      kind: "failed",
      summary: "the response carries no states array",
      detail: [`invocation: ${invocation}`],
    };
  }

  return {
    kind: "ok",
    response,
    interpreter,
    durationMs: raw.durationMs,
  };
}
