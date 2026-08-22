"use client";

import { useCallback, useRef, useState } from "react";

interface HistoryState<T> {
  history: T[];
  index: number;
}

/**
 * useState with undo/redo. Rapid consecutive changes (e.g. every keystroke
 * in the same field) within `coalesceMs` replace the current history entry
 * instead of each pushing their own, so one undo step corresponds to "the
 * last thing you were doing," not "the last character you typed."
 */
export function useUndoableState<T>(initial: T, coalesceMs = 800) {
  const [state, setState] = useState<HistoryState<T>>({ history: [initial], index: 0 });
  const lastChangeAt = useRef(0);

  const value = state.history[state.index];

  const set = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const now = Date.now();
      setState((prev) => {
        const prevValue = prev.history[prev.index];
        const nextValue = typeof updater === "function" ? (updater as (p: T) => T)(prevValue) : updater;
        const shouldCoalesce = now - lastChangeAt.current < coalesceMs && prev.index === prev.history.length - 1;
        lastChangeAt.current = now;

        if (shouldCoalesce) {
          const history = prev.history.slice(0, prev.index);
          return { history: [...history, nextValue], index: prev.index };
        }
        const truncated = prev.history.slice(0, prev.index + 1);
        return { history: [...truncated, nextValue], index: truncated.length };
      });
    },
    [coalesceMs],
  );

  const undo = useCallback(() => {
    lastChangeAt.current = 0;
    setState((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) }));
  }, []);

  const redo = useCallback(() => {
    lastChangeAt.current = 0;
    setState((prev) => ({ ...prev, index: Math.min(prev.history.length - 1, prev.index + 1) }));
  }, []);

  return {
    value,
    set,
    undo,
    redo,
    canUndo: state.index > 0,
    canRedo: state.index < state.history.length - 1,
  };
}
