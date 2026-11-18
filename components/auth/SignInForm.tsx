"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";
import { safeRedirect } from "@/lib/safeRedirect";

export function SignInView() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await signIn(email, password, code);
      if (result.needsCode || result.error) {
        setNeedsCode(Boolean(result.needsCode));
        setError(result.error ?? null);
        return;
      }
      router.push(safeRedirect(searchParams.get("redirect")));
      router.refresh();
    } catch {
      setError("Couldn't sign in. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <AuthHeading title="Sign in">Pick up where you left off.</AuthHeading>
      {searchParams.get("reset") === "1" && (
        <p role="status" className="mb-4 rounded-md border border-line bg-panel px-3 py-2 text-small">
          Password updated. Sign in using your new password.
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email">
          {(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password">
          {(p) => (
            <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        {needsCode && (
          <Field label="Authenticator or recovery code">
            {(p) => <Input {...p} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />}
          </Field>
        )}
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1 w-full">
          Sign in
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-small">
        <Link href="/forgot-password" className="text-ink-2 underline decoration-line-strong hover:text-ink">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="text-brass hover:underline">
          Create an account
        </Link>
      </div>
    </>
  );
}
