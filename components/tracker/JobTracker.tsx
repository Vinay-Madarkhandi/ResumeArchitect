"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import type { TrackerJob } from "@/lib/data/jobs";
import { maxCsvBytes } from "@/lib/tracker/csv";
import { stageLabels, stages, type ApplicationStatus } from "@/lib/tracker/stages";
import { JobDetails } from "./JobDetails";

const dragType = "application/x-resumearchitect-job";

export function JobTracker({ jobs, initialJobId }: { jobs: TrackerJob[]; initialJobId: string | null }) {
  const router = useRouter();
  const initial = jobs.find((job) => job.id === initialJobId);
  const [editing, setEditing] = useState<string | null>(initial?.id ?? null);
  const [view, setView] = useState<"board" | "table">("board");
  const [archived, setArchived] = useState(initial?.archived ?? false);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [sort, setSort] = useState("updated");
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const [pending, startTransition] = useTransition();
  const [dropStage, setDropStage] = useState<ApplicationStatus | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const focusAfterMove = useRef<{ id: string; stage: ApplicationStatus } | null>(null);
  const moveControls = useRef(new Map<string, HTMLSelectElement>());
  const editTrigger = useRef<HTMLElement | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const target = focusAfterMove.current;
    if (target && jobs.some((job) => job.id === target.id && job.stage === target.stage)) {
      (moveControls.current.get(target.id) ?? addButton.current)?.focus();
      focusAfterMove.current = null;
    }
  }, [jobs]);

  const visible = jobs.filter((job) => job.archived === archived && (stage === "all" || job.stage === stage)
    && [job.title, job.company, job.location, job.description, job.notes].some((value) => value.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "company") return a.company.localeCompare(b.company) || a.title.localeCompare(b.title);
      if (sort === "excitement") return (b.excitement ?? 0) - (a.excitement ?? 0);
      if (sort === "followUp") return (a.followUp ?? "~").localeCompare(b.followUp ?? "~");
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  function send(body: BodyInit, type: string, success: (result: { count?: number }) => string, onSuccess?: () => void) {
    return new Promise<boolean>((resolve) => {
      setNotice(undefined);
      startTransition(async () => {
        try {
          const response = await fetch("/api/tracker", { method: "POST", headers: { "Content-Type": type }, body });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error ?? "Couldn't save your changes. Try again.");
          onSuccess?.();
          setNotice({ text: success(result) });
          router.refresh();
          resolve(true);
        } catch (error) {
          setNotice({ text: error instanceof Error ? error.message : "Couldn't save your changes.", error: true });
          resolve(false);
        }
      });
    });
  }

  function move(id: string, next: ApplicationStatus, keyboard = false) {
    const job = jobs.find((item) => item.id === id);
    if (!job || job.stage === next || pending) return;
    void send(JSON.stringify({ action: "move", id, stage: next }), "application/json",
      () => `${job.title} moved to ${stageLabels[next]}.`,
      () => { if (keyboard) focusAfterMove.current = { id, stage: next }; });
  }

  function open(id: string, button: HTMLElement) {
    editTrigger.current = button;
    setNotice(undefined);
    setEditing(id);
  }

  function jobButton(job: TrackerJob) {
    return <button type="button" onClick={(event) => open(job.id, event.currentTarget)}
      className="block max-w-full break-words text-left text-body font-semibold hover:underline">{job.title}</button>;
  }

  function moveControl(job: TrackerJob) {
    return <Select ref={(element) => {
      if (element) moveControls.current.set(job.id, element);
      else moveControls.current.delete(job.id);
    }} aria-label={`Move ${job.title} to stage`} value={job.stage} disabled={pending}
      onChange={(event) => move(job.id, event.target.value as ApplicationStatus, true)}>
      {stages.map((option) => <option key={option} value={option}>{stageLabels[option]}</option>)}
    </Select>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page font-semibold">Job tracker</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/tracker" download className={buttonVariants()}><Download aria-hidden /> Export CSV</a>
          <Button disabled={pending} onClick={() => file.current?.click()}><Upload aria-hidden /> Import CSV</Button>
          <input ref={file} type="file" accept=".csv,text/csv" aria-label="CSV file to import" className="sr-only" tabIndex={-1}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!selected) return;
              if (selected.size > maxCsvBytes) return setNotice({ text: "Choose a CSV file under 2 MB.", error: true });
              void send(selected, "text/csv", ({ count }) => `Imported ${count} ${count === 1 ? "job" : "jobs"}.`);
            }} />
          <Button ref={addButton} variant="primary" onClick={(event) => open("new", event.currentTarget)}><Plus aria-hidden /> Add job</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Tracker view" className="flex gap-1">
          <Button aria-pressed={view === "board"} variant={view === "board" ? "secondary" : "ghost"} onClick={() => setView("board")}>Board</Button>
          <Button aria-pressed={view === "table"} variant={view === "table" ? "secondary" : "ghost"} onClick={() => setView("table")}>Table</Button>
        </div>
        <Input className="w-full sm:w-48" type="search" aria-label="Search jobs" placeholder="Search jobs" value={query}
          onChange={(event) => setQuery(event.target.value)} />
        <Select aria-label="Filter by stage" value={stage} onChange={(event) => setStage(event.target.value)}>
          <option value="all">All stages</option>
          {stages.map((option) => <option key={option} value={option}>{stageLabels[option]}</option>)}
        </Select>
        <Select aria-label="Sort jobs" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="updated">Recently updated</option>
          <option value="title">Job title</option>
          <option value="company">Company</option>
          <option value="excitement">Excitement</option>
          <option value="followUp">Next follow-up</option>
        </Select>
        <Button className="sm:ml-auto" aria-pressed={archived} variant={archived ? "secondary" : "ghost"}
          onClick={() => setArchived(!archived)}>Archive</Button>
      </div>
      {(!editing || !notice?.error) && <p role={notice?.error ? "alert" : "status"} className={cn("text-small", notice?.error ? "text-danger" : "text-ink-2")}>
        {notice?.text}
      </p>}
      {view === "board" ? (
        <div className="grid auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-2 overflow-x-auto pb-3">
          {stages.filter((option) => stage === "all" || stage === option).map((option) => {
            const column = visible.filter((job) => job.stage === option);
            return <section key={option} aria-label={stageLabels[option]} className={cn(
              "min-h-48 rounded-lg border border-line bg-sunken p-2", dropStage === option && "border-brass bg-brass-soft",
            )} onDragOver={(event) => {
              if (!event.dataTransfer.types.includes(dragType)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropStage(option);
            }} onDrop={(event) => {
              event.preventDefault();
              setDropStage(null);
              move(event.dataTransfer.getData(dragType), option);
            }}>
              <h2 className="flex items-center justify-between border-b border-line px-1 pb-2 text-small font-semibold">
                {stageLabels[option]} <span className="font-mono text-label text-ink-3">{column.length}</span>
              </h2>
              <ul className="mt-2 space-y-2">
                {column.map((job) => <li key={job.id} draggable={!pending} onDragStart={(event) => {
                  event.dataTransfer.setData(dragType, job.id);
                  event.dataTransfer.effectAllowed = "move";
                }} onDragEnd={() => setDropStage(null)} aria-label={job.title}
                  className="cursor-grab space-y-2 rounded-lg border border-line bg-panel p-3 active:cursor-grabbing">
                  <div>{jobButton(job)}
                    {(job.company || job.location) && <p className="break-words text-small text-ink-2">
                      {[job.company, job.location].filter(Boolean).join(" · ")}
                    </p>}
                  </div>
                  {job.followUp && <p className="text-label text-ink-3">Follow-up <time dateTime={job.followUp}>{job.followUp}</time></p>}
                  {moveControl(job)}
                </li>)}
              </ul>
            </section>;
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[42rem] text-left text-small">
            <thead className="border-b border-line bg-sunken text-ink-2">
              <tr>{["Job title", "Company", "Location", "Stage", "Follow-up", "Excitement"].map((label) => (
                <th key={label} scope="col" className="p-3 font-semibold">{label}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-line bg-panel">
              {visible.map((job) => <tr key={job.id}>
                <td className="p-3">{jobButton(job)}</td>
                <td className="p-3">{job.company}</td>
                <td className="p-3">{job.location}</td>
                <td className="w-40 p-3">{moveControl(job)}</td>
                <td className="whitespace-nowrap p-3">{job.followUp ?? "—"}</td>
                <td className="p-3 font-mono">{job.excitement ? `${job.excitement}/5` : "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      {visible.length === 0 && <p className="text-small text-ink-3">
        {query || stage !== "all" ? "No jobs match these filters." : archived ? "No archived jobs." : "Add or import a job to start tracking it."}
      </p>}
      <Dialog open={editing !== null} onOpenChange={(value) => { if (!value && !pending) setEditing(null); }}>
        {editing && <JobDetails key={editing} job={jobs.find((job) => job.id === editing)} pending={pending}
          error={notice?.error ? notice.text : undefined}
          restoreFocus={() => (editTrigger.current?.isConnected ? editTrigger.current : addButton.current)?.focus()}
          submit={(body, text) => send(JSON.stringify(body), "application/json", () => text, () => setEditing(null))}
          />}
      </Dialog>
    </div>
  );
}
