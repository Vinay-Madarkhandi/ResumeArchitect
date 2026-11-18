"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/react";
import { ArrowLeft, Check, CircleAlert, Columns2, FileCheck2, LoaderCircle, Mail, PenLine, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useToast } from "@/components/ui/Toast";
import { DocumentView, Paper } from "@/components/paper/Paper";
import { PaperEditor } from "@/components/paper/PaperEditor";
import { FormatBar } from "@/components/paper/FormatBar";
import { AskAi } from "@/components/paper/AskAi";
import { Redline } from "@/components/workspace/Redline";
import { ChangeList, type ChangeEntry } from "@/components/workspace/ChangeList";
import { AtsList, ScoreLockup, ScorePanel } from "@/components/workspace/ScorePanel";
import { ExportMenu } from "@/components/workspace/ExportMenu";
import { CoverLetter } from "@/components/workspace/CoverLetter";
import { JobPostPanel } from "@/components/workspace/JobPostPanel";
import { StatusSelect } from "@/components/tracker/StatusSelect";
import { changeImpact } from "@/lib/resume/impact";
import type { ApplicationStatus } from "@/lib/db/schema";
import { setOriginalLines, setPageBreaks } from "@/lib/editor/extensions";
import { useAutosave, type SaveStatus } from "@/lib/editor/useAutosave";
import { usePageCount } from "@/lib/editor/usePageCount";
import { diffUnits, revertHunk, type Hunk } from "@/lib/resume/diff";
import { buildRedline, matchChange } from "@/lib/resume/review";
import { addSkill } from "@/lib/resume/addSkill";
import { documentText, fromUnits, toUnits } from "@/lib/resume/units";
import { TEMPLATES, type TemplateId } from "@/lib/resume/templates";
import { atsChecks, scoreResume } from "@/lib/scoring/score";
import type { DocumentContent } from "@/lib/schemas/document";
import type { SessionArtifacts } from "@/lib/schemas/tailoring";
import { cn } from "@/lib/cn";

type View = "review" | "edit" | "compare" | "letter";
type Rail = "changes" | "score" | "job";

export interface WorkspaceProps {
  resume: {
    id: string;
    title: string;
    kind: "master" | "tailored";
    content: DocumentContent;
    template: TemplateId;
    reviewedChangeIds: string[];
    applicationStatus: ApplicationStatus;
    coverLetter: string | null;
    /** Imported from .docx: the Word download writes into the user's own file. */
    keepsWordDesign: boolean;
  };
  session: SessionArtifacts | null;
  /** The original job post text, for the keyword panel. */
  jobText: string | null;
  initialView: View | null;
}

