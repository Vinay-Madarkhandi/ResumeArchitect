"use client";

import { useEffect, useRef, useState } from "react";
import type { DocumentContent } from "@/lib/schemas/document";

export interface PageInfo {
  pageCount: number;
  /** Text anchors marking where each page but the last ends in the real
   * exported PDF — see lib/editor/pageBreakExtension.ts for how these
   * become visual markers in the canvas. */
  pageBreakAnchors: string[];
}

/** Live "how many pages will this print as, and roughly where do they
 * break" indicator — debounced, renders the actual PDF pipeline
 * server-side and reads real pagination rather than trying to compute it
 * purely in the HTML canvas (a different rendering engine, at a different
 * — and user-resizable — width than the exported PDF, so pixel-perfect
 * WYSIWYG pagination isn't realistically achievable; the real thing,
 * summarized, is more honest and just as useful). Silently does nothing on
 * failure — this is a nice-to-have indicator, not something that should
 * ever block or error the actual editing experience. */
export function usePageCount(resumeId: string, doc: DocumentContent, delayMs = 1200): PageInfo | null {
  const [info, setInfo] = useState<PageInfo | null>(null);
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
          setInfo({ pageCount: body.pageCount, pageBreakAnchors: Array.isArray(body.pageBreakAnchors) ? body.pageBreakAnchors : [] });
        }
      } catch {
        // Best-effort only.
      }
    }, delayMs);
    return () => clearTimeout(handle);
  }, [resumeId, doc, delayMs]);

  return info;
}
