"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, FileUp, Link2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { AtsNote } from "@/components/scan/AtsNote";
import type { DetectedAts } from "@/lib/ats";
import { MAX_JOB_DESCRIPTION_LENGTH, MIN_JOB_DESCRIPTION_LENGTH } from "@/lib/schemas/tailoring";
import { cn } from "@/lib/cn";

export interface ResumeOption { id: string; label: string }
export interface JobOption { id: string; label: string; hasFacts: boolean }

type ResumeSource = "saved" | "upload" | "paste";
type JobSource = "paste" | "saved" | "link";

const KEY_CODES = new Set(["missing_api_key", "invalid_api_key"]);

function Segmented<T extends string>({ name, legend, options, value, onChange }: {
  name: string; legend: string; options: Array<{ value: T; label: string; disabled?: boolean }>; value: T; onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex w-fit flex-wrap rounded-md border border-line bg-sunken p-0.5">
        {options.map((o) => (
          <label key={o.value} className="relative">
            <input type="radio" name={name} value={o.value} checked={value === o.value} disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default" />
            <span className={cn(
              "inline-flex h-7 cursor-pointer items-center rounded-sm px-3 text-small text-ink-3 transition-colors hover:text-ink",
              "peer-checked:bg-raised peer-checked:text-ink peer-checked:shadow-[0_1px_2px_oklch(0%_0_0/0.25)]",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-disabled:cursor-default peer-disabled:opacity-45",
            )}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Panel({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-panel p-4 sm:p-5">
      <h2 id={id} className="text-lead font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function ScanForm({ resumes, jobs, hasKey, initialJobId, initialResumeId }: {
  resumes: ResumeOption[]; jobs: JobOption[]; hasKey: boolean; initialJobId: string | null; initialResumeId: string | null;
}) {
  const router = useRouter();
  const [resumeSource, setResumeSource] = useState<ResumeSource>(resumes.length ? "saved" : "upload");
  const [resumeId, setResumeId] = useState(resumes.find((r) => r.id === initialResumeId)?.id ?? resumes[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");

  const initialJob = jobs.find((j) => j.id === initialJobId);
  const [jobSource, setJobSource] = useState<JobSource>(initialJob ? "saved" : "paste");
  const [jobId, setJobId] = useState(initialJob?.id ?? jobs[0]?.id ?? "");
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<{ title: string | null; company: string | null; ats: DetectedAts | null } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; key: boolean } | null>(null);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const needsRead = jobSource !== "saved" || !selectedJob?.hasFacts;

  async function importFromLink() {
    if (!jobUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    const res = await fetch("/api/job-import", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: jobUrl }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setImporting(false);
    if (!res?.ok || !data?.text) return setImportError(data?.error ?? "Couldn't import that page. Paste the job post instead.");
    setJobText(data.text);
    setImported({ title: data.title ?? null, company: data.company ?? null, ats: data.ats ?? null });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.set("resumeSource", resumeSource);
    if (resumeSource === "saved") form.set("resumeId", resumeId);
    if (resumeSource === "upload" && file) form.set("file", file);
    if (resumeSource === "paste") form.set("resumeText", resumeText);
    form.set("jobSource", jobSource === "saved" ? "saved" : "paste");
    if (jobSource === "saved") form.set("jobId", jobId);
    else {
      form.set("jobText", jobText);
      if (jobSource === "link") {
        form.set("jobUrl", jobUrl.trim());
        if (imported?.title) form.set("jobTitle", imported.title);
        if (imported?.company) form.set("company", imported.company);
      }
    }

    setPending(true);
    setError(null);
    const res = await fetch("/api/scans", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.id) return router.push(`/scan/${data.id}`);
    setPending(false);
    setError({ message: data?.error ?? "Couldn't scan. Check your connection and try again.", key: KEY_CODES.has(data?.code) });
  }

  const resumeReady = resumeSource === "saved" ? !!resumeId : resumeSource === "upload" ? !!file : resumeText.trim().length >= 80;
  const jobReady = jobSource === "saved" ? !!jobId : jobText.trim().length >= MIN_JOB_DESCRIPTION_LENGTH;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel id="scan-resume" title="Your resume">
          <Segmented name="resume-source" legend="Resume source" value={resumeSource} onChange={setResumeSource} options={[
            { value: "saved", label: "Saved resume", disabled: resumes.length === 0 },
            { value: "upload", label: "Upload file" },
            { value: "paste", label: "Paste text" },
          ]} />
          {resumeSource === "saved" && (
            <Field label="Resume">
              {(p) => <Select {...p} value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                {resumes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </Select>}
            </Field>
          )}
          {resumeSource === "upload" && (
            <Field label="Resume file" hint="PDF, Word (.docx), or plain text, up to 8 MB. The layout is checked the way an ATS would read it.">
              {(p) => (
                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong bg-sunken px-4 py-5 text-center transition-colors hover:border-ink-3 focus-within:border-brass">
                  <FileUp className="size-5 text-ink-3" aria-hidden />
                  <span className="text-small text-ink-2">{file ? file.name : "Choose a file"}</span>
                  <input {...p} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </Field>
          )}
          {resumeSource === "paste" && (
            <Field label="Resume text">
              {(p) => <Textarea {...p} value={resumeText} onChange={(e) => setResumeText(e.target.value)} maxLength={40_000}
                placeholder="Paste your whole resume: contact details, experience, education, skills…" className="min-h-[18rem]" />}
            </Field>
          )}
        </Panel>

        <Panel id="scan-job" title="The job">
          <Segmented name="job-source" legend="Job source" value={jobSource} onChange={setJobSource} options={[
            { value: "paste", label: "Paste posting" },
            { value: "saved", label: "Saved job", disabled: jobs.length === 0 },
            { value: "link", label: "From a link" },
          ]} />
          {jobSource === "saved" && (
            <Field label="Job" hint={selectedJob?.hasFacts ? "Already read. Scanning it again is instant." : "Read once with your Gemini key, then cached."}>
              {(p) => <Select {...p} value={jobId} onChange={(e) => setJobId(e.target.value)}>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
              </Select>}
            </Field>
          )}
          {jobSource === "link" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="scan-job-url" className="text-small font-medium text-ink-2">Posting link</label>
              <div className="flex gap-2">
                <Input id="scan-job-url" type="url" inputMode="url" value={jobUrl} placeholder="https://jobs.example.com/senior-engineer"
                  onChange={(e) => setJobUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void importFromLink(); } }} />
                <Button onClick={() => void importFromLink()} loading={importing} disabled={!jobUrl.trim()}>
                  <Link2 aria-hidden /> Import
                </Button>
              </div>
              {importError && <p role="alert" className="text-small text-danger">{importError}</p>}
            </div>
          )}
          {jobSource === "link" && imported?.ats && <AtsNote ats={imported.ats} />}
          {jobSource === "link" && imported && !imported.ats && (
            <p className="text-small text-ink-3">We couldn&rsquo;t tell which applicant tracking system this site uses.</p>
          )}
          {(jobSource === "paste" || (jobSource === "link" && imported)) && (
            <Field label="Job post" hint={<span className="font-mono tabular">{jobText.length.toLocaleString()} / {MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()}</span>}>
              {(p) => <Textarea {...p} value={jobText} onChange={(e) => setJobText(e.target.value)} maxLength={MAX_JOB_DESCRIPTION_LENGTH}
                placeholder="Paste the full posting: responsibilities, requirements, nice-to-haves…" className="min-h-[18rem]" />}
            </Field>
          )}
        </Panel>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/40 bg-del-soft px-4 py-3 text-body text-ink">
          <CircleAlert className="size-4 shrink-0 text-danger" aria-hidden />
          <p className="flex-1">{error.message}</p>
          {error.key && <Link href="/settings" className={buttonVariants({ size: "sm" })}>Open settings</Link>}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3">
        <p className="text-small text-ink-3">
          {needsRead && !hasKey
            ? "Reading a new job needs your Gemini key. Jobs you've already scanned work without it."
            : needsRead ? "Gemini reads the posting once. The match rate itself is measured without AI." : "Measured without AI, in a moment."}
        </p>
        <Button type="submit" variant="primary" size="lg" loading={pending} disabled={!resumeReady || !jobReady}>
          Scan <ArrowRight aria-hidden />
        </Button>
      </div>
    </form>
  );
}
