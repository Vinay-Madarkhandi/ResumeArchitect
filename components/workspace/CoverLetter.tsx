"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCopy, Download, FileText, PenLine, RefreshCw, ScanText } from "lucide-react";
import { useCareerPost } from "@/components/career/useCareerPost";
import { Button } from "@/components/ui/Button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/Menu";
import { Paper } from "@/components/paper/Paper";
import { useToast } from "@/components/ui/Toast";
import { useAutosave } from "@/lib/editor/useAutosave";
import type { DocumentContent } from "@/lib/schemas/document";
import type { TemplateId } from "@/lib/resume/templates";
import { cn } from "@/lib/cn";

const TONES = [
  { id: "confident", label: "Confident" },
  { id: "warm", label: "Warm" },
  { id: "concise", label: "Concise" },
] as const;

async function saveLetter(id: string, coverLetter: string) {
  const res = await fetch(`/api/resumes/${id}`, {
    method: "PATCH",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coverLetter }),
  });
  if (!res.ok) throw new Error("save failed");
}

/**
 * A cover letter for this application, written from the tailored resume and
 * the job, then edited by hand on the same proof paper. Autosaves.
 */
export function CoverLetter({
  resumeId,
  doc,
  template,
  initial,
}: {
  resumeId: string;
  doc: DocumentContent;
  template: TemplateId;
  initial: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const scan = useCareerPost<{ id: string }>();
  const [text, setText] = useState(initial ?? "");
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("confident");
  const [writing, setWriting] = useState(false);
  const { status } = useAutosave(text, (value) => saveLetter(resumeId, value));
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function write() {
    if (text.trim() && !window.confirm("Replace the current letter with a new draft?")) return;
    setWriting(true);
    const res = await fetch(`/api/resumes/${resumeId}/cover-letter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: doc, tone }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setWriting(false);
    if (!res?.ok || !data?.letter) return toast(data?.error ?? "Couldn't write the letter. Try again.", "error");
    setText(data.letter);
    toast("Draft written from your tailored resume. Read it before sending.", "success");
  }

  async function scanLetter() {
    const data = await scan.post("/api/career/cover-letter", {
      letter: text,
      target: { kind: "application", resumeId },
    });
    if (data) router.push(`/cover-letter/${data.id}`);
  }

  async function download(format: "pdf" | "docx") {
    const res = await fetch(`/api/resumes/${resumeId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "letter", format, text, template }),
    }).catch(() => null);
    if (!res?.ok) return toast("Couldn't build the file. Try again.", "error");
    const blob = await res.blob();
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `Cover letter.${format}`;
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <div className="mx-auto flex max-w-[794px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Tone" className="inline-flex rounded-md border border-line bg-sunken p-0.5">
          {TONES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={tone === t.id}
              onClick={() => setTone(t.id)}
              className={cn(
                "h-7 rounded-sm px-3 text-small text-ink-3 transition-colors hover:text-ink",
                tone === t.id && "bg-raised text-ink shadow-[0_1px_2px_oklch(0%_0_0/0.25)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button size="sm" variant={text ? "secondary" : "primary"} onClick={write} loading={writing}>
          {text ? <RefreshCw aria-hidden /> : <PenLine aria-hidden />}
          {writing ? "Writing…" : text ? "Rewrite" : "Write cover letter"}
        </Button>
        {text.trim() && (
          <Button size="sm" onClick={scanLetter} loading={scan.busy} disabled={writing}>
            <ScanText aria-hidden /> {scan.busy ? "Scanning…" : "Scan letter"}
          </Button>
        )}
        <span className="ml-auto text-small text-ink-3 tabular" role="status">
          {words > 0 && `${words} words · `}
          {status === "saved" ? "Saved" : status === "error" ? "Not saved" : "Saving"}
        </span>
        {text && (
          <Menu>
            <MenuTrigger asChild>
              <Button size="sm">
                <Download aria-hidden /> Download
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => void download("pdf")}>
                <Download /> PDF
              </MenuItem>
              <MenuItem onSelect={() => void download("docx")}>
                <FileText /> Word (.docx)
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  void navigator.clipboard.writeText(text).then(
                    () => toast("Letter copied.", "success"),
                    () => toast("Your browser blocked the clipboard.", "error"),
                  )
                }
              >
                <ClipboardCopy /> Copy text
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>

      {scan.error && <p role="alert" className="text-small text-danger">{scan.error}</p>}

      <Paper template={template}>
        {text || writing ? (
          <textarea
            aria-label="Cover letter"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={writing}
            placeholder="Writing…"
            className="min-h-[60vh] w-full resize-none bg-transparent font-[family-name:var(--paper-body)] text-[13.5px] leading-[1.65] text-paper-ink outline-none placeholder:text-paper-muted"
          />
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-[15px] font-semibold text-paper-ink">No cover letter yet</p>
            <p className="max-w-sm text-[13px] text-paper-muted">
              Gemini drafts one from this tailored resume and the job post, using only facts your resume states. You edit it here.
            </p>
          </div>
        )}
      </Paper>
    </div>
  );
}
