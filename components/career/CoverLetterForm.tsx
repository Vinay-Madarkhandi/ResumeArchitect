"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Field";
import { IDEAL_WORDS } from "@/lib/career/coverLetter";
import { wordCount } from "@/lib/career/score";
import { initialTarget, TargetPicker, toTargetInput, type ApplicationOption, type TargetKind } from "./TargetPicker";
import { useCareerPost } from "./useCareerPost";

const KINDS: TargetKind[] = ["application", "posting"];

export interface LetterApplication extends ApplicationOption {
  letter: string | null;
}

export function CoverLetterForm({
  applications,
  hasKey,
  preselect,
}: {
  applications: LetterApplication[];
  hasKey: boolean;
  preselect: string | null;
}) {
  const router = useRouter();
  const [target, setTarget] = useState(() => initialTarget(KINDS, applications, preselect));
  const selected = target.kind === "application" ? applications.find((a) => a.id === target.resumeId) : undefined;
  const [letter, setLetter] = useState(() => (preselect ? selected?.letter ?? "" : ""));
  const { post, busy, error } = useCareerPost<{ id: string }>();
  const words = wordCount(letter);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const data = await post("/api/career/cover-letter", { letter, target: toTargetInput(target) });
    if (data) router.push(`/cover-letter/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_21rem]">
      <div className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-panel/75 p-6 shadow-xs backdrop-blur-xs">
        <Field
          label="Cover letter draft"
          hint={
            <>
              <span className="font-mono tabular">{words}</span> words · {IDEAL_WORDS.min}–{IDEAL_WORDS.max} reads best
            </>
          }
        >
          {(props) => <Textarea {...props} rows={16} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder="Dear Hiring Team,&#10;&#10;I am writing to express my strong interest in the role..." className="font-sans text-small leading-relaxed" />}
        </Field>
        {selected?.letter && selected.letter !== letter && (
          <Button size="sm" className="self-start" onClick={() => setLetter(selected.letter ?? "")}>
            Use the letter saved with this application
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-5 rounded-xl border border-line bg-panel/75 p-6 shadow-xs backdrop-blur-xs h-fit">
        <TargetPicker kinds={KINDS} applications={applications} hasKey={hasKey} value={target} onChange={setTarget} />
        {error && (
          <p role="alert" className="flex gap-2 text-small text-danger">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
          </p>
        )}
        <Button type="submit" variant="primary" loading={busy} disabled={target.kind === "posting" && !hasKey}>
          {busy ? "Scanning…" : "Scan letter"}
        </Button>
        <p className="text-small text-ink-3">
          Need a draft first?{" "}
          <Link
            href={selected ? `/resumes/${selected.id}?view=letter` : "/new"}
            className="inline-flex items-center gap-1 text-brass hover:underline"
          >
            {selected ? "Write one from this application" : "Tailor a resume, then write one from it"}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </p>
      </div>
    </form>
  );
}
