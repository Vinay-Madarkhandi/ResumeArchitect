"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookmarkCheck,
  Briefcase,
  CheckCircle2,
  CircleAlert,
  FileCheck,
  FileCode,
  FileText,
  Globe,
  Link2,
  Cpu,
  UploadCloud,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { AtsNote } from "@/components/scan/AtsNote";
import type { DetectedAts } from "@/lib/ats";
import { MAX_JOB_DESCRIPTION_LENGTH, MIN_JOB_DESCRIPTION_LENGTH } from "@/lib/schemas/tailoring";
import { cn } from "@/lib/cn";

export interface ResumeOption {
  id: string;
  label: string;
}
export interface JobOption {
  id: string;
  label: string;
  hasFacts: boolean;
}

type ResumeSource = "saved" | "upload" | "paste";
type JobSource = "paste" | "saved" | "link";

const KEY_CODES = new Set(["missing_api_key", "invalid_api_key"]);

function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: Array<{ value: T; label: string; icon?: React.ReactNode; disabled?: boolean }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex w-full flex-wrap gap-1 rounded-lg border border-line bg-sunken p-1 sm:w-fit">
        {options.map((o) => (
          <label key={o.value} className="relative flex-1 sm:flex-initial">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
            />
            <span
              className={cn(
                "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-small font-medium text-ink-3 transition-all hover:text-ink",
                "peer-checked:bg-raised peer-checked:text-ink peer-checked:shadow-xs",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-brass peer-disabled:cursor-default peer-disabled:opacity-40",
              )}
            >
              {o.icon}
              <span>{o.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  id,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  id: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex min-w-0 flex-col gap-5 rounded-xl border border-line bg-panel/75 p-5 shadow-xs backdrop-blur-xs sm:p-6"
    >
      <div className="flex items-center gap-3 border-b border-line pb-3.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brass/10 text-brass">
          {icon}
        </div>
        <div>
          <h2 id={id} className="text-lead font-semibold text-ink">
            {title}
          </h2>
          {subtitle && <p className="text-small text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function ScanForm({
  resumes,
  jobs,
  hasKey,
  initialJobId,
  initialResumeId,
}: {
  resumes: ResumeOption[];
  jobs: JobOption[];
  hasKey: boolean;
  initialJobId: string | null;
  initialResumeId: string | null;
}) {
  const router = useRouter();
  const [resumeSource, setResumeSource] = useState<ResumeSource>(resumes.length ? "saved" : "upload");
  const [resumeId, setResumeId] = useState(resumes.find((r) => r.id === initialResumeId)?.id ?? resumes[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resumeText, setResumeText] = useState("");

  const initialJob = jobs.find((j) => j.id === initialJobId);
  const [jobSource, setJobSource] = useState<JobSource>(initialJob ? "saved" : "paste");
  const [jobId, setJobId] = useState(initialJob?.id ?? jobs[0]?.id ?? "");
  const [jobText, setJobText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<{
    title: string | null;
    company: string | null;
    ats: DetectedAts | null;
  } | null>(null);
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: jobUrl }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setImporting(false);
    if (!res?.ok || !data?.text) {
      return setImportError(data?.error ?? "Couldn't import that page. Paste the job post instead.");
    }
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
    setError({
      message: data?.error ?? "Couldn't complete scan. Check your connection or API key and try again.",
      key: KEY_CODES.has(data?.code),
    });
  }

  const resumeReady =
    resumeSource === "saved" ? !!resumeId : resumeSource === "upload" ? !!file : resumeText.trim().length >= 80;
  const jobReady = jobSource === "saved" ? !!jobId : jobText.trim().length >= MIN_JOB_DESCRIPTION_LENGTH;

  const jobLength = jobText.trim().length;
  const jobValid = jobLength >= MIN_JOB_DESCRIPTION_LENGTH;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Your Resume Panel */}
        <Panel
          id="scan-resume"
          title="Your resume"
          subtitle="Choose an existing master or upload an A4 document"
          icon={<FileText className="size-5" />}
        >
          <Segmented
            name="resume-source"
            legend="Resume source"
            value={resumeSource}
            onChange={setResumeSource}
            options={[
              {
                value: "saved",
                label: "Saved resume",
                icon: <BookmarkCheck className="size-3.5" />,
                disabled: resumes.length === 0,
              },
              { value: "upload", label: "Upload file", icon: <UploadCloud className="size-3.5" /> },
              { value: "paste", label: "Paste text", icon: <FileCode className="size-3.5" /> },
            ]}
          />

          {resumeSource === "saved" && (
            <Field label="Saved resume" hint="Select the master or tailored version to test against the ATS parser.">
              {(p) => (
                <Select {...p} value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {resumeSource === "upload" && (
            <div className="flex flex-col gap-2">
              <label className="text-small font-medium text-ink-2">Resume file</label>
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setFile(dropped);
                  }}
                  className={cn(
                    "relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-6 text-center transition-all",
                    isDragging
                      ? "border-brass bg-brass/10"
                      : "border-line-strong bg-sunken/60 hover:border-ink-3 hover:bg-sunken",
                  )}
                >
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex size-10 items-center justify-center rounded-full bg-raised text-brass shadow-xs">
                    <UploadCloud className="size-5" />
                  </div>
                  <div>
                    <p className="text-small font-medium text-ink">
                      Drag & drop your resume, or <span className="text-brass underline">browse files</span>
                    </p>
                    <p className="mt-1 text-label text-ink-3">
                      Supports PDF, Word (.docx), or plain text (up to 8 MB)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="rounded bg-raised px-2 py-0.5 text-label font-mono text-ink-3">.PDF</span>
                    <span className="rounded bg-raised px-2 py-0.5 text-label font-mono text-ink-3">.DOCX</span>
                    <span className="rounded bg-raised px-2 py-0.5 text-label font-mono text-ink-3">.TXT</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-line bg-raised p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <FileCheck className="size-5" />
                    </div>
                    <div>
                      <p className="text-small font-medium text-ink">{file.name}</p>
                      <p className="text-label text-ink-3">
                        {(file.size / 1024).toFixed(1)} KB · Ready to scan
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="flex size-8 items-center justify-center rounded-md text-ink-3 hover:bg-hover hover:text-ink"
                    title="Remove selected file"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {resumeSource === "paste" && (
            <Field label="Resume text" hint="Paste the unformatted text from your current resume.">
              {(p) => (
                <Textarea
                  {...p}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  maxLength={40_000}
                  placeholder="Paste your whole resume: contact details, experience, education, skills, projects…"
                  className="min-h-[16rem] font-sans text-small"
                />
              )}
            </Field>
          )}
        </Panel>

        {/* The Job Panel */}
        <Panel
          id="scan-job"
          title="The job"
          subtitle="Target position requirements and role description"
          icon={<Briefcase className="size-5" />}
        >
          <Segmented
            name="job-source"
            legend="Job source"
            value={jobSource}
            onChange={setJobSource}
            options={[
              { value: "paste", label: "Paste posting", icon: <FileCode className="size-3.5" /> },
              {
                value: "saved",
                label: "Saved job",
                icon: <BookmarkCheck className="size-3.5" />,
                disabled: jobs.length === 0,
              },
              { value: "link", label: "From a link", icon: <Globe className="size-3.5" /> },
            ]}
          />

          {jobSource === "saved" && (
            <Field
              label="Saved job"
              hint={
                selectedJob?.hasFacts
                  ? "Already analyzed. Scanning is instant without additional AI calls."
                  : "Analyzed once with your Gemini key, then cached for fast scans."
              }
            >
              {(p) => (
                <Select {...p} value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          {jobSource === "link" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="scan-job-url" className="text-small font-medium text-ink-2">
                Posting link
              </label>
              <div className="flex gap-2">
                <Input
                  id="scan-job-url"
                  type="url"
                  inputMode="url"
                  value={jobUrl}
                  placeholder="https://jobs.example.com/senior-engineer"
                  onChange={(e) => setJobUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void importFromLink();
                    }
                  }}
                />
                <Button onClick={() => void importFromLink()} loading={importing} disabled={!jobUrl.trim()}>
                  <Link2 aria-hidden /> Import
                </Button>
              </div>
              {importError && (
                <p role="alert" className="text-small text-danger">
                  {importError}
                </p>
              )}
            </div>
          )}

          {jobSource === "link" && imported?.ats && <AtsNote ats={imported.ats} />}
          {jobSource === "link" && imported && !imported.ats && (
            <p className="text-small text-ink-3">We couldn’t detect which applicant tracking system this site uses.</p>
          )}

          {(jobSource === "paste" || (jobSource === "link" && imported)) && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-small font-medium text-ink-2">Job description text</label>
                <div className="flex items-center gap-2">
                  {jobLength > 0 && (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-label font-medium",
                        jobValid ? "text-emerald-400" : "text-brass",
                      )}
                    >
                      {jobValid ? <CheckCircle2 className="size-3.5" /> : null}
                      <span>{jobValid ? "Optimal length" : "Needs 150+ chars"}</span>
                    </span>
                  )}
                  <span className="font-mono text-label tabular text-ink-3">
                    {jobLength.toLocaleString()} / {MAX_JOB_DESCRIPTION_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
              <Textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                maxLength={MAX_JOB_DESCRIPTION_LENGTH}
                placeholder="Paste the full job post: responsibilities, required qualifications, tech stack, and nice-to-haves…"
                className="min-h-[16rem] font-sans text-small leading-relaxed"
              />
            </div>
          )}
        </Panel>
      </div>

      {/* Error Callout */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/40 bg-del-soft p-4 text-body text-ink"
        >
          <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden />
          <p className="flex-1">{error.message}</p>
          {error.key && (
            <Link href="/settings" className={buttonVariants({ size: "sm" })}>
              Open settings
            </Link>
          )}
        </div>
      )}

      {/* Submission Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-panel/50 p-4">
        <div className="flex items-center gap-2 text-small text-ink-3">
          <Cpu className="size-4 text-brass" />
          <span>
            {needsRead && !hasKey
              ? "Reading a new job needs your Gemini key in Settings. Existing jobs scan instantly."
              : needsRead
              ? "Gemini extracts job requirements once. ATS match scoring is private and calculated locally."
              : "Scored locally against ATS parsing algorithms in milliseconds."}
          </span>
        </div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          disabled={!resumeReady || !jobReady}
          className="gap-2 px-6 shadow-md"
        >
          <span>Scan Resume</span>
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </div>
    </form>
  );
}
