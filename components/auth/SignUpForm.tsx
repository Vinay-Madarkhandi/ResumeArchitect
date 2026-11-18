"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";
import { useHydrated } from "@/lib/useHydrated";

export function SignUpForm() {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 10) return setError("Use at least 10 characters for your password.");

    setPending(true);
    try {
      const result = await signUp(email, password);
      if (result.error) return setError(result.error);
      setCheckEmail(true);
    } catch {
      setError("Couldn't create your account. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <>
        <MailCheck className="mb-5 size-7 text-brass" aria-hidden />
        <AuthHeading title="Check your email">
          If you can register with <span className="text-ink">{email}</span>, a confirmation link is on its way.
        </AuthHeading>
        <Link href="/sign-in" className="text-small text-brass hover:underline">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Create your account">
        You&rsquo;ll connect your own Gemini key next. Your resumes stay private to you.
      </AuthHeading>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate data-hydrated={hydrated || undefined}>
        <Field label="Email">
          {(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" hint="At least 10 characters.">
          {(p) => (
            <Input {...p} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1 w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-small text-ink-2">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brass hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
