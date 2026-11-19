import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ExtractedResume } from "@/lib/resume/extract";
import type { FileInspectionFailure, ResumeFileFacts } from "./report";
import { INSPECTION_BACKSTOP_MS, MAX_UPLOAD_BYTES } from "./inspectLimits";
import { logger } from "@/lib/logger";

type FileFormat = FileInspectionFailure["extension"];
export type InspectionResult<F extends FileFormat> = Extract<ResumeFileFacts, { format: F }> | FileInspectionFailure;

/** The layout facts, and the resume text when the file passed inspection. */
export interface FileReading<F extends FileFormat> {
  facts: InspectionResult<F>;
  resume: ExtractedResume | null;
  encrypted?: boolean;
}

export class ParseBusyError extends Error {
  readonly status = 429;
  readonly retryAfter = 2;
  constructor(message = "Busy, try again in a moment") {
    super(message);
    this.name = "ParseBusyError";
  }
}

class ParseSemaphore {
  private active = 0;
  private readonly maxActive = 2;
  private readonly queue: Array<() => void> = [];
  private readonly maxQueue = 2;

  async acquire(): Promise<() => void> {
    if (this.active < this.maxActive) {
      this.active++;
      return () => this.release();
    }
    if (this.queue.length >= this.maxQueue) {
      throw new ParseBusyError();
    }
    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.active--;
    if (this.queue.length > 0 && this.active < this.maxActive) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  reset(): void {
    this.active = 0;
    this.queue.length = 0;
  }
}

export const parseSemaphore = new ParseSemaphore();

function getWorkerScript(): { scriptPath: string; useDist: boolean } {
  const distCandidates = [
    path.resolve(process.cwd(), "dist/inspectWorker.js"),
    path.resolve(__dirname, "../../dist/inspectWorker.js"),
  ];
  for (const c of distCandidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) return { scriptPath: c, useDist: true };
  }
  const srcCandidates = [
    path.resolve(process.cwd(), "lib/report/inspectWorker.ts"),
    path.resolve(__dirname, "inspectWorker.ts"),
  ];
  for (const c of srcCandidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) return { scriptPath: c, useDist: false };
  }
  return { scriptPath: srcCandidates[0], useDist: false };
}

const MAX_STDOUT_BYTES = 4 * 1024 * 1024;

