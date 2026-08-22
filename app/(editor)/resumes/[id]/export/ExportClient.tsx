"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ResumeContent } from "@/lib/schemas/resume";
import { ResumeDocumentPdf } from "@/components/resume-document/ResumeDocumentPdf";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/icon/Icon";

// PDFViewer renders via a browser-only worker; it can't be server-rendered.
const PDFViewer = dynamic(() => import("@react-pdf/renderer").then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-on-surface-variant">
      <Icon name="spinner" size={24} className="animate-spin" />
    </div>
  ),
});

export function ExportClient({ resumeId, title, content }: { resumeId: string; title: string; content: ResumeContent }) {
  const [status, setStatus] = useState<"idle" | "exporting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setStatus("exporting");
    setError(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/export`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
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

  if (status === "done") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-center">
        <Icon name="check-circle" size={48} className="mb-md text-secondary" />
        <h1 className="mb-1 font-sans text-headline-lg text-primary">Export complete</h1>
        <p className="mb-lg font-sans text-body-lg text-on-surface-variant">Your download should have started.</p>
        <div className="flex gap-2">
          <Link href="/library">
            <Button variant="primary">View in Library</Button>
          </Link>
          <Link href="/new-tailoring">
            <Button variant="secondary">Tailor for another job</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-lg">
        <div className="flex items-center gap-sm">
          <Link href={`/resumes/${resumeId}/edit`} className="text-on-surface-variant hover:text-primary">
            <Icon name="arrow-left" size={18} />
          </Link>
          <h1 className="font-sans text-headline-md text-on-surface">Preview &amp; export</h1>
        </div>
        <Button variant="primary" onClick={handleExport} disabled={status === "exporting"}>
          <Icon name="download" size={16} />
          {status === "exporting" ? "Preparing…" : "Confirm & download"}
        </Button>
      </header>

      {error && (
        <div className="border-b border-error-container bg-error-container/30 px-lg py-sm font-sans text-sm text-on-error-container">
          {error}
        </div>
      )}

      <div className="flex-1 bg-surface-container-low">
        <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: "none" }}>
          <ResumeDocumentPdf content={content} />
        </PDFViewer>
      </div>
    </div>
  );
}
