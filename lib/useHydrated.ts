import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False in the server render and during hydration, true once React owns the DOM. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
