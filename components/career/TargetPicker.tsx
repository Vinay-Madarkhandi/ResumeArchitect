"use client";

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

const LABELS: Record<TargetKind, string> = {
  none: "No target",
  application: "Saved application",
  posting: "Paste a job post",
  role: "Role title",
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
  const disabled = (kind: TargetKind) => (kind === "application" && applications.length === 0) || (!hasKey && NEEDS_KEY.includes(kind));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-small font-medium text-ink-2">Target job</legend>
      <div className="inline-flex w-fit flex-wrap rounded-md border border-line bg-sunken p-0.5">
        {kinds.map((kind) => (
          <label key={kind} className="relative">
            <input
              type="radio"
              name="target-kind"
              value={kind}
              checked={value.kind === kind}
              disabled={disabled(kind)}
              onChange={() => onChange({ ...value, kind })}
              className="peer absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-default"
            />
            <span className={cn(
              "inline-flex h-7 cursor-pointer items-center rounded-sm px-3 text-small text-ink-3 transition-colors hover:text-ink",
              "peer-checked:bg-raised peer-checked:text-ink peer-checked:shadow-[0_1px_2px_oklch(0%_0_0/0.25)]",
              "peer-focus-visible:outline-2 peer-focus-visible:outline-focus peer-disabled:cursor-default peer-disabled:opacity-45",
            )}>
              {LABELS[kind]}
            </span>
          </label>
        ))}
      </div>

      {value.kind === "application" && (
        <Field label="Application" hint="Uses the job requirements from your saved application.">
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
        <Field label="Job post" hint="Include the responsibilities and requirements.">
          {(props) => (
            <Textarea {...props} rows={8} value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} />
          )}
        </Field>
      )}
      {value.kind === "role" && (
        <Field label="Role" hint="Uses typical requirements for this role.">
          {(props) => (
            <Input {...props} value={value.role} placeholder="e.g. Product designer" onChange={(e) => onChange({ ...value, role: e.target.value })} />
          )}
        </Field>
      )}
    </fieldset>
  );
}
