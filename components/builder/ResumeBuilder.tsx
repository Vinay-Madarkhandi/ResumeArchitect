"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { assistBuilderField, saveBuilderResume } from "@/app/actions/builder";
import { DocumentView, Paper } from "@/components/paper/Paper";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import {
  blankCertification, blankEducation, blankExperience, blankProject, draftPlaceholders,
  draftProblems, draftToDocument, emptyDraft, placeholdersIn, type Draft,
} from "@/lib/builder/draft";
import { isTemplateId, TEMPLATE_LIST } from "@/lib/resume/templates";

const steps = ["Contact", "Target role", "Summary", "Experience", "Education", "Skills", "Projects", "Certifications"] as const;
type Step = typeof steps[number];
type AssistField = "summary" | "experience" | "education" | "skills" | "project";

function TextField({ label, value, onChange, maxLength = 200, multiline, hint, type }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  hint?: string;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(props) => multiline
        ? <Textarea {...props} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
        : <Input {...props} value={value} type={type} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

function Assist({ field, source, onApply }: {
  field: AssistField;
  source: string;
  onApply: (lines: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [suggestion, setSuggestion] = useState<{ source: string; lines: string[] }>();
  const [error, setError] = useState<string>();

  async function ask() {
    setBusy(true);
    setError(undefined);
    setSuggestion(undefined);
    try {
      const result = await assistBuilderField({ field, source });
      if (result.lines) setSuggestion({ source, lines: result.lines });
      else setError(result.error);
    } catch {
      setError("Couldn't get a suggestion. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const lines = suggestion?.source === source ? suggestion.lines : undefined;
  return (
    <div className="grid gap-2">
      <Button className="justify-self-start" size="sm" disabled={!source.trim()} loading={busy} onClick={() => void ask()}>
        <Sparkles aria-hidden /> Suggest with Gemini
      </Button>
      {error && <p role="alert" className="text-small text-danger">{error}</p>}
      {lines && (
        <div className="grid gap-2 rounded-md border border-line bg-raised p-3 text-small">
          <p className="font-medium text-ink">Check the suggestion before using it.</p>
          <ul className="grid gap-1">
            {lines.map((line, index) => <li key={index} className="text-ink-2">{line}</li>)}
          </ul>
          {lines.some((line) => placeholdersIn(line).length) && <p className="text-brass">Replace bracketed placeholders with real figures, or remove them.</p>}
          <Button className="justify-self-start" size="sm" onClick={() => { onApply(lines); setSuggestion(undefined); }}>Use suggestion</Button>
        </div>
      )}
    </div>
  );
}

function Entries<T extends { id: string }>({ entries, limit, label, add, onChange, children }: {
  entries: T[];
  limit: number;
  label: string;
  add: () => T;
  onChange: (entries: T[]) => void;
  children: (entry: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  return (
    <>
      {entries.map((entry, index) => (
        <fieldset key={entry.id} className="grid gap-3 rounded-lg border border-line bg-ground p-4">
          <legend className="px-2 text-small text-ink-2">{label} {index + 1}</legend>
          {children(entry, (patch) => onChange(entries.map((item) => item.id === entry.id ? { ...item, ...patch } : item)))}
          <Button size="sm" variant="ghost" className="justify-self-end" onClick={() => onChange(entries.filter((item) => item.id !== entry.id))}>
            Remove {label.toLowerCase()}
          </Button>
        </fieldset>
      ))}
      <Button className="justify-self-start" disabled={entries.length >= limit} onClick={() => onChange([...entries, add()])}>
        Add {label.toLowerCase()}
      </Button>
    </>
  );
}

function Bullets({ field, notes, bullets, limit, update }: {
  field: "experience" | "project";
  notes: string;
  bullets: string[];
  limit: number;
  update: (patch: { notes?: string; bullets?: string[] }) => void;
}) {
  return (
    <>
      <TextField label="Describe what you did" value={notes} onChange={(value) => update({ notes: value })} maxLength={2000} multiline hint="Add your responsibilities and any results you can verify." />
      <Assist field={field} source={notes} onApply={(lines) => update({ bullets: [...bullets.filter((line) => line.trim()), ...lines].slice(0, limit) })} />
      {bullets.map((bullet, index) => (
        <div key={index} className="grid grid-cols-[1fr_auto] items-end gap-2">
          <TextField label={`Bullet ${index + 1}`} value={bullet} maxLength={400} onChange={(value) => update({
            bullets: bullets.map((line, i) => i === index ? value : line),
          })} />
          <Button size="icon" variant="ghost" aria-label={`Remove bullet ${index + 1}`} onClick={() => update({
            bullets: bullets.filter((_, i) => i !== index),
          })}>×</Button>
        </div>
      ))}
      <Button size="sm" className="justify-self-start" disabled={bullets.length >= limit} onClick={() => update({ bullets: [...bullets, ""] })}>
        Add bullet
      </Button>
    </>
  );
}

export function ResumeBuilder({ email }: { email: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => ({ ...emptyDraft(), email }));
  const [step, setStep] = useState<Step>("Contact");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const index = steps.indexOf(step);

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors([]);
  }

  async function save() {
    const problems = draftProblems(draft);
    if (problems.length) return setErrors(problems);
    setBusy(true);
    try {
      const result = await saveBuilderResume(draft);
      if (result.id) {
        router.push(`/resumes/${result.id}`);
        return;
      }
      setErrors([result.error ?? "Couldn't save your resume. Try again."]);
    } catch {
      setErrors(["Couldn't save your resume. Try again."]);
    }
    setBusy(false);
  }

  function renderStep() {
    switch (step) {
      case "Contact": return (
        <>
          <TextField label="Full name" value={draft.name} maxLength={120} onChange={(name) => update({ name })} />
          <TextField label="Email" value={draft.email} type="email" onChange={(email) => update({ email })} />
          <TextField label="Phone" value={draft.phone} type="tel" maxLength={60} onChange={(phone) => update({ phone })} />
          <TextField label="Location" value={draft.location} onChange={(location) => update({ location })} />
          {draft.links.map((link, i) => (
            <TextField key={i} label={`Link ${i + 1}`} value={link} maxLength={300} onChange={(value) => update({ links: draft.links.map((l, j) => i === j ? value : l) })} />
          ))}
          <Button className="justify-self-start" disabled={draft.links.length >= 5} onClick={() => update({ links: [...draft.links, ""] })}>Add link</Button>
        </>
      );
      case "Target role": return (
        <TextField label="Target job title" value={draft.targetRole} onChange={(targetRole) => update({ targetRole })}
          hint="This helps identify the resume in your library." />
      );
      case "Summary": return (
        <>
          <TextField label="Professional summary" value={draft.summary} onChange={(summary) => update({ summary })} maxLength={1500} multiline
            hint="Start with a few facts about your background and strengths." />
          <Assist field="summary" source={draft.summary} onApply={([summary]) => update({ summary })} />
        </>
      );
      case "Experience": return (
        <Entries entries={draft.experience} limit={20} label="Role" add={blankExperience} onChange={(experience) => update({ experience })}>
          {(entry, change) => <>
            <TextField label="Job title" value={entry.title} onChange={(title) => change({ title })} />
            <TextField label="Company" value={entry.company} onChange={(company) => change({ company })} />
            <TextField label="Location" value={entry.location} onChange={(location) => change({ location })} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Start date" value={entry.start} maxLength={40} onChange={(start) => change({ start })} />
              <TextField label="End date" value={entry.end} maxLength={40} onChange={(end) => change({ end })} />
            </div>
            <Bullets field="experience" {...entry} limit={30} update={change} />
          </>}
        </Entries>
      );
      case "Education": return (
        <Entries entries={draft.education} limit={10} label="Education entry" add={blankEducation} onChange={(education) => update({ education })}>
          {(entry, change) => <>
            <TextField label="Degree" value={entry.degree} onChange={(degree) => change({ degree })} />
            <TextField label="School" value={entry.school} onChange={(school) => change({ school })} />
            <TextField label="Location" value={entry.location} onChange={(location) => change({ location })} />
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Start date" value={entry.start} maxLength={40} onChange={(start) => change({ start })} />
              <TextField label="End date" value={entry.end} maxLength={40} onChange={(end) => change({ end })} />
            </div>
            <TextField label="Education details" value={entry.details} maxLength={600} multiline onChange={(details) => change({ details })} />
            <Assist field="education" source={entry.details} onApply={([details]) => change({ details })} />
          </>}
        </Entries>
      );
      case "Skills": return (
        <>
          <TextField label="Skills list" value={draft.skills} maxLength={1500} multiline onChange={(skills) => update({ skills })}
            hint="Separate skills with commas or line breaks." />
          <Assist field="skills" source={draft.skills} onApply={([skills]) => update({ skills })} />
        </>
      );
      case "Projects": return (
        <Entries entries={draft.projects} limit={15} label="Project" add={blankProject} onChange={(projects) => update({ projects })}>
          {(entry, change) => <>
            <TextField label="Project name" value={entry.name} onChange={(name) => change({ name })} />
            <TextField label="Project link" value={entry.link} maxLength={300} onChange={(link) => change({ link })} />
            <Bullets field="project" {...entry} limit={20} update={change} />
          </>}
        </Entries>
      );
      case "Certifications": return (
        <Entries entries={draft.certifications} limit={20} label="Certification" add={blankCertification} onChange={(certifications) => update({ certifications })}>
          {(entry, change) => <>
            <TextField label="Certification name" value={entry.name} onChange={(name) => change({ name })} />
            <TextField label="Issuer" value={entry.issuer} onChange={(issuer) => change({ issuer })} />
            <TextField label="Year" value={entry.year} maxLength={20} onChange={(year) => change({ year })} />
          </>}
        </Entries>
      );
    }
  }

  const placeholders = draftPlaceholders(draft);
  return (
    <>
      <h1 className="text-page font-semibold">Build your resume</h1>
      <nav aria-label="Resume steps" className="my-5 flex flex-wrap gap-1 border-b border-line pb-3">
        {steps.map((item) => (
          <Button key={item} variant={step === item ? "secondary" : "ghost"} size="sm" aria-current={step === item ? "step" : undefined}
            disabled={busy} onClick={() => setStep(item)}>{item}</Button>
        ))}
      </nav>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(20rem,2fr)_minmax(0,3fr)]">
        <section className="rounded-lg border border-line bg-panel p-5">
          <h2 className="mb-4 text-title font-semibold">{step}</h2>
          <fieldset disabled={busy} className="grid min-w-0 gap-3">{renderStep()}</fieldset>
          {placeholders.length > 0 && (
            <p role="status" className="mt-4 text-small text-brass">
              Fill or remove {placeholders.map(({ where, placeholder }) => `${placeholder} in ${where}`).join(", ")}.
            </p>
          )}
          {errors.length > 0 && (
            <ul role="alert" className="mt-4 grid gap-1 text-small text-danger">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" disabled={index === 0 || busy} onClick={() => setStep(steps[index - 1])}>Back</Button>
            {index < steps.length - 1
              ? <Button variant="primary" onClick={() => setStep(steps[index + 1])}>Next</Button>
              : <Button variant="primary" loading={busy} onClick={() => void save()}>Save master resume</Button>}
          </div>
        </section>
        <section aria-label="Live preview" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-title font-semibold">Live preview</h2>
            <Select aria-label="Template" className="w-36" disabled={busy} value={draft.template} onChange={(e) => {
              if (isTemplateId(e.target.value)) update({ template: e.target.value });
            }}>
              {TEMPLATE_LIST.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
            </Select>
          </div>
          <Paper template={draft.template} className="min-h-96"><DocumentView doc={draftToDocument(draft)} /></Paper>
        </section>
      </div>
    </>
  );
}
