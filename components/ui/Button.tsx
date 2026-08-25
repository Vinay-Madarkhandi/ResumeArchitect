import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded font-sans text-button transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-secondary text-on-secondary shadow-[0_1px_0_rgba(0,0,0,0.05),0_4px_10px_-2px_rgba(0,106,97,0.4)] border-b-2 border-on-secondary-fixed-variant hover:bg-on-secondary-container hover:shadow-[0_1px_0_rgba(0,0,0,0.05),0_6px_16px_-2px_rgba(0,106,97,0.5)] hover:-translate-y-px active:translate-y-px active:shadow-none",
        secondary:
          "bg-surface-container-lowest text-on-surface border border-outline-variant border-b-2 border-b-outline hover:bg-surface-container hover:-translate-y-px hover:shadow-[var(--shadow-soft)] active:translate-y-px active:shadow-none",
        ghost: "text-on-surface-variant hover:text-primary hover:bg-surface-container",
        destructive:
          "bg-error text-on-error border-b-2 border-on-error-container hover:opacity-90 hover:-translate-y-px active:translate-y-px",
      },
      size: {
        sm: "h-8 px-sm text-xs",
        md: "h-10 px-md",
        lg: "h-11 px-lg",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  }
);
Button.displayName = "Button";
