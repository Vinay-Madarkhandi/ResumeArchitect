"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";
import { useHydrated } from "@/lib/useHydrated";

// Signing in takes a click, so mail scanners that open the link don't use it up.
export function SignInLinkForm({ token }: { token: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const result = await signInWithLink(token, code);
      if (result.needsCode || result.error) {
        setNeedsCode(Boolean(result.needsCode));
        return setError(result.error);
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't sign in. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading title="Sign in">Continue to your account from this inbox.</AuthHeading>
      <form onSubmit={submit} className="flex flex-col gap-4" data-hydrated={hydrated || undefined}>
        {needsCode && (
          <Field label="Authenticator or recovery code">
            {(p) => <Input {...p} autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} />}
          </Field>
        )}
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="w-full">Sign in</Button>
      </form>
    </>
  );
}
