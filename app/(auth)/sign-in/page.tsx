"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";
import { safeRedirect } from "@/lib/safeRedirect";

export default function SignInPage() {
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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error: signInError } = await createClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setPending(false);
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email and password don't match an account."
          : signInError.message,
      );
      return;
    }
    router.push(safeRedirect(searchParams.get("redirect")));
    router.refresh();
  }

  return (
    <>
      <AuthHeading title="Sign in">Pick up where you left off.</AuthHeading>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email">
          {(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password">
          {(p) => (
            <Input {...p} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
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
