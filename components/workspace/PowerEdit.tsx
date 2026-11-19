"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { loadReportTarget, saveWorkspaceScan } from "@/app/actions/scans";
import { AtsNote } from "@/components/scan/AtsNote";
import { Breakdown, CheckList, MatchRateFigure, PredictedSkills, SkillStatusMark } from "@/components/scan/reportParts";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { detectAts } from "@/lib/ats";
import type { ScanTarget } from "@/lib/data/job-descriptions";
import { buildMatchReport } from "@/lib/report/matchReport";
import type { SkillMatch } from "@/lib/report/report";
import type { ReportTarget } from "@/lib/report/target";
import type { DocumentContent } from "@/lib/schemas/document";

function Skills({ title, skills, onInsert, insertLabel }: {
  title: string;
  skills: SkillMatch[];
  onInsert: (text: string) => void;
  insertLabel: string;
}) {
  const found = skills.filter((skill) => skill.status === "found").length;
  return (
    <details open={found < skills.length}>
      <summary className="cursor-pointer text-body font-medium text-ink">{title} <span className="font-mono text-label text-ink-3">{found}/{skills.length}</span></summary>
      {skills.length ? (
        <ul className="mt-2 divide-y divide-line">
          {skills.map((skill) => (
            <li key={skill.term} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 py-2">
              <div className="min-w-0">
                <p className="break-words text-small font-medium">{skill.term}</p>
                <SkillStatusMark status={skill.status} form={skill.matchedForm} />
              </div>
              {skill.status !== "found" && (
                <Button variant="ghost" size="sm" aria-label={`${insertLabel}: ${skill.term}`} onClick={() => onInsert(skill.term)}>
                  <Plus aria-hidden /> {insertLabel}
                </Button>
              )}
              {skill.advice && <p className="basis-full text-label text-ink-2">{skill.advice}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-small text-ink-3">None identified in the posting.</p>}
    </details>
  );
}

export function PowerEdit({ active, doc, resumeId, jobs, initialJobId, initialTarget, asOf, onAddSkill, onInsert, flush }: {
  active: boolean;
  doc: DocumentContent;
  resumeId: string;
  jobs: ScanTarget[];
  initialJobId: string | null;
  initialTarget: ReportTarget | null;
  asOf: string;
  onAddSkill: (text: string) => void;
  onInsert: (text: string) => void;
  flush: () => Promise<void>;
}) {
  const router = useRouter();
  const [target, setTarget] = useState(initialTarget);
  const [selected, setSelected] = useState(initialJobId ?? "");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoredDoc, setScoredDoc] = useState(doc);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setScoredDoc(doc), 250);
    return () => clearTimeout(timer);
  }, [active, doc]);

  const report = useMemo(() => active && target ? buildMatchReport({
    job: target.facts, jobText: target.text, resume: scoredDoc, file: null, asOf: new Date(asOf),
  }) : null, [active, target, scoredDoc, asOf]);
  const ats = useMemo(() => target ? detectAts({ url: target.url, text: target.text }) : null, [target]);

  async function choose(id: string) {
    setSelected(id);
    setTarget(null);
    setError(null);
    if (!id) return;
    setBusy(true);
    try {
      const result = await loadReportTarget(id);
      if (result.ok) setTarget(result.target);
      else setError(result.error);
    } catch {
      setError("Couldn't load this posting. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function rescan() {
    if (!target) return;
    setError(null);
    setSaving(true);
    try {
      await flush();
      const result = await saveWorkspaceScan(resumeId, target.id);
      if (result.ok) router.push(`/scan/${result.id}`);
      else setError(result.error);
    } catch {
      setError("Couldn't save this scan. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!active) return null;

  return (
    <section aria-label="Power Edit" className="grid gap-5 p-4">
      <div>
        <h2 className="text-lead font-semibold">Power Edit</h2>
        <p className="text-small text-ink-2">Your match rate updates as you edit.</p>
      </div>
      <Field label="Compare with a job">
        {(props) => (
          <Select {...props} value={selected} onChange={(event) => void choose(event.target.value)} disabled={busy || saving}>
            <option value="">Choose a posting</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}{job.company && ` · ${job.company}`}</option>)}
          </Select>
        )}
      </Field>
      {!target && selected && !busy && (
        <Button variant="secondary" onClick={() => void choose(selected)}>Load match report</Button>
      )}
      {!selected && <Link href={`/scan?resume=${resumeId}`} className="text-small text-brass hover:underline">Scan against a new posting</Link>}
      {busy && <p role="status" className="text-small text-ink-2">Reading job posting…</p>}
      {error && <p role="alert" className="text-small text-danger">{error} <Link href="/settings" className="text-brass hover:underline">Settings</Link></p>}
      {target && report && (
        <>
          <div className="rounded-lg border border-line bg-panel p-3.5" aria-live="polite">
            <MatchRateFigure rate={report.matchRate} target={report.verdict.target} size="md" />
          </div>
          <Button variant="primary" loading={saving} onClick={() => void rescan()}><RefreshCw aria-hidden /> Save a new scan</Button>
          <p className="text-small text-ink-2">Add skills you have. Place your cursor in a relevant line before inserting a keyword.</p>
          <Skills title="Hard skills" skills={report.hardSkills} onInsert={onAddSkill} insertLabel="Add to skills" />
          <Skills title="Soft skills" skills={report.softSkills} onInsert={onInsert} insertLabel="Insert at cursor" />
          <Skills title="Other keywords" skills={report.otherKeywords} onInsert={onInsert} insertLabel="Insert at cursor" />
          <Details title="Score breakdown"><Breakdown components={report.breakdown} /></Details>
          <Details title="Searchability"><CheckList checks={report.searchability} /></Details>
          <Details title="Formatting"><CheckList checks={report.formatting} /></Details>
          <Details title="Recruiter tips"><CheckList checks={report.recruiterTips} /></Details>
          <Details title="Predicted skills"><PredictedSkills skills={report.predictedSkills} /></Details>
          {ats && <Details title="ATS tips"><AtsNote ats={ats} /></Details>}
          <Details title="Job posting"><p className="whitespace-pre-wrap break-words text-small text-ink-2">{target.text}</p></Details>
        </>
      )}
    </section>
  );
}

function Details({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="border-t border-line pt-3">
      <summary className="cursor-pointer text-body font-medium">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
