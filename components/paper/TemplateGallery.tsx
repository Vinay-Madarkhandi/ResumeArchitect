"use client";

import { Check } from "lucide-react";
import { DocumentView, Paper } from "@/components/paper/Paper";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/resume/templates";
import type { DocumentContent } from "@/lib/schemas/document";
import { cn } from "@/lib/cn";

const PAGE_WIDTH = 794;
const THUMB_WIDTH = 176;
const SCALE = THUMB_WIDTH / PAGE_WIDTH;

/**
 * Every template, each previewing the user's own resume at true layout,
 * scaled down. Picking one changes only the typesetting, never the content.
 */
export function TemplateGallery({
  doc,
  value,
  onChange,
}: {
  doc: DocumentContent;
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Template" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {TEMPLATE_LIST.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t.label}
            onClick={() => onChange(t.id)}
            className="group flex flex-col gap-2 text-left focus-visible:outline-none"
          >
            <span
              className={cn(
                "relative block overflow-hidden rounded-[3px] ring-1 transition-shadow",
                selected ? "ring-2 ring-brass" : "ring-line group-hover:ring-line-strong group-focus-visible:ring-2 group-focus-visible:ring-brass",
              )}
              style={{ width: THUMB_WIDTH, height: Math.round(THUMB_WIDTH * 1.4142) }}
            >
              <span inert aria-hidden className="absolute left-0 top-0 block origin-top-left" style={{ width: PAGE_WIDTH, transform: `scale(${SCALE})` }}>
                <Paper template={t.id} className="min-h-[1123px] !px-(--paper-pad-x) !py-(--paper-pad-y)">
                  <DocumentView doc={doc} />
                </Paper>
              </span>
              {selected && (
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-brass text-on-brass">
                  <Check className="size-3" aria-hidden />
                </span>
              )}
            </span>
            <span>
              <span className="block text-small font-medium text-ink">{t.label}</span>
              <span className="block text-label text-ink-3">{t.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
