"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";

/**
 * No live PDF preview here on purpose — it used to embed @react-pdf/renderer's
 * PDFViewer in an iframe, which Android Chrome/Brave don't render inline
 * (they fall back to a bare "here's a file" card instead of the document).
 * The document editor canvas is already styled to match the exported PDF,
 * so it doubles as the live preview; this screen is just the download step.
 */
export function ExportClient({ resumeId, title }: { resumeId: string; title: string }) {
  const [status, setStatus] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setStatus("exporting");
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/export`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      const link = document.createElement("a");
      link.href = body.signedUrl;
      link.download = `${title.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus("done");
    } catch {
      setError("Network error — please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center gap-sm border-b border-outline-variant bg-surface-container-lowest px-lg">
        <Link href={`/resumes/${resumeId}/edit`} className="text-on-surface-variant hover:text-primary">
          <Icon name="arrow-left" size={18} />
        </Link>
        <h1 className="font-sans text-headline-md text-on-surface">Export</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center bg-surface-container-low px-lg text-center">
        {status === "done" ? (
          <>
            <Icon name="check-circle" size={48} className="mb-md text-secondary" />
            <h2 className="mb-1 font-display text-headline-lg text-primary">Export complete</h2>
            <p className="mb-lg font-sans text-body-lg text-on-surface-variant">Your download should have started.</p>
            <div className="flex gap-2">
              <Link href="/library">
                <Button variant="primary">View in Library</Button>
              </Link>
              <Link href="/new-tailoring">
                <Button variant="secondary">Tailor for another job</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <Icon name="download" size={48} className="mb-md text-secondary" />
            <h2 className="mb-1 font-display text-headline-lg text-primary">{title}</h2>
            <p className="mb-lg max-w-sm font-sans text-body-lg text-on-surface-variant">
              We&rsquo;ll generate a PDF from your current document and start the download.
            </p>
            {error && <p className="mb-md font-sans text-body-lg text-error">{error}</p>}
            <Button variant="primary" size="lg" onClick={handleExport} disabled={status === "exporting"}>
              <Icon name="download" size={16} />
              {status === "exporting" ? "Preparing…" : "Confirm & download"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
