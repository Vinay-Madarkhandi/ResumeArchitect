"use client";

import { useActionState } from "react";
import { unlockResumeShare } from "@/app/actions/shares";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function SharePassword({ slug }: { slug: string }) {
  const [error, action, pending] = useActionState(unlockResumeShare.bind(null, slug), "");

  return (
    <main className="mx-auto mt-20 grid max-w-md gap-3 rounded-lg border border-line bg-panel p-6">
      <h1 className="text-page font-semibold">Protected resume</h1>
      <p className="text-body text-ink-2">Enter the password from the person who shared this resume.</p>
      <form action={action} className="mt-3 grid gap-4">
        <Field label="Password" error={error || undefined}>
          {(props) => <Input {...props} name="password" type="password" required maxLength={1024} autoComplete="current-password" />}
        </Field>
        <Button type="submit" variant="primary" loading={pending} className="justify-self-start">View resume</Button>
      </form>
    </main>
  );
}
