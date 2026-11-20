"use client";

import { useState } from "react";
import { Check, X, FileText, MousePointer, Plus, Cpu, Sliders } from "lucide-react";
import { cn } from "@/lib/cn";

const BREAKDOWN = [
  { label: "Core technical skills", got: 38, of: 45 },
  { label: "Role title alignment", got: 15, of: 15 },
  { label: "Domain terminology", got: 9, of: 10 },
  { label: "Parser AST compliance", got: 5, of: 5 },
];

const SKILLS = [
  { w: "TypeScript", hit: true, note: "Found via TS alias" },
  { w: "React & Next.js", hit: true, note: "Exact match in Experience" },
  { w: "PostgreSQL", hit: true, note: "Exact match in Skills" },
  { w: "Docker & OCI", hit: true, note: "Containerization match" },
  { w: "Distributed Storage", hit: true, note: "Exact match in Bullet 2" },
  { w: "Kubernetes", hit: false, note: "Missing from Experience" },
  { w: "gRPC", hit: false, note: "Missing from Skills" },
];

const CHECKS = [
  { label: "Contact information in primary body text", ok: true },
  { label: "Single-column linear text stream", ok: true },
  { label: "Standardized semantic headings (H1/H2/H3)", ok: true },
  { label: "Zero unanchored tables, floating textboxes, or canvas vectors", ok: true },
];

export function MatchReportDemo() {
  const [activeTab, setActiveTab] = useState<"editor" | "scanner">("editor");

  return (
    <div className="min-w-0" aria-label="Interactive platform demonstration">
      {/* Tab Switcher */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-line bg-sunken p-1 font-mono text-label">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all",
              activeTab === "editor"
                ? "bg-raised text-brass shadow-xs font-semibold"
                : "text-ink-3 hover:text-ink",
            )}
          >
            <FileText className="size-3.5" />
            <span>Direct PDF Canvas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scanner")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all",
              activeTab === "scanner"
                ? "bg-raised text-brass shadow-xs font-semibold"
                : "text-ink-3 hover:text-ink",
            )}
          >
            <Cpu className="size-3.5" />
            <span>ATS Token Telemetry</span>
          </button>
        </div>
        <span className="hidden font-mono text-[11px] text-ink-3 sm:inline">A4 Proof Sheet · 96 DPI</span>
      </div>

      {activeTab === "editor" ? (
        /* Sejda PDF Direct Canvas Demo */
        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl transition-all">
          {/* Sejda Ribbon Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken/80 px-4 py-2 text-small">
            <div className="flex items-center gap-1.5">
              <span className="rounded border border-line bg-raised px-2 py-0.5 font-mono text-label text-ink">
                Heading 2 · 14pt
              </span>
              <span className="h-4 w-px bg-line" />
              <span className="flex size-6 items-center justify-center rounded border border-line bg-raised font-serif font-bold text-ink text-label">
                B
              </span>
              <span className="flex size-6 items-center justify-center rounded border border-line/40 font-serif italic text-ink-3 text-label">
                I
              </span>
              <span className="h-4 w-px bg-line" />
              <button
                type="button"
                className="flex items-center gap-1 rounded border border-brass/40 bg-brass/10 px-2 py-0.5 font-mono text-label font-medium text-brass transition-colors hover:bg-brass/20"
              >
                <Plus className="size-3" /> Insert Section
              </button>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
              <Sliders className="size-3 text-brass" />
              <span>Single Stream · 24mm margins</span>
            </div>
          </div>

          {/* Paper Canvas */}
          <div className="flex justify-center bg-ground/60 p-4 sm:p-6">
            <div className="relative w-full max-w-[480px] rounded-xs border border-[#e2ded5] bg-[#fcfbfa] p-6 text-[#141618] shadow-lg">
              {/* Document Header */}
              <div className="mb-4 border-b border-[#e8e5dc] pb-3">
                <h3 className="font-serif text-2xl font-bold tracking-tight text-[#141618]">Elena Vance</h3>
                <p className="mt-1 font-mono text-[11px] text-[#5c6470]">
                  San Francisco, CA · elena@vance.io · linkedin.com/in/evance · github.com/evance
                </p>
              </div>

              {/* Editable Block Highlight Demo */}
              <div className="relative mb-4 rounded border border-amber-500/80 bg-amber-500/5 p-3">
                <span className="absolute -top-2.5 right-2 flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-black shadow-xs">
                  <MousePointer className="size-2.5" /> Inline PDF Node
                </span>
                <h4 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141618]">
                  EXPERIENCE
                </h4>
                <div className="flex items-baseline justify-between text-[12px] font-semibold text-[#141618]">
                  <span>Principal Systems Engineer — Vector Infrastructure</span>
                  <span className="font-mono text-[11px] font-normal text-[#5c6470]">2021 – Present</span>
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-[#26292d]">
                  <li>
                    Architected high-throughput message streaming clusters processing 40M+ events/day with 99.99% availability.
                  </li>
                  <li>
                    Spearheaded migration to single-stream data partitioning, reducing infrastructure footprint by 35%.
                  </li>
                </ul>
              </div>

              {/* Second Section */}
              <div>
                <h4 className="mb-1.5 border-b border-[#e8e5dc] pb-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#141618]">
                  TECHNICAL ARCHITECTURE
                </h4>
                <p className="text-[11.5px] leading-relaxed text-[#26292d]">
                  <strong className="font-semibold text-[#141618]">Systems & Storage:</strong> TypeScript, Go, PostgreSQL, Redis, Kafka, Docker, Distributed Consensus.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ATS Token Telemetry Demo */
        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl transition-all">
          <div className="flex items-end justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="font-mono text-small text-ink-2">Target: Staff Infrastructure Engineer</p>
              <p className="mt-2 flex items-baseline gap-3">
                <span className="inline-block border-b-2 border-brass pb-1 font-mono text-[42px] font-semibold leading-none text-ink tabular">
                  88%
                </span>
                <span className="text-small text-ink-3">
                  Weighted ATS Rubric · <span className="font-mono font-medium text-emerald-400">Deterministic Match</span>
                </span>
              </p>
            </div>
          </div>

          <dl className="grid gap-3 border-b border-line px-5 py-4">
            {BREAKDOWN.map((c) => (
              <div key={c.label} className="grid grid-cols-[8.5rem_minmax(0,1fr)_3.25rem] items-center gap-3">
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
            <p className="font-mono text-label uppercase tracking-wider text-ink-3">Extracted Competency Tokens</p>
            <ul className="mt-2.5 flex flex-wrap gap-2" aria-label="Extracted tokens">
              {SKILLS.map((k) => (
                <li
                  key={k.w}
                  className={cn(
                    "rounded-sm border px-2 py-0.5 font-mono text-label transition-colors",
                    k.hit ? "border-emerald-500/40 bg-emerald-500/10 font-medium text-emerald-400" : "border-dashed border-line-strong text-ink-3",
                  )}
                >
                  {!k.hit && <span className="sr-only">Missing token: </span>}
                  {k.w}
                </li>
              ))}
            </ul>
          </div>

          <div className="px-5 py-4">
            <p className="font-mono text-label uppercase tracking-wider text-ink-3">ATS Parser AST Invariants</p>
            <ul className="mt-2 grid gap-1.5">
              {CHECKS.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-small text-ink-2">
                  <Check className="size-3.5 shrink-0 text-emerald-400" aria-hidden />
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
