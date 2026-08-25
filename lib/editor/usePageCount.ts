"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentContent } from "@/lib/schemas/document";

/** Live "how many pages will this print as" indicator — debounced, renders
 * the actual PDF pipeline server-side and counts real pages rather than
 * trying to approximate page breaks visually in the HTML canvas (a
 * different rendering engine than the PDF, so pixel-perfect WYSIWYG
 * pagination isn't realistically achievable; a real page count is more
 * honest and just as useful). Silently does nothing on failure — this is
 * a nice-to-have indicator, not something that should ever block or error
 * the actual editing experience. */
export function usePageCount(resumeId: string, doc: DocumentContent, delayMs = 1200): number | null {
  const [pageCount, setPageCount] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const res = await fetch(`/api/resumes/${resumeId}/page-count`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: doc }),
        });
        if (!res.ok) return;
        const body = await res.json();
        if (requestId === requestIdRef.current && typeof body.pageCount === "number") {
          setPageCount(body.pageCount);
        }
      } catch {
        // Best-effort only.
      }
    }, delayMs);
    return () => clearTimeout(handle);
  }, [resumeId, doc, delayMs]);

  return pageCount;
}
