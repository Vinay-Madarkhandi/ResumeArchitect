"use client";

import { useState } from "react";

/** POSTs JSON to a career route and returns its body, or the server's error message. */
export function useCareerPost<T>() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(url: string, body: unknown): Promise<T | null> {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      setError(data?.error ?? "Something went wrong. Try again.");
      return null;
    }
    return data as T;
  }

  return { post, busy, error };
}
