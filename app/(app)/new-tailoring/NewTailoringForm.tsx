"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Icon } from "@/components/icon/Icon";
import { MIN_JOB_DESCRIPTION_LENGTH } from "@/lib/schemas/tailoring";

interface ResumeOption {
  id: string;
  title: string;
  isDefault: boolean;
}

export function NewTailoringForm({
  resumes,
  geminiConfigured,
}: {
  resumes: ResumeOption[];
  geminiConfigured: boolean;
}) {
  const router = useRouter();
  const defaultResume = resumes.find((r) => r.isDefault) ?? resumes[0];
  const [sourceResumeId, setSourceResumeId] = useState(defaultResume?.id ?? "");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<"idle" | "analyzing">("idle");

  const tooShort = jobDescriptionText.trim().length > 0 && jobDescriptionText.trim().length < MIN_JOB_DESCRIPTION_LENGTH;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sourceResumeId) {
      setError("Choose a resume to tailor.");
      return;
    }
    if (jobDescriptionText.trim().length < MIN_JOB_DESCRIPTION_LENGTH) {
      setError("Paste the job description — a sentence or two isn't enough to tailor against.");
      return;
    }

    setIsSubmitting(true);
    setStage("analyzing");
    try {
      const res = await fetch("/api/tailoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceResumeId,
          jobDescriptionText,
          jobTitle: jobTitle || undefined,
          company: company || undefined,
          location: location || undefined,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.errorMessage ?? "Something went wrong. Please try again.");
        setStage("idle");
        return;
      }

      router.push(`/resumes/${body.resumeId}/edit`);
    } catch {
      setError("Network error — please try again.");
      setStage("idle");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (resumes.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-outline-variant p-xxl text-center">
        <p className="mb-md font-sans text-body-lg text-on-surface-variant">
          You don&rsquo;t have a resume yet — upload one first.
        </p>
        <Link href="/onboarding/upload">
          <Button variant="primary">Upload your resume</Button>
        </Link>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest p-xxl text-center">
        <Icon name="spinner" size={28} className="mb-md animate-spin text-secondary" />
        <h2 className="mb-1 font-sans text-headline-md text-on-surface">Tailoring your resume…</h2>
        <p className="font-sans text-body-lg text-on-surface-variant">
          This usually takes under a minute. Feel free to wait — your progress is saved either way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-lg" noValidate>
      {!geminiConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-secondary bg-secondary-container/15 p-md">
          <Icon name="api-key" size={18} className="mt-0.5 shrink-0 text-secondary" />
          <p className="font-sans text-body-lg text-on-surface">
            You&rsquo;ll need a Gemini API key to tailor resumes.{" "}
            <Link href="/settings" className="font-medium text-secondary hover:underline">
              Connect it in Settings
            </Link>{" "}
            — it&rsquo;s a one-time setup.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="source-resume">Resume to tailor</Label>
        <select
          id="source-resume"
          value={sourceResumeId}
          onChange={(e) => setSourceResumeId(e.target.value)}
          className="h-10 w-full rounded border border-outline-variant bg-surface-container-lowest px-sm font-sans text-body-lg text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          {resumes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
              {r.isDefault ? " (Master)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
        <div>
          <Label htmlFor="jobTitle">Job title (optional)</Label>
          <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="company">Company (optional)</Label>
          <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="location">Location (optional)</Label>
          <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="jd">Job description</Label>
        <Textarea
          id="jd"
          rows={12}
          value={jobDescriptionText}
          onChange={(e) => setJobDescriptionText(e.target.value)}
          placeholder="Paste the full job description here…"
        />
        <FieldHint>
          {tooShort ? "A little more detail helps us tailor accurately." : "Paste as much of the listing as you have."}
        </FieldHint>
      </div>

      <FieldError>{error ?? undefined}</FieldError>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" disabled={isSubmitting || !geminiConfigured}>
          <Icon name="ai-suggestion" size={18} />
          Tailor my resume
        </Button>
      </div>
    </form>
  );
}
