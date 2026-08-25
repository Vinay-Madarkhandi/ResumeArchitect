"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError, FieldHint } from "@/components/ui/Input";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // The recovery link's token is processed client-side by the Supabase
    // browser client on load (detectSessionInUrl). We just wait for that to
    // resolve into either a session or nothing.
    const supabase = createClient();
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setStatus((s) => (s === "checking" ? "ready" : s));
      else setStatus((s) => (s === "checking" ? "invalid" : s));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.push("/library");
      router.refresh();
    }, 1500);
  }

  if (status === "checking") {
    return <p className="text-center font-sans text-body-lg text-on-surface-variant">Checking your link…</p>;
  }

  if (status === "invalid") {
    return (
      <div className="text-center">
        <h1 className="mb-1 font-display text-headline-lg text-primary">This link isn&rsquo;t valid</h1>
        <p className="font-sans text-body-lg text-on-surface-variant">
          Password reset links expire after a while. Request a new one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-lg inline-block font-sans text-body-lg text-secondary hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="text-center">
        <h1 className="mb-1 font-display text-headline-lg text-primary">Password updated</h1>
        <p className="font-sans text-body-lg text-on-surface-variant">Taking you to your workspace…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-headline-lg text-primary">Set a new password</h1>
      <p className="mb-lg font-sans text-body-lg text-on-surface-variant">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="space-y-md" noValidate>
        <div>
          <Label htmlFor="password">New password</Label>
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
          <Label htmlFor="confirm-password">Confirm new password</Label>
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
          {isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
