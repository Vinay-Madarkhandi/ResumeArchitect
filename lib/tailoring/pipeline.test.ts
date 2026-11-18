import { describe, expect, it } from "vitest";
import { markdownToDocument } from "@/lib/documentMarkdown";
import type { JsonModel, JsonRequest } from "@/lib/gemini/model";
import type { PipelineEvent } from "@/lib/schemas/tailoring";
import { runPipeline, type PipelineStore, type SessionPatch } from "@/lib/tailoring/pipeline";
import { diffUnits } from "@/lib/resume/diff";
import { toUnits } from "@/lib/resume/units";

const SOURCE = markdownToDocument(`# Ada Lovelace

ada@example.com · +1 415 555 0100

## Summary

Backend engineer who likes reliable systems.

## Experience

### Engineer — Analytical Engines Ltd

- Worked on services written in Golang backed by Postgres
- Reduced build time by 40%

## Skills

Go, PostgreSQL, Docker`);

const JOB = {
  title: "Senior Backend Engineer",
  company: "Northwind",
  seniority: "Senior",
  summary: "Own the payments platform.",
  requirements: [
    { id: "go", label: "Go", aliases: ["Golang"], importance: "must", category: "skill" },
    { id: "pg", label: "PostgreSQL", aliases: ["Postgres"], importance: "must", category: "tool" },
    { id: "k8s", label: "Kubernetes", aliases: [], importance: "nice", category: "tool" },
  ],
  keywords: [{ term: "payments", aliases: [] }],
};

const FACTS = {
  title: JOB.title,
  level: "senior",
  hardSkills: [{ term: "Go", importance: "high" }, { term: "PostgreSQL", importance: "high" }, { term: "Kubernetes", importance: "low" }],
  otherKeywords: [{ term: "payments", importance: "medium" }],
};

const POSTING = "Senior Backend Engineer for Go, PostgreSQL, and Kubernetes services on the payments platform.";

const TAILOR = {
  summary: "Leads with backend depth in Go and PostgreSQL.",
  edits: [
    { op: "rewrite", line: 4, text: "Backend engineer building reliable **Go** and **PostgreSQL** services for payments.", reason: "Mirrors the role's focus.", requirementIds: ["go", "pg"] },
    { op: "rewrite", line: 7, text: "Built Go services on Postgres processing 2M payments a day on Kubernetes", reason: "Leads with impact.", requirementIds: ["go"] },
    { op: "insert_after", line: 8, text: "Containerized services with Docker", reason: "Shows deployment experience.", requirementIds: [] },
    { op: "rewrite", line: 99, text: "nonsense", reason: "Out of range.", requirementIds: [] },
  ],
};

function fakeModel(replies: Array<unknown | Error>): JsonModel & { calls: JsonRequest[] } {
  const calls: JsonRequest[] = [];
  return {
    name: "fake",
    calls,
    async generate(req) {
      calls.push(req);
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return JSON.stringify(next);
    },
  };
}

function memoryStore() {
  const sessions = new Map<string, SessionPatch & { sourceSnapshot?: unknown }>();
  const resumes = new Map<string, unknown>();
  const store: PipelineStore = {
    async createSession({ sourceSnapshot }) {
      sessions.set("s1", { sourceSnapshot });
      return "s1";
    },
    async updateSession(id, patch) {
      sessions.set(id, { ...sessions.get(id), ...patch });
    },
    async createTailoredResume(input) {
      resumes.set("r1", input);
      return "r1";
    },
    async deleteResume(id) {
      resumes.delete(id);
    },
  };
  return { store, sessions, resumes };
}

