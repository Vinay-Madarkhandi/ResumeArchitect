import type { ReactNode } from "react";

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-page font-semibold tracking-[-0.015em] text-ink">{title}</h1>
      {children && <p className="mt-2 text-body text-ink-2">{children}</p>}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-danger/40 bg-del-soft px-3 py-2 text-small text-ink">
      {children}
    </p>
  );
}
