"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Download, PenLine, RefreshCw, PencilRuler } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { rescanAction, scanResumeAction, trackScannedJob } from "@/app/actions/scans";

type Busy = "optimize" | "edit" | "rescan" | "track" | null;

/** What to do next with a report: let AI tailor, edit by hand with a live score, scan again, or track the job. */
export function ScanActions({ scanId, tracked, jobId }: { scanId: string; tracked: boolean; jobId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<Busy>(null);

  async function open(intent: "optimize" | "edit") {
    setBusy(intent);
    const result = await scanResumeAction(scanId);
    if (!result.ok) {
      setBusy(null);
      return toast(result.error, "error");
    }
    router.push(intent === "optimize"
      ? `/new?job=${result.jobId}&resume=${result.resumeId}`
      : `/resumes/${result.resumeId}?view=edit&job=${result.jobId}`);
  }

  async function rescan() {
    setBusy("rescan");
    const result = await rescanAction(scanId);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    router.push(`/scan/${result.id}`);
  }

  async function track() {
    setBusy("track");
    const result = await trackScannedJob(scanId);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    toast("Added to your job tracker.", "success");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button variant="primary" loading={busy === "optimize"} disabled={busy !== null} onClick={() => void open("optimize")}>
        <PencilRuler aria-hidden /> Optimize with AI
      </Button>
      <Button loading={busy === "edit"} disabled={busy !== null} onClick={() => void open("edit")}>
        <PenLine aria-hidden /> Edit and re-scan
      </Button>
      <Button variant="ghost" loading={busy === "rescan"} disabled={busy !== null} onClick={() => void rescan()}
        title="Scan your current resume against this job again">
        <RefreshCw aria-hidden /> Re-scan
      </Button>
      {tracked ? (
        <a href={`/tracker?job=${jobId}`} className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-body text-ink-2 transition-colors hover:bg-hover hover:text-ink [&_svg]:size-4">
          <Columns3 aria-hidden /> In tracker
        </a>
      ) : (
        <Button variant="ghost" loading={busy === "track"} disabled={busy !== null} onClick={() => void track()}>
          <Columns3 aria-hidden /> Track this job
        </Button>
      )}
      <a href={`/api/scans/${scanId}/download`} download
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-body text-ink-2 transition-colors hover:bg-hover hover:text-ink [&_svg]:size-4">
        <Download aria-hidden /> Download
      </a>
    </div>
  );
}
