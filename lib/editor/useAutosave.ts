"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

/**
 * Debounced autosave. Saves run one at a time on a promise chain, so
 * `flush()` resolves only once everything typed so far is on the server.
 * A failed save is retried once; pending edits are also saved when the
 * component unmounts (in-app navigation), and closing the tab with unsaved
 * edits asks for confirmation.
 */
export function useAutosave<T>(value: T, save: (value: T) => Promise<void>, delayMs = 900) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const saveRef = useRef(save);
  const latest = useRef(value);
  const dirty = useRef(false);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const first = useRef(true);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const saveLatestIfDirty = useCallback(async () => {
    if (!dirty.current) return;
    dirty.current = false;
    const snapshot = latest.current;
    if (mounted.current) setStatus("saving");
    try {
      await saveRef.current(snapshot);
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        await saveRef.current(snapshot);
      } catch (error) {
        // Only mark dirty again if nothing newer has been queued meanwhile.
        if (latest.current === snapshot) dirty.current = true;
        if (mounted.current) setStatus("error");
        throw error;
      }
    }
    if (mounted.current) setStatus(dirty.current ? "dirty" : "saved");
  }, []);

  const flush = useCallback(() => {
    const next = chain.current.catch(() => {}).then(saveLatestIfDirty);
    chain.current = next;
    return next;
  }, [saveLatestIfDirty]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    latest.current = value;
    dirty.current = true;
    setStatus("dirty");
    const handle = setTimeout(() => void flush().catch(() => {}), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs, flush]);

  useEffect(() => {
    mounted.current = true;
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      mounted.current = false;
      // Leaving the page inside the app: the fetch outlives the component.
      if (dirty.current) void flush().catch(() => {});
    };
  }, [flush]);

  return { status, flush };
}
