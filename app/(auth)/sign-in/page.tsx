"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "That email and password don't match an account."
          : signInError.message,
      );
      return;
    }

    const redirect = searchParams.get("redirect");
    router.push(redirect && redirect.startsWith("/") ? redirect : "/library");
    router.refresh();
  }

  return (
    <div>
      <h1 className="mb-1 font-sans text-headline-lg text-primary">Sign in</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">
        Welcome back. Let&rsquo;s get you tailoring.
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="mb-1.5 font-sans text-xs text-secondary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <FieldError>{error ?? undefined}</FieldError>

        <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-lg text-center font-sans text-body-lg text-on-surface-variant">
        New here?{" "}
        <Link href="/sign-up" className="text-secondary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
