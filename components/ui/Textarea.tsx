import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded border border-outline-variant bg-surface-container-lowest px-sm py-sm font-sans text-body-lg text-on-surface placeholder:text-outline transition-colors resize-y",
          "focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary",
          "disabled:opacity-50 disabled:pointer-events-none",
          "aria-invalid:border-error aria-invalid:focus:ring-error",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
