"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw, Trash2 } from "lucide-react";
import { deleteScanAction, rescanAction } from "@/app/actions/scans";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { ScanSummary } from "@/lib/data/scans";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

export function ScanHistory({ scans }: { scans: ScanSummary[] }) {
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<ScanSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const terms = query.toLowerCase().trim().split(/\s+/);
  const rows = scans.filter((scan) => {
    const text = [scan.jobTitle || "Untitled job", scan.company, scan.resumeLabel].join(" ").toLowerCase();
    return terms.every((term) => text.includes(term));
  });

  async function rescan(id: string) {
    setBusy(id);
    try {
      const result = await rescanAction(id);
      if (result.ok) router.push(`/scan/${result.id}`);
      else toast(result.error, "error");
    } catch {
      toast("Couldn't re-scan. Try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(scan: ScanSummary) {
    setBusy(scan.id);
    try {
      const result = await deleteScanAction(scan.id);
      if (!result.ok) return toast(result.error, "error");
      setDeleting(null);
      toast("Scan deleted.", "success");
    } catch {
      toast("Couldn't delete the scan. Try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  if (!scans.length) return <p className="rounded-lg border border-line bg-panel p-5 text-body text-ink-2">Your completed scans will appear here.</p>;

  return (
    <div className="grid gap-4">
      <Field label="Filter by job, company, or resume">
        {(props) => <Input {...props} type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="max-w-sm" />}
      </Field>
      {rows.length ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-panel">
          <table className="w-full min-w-[39rem] text-left text-small">
            <thead className="border-b border-line text-ink-3">
              <tr>{["Job", "Resume", "Match rate", "Date", "Actions"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((scan) => (
                <tr key={scan.id} className="border-b border-line last:border-b-0">
                  <th scope="row" className="px-4 py-3 font-medium">
                    <Link href={`/scan/${scan.id}`} className="text-brass hover:underline">{scan.jobTitle || "Untitled job"}</Link>
                    {scan.company && <span className="block text-label font-normal text-ink-3">{scan.company}</span>}
                  </th>
                  <td className="px-4 py-3 text-ink-2">{scan.resumeLabel}</td>
                  <td className="px-4 py-3 font-mono tabular">{scan.matchRate}%</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-2">
                    <time dateTime={scan.createdAt}>{dateFormat.format(new Date(scan.createdAt))}</time>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void rescan(scan.id)}>
                        <RefreshCw aria-hidden /> Re-scan
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => setDeleting(scan)}>
                        <Trash2 aria-hidden /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-body text-ink-2">No scans match that filter.</p>}
      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(null); }}>
        <DialogContent title="Delete this scan?" description="The match report will be removed from your history.">
          <div className="flex justify-end gap-2">
            <Button disabled={busy !== null} onClick={() => setDeleting(null)}>Cancel</Button>
            <Button loading={busy !== null} variant="danger" onClick={() => deleting && void remove(deleting)}>Delete scan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
