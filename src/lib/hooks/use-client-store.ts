"use client";

import * as React from "react";

/**
 * Two things every screen here needs, both of which are external state rather
 * than React state — so both go through `useSyncExternalStore`.
 *
 * This is not pedantry. The obvious alternative (`useState(false)` plus
 * `useEffect(() => setMounted(true))`) causes a cascading render on every
 * mount, and calling `Date.now()` during render makes a component's output
 * depend on when React happened to run it. The kitchen board renders thirty
 * timers a second; both costs are real there.
 */

const noopSubscribe = () => () => {};

/** True only after hydration. Server and first client render both say false. */
export function useIsClient(): boolean {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/* ── one shared clock for the whole app ──────────────────────────────────────
   Thirty aging timers must not mean thirty intervals drifting out of phase
   with one another. One interval, one value, and only the components that
   actually display time re-render when it changes.                          */

let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribeToClock(onChange: () => void): () => void {
  listeners.add(onChange);
  if (!timer) {
    // Runs during an effect, never during render, so reading the clock here
    // is safe — and it means the first tick is immediate rather than a second late.
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Current epoch ms, or 0 before hydration. Stable between ticks. */
export function useNow(): number {
  return React.useSyncExternalStore(
    subscribeToClock,
    () => now,
    () => 0,
  );
}

/**
 * A boolean remembered in localStorage.
 *
 * Reads lazily on the client and lets an explicit toggle win, so the server
 * render and the first client render agree (both `false`) and nothing
 * mismatches during hydration.
 */
export function usePersistedFlag(
  key: string,
  fallback = false,
): [boolean, (value: boolean) => void] {
  const isClient = useIsClient();
  const [override, setOverride] = React.useState<boolean | null>(null);

  let stored = fallback;
  if (isClient && override === null) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) stored = raw === "1";
    } catch {
      /* private mode — fall back */
    }
  }

  const value = override ?? stored;

  const set = React.useCallback(
    (next: boolean) => {
      setOverride(next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* private mode — the toggle still works for this session */
      }
    },
    [key],
  );

  return [value, set];
}
