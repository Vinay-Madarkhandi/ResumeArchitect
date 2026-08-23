"use client";

import { useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { GeminiKeyManager } from "@/components/settings/GeminiKeyManager";
import { Button } from "@/components/ui/Button";
import { FieldError } from "@/components/ui/Input";
import type { GeminiKeyStatusT } from "@/lib/schemas/profile";

export function ConnectGeminiClient({
  initialStatus,
  initialLast4,
}: {
  initialStatus: GeminiKeyStatusT;
  initialLast4: string | null;
}) {
  const [isFinishing, setIsFinishing] = useState(false);
  const [connected, setConnected] = useState(initialStatus === "valid");
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setIsFinishing(true);
    setError(null);
    // completeOnboarding() redirects on success and never returns in that
    // case (the redirect throws internally, by design) — reaching the line
    // below at all means it failed, so surface why instead of leaving the
    // user stuck on a button that looks like it did nothing.
    const result = await completeOnboarding();
    if (!result.ok) setError(result.error);
    setIsFinishing(false);
  }

  return (
    <div>
      <GeminiKeyManager
        initialStatus={initialStatus}
        initialLast4={initialLast4}
        onSaved={() => setConnected(true)}
      />

      <div className="mt-xl flex items-center justify-between border-t border-outline-variant pt-lg">
        {!connected ? (
          <button
            type="button"
            onClick={finish}
            disabled={isFinishing}
            className="font-sans text-body-lg text-on-surface-variant hover:text-primary"
          >
            Skip for now — I&rsquo;ll set this up later
          </button>
        ) : (
          <span />
        )}
        <Button variant="primary" onClick={finish} disabled={isFinishing}>
          {isFinishing ? "Finishing…" : connected ? "Finish" : "Continue without connecting"}
        </Button>
      </div>

      {error && (
        <div className="mt-sm">
          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  );
}
