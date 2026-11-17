"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentContent } from "@/lib/schemas/document";

export interface PageInfo {
  pageCount: number;
  pageBreakAnchors: string[];
}

/**
 * Printed page count from the real PDF renderer, refreshed after edits
 * settle. Best-effort: failures leave the last known value in place.
 */
export function usePageCount(resumeId: string, doc: DocumentContent, template: string, delayMs = 1500): PageInfo | null {
  const [info, setInfo] = useState<PageInfo | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const handle = setTimeout(async () => {
      const id = ++seq.current;
      try {
        const res = await fetch(`/api/resumes/${resumeId}/page-count`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: doc, template }),
        });
        if (!res.ok) return;
        const body = await res.json();
        if (id === seq.current && typeof body.pageCount === "number") {
          setInfo({ pageCount: body.pageCount, pageBreakAnchors: body.pageBreakAnchors ?? [] });
        }
      } catch {
        // Keep the last value.
      }
    }, delayMs);
    return () => clearTimeout(handle);
  }, [resumeId, doc, template, delayMs]);
  return info;
}
