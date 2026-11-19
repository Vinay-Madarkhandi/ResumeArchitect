"use client";

import { useEffect } from "react";

export function RefreshSession() {
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void fetch("/api/session", { method: "POST" }).catch(() => {});
      }
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 60 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
    };
  }, []);
  return null;
}
