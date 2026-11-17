"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { GeminiKeyCard } from "@/components/settings/GeminiKeyCard";
import { buttonVariants } from "@/components/ui/Button";
import type { GeminiKeyStatusT } from "@/lib/schemas/profile";
import { cn } from "@/lib/cn";

export function ConnectStep({ status, last4 }: { status: GeminiKeyStatusT; last4: string | null }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-5">
      <GeminiKeyCard initialStatus={status} initialLast4={last4} onConnected={() => router.push("/onboarding/resume")} />
      <div className="flex items-center gap-4">
        {status === "valid" && (
          <Link href="/onboarding/resume" className={cn(buttonVariants({ variant: "primary" }))}>
            Continue <ArrowRight aria-hidden />
          </Link>
        )}
        {status !== "valid" && (
          <Link href="/onboarding/resume" className="text-small text-ink-3 underline decoration-line-strong hover:text-ink">
            Skip for now and import without AI
          </Link>
        )}
      </div>
    </div>
  );
}
