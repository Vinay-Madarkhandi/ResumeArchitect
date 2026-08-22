import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded border border-outline-variant bg-surface-container-lowest px-sm font-sans text-body-lg text-on-surface placeholder:text-outline transition-colors",
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
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block font-mono text-label-sm text-on-surface-variant mb-1.5", className)}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="mt-1.5 font-sans text-xs text-error">{children}</p>;
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 font-sans text-xs text-on-surface-variant">{children}</p>;
}
