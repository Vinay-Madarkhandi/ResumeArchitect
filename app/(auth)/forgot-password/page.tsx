"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { forgotPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError("Couldn't process the request. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <>
        <MailCheck className="mb-5 size-7 text-brass" aria-hidden />
        <AuthHeading title="Check your email">
          If an account exists for <span className="text-ink">{email}</span>, a reset link is on its way.
        </AuthHeading>
        <Link href="/sign-in" className="text-small text-brass hover:underline">
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Reset your password">We&rsquo;ll email you a link to choose a new one.</AuthHeading>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email">
          {(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1 w-full">
          Send reset link
        </Button>
      </form>
      <Link href="/sign-in" className="mt-6 inline-block text-small text-ink-2 hover:text-ink">
        Back to sign in
      </Link>
    </>
  );
}
