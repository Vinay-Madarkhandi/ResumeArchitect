"use client";

import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Saves `value` `delayMs` after it stops changing. `save` is read through a
 * ref so callers don't need to memoize it themselves. */
export function useDebouncedAutosave<T>(value: T, save: (value: T) => Promise<void>, delayMs = 800): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveRef = useRef(save);
  const isFirstRun = useRef(true);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    setStatus("idle");
    const handle = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveRef.current(value);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return status;
}