async function collect(gen: AsyncGenerator<PipelineEvent>) {
  const events: PipelineEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

describe("runPipeline", () => {
  it("runs all five stages and saves a tailored resume", async () => {
    const { store, sessions, resumes } = memoryStore();
    const events = await collect(
      runPipeline({ model: fakeModel([JOB, FACTS, TAILOR]), store }, { source: { title: "Master", content: SOURCE }, jobDescription: POSTING }),
    );
    const done = events.filter((e) => e.type === "stage" && e.status === "done").map((e) => (e as { stage: string }).stage);
    expect(done).toEqual(["copy", "markup", "set", "proof", "lockup"]);
    expect(events.at(-1)).toEqual({ type: "done", sessionId: "s1", resumeId: "r1" });

    const session = sessions.get("s1")!;
    expect(session.status).toBe("completed");
    expect(session.changes).toHaveLength(3); // out-of-range edit dropped
    expect(session.score_after!).toBeGreaterThanOrEqual(session.score_before!);
    expect((resumes.get("r1") as { title: string }).title).toBe("Senior Backend Engineer — Northwind");
  });

  it("flags numbers and requirements the original never mentions", async () => {
    const { store, sessions } = memoryStore();
    await collect(runPipeline({ model: fakeModel([JOB, FACTS, TAILOR]), store }, { source: { title: "M", content: SOURCE }, jobDescription: POSTING }));
    const bullet = sessions.get("s1")!.changes!.find((c) => c.after?.includes("2M"))!;
    expect(bullet.flags.map((f) => f.kind).sort()).toEqual(["number", "skill"]);
    expect(bullet.flags.find((f) => f.kind === "skill")!.value).toBe("Kubernetes");
    expect(bullet.flags.find((f) => f.kind === "number")!.value).toBe("2M");
    const docker = sessions.get("s1")!.changes!.find((c) => c.op === "insert_after")!;
    expect(docker.flags).toEqual([]);
  });

  it("produces a diff whose hunks line up with the recorded changes", async () => {
    const { store, resumes } = memoryStore();
    await collect(runPipeline({ model: fakeModel([JOB, FACTS, TAILOR]), store }, { source: { title: "M", content: SOURCE }, jobDescription: POSTING }));
    const tailored = (resumes.get("r1") as { content: Parameters<typeof toUnits>[0] }).content;
    const hunks = diffUnits(toUnits(SOURCE), toUnits(tailored));
    expect(hunks.map((h) => h.kind).sort()).toEqual(["added", "modified", "modified"]);
  });

  it("reports the failing stage and marks the session failed", async () => {
    const { store, sessions } = memoryStore();
    const events = await collect(
      runPipeline(
        { model: fakeModel([JOB, FACTS, { nope: true }, { nope: true }]), store },
        { source: { title: "M", content: SOURCE }, jobDescription: POSTING },
      ),
    );
    const last = events.at(-1)!;
    expect(last).toMatchObject({ type: "error", code: "schema_validation_failed", stage: "set" });
    expect(sessions.get("s1")!.status).toBe("failed");
  }, 10_000);
});

describe("runPipeline atomicity", () => {
  it("removes the tailored resume if the session can't be completed", async () => {
    const { store, sessions, resumes } = memoryStore();
    const failing = {
      ...store,
      async updateSession(id: string, patch: SessionPatch) {
        if (patch.status === "completed") throw new Error("db down");
        return store.updateSession(id, patch);
      },
    };
    const events = await collect(
      runPipeline({ model: fakeModel([JOB, FACTS, TAILOR]), store: failing }, { source: { title: "M", content: SOURCE }, jobDescription: POSTING }),
    );
    expect(events.at(-1)).toMatchObject({ type: "error", stage: "lockup" });
    expect(resumes.size).toBe(0);
    expect(sessions.get("s1")!.status).toBe("failed");
  });
});

describe("properNouns", () => {
  it("ignores the sentence-initial capital but keeps real names", async () => {
    const { properNouns } = await import("@/lib/tailoring/verify");
    expect(properNouns("Built Go services")).toEqual([]);
    expect(properNouns("Migrated workloads to Google Cloud Platform. Led Acme Corp hiring")).toEqual([
      "Google Cloud Platform",
      "Acme Corp",
    ]);
  });
});