async function patch(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/resumes/${id}`, {
    method: "PATCH",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("save failed");
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "error") {
    return (
      <button onClick={onRetry} className="flex items-center gap-1.5 text-small text-danger hover:underline">
        <CircleAlert className="size-3.5" aria-hidden /> Not saved · Retry
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-small text-ink-3" role="status">
      {status === "saving" || status === "dirty" ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Saving
        </>
      ) : (
        <>
          <Check className="size-3.5" aria-hidden /> Saved
        </>
      )}
    </span>
  );
}

export function Workspace({ resume, session, jobText, initialView }: WorkspaceProps) {
  const toast = useToast();
  const tailored = !!session;
  const original = session?.sourceSnapshot ?? null;
  const job = session?.jobAnalysis ?? null;

  const [doc, setDoc] = useState(resume.content);
  const [template, setTemplate] = useState<TemplateId>(resume.template);
  const [reviewed, setReviewed] = useState(() => new Set(resume.reviewedChangeIds));
  const [view, setView] = useState<View>(initialView ?? (tailored ? "review" : "edit"));
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [rail, setRail] = useState<Rail>("changes");

  const { status, flush } = useAutosave(doc, (content) => patch(resume.id, { content }));
  const deferredDoc = useDeferredValue(doc);

  const originalUnits = useMemo(() => (original ? toUnits(original) : null), [original]);
  const units = useMemo(() => toUnits(deferredDoc), [deferredDoc]);
  const hunks = useMemo(() => (originalUnits ? diffUnits(originalUnits, units) : []), [originalUnits, units]);
  const scoreNowEarly = useMemo(() => (job ? scoreResume(deferredDoc, job) : null), [deferredDoc, job]);
  const entries: ChangeEntry[] = useMemo(
    () =>
      hunks.map((hunk) => ({
        hunk,
        change: matchChange(hunk, session?.changes ?? []),
        impact: job && scoreNowEarly ? changeImpact(units, hunk, job, scoreNowEarly) : null,
      })),
    [hunks, session, job, units, scoreNowEarly],
  );
  const redline = useMemo(() => buildRedline(units, hunks), [units, hunks]);
  const scoreBefore = useMemo(() => (original && job ? scoreResume(original, job) : null), [original, job]);
  const scoreNow = scoreNowEarly;
  const ats = useMemo(() => atsChecks(units), [units]);
  const pages = usePageCount(resume.id, deferredDoc, template);

  const unreviewed = entries.filter((e) => !reviewed.has(e.hunk.id)).length;
  const toVerify = entries.filter((e) => (e.change?.flags.length ?? 0) > 0 && !reviewed.has(e.hunk.id)).length;

  // Stores only ids of changes that still exist, so the list never grows stale.
  const persistReviewed = useCallback(
    (next: Set<string>) => {
      const live = new Set(entries.map((e) => e.hunk.id));
      const trimmed = new Set([...next].filter((id) => live.has(id)));
      setReviewed(trimmed);
      patch(resume.id, { reviewedChangeIds: [...trimmed] }).catch(() => toast("Couldn't save that. Try again.", "error"));
    },
    [entries, resume.id, toast],
  );

  // While the editor is open it owns the document, so outside replacements go
  // through it (one undoable step); otherwise they replace the state directly
  // and the editor mounts with them next time.
  const replaceDoc = useCallback(
    (next: DocumentContent) => {
      if (editor && !editor.isDestroyed) editor.commands.setContent(next, { emitUpdate: true });
      else setDoc(next);
    },
    [editor],
  );

  const keep = useCallback(
    (id: string) => {
      const next = new Set(reviewed);
      next.add(id);
      persistReviewed(next);
      const idx = entries.findIndex((e) => e.hunk.id === id);
      const nextOpen = entries.slice(idx + 1).find((e) => !next.has(e.hunk.id));
      setFocusedId(nextOpen?.hunk.id ?? null);
    },
    [entries, reviewed, persistReviewed],
  );

  // Re-diffs against the live document (not the deferred render) and finds the
  // change by id, so a revert can never land on a line that has since moved.
  const revert = useCallback(
    (hunk: Hunk) => {
      if (!originalUnits) return;
      const live = toUnits(doc);
      const current = diffUnits(originalUnits, live).find((h) => h.id === hunk.id);
      const reverted = current ? revertHunk(live, current) : null;
      if (!reverted) return toast("That line changed since; review it again.", "info");
      replaceDoc(fromUnits(reverted));
      setFocusedId(null);
      toast("Reverted to your original line.", "info");
    },
    [doc, originalUnits, replaceDoc, toast],
  );

  function keepAll() {
    persistReviewed(new Set([...reviewed, ...entries.map((e) => e.hunk.id)]));
    setFocusedId(null);
    toast("All changes kept.", "success");
  }

  function revertAll() {
    if (!original) return;
    replaceDoc(original);
    setFocusedId(null);
    toast("Restored your original resume. Every change can be redone with Ask AI.", "info");
  }

  function onAddSkill(label: string) {
    replaceDoc(addSkill(doc, label));
    toast(`Added ${label} to your skills.`, "success");
  }

  function changeTemplate(next: TemplateId) {
    setTemplate(next);
    patch(resume.id, { template: next }).catch(() => toast("Couldn't save the template choice.", "error"));
  }

  // Editor decorations: changed-line marks and page breaks.
  useEffect(() => {
    if (editor && originalUnits) setOriginalLines(editor, originalUnits.map((u) => u.text));
  }, [editor, originalUnits]);
  useEffect(() => {
    if (editor && pages) setPageBreaks(editor, pages.pageBreakAnchors);
  }, [editor, pages]);

  // Keyboard: j/k move between changes in review.
  useEffect(() => {
    if (view !== "review") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key !== "j" && e.key !== "k") return;
      const idx = entries.findIndex((x) => x.hunk.id === focusedId);
      const next = e.key === "j" ? entries[idx + 1] ?? entries[0] : entries[idx - 1] ?? entries[entries.length - 1];
      if (next) setFocusedId(next.hunk.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, entries, focusedId]);

  useEffect(() => {
    if (focusedId && view === "review") {
      document.getElementById(`hunk-${focusedId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [focusedId, view]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-ground/92 backdrop-blur-md">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-5">
          <Link href="/dashboard" className="rounded-md p-2 text-ink-3 transition-colors hover:bg-hover hover:text-ink" aria-label="Back to applications">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-body font-semibold text-ink">{resume.title}</h1>
            <p className="truncate text-label text-ink-3">{tailored ? "Tailored application" : "Master resume"}</p>
          </div>
          {tailored && (
            <span className="ml-1 hidden sm:block">
              <StatusSelect resumeId={resume.id} initial={resume.applicationStatus} compact />
            </span>
          )}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:block">
              <SaveIndicator status={status} onRetry={() => void flush().catch(() => {})} />
            </span>
            {pages && (
              <span className="hidden font-mono text-small text-ink-3 tabular md:block" title="Printed length of the PDF">
                {pages.pageCount} {pages.pageCount === 1 ? "page" : "pages"}
              </span>
            )}
            <label className="hidden items-center gap-2 text-small text-ink-3 md:flex">
              <span className="sr-only">Template</span>
              <Select value={template} onChange={(e) => changeTemplate(e.target.value as TemplateId)} className="h-8 w-32 text-small">
                {Object.values(TEMPLATES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </label>
            <ThemeToggle />
            <ExportMenu
              resumeId={resume.id}
              doc={doc}
              template={template}
              flush={flush}
              keepsWordDesign={resume.keepsWordDesign}
              lengthChange={original ? documentText(doc).length / Math.max(1, documentText(original).length) - 1 : 0}
            />
          </div>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <main className="min-w-0 px-3 pb-24 pt-5 sm:px-6">
          <div className="mx-auto mb-5 flex max-w-[794px] flex-wrap items-center justify-between gap-3">
            {tailored ? (
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList aria-label="View">
                  <TabsTrigger value="review">
                    <FileCheck2 aria-hidden /> Review
                    {unreviewed > 0 && <span className="font-mono text-label text-brass tabular">{unreviewed}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="edit">
                    <PenLine aria-hidden /> Edit
                  </TabsTrigger>
                  <TabsTrigger value="compare">
                    <Columns2 aria-hidden /> Compare
                  </TabsTrigger>
                  <TabsTrigger value="letter">
                    <Mail aria-hidden /> Cover letter
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <p className="text-small text-ink-3">Select any text to rewrite it with AI.</p>
            )}
            {scoreBefore && scoreNow && (
              <a
                href="#score-rail"
                onClick={() => setRail("score")}
                className="flex items-baseline gap-1.5 rounded-md border border-line px-2.5 py-1 font-mono text-small tabular lg:hidden"
                aria-label={`Match score ${scoreBefore.total} to ${scoreNow.total}`}
              >
                <span className="text-ink-3">{scoreBefore.total}</span>
                <span className="text-ink-3">→</span>
                <span className="font-medium text-ink">{scoreNow.total}</span>
              </a>
            )}
            {view === "edit" && <FormatBar editor={editor} />}
            {view === "review" && entries.length > 0 && (
              <p className="text-small text-ink-3">
                <kbd className="rounded-sm border border-line-strong px-1 font-mono text-label">j</kbd>{" "}
                <kbd className="rounded-sm border border-line-strong px-1 font-mono text-label">k</kbd> to step through changes
              </p>
            )}
          </div>

          {view === "review" && (
            <Paper template={template}>
              <Redline items={redline} focusedId={focusedId} reviewed={reviewed} onFocus={(id) => { setFocusedId(id); setRail("changes"); }} />
            </Paper>
          )}

          {view === "edit" && (
            <Paper template={template}>
              <PaperEditor initialContent={doc} onChange={setDoc} onReady={setEditor} />
              {editor && <AskAi editor={editor} resumeId={resume.id} />}
            </Paper>
          )}

          {view === "letter" && (
            <CoverLetter resumeId={resume.id} doc={deferredDoc} template={template} initial={resume.coverLetter} />
          )}

          {view === "compare" && original && (
            <div className="mx-auto grid max-w-[1400px] gap-5 xl:grid-cols-2">
              <section aria-label="Original resume">
                <p className="mb-2 text-small font-medium text-ink-3">Original</p>
                <Paper template={template} compact>
                  <DocumentView doc={original} />
                </Paper>
              </section>
              <section aria-label="Tailored resume">
                <p className="mb-2 text-small font-medium text-ink-3">Tailored</p>
                <Paper template={template} compact>
                  <DocumentView doc={deferredDoc} originalLines={originalUnits?.map((u) => u.text)} />
                </Paper>
              </section>
            </div>
          )}
        </main>

        <aside id="score-rail" className="border-t border-line bg-panel/40 lg:sticky lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:border-l lg:border-t-0">
          {tailored && scoreBefore && scoreNow && job ? (
            <div className="flex flex-col">
              <div className="border-b border-line px-4 py-4">
                <ScoreLockup job={job} before={scoreBefore.total} now={scoreNow.total} />
              </div>
              <div className="flex items-center gap-1 border-b border-line px-4 py-2.5">
                <Tabs value={rail} onValueChange={(v) => setRail(v as Rail)}>
                  <TabsList>
                    <TabsTrigger value="changes">
                      Changes <span className="font-mono text-label tabular">{entries.length}</span>
                    </TabsTrigger>
                    <TabsTrigger value="score">Score</TabsTrigger>
                    <TabsTrigger value="job">Job post</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {rail === "changes" ? (
                <div className="flex flex-col gap-4 p-4">
                  {session?.summary && <p className="text-small leading-relaxed text-ink-2">{session.summary}</p>}
                  <div className="flex flex-col gap-2">
                    <p className={cn("text-small", unreviewed ? "text-ink" : "text-ink-3")}>
                      {unreviewed === 0 ? "Everything reviewed" : `${unreviewed} to review`}
                      {toVerify > 0 && <span className="text-query"> · {toVerify} need checking</span>}
                    </p>
                    {entries.length > 0 && (
                      <div className="-ml-2 flex gap-1">
                        {unreviewed > 0 && (
                          <Button size="sm" variant="ghost" onClick={keepAll}>
                            <Check aria-hidden /> Keep all
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={revertAll} title="Restore the original resume">
                          <RotateCcw aria-hidden /> Revert all
                        </Button>
                      </div>
                    )}
                  </div>
                  <ChangeList
                    entries={entries}
                    job={job}
                    reviewed={reviewed}
                    focusedId={focusedId}
                    onFocus={(id) => {
                      setFocusedId((cur) => (cur === id ? null : id));
                      if (view !== "review") setView("review");
                    }}
                    onKeep={keep}
                    onRevert={revert}
                  />
                </div>
              ) : rail === "score" ? (
                <div className="p-4">
                  <ScorePanel before={scoreBefore} now={scoreNow} onAddSkill={onAddSkill} />
                </div>
              ) : (
                <div className="p-4">
                  <JobPostPanel text={jobText} job={job} report={scoreNow} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-4">
              <div>
                <h2 className="text-lead font-semibold text-ink">Your master resume</h2>
                <p className="mt-1 text-small text-ink-2">
                  Every application starts from this copy. Tailoring never changes it; edits here apply to future applications.
                </p>
                <Link href="/new" className="mt-3 inline-flex text-small text-brass hover:underline">
                  Tailor it for a job →
                </Link>
              </div>
              <AtsList report={{ ats }} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
