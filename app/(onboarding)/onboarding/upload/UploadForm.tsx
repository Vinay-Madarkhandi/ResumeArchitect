"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icon } from "@/components/icon/Icon";

type Status = "idle" | "uploading" | "parsing" | "error";

interface ParseResponse {
  resumeId: string;
  errorMessage?: string;
}

function uploadWithProgress(url: string, formData: FormData, onProgress: (pct: number) => void) {
  return new Promise<{ status: number; body: ParseResponse }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
      } catch {
        reject(new Error("Unexpected response from server."));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading."));
    xhr.send(formData);
  });
}

export function UploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const previousResumeId = useRef<string | null>(searchParams.get("resumeId"));

  const startUpload = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);

      if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
        setStatus("error");
        setError("Please upload a PDF file.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setStatus("error");
        setError("That file is larger than 10MB. Please upload a smaller PDF.");
        return;
      }

      setStatus("uploading");
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      if (previousResumeId.current) formData.append("previousResumeId", previousResumeId.current);

      try {
        const { status: httpStatus, body } = await uploadWithProgress("/api/resumes/parse", formData, (pct) => {
          setProgress(pct);
          if (pct >= 100) setStatus("parsing");
        });

        if (httpStatus !== 200) {
          setStatus("error");
          setError(body.errorMessage ?? "Something went wrong. Please try again.");
          return;
        }

        router.push(`/onboarding/review?resumeId=${body.resumeId}`);
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    },
    [router],
  );

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) startUpload(file);
  }

  function reset() {
    setStatus("idle");
    setFileName(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {status === "idle" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-xxl text-center transition-colors ${
            isDragOver ? "border-secondary bg-secondary-container/10" : "border-outline-variant hover:border-outline"
          }`}
        >
          <Icon name="upload" size={28} className="mb-md text-secondary" />
          <p className="font-sans text-body-lg text-on-surface">
            <span className="font-medium text-secondary">Browse files</span> or drag and drop
          </p>
          <p className="mt-1 font-mono text-label-sm text-on-surface-variant">PDF, up to 10MB</p>
        </div>
      )}

      {(status === "uploading" || status === "parsing") && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-lg">
          <div className="mb-sm flex items-center gap-2">
            <Icon name="document" size={18} className="text-on-surface-variant" />
            <span className="flex-1 truncate font-sans text-body-lg text-on-surface">{fileName}</span>
          </div>
          <ProgressBar value={status === "parsing" ? 100 : progress} />
          <p className="mt-2 font-mono text-label-sm text-on-surface-variant">
            {status === "uploading" ? `Uploading… ${progress}%` : "Reading your resume…"}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-error-container bg-error-container/30 p-lg">
          <div className="mb-sm flex items-center gap-2">
            <Icon name="warning" size={18} className="text-error" />
            <span className="font-sans text-body-lg text-on-surface">{fileName}</span>
          </div>
          <p className="mb-md font-sans text-body-lg text-on-error-container">{error}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                reset();
                inputRef.current?.click();
              }}
            >
              Try another file
            </Button>
          </div>
        </div>
      )}

      <p className="mt-md font-sans text-body-lg text-on-surface-variant">
        We&rsquo;ll use this as your starting resume — you can edit anything after we read it.
      </p>
    </div>
  );
}
