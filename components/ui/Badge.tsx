import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-label-sm",
  {
    variants: {
      variant: {
        neutral: "bg-surface-container-high text-on-surface",
        accent: "bg-secondary-container text-on-secondary-container",
        outline: "border border-outline-variant text-on-surface-variant",
        error: "bg-error-container text-on-error-container",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
