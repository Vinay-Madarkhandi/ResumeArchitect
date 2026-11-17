"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/cn";

const ACCEPT = ".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";

/** Upload a file or paste text; the server rebuilds it as a structured resume, then we review it. */
export function ImportResume({ hasKey, next }: { hasKey: boolean; next: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(form: FormData, label: string) {
    setPending(label);
    setError(null);
    const res = await fetch("/api/resumes/parse", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data?.resumeId) {
      setPending(null);
      setError(data?.errorMessage ?? "Couldn't import that. Check your connection and try again.");
      return;
    }
    router.push(`${next}?resumeId=${data.resumeId}`);
  }

  function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    void submit(form, file.name);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    upload(e.dataTransfer.files[0]);
  }

  if (pending) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-line bg-panel px-6 text-center" role="status">
        <LoaderCircle className="size-6 animate-spin text-brass" aria-hidden />
        <div>
          <p className="text-lead font-medium text-ink">Reading {pending === "paste" ? "your resume" : pending}</p>
          <p className="mt-1 text-small text-ink-3">
            {hasKey ? "Gemini is rebuilding its structure. This takes 10–30 seconds." : "Extracting the text and sections."}
          </p>
        </div>
        <div className="working-rule h-px w-48" aria-hidden />
      </div>
    );
  }

  return (
    <Tabs defaultValue="upload" className="flex flex-col gap-4">
      <TabsList className="self-start">
        <TabsTrigger value="upload">Upload a file</TabsTrigger>
        <TabsTrigger value="paste">Paste text</TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-panel px-6 py-10 text-center transition-colors",
            dragging ? "border-brass bg-brass-soft" : "border-line-strong",
          )}
        >
          <FileUp className="size-6 text-brass" aria-hidden />
          <div>
            <p className="text-lead font-medium text-ink">Drop your resume here</p>
            <p className="mt-1 text-small text-ink-3">PDF, Word (.docx), or plain text · up to 10 MB</p>
          </div>
          <Button onClick={() => input.current?.click()}>Choose file</Button>
          <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} tabIndex={-1} />
        </div>
      </TabsContent>

      <TabsContent value="paste">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData();
            form.set("text", text);
            void submit(form, "paste");
          }}
        >
          <label htmlFor="paste-resume" className="sr-only">
            Resume text
          </label>
          <Textarea
            id="paste-resume"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full text of your resume…"
            className="min-h-72 font-mono text-small"
          />
          <Button type="submit" variant="primary" disabled={text.trim().length < 80} className="self-start">
            Import text
          </Button>
        </form>
      </TabsContent>

      {error && (
        <p role="alert" className="rounded-md border border-danger/40 bg-del-soft px-3 py-2 text-small text-ink">
          {error}
        </p>
      )}
    </Tabs>
  );
}
