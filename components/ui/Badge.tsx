import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badge = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-px text-label font-medium [&_svg]:size-3", {
  variants: {
    tone: {
      neutral: "bg-hover text-ink-2",
      brass: "bg-brass-soft text-brass",
      add: "bg-add-soft text-add",
      del: "bg-del-soft text-del",
      query: "bg-query-soft text-query",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
