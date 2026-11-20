"use client";

import { BookmarkCheck, Briefcase, FileCode, MinusCircle } from "lucide-react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import type { TargetInput } from "@/lib/schemas/career";
import { cn } from "@/lib/cn";

export type TargetKind = TargetInput["kind"];

export interface TargetDraft {
  kind: TargetKind;
  resumeId: string;
  text: string;
  role: string;
}

export interface ApplicationOption {
  id: string;
  label: string;
}

const LABELS: Record<TargetKind, { label: string; icon: React.ReactNode }> = {
  none: { label: "No target", icon: <MinusCircle className="size-3.5" /> },
  application: { label: "Saved application", icon: <BookmarkCheck className="size-3.5" /> },
  posting: { label: "Paste a job post", icon: <FileCode className="size-3.5" /> },
  role: { label: "Role title", icon: <Briefcase className="size-3.5" /> },
};

const NEEDS_KEY: TargetKind[] = ["posting", "role"];

export function initialTarget(kinds: TargetKind[], applications: ApplicationOption[], preferred?: string | null): TargetDraft {
  const pick = applications.find((a) => a.id === preferred) ?? applications[0];
  const kind = pick && kinds.includes("application") ? "application" : kinds.includes("none") ? "none" : "posting";
  return { kind, resumeId: pick?.id ?? "", text: "", role: "" };
}

export function toTargetInput(draft: TargetDraft): TargetInput {
  switch (draft.kind) {
    case "none":
      return { kind: "none" };
    case "application":
      return { kind: "application", resumeId: draft.resumeId };
    case "posting":
      return { kind: "posting", text: draft.text };
    case "role":
      return { kind: "role", role: draft.role };
  }
}

/** Which job a tool measures against. Options that need Gemini are disabled without a key. */
export function TargetPicker({
  kinds,
  applications,
  hasKey,
  value,
  onChange,
}: {
  kinds: TargetKind[];
  applications: ApplicationOption[];
  hasKey: boolean;
  value: TargetDraft;
  onChange: (next: TargetDraft) => void;
}) {
  const disabled = (kind: TargetKind) =>
    (kind === "application" && applications.length === 0) || (!hasKey && NEEDS_KEY.includes(kind));

  return (
    <fieldset className="flex flex-col gap-3.5">
      <legend className="text-small font-medium text-ink-2">Target context</legend>
      <div className="inline-flex w-full flex-wrap gap-1 rounded-lg border border-line bg-sunken p-1 sm:w-fit">
        {kinds.map((kind) => (
          <label key={kind} className="relative flex-1 sm:flex-initial">
            <input
              type="radio"
              name="target-kind"
              value={kind}
              checked={value.kind === kind}
              disabled={disabled(kind)}
              onChange={() => onChange({ ...value, kind })}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
            />
            <span
              className={cn(
                "flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-small font-medium text-ink-3 transition-all hover:text-ink",
                "peer-checked:bg-raised peer-checked:text-ink peer-checked:shadow-xs",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-brass peer-disabled:cursor-default peer-disabled:opacity-40",
              )}
            >
              {LABELS[kind].icon}
              <span>{LABELS[kind].label}</span>
            </span>
          </label>
        ))}
      </div>

      {value.kind === "application" && (
        <Field label="Saved application" hint="Uses the tailored resume and requirements from your saved tracker.">
          {(props) => (
            <Select {...props} value={value.resumeId} onChange={(e) => onChange({ ...value, resumeId: e.target.value })}>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      {value.kind === "posting" && (
        <Field label="Job description post" hint="Paste the responsibilities, requirements, and tech stack details.">
          {(props) => (
            <Textarea
              {...props}
              rows={8}
              value={value.text}
              placeholder="Paste the full job post here…"
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              className="font-sans text-small leading-relaxed"
            />
          )}
        </Field>
      )}
      {value.kind === "role" && (
        <Field label="Role title" hint="Uses industry standard criteria for this role.">
          {(props) => (
            <Input
              {...props}
              value={value.role}
              placeholder="e.g. Staff Full Stack Engineer"
              onChange={(e) => onChange({ ...value, role: e.target.value })}
            />
          )}
        </Field>
      )}
    </fieldset>
  );
}
