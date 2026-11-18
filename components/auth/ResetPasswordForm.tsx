"use client";

import { useState, type FormEvent } from "react";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    setPending(true);
    try {
      const result = await resetPassword(token, password);
      if (result.error) return setError(result.error);
    } catch {
      setError("Couldn't reset your password. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading title="Choose a new password" />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="New password" hint="At least 10 characters.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">Update password</Button>
      </form>
    </>
  );
}