async function executeChildParse<F extends FileFormat>(
  extension: F,
  bytes: Uint8Array,
): Promise<FileReading<F>> {
  const failure = (reason: FileInspectionFailure["reason"], encrypted = false): FileReading<F> => ({
    facts: { format: "invalid", extension, reason },
    resume: null,
    encrypted,
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-parse-"));
  const { scriptPath, useDist } = getWorkerScript();
  const nodeBin = process.execPath;
  const isLinux = process.platform === "linux";
  const prlimitBin =
    isLinux && (fs.existsSync("/usr/bin/prlimit") ? "/usr/bin/prlimit" : fs.existsSync("/bin/prlimit") ? "/bin/prlimit" : null);

  let cmd: string;
  let args: string[];

  if (prlimitBin) {
    cmd = prlimitBin;
    args = [
      "--data=402653184",
      nodeBin,
      "--max-old-space-size=128",
      ...(useDist ? [] : ["--import", "tsx"]),
      scriptPath,
      extension,
    ];
  } else {
    cmd = nodeBin;
    args = [
      "--max-old-space-size=128",
      ...(useDist ? [] : ["--import", "tsx"]),
      scriptPath,
      extension,
    ];
  }

  const childEnv: Record<string, string> = {
    PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
    TMPDIR: tempDir,
    NODE_ENV: process.env.NODE_ENV || "production",
    HTTP_PROXY: "http://127.0.0.1:0",
    HTTPS_PROXY: "http://127.0.0.1:0",
    ALL_PROXY: "http://127.0.0.1:0",
    NO_PROXY: "",
  };
  if (process.env.VITEST) {
    childEnv.VITEST = process.env.VITEST;
  }

  return new Promise<FileReading<F>>((resolve) => {
    let resolved = false;
    let timedOut = false;
    let stdoutBytes = 0;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const cleanup = () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore temp cleanup errors
      }
    };

    const done = (result: FileReading<F>) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    let child: ChildProcess;
    try {
      child = spawn(cmd, args, {
        cwd: tempDir,
        env: childEnv as NodeJS.ProcessEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (spawnError) {
      const err = spawnError instanceof Error ? spawnError : new Error(String(spawnError));
      logger.error({ err, reason: "spawn_failed", extension }, "Could not spawn child inspect process");
      done(failure("unreadable"));
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // Child may have already exited
      }
    }, INSPECTION_BACKSTOP_MS);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > MAX_STDOUT_BYTES) {
        try {
          child.kill("SIGKILL");
        } catch {
          // Ignore
        }
        done(failure("too-large"));
        return;
      }
      stdoutChunks.push(chunk);
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error: Error) => {
      logger.error({ err: error, reason: "child_error", extension }, "Child inspect process emitted error");
      done(failure("unreadable"));
    });

    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      if (resolved) return;
      const stdoutText = Buffer.concat(stdoutChunks).toString("utf8");
      const stderrText = Buffer.concat(stderrChunks).toString("utf8");

      const isOomStderr = /out of memory|allocation failed|heap limit|array buffer allocation failed/i.test(stderrText);
      const isSignalKilled = signal === "SIGKILL" || signal === "SIGABRT" || signal === "SIGSEGV" || signal !== null;
      const isOomCode = code === 134 || code === 137;
      const isTooLarge = timedOut || isSignalKilled || isOomCode || isOomStderr;

      if (isTooLarge) {
        done(failure("too-large"));
        return;
      }

      if (stdoutText.trim()) {
        const lines = stdoutText.trim().split("\n");
        let parsed: {
          ok?: boolean;
          errorType?: "too-large" | "unreadable";
          message?: string;
          stack?: string;
          encrypted?: boolean;
          facts?: ResumeFileFacts;
          resume?: ExtractedResume | null;
        } | null = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim();
          if (line.startsWith("{") && line.endsWith("}")) {
            try {
              const obj = JSON.parse(line);
              if (typeof obj === "object" && obj !== null && ("ok" in obj || "facts" in obj)) {
                parsed = obj;
                break;
              }
            } catch {
              // Continue
            }
          }
        }
        if (parsed) {
          if (parsed.ok && parsed.facts) {
            done({
              facts: parsed.facts as InspectionResult<F>,
              resume: parsed.resume ?? null,
              encrypted: parsed.encrypted,
            });
            return;
          }
          if (parsed.errorType === "too-large") {
            done(failure("too-large"));
            return;
          }
          const err = new Error(parsed.message || "File inspection failed in child");
          if (parsed.stack) err.stack = parsed.stack;
          logger.error({ err, reason: "child_unreadable", extension }, "File inspection failed in child process");
          done(failure("unreadable", parsed.encrypted));
          return;
        }
      }

      const err = new Error(stderrText.trim() || `Child process exited with code ${code}`);
      logger.error({ err, reason: "child_exit_error", extension, code, signal }, "Child inspect process exited abnormally");
      done(failure("unreadable"));
    });

    try {
      child.stdin?.end(bytes);
    } catch {
      // Ignore stdin write errors if child closed early
    }
  });
}

/**
 * Reads an uploaded PDF or Word file in an isolated child process with OS-enforced
 * memory (RLIMIT_DATA ~384MB) and V8 heap limits (--max-old-space-size=128),
 * running at most 2 concurrent parses via a semaphore.
 */
export async function readWithinBudget<F extends FileFormat>(
  extension: F,
  file: ArrayBuffer | Uint8Array,
): Promise<FileReading<F>> {
  const failure = (reason: FileInspectionFailure["reason"]): FileReading<F> => ({
    facts: { format: "invalid", extension, reason },
    resume: null,
  });
  if (file.byteLength > MAX_UPLOAD_BYTES) return failure("too-large");
  const source = file instanceof Uint8Array ? file : new Uint8Array(file);
  const bytes = new Uint8Array(source);

  const release = await parseSemaphore.acquire();
  try {
    return await executeChildParse(extension, bytes);
  } finally {
    release();
  }
}

export async function inspectWithinBudget<F extends FileFormat>(
  extension: F,
  file: ArrayBuffer | Uint8Array,
): Promise<InspectionResult<F>> {
  return (await readWithinBudget(extension, file)).facts;
}
