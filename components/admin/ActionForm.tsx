"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminResult } from "@/app/admin/actions";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/Dialog";

export function ActionForm({
  action, fields, label, variant, confirmation, children,
}: {
  action: (state: AdminResult, form: FormData) => Promise<AdminResult>;
  fields?: Record<string, string>;
  label: string;
  variant?: ButtonProps["variant"];
  confirmation?: string;
  children?: ReactNode;
}) {
  const [result, submit, pending] = useActionState(action, {});

  const form = (
    <form action={submit} className="space-y-3">
      {Object.entries(fields ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <Button type="submit" variant={variant} size="sm" loading={pending}>{label}</Button>
      {result.error && <p className="text-small text-danger" role="alert">{result.error}</p>}
      {result.success && <p className="text-small text-add" role="status">{result.success}</p>}
    </form>
  );
  if (!confirmation) return form;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">{label}</Button>
      </DialogTrigger>
      <DialogContent title={label} description={confirmation}>{form}</DialogContent>
    </Dialog>
  );
}
