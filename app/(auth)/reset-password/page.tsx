"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { AuthHeading, FormError } from "@/components/auth/AuthHeading";

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // The browser client exchanges the recovery token from the URL on load.
    const supabase = createClient();
    let cancelled = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancelled && (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session))) setStatus("ready");
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setStatus((s) => (s === "checking" ? (session ? "ready" : "invalid") : s));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setPending(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (updateError) return setError(updateError.message);
    setStatus("done");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  if (status === "checking") {
    return (
      <p className="flex items-center gap-2 text-body text-ink-2">
        <LoaderCircle className="size-4 animate-spin text-brass" aria-hidden /> Checking your link…
      </p>
    );
  }
  if (status === "invalid") {
    return (
      <>
        <AuthHeading title="This link has expired">Reset links work once and expire after a while. Request a new one.</AuthHeading>
        <Link href="/forgot-password" className="text-small text-brass hover:underline">
          Send a new link
        </Link>
      </>
    );
  }
  if (status === "done") return <AuthHeading title="Password updated">Taking you to your dashboard…</AuthHeading>;

  return (
    <>
      <AuthHeading title="Choose a new password" />
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="New password" hint="At least 8 characters.">
          {(p) => (
            <Input {...p} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          )}
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1 w-full">
          Update password
        </Button>
      </form>
    </>
  );
}
