import { analyzeJob } from "@/lib/gemini/prompts/analyzeJob";
import { tailorLines } from "@/lib/gemini/prompts/tailorLines";
import { AiError, type JsonModel } from "@/lib/gemini/model";
import type { DocumentContent } from "@/lib/schemas/document";
import type { JobAnalysis, Requirement } from "@/lib/schemas/jobAnalysis";
import { uniqueIds } from "@/lib/gemini/prompts/uniqueIds";
import type { PipelineEvent, PipelineStage, TailoredChange, TailoringErrorCodeT } from "@/lib/schemas/tailoring";
import { buildMatchReport } from "@/lib/report/matchReport";
import { extractJobFacts } from "@/lib/gemini/prompts/extractJobFacts";
import type { JobFacts, JobSkill } from "@/lib/schemas/jobFacts";
import { buildLexicon, formKey } from "@/lib/report/synonyms";
import { documentText, fromUnits, toUnits } from "@/lib/resume/units";
import { applyEdits } from "./applyEdits";
import { verifyChange } from "./verify";

/**
 * The tailoring run as five visible stages, named after a compositor's
 * workflow:
 *   copy    – read the job description (AI)
 *   markup  – measure the resume against it (deterministic score)
 *   set     – rewrite lines for the job (AI)
 *   proof   – check every edit against the original (deterministic)
 *   lockup  – score the result and save it
 * Every stage reports progress as an event, and the session row records
 * the stage reached, so a failure says exactly where it happened.
 */

export interface SessionPatch {
  stage?: PipelineStage;
  status?: "analyzing" | "generating" | "completed" | "failed";
  job_analysis?: JobAnalysis;
  score_before?: number;
  score_after?: number;
  changes?: TailoredChange[];
  summary?: string;
  error_code?: TailoringErrorCodeT;
  error_message?: string;
  result_resume_id?: string;
  result_resume_title_snapshot?: string;
  completed_at?: string;
  usage?: Record<string, { prompt: number; output: number; total: number }>;
}

/** Persistence the pipeline needs, kept behind an interface so tests can run it in memory. */
export interface PipelineStore {
  createSession(input: { sourceSnapshot: DocumentContent; model: string }): Promise<string>;
  updateSession(sessionId: string, patch: SessionPatch): Promise<void>;
  createTailoredResume(input: {
    sessionId: string;
    title: string;
    content: DocumentContent;
    jobTitle: string;
    company: string | null;
  }): Promise<string>;
  /** Compensates a resume insert when the run can't be completed. */
  deleteResume(resumeId: string): Promise<void>;
}

export interface PipelineInput {
  source: { title: string; content: DocumentContent };
  jobDescription: string;
  jobFacts?: JobFacts;
  /** Optional overrides typed by the user; the analysis fills in what's missing. */
  jobTitle?: string | null;
  company?: string | null;
}

const lexicon = buildLexicon();

function requirementAliases(label: string, existingAliases: string[] = []): string[] {
  const aliases = new Set<string>();
  for (const a of existingAliases) {
    if (a.trim() && a.toLowerCase() !== label.toLowerCase()) aliases.add(a.trim());
  }
  const group = lexicon(label);
  if (group) {
    for (const form of group.forms) {
      if (form.toLowerCase() !== label.toLowerCase()) aliases.add(form);
    }
  }
  for (const a of existingAliases) {
    const ag = lexicon(a);
    if (ag) {
      for (const form of ag.forms) {
        if (form.toLowerCase() !== label.toLowerCase()) aliases.add(form);
      }
    }
  }
  return [...aliases];
}

