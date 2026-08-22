import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded font-sans text-button transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-secondary text-on-secondary border-b-2 border-on-secondary-fixed-variant hover:bg-on-secondary-container active:translate-y-px",
        secondary:
          "bg-surface-container-lowest text-on-surface border border-outline-variant border-b-2 border-b-outline hover:bg-surface-container active:translate-y-px",
        ghost: "text-on-surface-variant hover:text-primary hover:bg-surface-container",
        destructive:
          "bg-error text-on-error border-b-2 border-on-error-container hover:opacity-90 active:translate-y-px",
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
