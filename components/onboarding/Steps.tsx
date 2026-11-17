"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const STEPS = [
  { path: "/onboarding", label: "Connect Gemini" },
  { path: "/onboarding/resume", label: "Add your resume" },
  { path: "/onboarding/review", label: "Check it over" },
];

export function Steps() {
  const pathname = usePathname();
  const current = Math.max(0, STEPS.findIndex((s) => s.path === pathname));
  return (
    <ol className="flex items-center gap-3 text-small" aria-label="Setup progress">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.path} className="flex items-center gap-3" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex items-center gap-2",
                active ? "text-ink" : done ? "text-ink-2" : "text-ink-3",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border font-mono text-[11px] tabular",
                  active && "border-brass bg-brass text-on-brass",
                  done && "border-brass text-brass",
                  !active && !done && "border-line-strong",
                )}
              >
                {done ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              <span className={cn(!active && "hidden sm:inline")}>{s.label}</span>
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-line-strong sm:w-10" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
