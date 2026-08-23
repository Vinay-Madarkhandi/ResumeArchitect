"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Icon } from "@/components/icon/Icon";

/**
 * Landing target for signup-confirmation emails (see emailRedirectTo in
 * sign-up/page.tsx). This has to be a public route: the confirmation link
 * carries the session as a code/token in the URL that only the browser
 * Supabase client can exchange (detectSessionInUrl), so proxy.ts can't see
 * a valid session yet on the very first request here — same reason
 * /reset-password is public. Once a session exists we hand off to
 * proxy.ts's normal onboarding-vs-library gating.
 */
export default function AuthConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "invalid">("checking");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) {
        router.replace("/onboarding");
        router.refresh();
      } else if (event === "SIGNED_OUT") {
        setStatus("invalid");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        router.replace("/onboarding");
        router.refresh();
      } else {
        setStatus((s) => (s === "checking" ? "invalid" : s));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  if (status === "invalid") {
    return (
      <div className="text-center">
        <h1 className="mb-1 font-sans text-headline-lg text-primary">This link isn&rsquo;t valid</h1>
        <p className="font-sans text-body-lg text-on-surface-variant">
          Confirmation links expire after a while. Try signing in — if your email still isn&rsquo;t confirmed,
          sign up again to get a new link.
        </p>
        <Link href="/sign-in" className="mt-lg inline-block font-sans text-body-lg text-secondary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <Icon name="spinner" size={24} className="mx-auto mb-md animate-spin text-secondary" />
      <p className="font-sans text-body-lg text-on-surface-variant">Confirming your account…</p>
    </div>
  );
}
