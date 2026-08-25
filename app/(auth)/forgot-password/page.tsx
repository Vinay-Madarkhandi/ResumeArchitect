"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Icon } from "@/components/icon/Icon";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    // Always show the same confirmation, whether or not the email exists —
    // don't let this endpoint be used to enumerate registered accounts.
    if (resetError && resetError.status !== 400) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <Icon name="email" size={32} className="mx-auto mb-md text-secondary" />
        <h1 className="mb-1 font-display text-headline-lg text-primary">Check your email</h1>
        <p className="font-sans text-body-lg text-on-surface-variant">
          If an account exists for <span className="font-medium text-on-surface">{email}</span>, we sent a link
          to reset your password.
        </p>
        <Link href="/sign-in" className="mt-lg inline-block font-sans text-body-lg text-secondary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-headline-lg text-primary">Reset your password</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        Enter your email and we&rsquo;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-md" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-lg text-center font-sans text-body-lg text-on-surface-variant">
        <Link href="/sign-in" className="text-secondary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
