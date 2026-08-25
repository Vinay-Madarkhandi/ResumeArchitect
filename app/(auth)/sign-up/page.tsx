"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/Input";
import { Icon } from "@/components/icon/Icon";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth-confirm` },
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    // Supabase never errors on signUp for an email that's already registered
    // — to avoid leaking which emails exist, it silently returns a
    // fake-looking user (no session, no email sent) instead. The one
    // reliable signal is `identities`: empty for an existing account,
    // populated for a genuinely new one. See
    // https://supabase.com/docs/reference/javascript/auth-signup
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("An account with this email already exists. Try signing in instead.");
      return;
    }

    setNeedsEmailConfirmation(true);
  }

  if (needsEmailConfirmation) {
    return (
      <div className="text-center">
        <Icon name="email" size={32} className="mx-auto mb-md text-secondary" />
        <h1 className="mb-1 font-sans text-headline-lg text-primary">Check your email</h1>
        <p className="font-sans text-body-lg text-on-surface-variant">
          We sent a confirmation link to <span className="font-medium text-on-surface">{email}</span>. Follow it
          to activate your account, then sign in.
        </p>
        <Link href="/sign-in" className="mt-lg inline-block font-sans text-body-lg text-secondary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-sans text-headline-lg text-primary">Create your account</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        You already have the experience. Let&rsquo;s set up your workspace.
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
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FieldHint>At least 8 characters.</FieldHint>
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-lg text-center font-sans text-body-lg text-on-surface-variant">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-secondary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