function requirementsFromFacts(facts: JobFacts, existingRequirements: Requirement[] = []): Requirement[] {
  const matchedExistingIds = new Set<string>();

  const findExisting = (term: string) => {
    const termKey = formKey(term);
    const termLex = lexicon(term);
    for (const r of existingRequirements) {
      if (matchedExistingIds.has(r.id)) continue;
      if (r.label.toLowerCase() === term.toLowerCase() || formKey(r.label) === termKey) return r;
      if (r.aliases.some((a) => a.toLowerCase() === term.toLowerCase() || formKey(a) === termKey)) return r;
      if (termLex && lexicon(r.label) === termLex) return r;
      if (termLex && r.aliases.some((a) => lexicon(a) === termLex)) return r;
    }
    return null;
  };

  const toReq = (skill: JobSkill, defaultCategory: Requirement["category"]): Requirement => {
    const existing = findExisting(skill.term);
    if (existing) matchedExistingIds.add(existing.id);
    const slug = skill.term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill";
    const label = existing?.label ?? skill.term;
    const allAliases = requirementAliases(label, [
      ...(existing?.aliases ?? []),
      ...(existing ? [skill.term] : []),
    ]);
    return {
      id: existing?.id || slug,
      label,
      aliases: allAliases,
      importance: skill.importance === "high" ? "must" : (existing?.importance ?? "nice"),
      category: existing?.category ?? defaultCategory,
    };
  };

  const skillReqs = [
    ...facts.hardSkills.map((s) => toReq(s, "skill")),
    ...facts.softSkills.map((s) => toReq(s, "soft")),
  ];

  // Retain education, qualifications, and other requirements from job analysis
  const remainingReqs = existingRequirements
    .filter((r) => !matchedExistingIds.has(r.id))
    .map((r) => ({
      ...r,
      aliases: requirementAliases(r.label, r.aliases),
    }));

  return uniqueIds([...skillReqs, ...remainingReqs], "req");
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export async function* runPipeline(
  deps: { model: JsonModel; store: PipelineStore; saveFacts?: (facts: JobFacts) => Promise<void> },
  input: PipelineInput,
): AsyncGenerator<PipelineEvent> {
  const { model, store } = deps;
  const sessionId = await store.createSession({ sourceSnapshot: input.source.content, model: model.name });
  yield { type: "session", sessionId };

  let stage: PipelineStage = "copy";
  try {
    // copy
    yield { type: "stage", stage, status: "running" };
    await store.updateSession(sessionId, { stage, status: "analyzing" });
    const analysis = await analyzeJob(model, input.jobDescription);
    const facts = input.jobFacts ?? await extractJobFacts(model, input.jobDescription);
    if (!input.jobFacts) await deps.saveFacts?.(facts);
    const requirements = requirementsFromFacts(facts, analysis.requirements);
    const job: JobAnalysis = {
      ...analysis,
      title: input.jobTitle?.trim() || analysis.title,
      company: input.company?.trim() || analysis.company,
      requirements: requirements.length > 0 ? requirements : analysis.requirements,
    };
    const scoring = { job: facts, jobText: input.jobDescription, file: null, asOf: new Date() };
    await store.updateSession(sessionId, { job_analysis: job });
    const mustCount = job.requirements.filter((r) => r.importance === "must").length;
    yield {
      type: "stage",
      stage,
      status: "done",
      note: `${job.title}${job.company ? ` at ${job.company}` : ""} · ${plural(mustCount, "must-have")}`,
    };

    // markup
    stage = "markup";
    yield { type: "stage", stage, status: "running" };
    const before = buildMatchReport({ ...scoring, resume: input.source.content });
    const missing = [...before.hardSkills, ...before.softSkills, ...before.otherKeywords].filter((r) => r.status === "missing" && r.importance === "high").length;
    await store.updateSession(sessionId, { stage, score_before: before.matchRate });
    yield {
      type: "stage",
      stage,
      status: "done",
      note: `Starting score ${before.matchRate} · ${missing === 0 ? "every high-importance keyword shown" : `${plural(missing, "high-importance keyword")} not shown`}`,
    };

    // set
    stage = "set";
    yield { type: "stage", stage, status: "running" };
    await store.updateSession(sessionId, { stage, status: "generating" });
    const sourceUnits = toUnits(input.source.content);
    const response = await tailorLines(model, { units: sourceUnits, job, report: before });
    const applied = applyEdits(sourceUnits, response.edits);
    const rewrites = applied.changes.filter((c) => c.op === "rewrite").length;
    const inserts = applied.changes.filter((c) => c.op === "insert_after").length;
    const removals = applied.changes.filter((c) => c.op === "remove").length;
    yield {
      type: "stage",
      stage,
      status: "done",
      note: [plural(rewrites, "line") + " rewritten", inserts && `${inserts} added`, removals && `${removals} removed`]
        .filter(Boolean)
        .join(" · "),
    };

    // proof
    stage = "proof";
    yield { type: "stage", stage, status: "running" };
    await store.updateSession(sessionId, { stage });
    const sourceText = documentText(input.source.content);
    const changes: TailoredChange[] = applied.changes.map((c) => ({ ...c, flags: verifyChange(c, sourceText, job) }));
    const flagged = changes.filter((c) => c.flags.length > 0).length;
    yield {
      type: "stage",
      stage,
      status: "done",
      note: flagged === 0 ? "Nothing invented" : `${plural(flagged, "change")} to verify`,
    };

    // lockup
    stage = "lockup";
    yield { type: "stage", stage, status: "running" };
    const tailored = fromUnits(applied.units);
    const after = buildMatchReport({ ...scoring, resume: tailored });
    const title = `${job.title}${job.company ? ` — ${job.company}` : ""}`;
    // Artifacts first, so a resume never exists without the session that explains it.
    await store.updateSession(sessionId, { stage, score_after: after.matchRate, changes, summary: response.summary });
    const resumeId = await store.createTailoredResume({
      sessionId,
      title,
      content: tailored,
      jobTitle: job.title,
      company: job.company,
    });
    try {
      await store.updateSession(sessionId, {
        status: "completed",
        usage: model.usage,
        result_resume_id: resumeId,
        result_resume_title_snapshot: title,
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      await store.deleteResume(resumeId).catch(() => {});
      throw error;
    }
    yield { type: "stage", stage, status: "done", note: `Score ${before.matchRate} → ${after.matchRate}` };
    yield { type: "done", sessionId, resumeId };
  } catch (error) {
    const code: TailoringErrorCodeT = error instanceof AiError ? error.code : "unknown";
    const message =
      error instanceof AiError ? error.message : "Something unexpected went wrong. Your resume wasn't changed; try again.";
    await store
      .updateSession(sessionId, {
        status: "failed",
        stage,
        error_code: code,
        error_message: message,
        usage: model.usage,
        completed_at: new Date().toISOString(),
      })
      .catch(() => {});
    yield { type: "error", code, message, sessionId, stage };
  }
}
