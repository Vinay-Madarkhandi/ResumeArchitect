"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { AuthHeading } from "@/components/auth/AuthHeading";

/**
 * Target of the sign-up confirmation email. Public on purpose: only the
 * browser client can exchange the token in the URL for a session, so the
 * proxy can't see a session on this first request.
 */
export default function AuthConfirmPage() {
  const router = useRouter();
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const go = () => {
      router.replace("/onboarding");
      router.refresh();
    };
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (session) go();
      else if (event === "SIGNED_OUT") setInvalid(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) go();
      else setInvalid(true);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  if (invalid) {
    return (
      <>
        <AuthHeading title="This link isn't valid">
          Confirmation links expire. Sign in, or sign up again to get a fresh link.
        </AuthHeading>
        <Link href="/sign-in" className="text-small text-brass hover:underline">
          Back to sign in
        </Link>
      </>
    );
  }
  return (
    <p className="flex items-center gap-2 text-body text-ink-2">
      <LoaderCircle className="size-4 animate-spin text-brass" aria-hidden /> Confirming your account…
    </p>
  );
}
