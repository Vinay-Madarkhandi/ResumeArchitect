"use client";

import { useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { GeminiKeyManager } from "@/components/settings/GeminiKeyManager";
import { Button } from "@/components/ui/Button";
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

  async function finish() {
    setIsFinishing(true);
    // completeOnboarding() redirects on success; it only returns if it
    // failed (e.g. the session expired), in which case we just stop
    // showing the loading state rather than getting stuck.
    await completeOnboarding();
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
    </div>
  );
}
