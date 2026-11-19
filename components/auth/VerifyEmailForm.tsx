"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { verifyEmail } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";
import { useHydrated } from "@/lib/useHydrated";

export function VerifyEmailForm({ token, changing }: { token: string; changing: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const result = await verifyEmail(token, changing, password);
      if (result.error) return setError(result.error);
      router.replace(changing ? "/sign-in" : "/onboarding");
      router.refresh();
    } catch {
      setError("Couldn't verify your email. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading title="Verify your email">
        {changing ? "Confirm that you want to use this email address." : "Choose the password for your account to activate it."}
      </AuthHeading>
      <form onSubmit={submit} className="flex flex-col gap-4" data-hydrated={hydrated || undefined}>
        {!changing && (
          <Field label="Password" hint="At least 10 characters.">
            {(p) => <Input {...p} type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
        )}
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">Verify email</Button>
      </form>
    </>
  );
}
