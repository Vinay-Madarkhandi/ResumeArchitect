"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your password.");

    setPending(true);
    const { data, error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth-confirm` },
    });
    setPending(false);

    if (signUpError) return setError(signUpError.message);
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }
    // Supabase returns a user with no identities for an existing email instead of an error.
    if (data.user?.identities?.length === 0) return setError("An account with this email already exists. Sign in instead.");
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <>
        <MailCheck className="mb-5 size-7 text-brass" aria-hidden />
        <AuthHeading title="Check your email">
          We sent a confirmation link to <span className="text-ink">{email}</span>. Open it to activate your account.
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
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email">
          {(p) => <Input {...p} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" hint="At least 8 characters.">
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
