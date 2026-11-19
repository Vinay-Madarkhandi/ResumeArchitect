"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ScoreDelta } from "@/components/dashboard/ScoreDelta";
import { ResumeActions } from "@/components/dashboard/ResumeActions";
import { STATUSES, StatusSelect } from "@/components/tracker/StatusSelect";
import type { ApplicationStatus } from "@/lib/db/schema";
import { cn } from "@/lib/cn";

export interface ApplicationRow {
  id: string;
  title: string;
  role: string;
  company: string | null;
  status: ApplicationStatus;
  before: number | null;
  after: number | null;
  changes: number;
  toVerify: number;
  updatedLabel: string;
}

/** The application tracker: filter by stage, search by role or company, change stage inline. */
export function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = rows.filter(
    (r) =>
      (filter === "all" || r.status === filter) &&
      (!query.trim() || `${r.role} ${r.company ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filter by stage" className="flex flex-wrap gap-1">
          {[{ id: "all" as const, label: "All" }, ...STATUSES].map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={filter === s.id}
              onClick={() => setFilter(s.id)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-small text-ink-3 transition-colors hover:bg-hover hover:text-ink",
                filter === s.id && "bg-raised text-ink",
              )}
            >
              {s.label}
              <span className="font-mono text-label tabular text-ink-3">{counts[s.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-56">
          <span className="sr-only">Search applications</span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search role or company"
            className="h-8 w-full rounded-md border border-line bg-sunken pl-8 pr-3 text-small text-ink placeholder:text-ink-3 focus:border-brass focus:outline-none"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8.5rem_7rem_6.5rem_2.5rem] gap-4 border-b border-line bg-sunken px-4 py-2 text-label font-medium text-ink-3 md:grid">
          <span>Role</span>
          <span>Stage</span>
          <span>Match score</span>
          <span>Review</span>
          <span>Updated</span>
          <span className="sr-only">Actions</span>
        </div>
        {visible.length === 0 ? (
          <p className="bg-panel px-4 py-8 text-center text-small text-ink-3">No applications match.</p>
        ) : (
          <ul className="divide-y divide-line bg-panel">
            {visible.map((a) => (
              <li
                key={a.id}
                className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-hover md:grid-cols-[minmax(0,1fr)_9rem_8.5rem_7rem_6.5rem_2.5rem]"
              >
                <div className="min-w-0">
                  <Link href={`/resumes/${a.id}`} className="block truncate text-body font-medium text-ink after:absolute after:inset-0">
                    {a.role}
                  </Link>
                  <p className="truncate text-small text-ink-3">{a.company ?? "Company not named"}</p>
                </div>
                <div className="relative z-10 col-start-1 row-start-2 md:col-start-auto md:row-start-auto">
                  <StatusSelect resumeId={a.id} initial={a.status} compact />
                </div>
                <ScoreDelta before={a.before} after={a.after} className="text-body" />
                <div className="hidden md:block">
                  {a.toVerify > 0 ? <Badge tone="query">{a.toVerify} to verify</Badge> : <span className="text-small text-ink-3">{a.changes} changes</span>}
                </div>
                <span className="hidden text-small text-ink-3 md:block">{a.updatedLabel}</span>
                <div className="relative z-10 hidden justify-end md:flex">
                  <ResumeActions id={a.id} title={a.title} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
