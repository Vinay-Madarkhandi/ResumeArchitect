"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import type { ApplicationStatus } from "@/lib/db/schema";
import { cn } from "@/lib/cn";

export const STATUSES: Array<{ id: ApplicationStatus; label: string; dot: string }> = [
  { id: "saved", label: "Saved", dot: "bg-ink-3" },
  { id: "applied", label: "Applied", dot: "bg-brass" },
  { id: "interviewing", label: "Interviewing", dot: "bg-query" },
  { id: "offer", label: "Offer", dot: "bg-add" },
  { id: "rejected", label: "Rejected", dot: "bg-del" },
];

export function statusMeta(id: ApplicationStatus) {
  return STATUSES.find((s) => s.id === id) ?? STATUSES[0];
}

/** Where an application stands; saved immediately, refreshes the page's server data. */
export function StatusSelect({ resumeId, initial, compact }: { resumeId: string; initial: ApplicationStatus; compact?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(initial);
  const meta = statusMeta(status);

  async function choose(next: ApplicationStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    const res = await fetch(`/api/resumes/${resumeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationStatus: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setStatus(prev);
      return toast("Couldn't update the status. Try again.", "error");
    }
    router.refresh();
  }

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-line text-small text-ink transition-colors hover:border-line-strong hover:bg-hover data-[state=open]:bg-hover",
          compact ? "h-7 px-2" : "h-8 px-2.5",
        )}
        aria-label={`Application status: ${meta.label}. Change status`}
      >
        <span className={cn("size-2 rounded-full", meta.dot)} aria-hidden />
        {meta.label}
        <ChevronDown className="size-3.5 text-ink-3" aria-hidden />
      </MenuTrigger>
      <MenuContent align="start" className="min-w-40">
        {STATUSES.map((s) => (
          <MenuItem key={s.id} onSelect={() => void choose(s.id)}>
            <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
            <span className="flex-1">{s.label}</span>
            {s.id === status && <Check aria-hidden />}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
