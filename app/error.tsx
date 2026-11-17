"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <div>
        <h1 className="text-page font-semibold">Something broke on this page</h1>
        <p className="mt-2 text-body text-ink-2">Your saved work is safe. Try again, or reload the page.</p>
      </div>
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
