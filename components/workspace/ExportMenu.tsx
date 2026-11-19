"use client";

import { useState } from "react";
import { ChevronDown, ClipboardCopy, Download, FileCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import type { DocumentContent } from "@/lib/schemas/document";
import { hasUnverifiedClaim, RESOLVE_CLAIMS } from "@/lib/grounding/placeholder";
import { documentText } from "@/lib/resume/units";

type Format = "pdf" | "docx" | "design";

const DONE: Record<Format, string> = {
  pdf: "PDF downloaded.",
  docx: "Word file downloaded.",
  design: "Your Word file downloaded with the new wording.",
};

/**
 * Downloads exactly what's on screen: saves first, then renders the live
 * document. A resume imported from Word can also come back as that same file
 * with only the wording changed.
 */
export function ExportMenu({
  resumeId,
  doc,
  template,
  flush,
  keepsWordDesign,
  lengthChange,
}: {
  resumeId: string;
  doc: DocumentContent;
  template: string;
  flush: () => Promise<void>;
  keepsWordDesign: boolean;
  /** Text length relative to the original resume: 0.08 is 8% longer. */
  lengthChange: number;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Format | null>(null);

  const needsReview = hasUnverifiedClaim(documentText(doc));

  async function download(format: Format) {
    setBusy(format);
    try {
      await flush().catch(() => toast("Couldn't save first, but your download includes every edit on screen.", "info"));
      const res = await fetch(`/api/resumes/${resumeId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, content: doc, template }),
      });
      if (!res.ok) {
        const message = await res.json().then((b) => b?.error as string | undefined).catch(() => undefined);
        throw new Error(message);
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `Resume.${format === "pdf" ? "pdf" : "docx"}`;
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(DONE[format], "success");
    } catch (error) {
      toast((error instanceof Error && error.message) || "Couldn't build the file. Try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(documentText(doc));
      toast("Plain text copied.", "success");
    } catch {
      toast("Your browser blocked the clipboard.", "error");
    }
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="primary" size="sm" loading={busy !== null}>
          {busy ? "Preparing…" : "Download"}
          {!busy && <ChevronDown aria-hidden />}
        </Button>
      </MenuTrigger>
      <MenuContent>
        {needsReview && <p className="max-w-64 px-2 py-1.5 text-label text-query">{RESOLVE_CLAIMS}</p>}
        {keepsWordDesign && (
          <>
            <MenuLabel>Your design</MenuLabel>
            <MenuItem disabled={needsReview} onSelect={() => void download("design")}>
              <FileCheck /> Word, your original file
            </MenuItem>
            <p className="max-w-64 px-2 pb-1.5 text-label text-ink-3">
              Same fonts and layout, new wording. Save as PDF from Word to keep it exact.
              {lengthChange > 0.04 && ` The text is ${Math.round(lengthChange * 100)}% longer than your original, so check it still fits the page.`}
            </p>
            <MenuSeparator />
          </>
        )}
        <MenuLabel>{keepsWordDesign ? "In this template" : "Exactly what\u2019s on screen"}</MenuLabel>
        <MenuItem disabled={needsReview} onSelect={() => void download("pdf")}>
          <Download /> PDF
        </MenuItem>
        <MenuItem disabled={needsReview} onSelect={() => void download("docx")}>
          <FileText /> Word (.docx)
        </MenuItem>
        <MenuSeparator />
        <MenuItem disabled={needsReview} onSelect={() => void copy()}>
          <ClipboardCopy /> Copy as plain text
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
