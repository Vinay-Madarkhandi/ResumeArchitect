"use client";

import { useState } from "react";
import { ChevronDown, ClipboardCopy, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import type { DocumentContent } from "@/lib/schemas/document";
import { documentText } from "@/lib/resume/units";

/** Downloads exactly what's on screen: saves first, then renders the live document. */
export function ExportMenu({
  resumeId,
  doc,
  template,
  flush,
}: {
  resumeId: string;
  doc: DocumentContent;
  template: string;
  flush: () => Promise<void>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);

  async function download(format: "pdf" | "docx") {
    setBusy(format);
    try {
      await flush().catch(() => toast("Couldn't save first, but your download includes every edit on screen.", "info"));
      const res = await fetch(`/api/resumes/${resumeId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, content: doc, template }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `Resume.${format}`;
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`${format === "pdf" ? "PDF" : "Word file"} downloaded.`, "success");
    } catch {
      toast("Couldn't build the file. Try again.", "error");
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
        <MenuLabel>Exactly what&rsquo;s on screen</MenuLabel>
        <MenuItem onSelect={() => void download("pdf")}>
          <Download /> PDF
        </MenuItem>
        <MenuItem onSelect={() => void download("docx")}>
          <FileText /> Word (.docx)
        </MenuItem>
        <MenuSeparator />
        <MenuItem onSelect={() => void copy()}>
          <ClipboardCopy /> Copy as plain text
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
