"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, CircleAlert, Link2, RefreshCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Pipeline, STAGES, type StageState } from "@/components/tailor/Pipeline";
import { readPipelineStream } from "@/lib/tailoring/readStream";
import { MAX_JOB_DESCRIPTION_LENGTH, MIN_JOB_DESCRIPTION_LENGTH, type PipelineEvent, type PipelineStage } from "@/lib/schemas/tailoring";

interface Source {
  id: string;
  title: string;
  kind: "master" | "tailored";
}

const initialStages = () =>
  Object.fromEntries(STAGES.map((s) => [s, { status: "waiting" } as StageState])) as Record<PipelineStage, StageState>;

type SavedPosting = { id: string; title: string; company: string; description: string; inTracker: boolean };

export function NewApplication({ sources, hasKey, retryId, posting, initialSourceId }: {
  sources: Source[]; hasKey: boolean; retryId: string | null; posting: SavedPosting | null; initialSourceId?: string;
}) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(initialSourceId ?? sources[0]?.id ?? "");
  const [jd, setJd] = useState(posting?.description ?? "");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState(initialStages);
  const [error, setError] = useState<{ message: string; sessionId?: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [jobUrl, setJobUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function importFromLink() {
    if (!jobUrl.trim()) return;
    setImporting(true);
    setImportNote(null);
    const res = await fetch("/api/job-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: jobUrl }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setImporting(false);
    if (!res?.ok || !data?.text) {
      return setImportNote({ ok: false, text: data?.error ?? "Couldn't import that page. Paste the job post instead." });
    }
    setJd(data.text);
    if (data.title) setTitle(data.title);
    if (data.company) setCompany(data.company);
    if (data.title || data.company) setShowDetails(true);
    setImportNote({ ok: true, text: "Imported. Check it below and trim anything that isn't the job." });
  }
  const startedRetry = useRef(false);

  /** The stream dropped but the server keeps running: poll the run until it settles. */
  const reconnect = useCallback(
    async (sessionId: string) => {
    for (let attempt = 0; attempt < 90; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(`/api/tailoring/${sessionId}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data?.status === "completed" && data.resumeId) return router.push(`/resumes/${data.resumeId}?view=review`);
      if (data?.status === "failed") return setError({ message: data.errorMessage ?? "The run failed.", sessionId });
    }
    setError({ message: "Lost track of the run. Check your applications, or retry.", sessionId });
    },
    [router],
  );

  const run = useCallback(
    async (body: Record<string, string>) => {
      setRunning(true);
      setError(null);
      setStages(initialStages());
      let finished = false;
      let sessionId: string | undefined;
      const onEvent = (e: PipelineEvent) => {
        if (e.type === "session") sessionId = e.sessionId;
        if (e.type === "stage") setStages((prev) => ({ ...prev, [e.stage]: { status: e.status, note: e.note } }));
        if (e.type === "error") {
          finished = true;
          if (e.stage) setStages((prev) => ({ ...prev, [e.stage!]: { status: "failed" } }));
          setError({ message: e.message, sessionId: e.sessionId });
        }
        if (e.type === "done") {
          finished = true;
          router.push(`/resumes/${e.resumeId}?view=review`);
        }
      };
      try {
        const res = await fetch("/api/tailoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setRunning(false);
          setError({ message: data?.errorMessage ?? "Couldn't start. Try again." });
          return;
        }
        await readPipelineStream(res, onEvent);
      } catch {
        // Handled below: the run keeps going on the server.
      }
      if (!finished && sessionId) await reconnect(sessionId);
      else if (!finished) setError({ message: "The connection dropped. Check your network and try again." });
    },
    [router, reconnect],
  );

  useEffect(() => {
    if (retryId && !startedRetry.current) {
      startedRetry.current = true;
      void run({ retrySessionId: retryId });
    }
  }, [retryId, run]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!sourceId) return setFormError("Add a master resume first.");
    if (jd.trim().length < MIN_JOB_DESCRIPTION_LENGTH) return setFormError("Paste the full job post, including the requirements.");
    setFormError(null);
    void run(posting ? { sourceResumeId: sourceId, jobDescriptionId: posting.id }
      : { sourceResumeId: sourceId, jobDescriptionText: jd, jobTitle: title, company, sourceUrl: jobUrl });
  }

  if (running) {
    return (
      <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="text-page font-semibold tracking-[-0.015em]">{error ? "The run stopped" : "Tailoring your resume"}</h1>
          <p className="mt-2 text-body text-ink-2">
            {error ? "Nothing was changed. Your master resume is untouched." : "This usually takes 20–40 seconds. Keep this tab open."}
          </p>
          <div className="mt-8 rounded-lg border border-line bg-panel p-6">
            <Pipeline stages={stages} />
          </div>
          {error && (
            <div role="alert" className="mt-5 flex flex-col gap-4 rounded-lg border border-danger/40 bg-del-soft p-4">
              <p className="flex gap-2 text-body text-ink">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> {error.message}
              </p>
              <div className="flex gap-2">
                {error.sessionId ? (
                  <Button variant="primary" onClick={() => void run({ retrySessionId: error.sessionId! })}>
                    <RefreshCw aria-hidden /> Retry
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setRunning(false)}>
                    Back to the form
                  </Button>
                )}
                {error.sessionId && (
                  <Button variant="ghost" onClick={() => setRunning(false)}>
                    {posting ? "Back to posting" : "Edit the job post"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        <aside className="text-small text-ink-2 md:pt-16">
          <h2 className="text-body font-semibold text-ink">What&rsquo;s happening</h2>
          <p className="mt-2">
            Gemini only rewrites lines that are already on your resume. It can&rsquo;t add employers, degrees, tools, or
            numbers you don&rsquo;t have. Anything that looks new is flagged for you to confirm.
          </p>
          <p className="mt-3">The score is measured the same way before and after, so the change is a fair comparison.</p>
        </aside>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_19rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h1 className="text-page font-semibold tracking-[-0.015em]">New application</h1>
          {posting ? <p className="mt-2 text-body text-ink-2">
            {posting.inTracker
              ? <Link href={`/tracker?job=${posting.id}`} className="text-brass hover:underline">{posting.title}</Link>
              : <span className="font-medium text-ink">{posting.title}</span>}
            {posting.company && ` · ${posting.company}`}
          </p> : <p className="mt-2 text-body text-ink-2">Paste the job post. You&rsquo;ll review every change before you download.</p>}
        </div>
        {!posting && <div className="flex flex-col gap-1.5">
          <label htmlFor="job-url" className="text-small font-medium text-ink-2">
            Import from a link <span className="text-label font-normal text-ink-3">Optional</span>
          </label>
          <div className="flex gap-2">
            <Input
              id="job-url"
              type="url"
              inputMode="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void importFromLink();
                }
              }}
              placeholder="https://jobs.example.com/senior-engineer"
            />
            <Button onClick={() => void importFromLink()} loading={importing} disabled={!jobUrl.trim()}>
              <Link2 aria-hidden /> Import
            </Button>
          </div>
          {importNote && (
            <p role="status" className={importNote.ok ? "text-small text-add" : "text-small text-danger"}>
              {importNote.text}
            </p>
          )}
        </div>}
        <Field
          label="Job post"
          error={formError}
          hint={
            <span className="font-mono tabular">
              {jd.length.toLocaleString()} / {MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()} characters
            </span>
          }
        >
          {(p) => (
            <Textarea
              {...p}
              value={jd}
              readOnly={Boolean(posting)}
              maxLength={MAX_JOB_DESCRIPTION_LENGTH}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full posting: responsibilities, requirements, nice-to-haves…"
              className="min-h-[22rem] text-body leading-relaxed"
              autoFocus
            />
          )}
        </Field>
      </div>

      <aside className="flex flex-col gap-5 lg:pt-[4.75rem]">
        <Field label="Start from">
          {(p) => (
            <Select {...p} value={sourceId} onChange={(e) => setSourceId(e.target.value)} disabled={sources.length === 0}>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.kind === "master" ? `${s.title} (master)` : s.title}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {!posting && <div>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            className="flex w-full items-start gap-1.5 text-left text-small text-ink-2 hover:text-ink"
          >
            <ChevronDown className={`mt-0.5 size-3.5 shrink-0 transition-transform ${showDetails ? "rotate-180" : ""}`} aria-hidden />
            <span>
              Role and company
              <span className="block text-label text-ink-3">Read from the post when left blank</span>
            </span>
          </button>
          {showDetails && (
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Role title" optional>
                {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Product Designer" />}
              </Field>
              <Field label="Company" optional>
                {(p) => <Input {...p} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Northwind" />}
              </Field>
            </div>
          )}
        </div>}

        {hasKey ? (
          <Button type="submit" variant="primary" size="lg" disabled={!sourceId}>
            Tailor resume <ArrowRight aria-hidden />
          </Button>
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-brass/40 bg-brass-soft p-4 text-small text-ink">
            Connect your Gemini key to tailor.
            <Link href="/settings" className={buttonVariants({ size: "sm" })}>
              Connect key
            </Link>
          </div>
        )}
        <ul className="flex flex-col gap-1.5 border-t border-line pt-4 text-small text-ink-3">
          <li>Your master resume is never modified.</li>
          <li>Every change comes with a reason and can be reverted.</li>
          <li>Runs on your key with Gemini 2.5 Flash.</li>
        </ul>
      </aside>
    </form>
  );
}
