"use client";

import { useState } from "react";
import { Check, X, Sparkles, FileText, MousePointer, Plus, Bold, Italic } from "lucide-react";
import { cn } from "@/lib/cn";

const BREAKDOWN = [
  { label: "Hard skills", got: 38, of: 45 },
  { label: "Job title match", got: 15, of: 15 },
  { label: "Soft skills", got: 9, of: 10 },
  { label: "ATS formatting", got: 5, of: 5 },
];

const SKILLS = [
  { w: "TypeScript", hit: true },
  { w: "React & Next.js", hit: true },
  { w: "PostgreSQL", hit: true },
  { w: "Docker & CI/CD", hit: true },
  { w: "Distributed Systems", hit: true },
  { w: "Kubernetes", hit: false },
  { w: "gRPC", hit: false },
];

const CHECKS = [
  { label: "Email, phone & links in body", ok: true },
  { label: "Standard ATS headings (H1/H2/H3)", ok: true },
  { label: "Single-column layout preserved", ok: true },
  { label: "Unparseable tables or columns", ok: false },
];

export function MatchReportDemo() {
  const [activeTab, setActiveTab] = useState<"editor" | "scanner">("editor");

  return (
    <figure className="min-w-0" aria-label="Interactive platform demo">
      {/* Tab Switcher */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-line bg-panel p-1">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-small font-medium transition-all",
              activeTab === "editor"
                ? "bg-raised text-brass shadow-xs"
                : "text-ink-3 hover:text-ink",
            )}
          >
            <FileText className="size-3.5" />
            <span>Sejda PDF Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scanner")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-small font-medium transition-all",
              activeTab === "scanner"
                ? "bg-raised text-brass shadow-xs"
                : "text-ink-3 hover:text-ink",
            )}
          >
            <Sparkles className="size-3.5" />
            <span>ATS Match Scanner</span>
          </button>
        </div>
        <span className="hidden text-label text-ink-3 sm:inline">Interactive Preview</span>
      </div>

      {activeTab === "editor" ? (
        /* Sejda PDF Editor Canvas Demo */
        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl transition-all">
          {/* Simulated Sejda Ribbon Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/60 px-4 py-2 text-small">
            <div className="flex items-center gap-1">
              <span className="rounded bg-raised px-2 py-0.5 font-medium text-ink">Heading 2</span>
              <span className="h-4 w-px bg-line" />
              <span className="flex size-6 items-center justify-center rounded bg-raised font-serif font-bold text-ink text-label">B</span>
              <span className="flex size-6 items-center justify-center rounded font-serif italic text-ink-3 text-label">I</span>
              <span className="h-4 w-px bg-line" />
              <span className="rounded bg-brass/15 px-2 py-0.5 font-semibold text-brass text-label flex items-center gap-1">
                <Plus className="size-3" /> Add Section
              </span>
            </div>
            <div className="flex items-center gap-2 text-label text-ink-3 font-mono">
              <span>A4 · 100%</span>
            </div>
          </div>

          {/* Paper Canvas */}
          <div className="p-4 sm:p-6 bg-ground/50 flex justify-center">
            <div className="w-full max-w-[480px] rounded-sm bg-[#fdfcfb] p-6 text-[#111315] shadow-lg border border-[#e5e2da] relative">
              <div className="border-b border-[#e5e2da] pb-3 mb-4">
                <h3 className="font-bold text-xl tracking-tight text-[#111315]">Alex Sterling</h3>
                <p className="text-[12px] text-[#525866]">
                  San Francisco, CA · alex@example.com · linkedin.com/in/alex · github.com/alex
                </p>
              </div>

              {/* Editable Block Highlight Demo */}
              <div className="relative mb-4 rounded border-2 border-dashed border-amber-500/60 p-2.5 bg-amber-500/5">
                <span className="absolute -top-2.5 right-2 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black flex items-center gap-1 shadow-xs">
                  <MousePointer className="size-2.5" /> Inline PDF Block
                </span>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#111315] mb-1">
                  WORK EXPERIENCE
                </h4>
                <div className="flex justify-between items-baseline text-[12px] font-semibold text-[#111315]">
                  <span>Lead Systems Architect — Acme Cloud</span>
                  <span className="text-[11px] font-normal text-[#525866]">2022 – Present</span>
                </div>
                <ul className="mt-1.5 list-disc pl-4 text-[11px] text-[#222428] space-y-0.5 leading-relaxed">
                  <li>
                    Architected high-throughput message streaming clusters processing 40M+ events/day.
                  </li>
                  <li>
                    Spearheaded migration to Kubernetes, decreasing cloud infrastructure cost by 35%.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#111315] border-b border-[#e5e2da] pb-0.5 mb-1.5">
                  TECHNICAL SKILLS
                </h4>
                <p className="text-[11px] text-[#222428] leading-normal">
                  <strong className="font-semibold">Languages & Frameworks:</strong> TypeScript, Go, Python, React, Next.js, Node.js, PostgreSQL
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ATS Scanner & Match Report Demo */
        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl transition-all">
          <div className="flex items-end justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-small text-ink-2">Senior Full Stack Engineer · FinTech Platforms</p>
              <p className="mt-2 flex items-baseline gap-3">
                <span className="inline-block border-b-2 border-brass pb-1 font-mono text-[42px] font-semibold leading-none text-ink tabular">
                  88%
                </span>
                <span className="text-small text-ink-3">
                  ATS Match Score · <span className="font-medium text-emerald-400">High Interview Probability</span>
                </span>
              </p>
            </div>
          </div>

          <dl className="grid gap-3 border-b border-line px-5 py-4">
            {BREAKDOWN.map((c) => (
              <div key={c.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.25rem] items-center gap-3">
                <dt className="text-small text-ink-2">{c.label}</dt>
                <dd className="h-1.5 rounded-full bg-sunken" aria-hidden>
                  <span className="block h-full rounded-full bg-brass" style={{ width: `${(c.got / c.of) * 100}%` }} />
                </dd>
                <dd className="text-right font-mono text-label text-ink-3 tabular">
                  {c.got}/{c.of}
                </dd>
              </div>
            ))}
          </dl>

          <div className="border-b border-line px-5 py-4">
            <p className="text-small font-medium text-ink-2">Matched Key Skills</p>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Skills from the job post">
              {SKILLS.map((k) => (
                <li
                  key={k.w}
                  className={cn(
                    "rounded-sm border px-2 py-0.5 text-small transition-colors",
                    k.hit ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-medium" : "border-dashed border-line-strong text-ink-3",
                  )}
                >
                  {!k.hit && <span className="sr-only">Missing: </span>}
                  {k.w}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-5 py-4">
            <p className="text-small font-medium text-ink-2">ATS Formatting & Searchability</p>
            <ul className="mt-2 grid gap-1.5">
              {CHECKS.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-small text-ink-2">
                  {c.ok ? <Check className="size-3.5 text-emerald-400" aria-hidden /> : <X className="size-3.5 text-rose-400" aria-hidden />}
                  <span className={cn(!c.ok && "line-through decoration-rose-400/70")}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <figcaption className="mt-3 text-label text-ink-3 text-center">
        Interactive preview. Experience real-time Sejda-style PDF editing alongside strict ATS compliance.
      </figcaption>
    </figure>
  );
}
