"use client";

import { useNow } from "@/lib/hooks/use-client-store";
import { AGE_BAND_CLASS, ageBand, formatElapsed } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * An aging timer.
 *
 * `now` comes from one shared clock rather than a local interval, so a board
 * of thirty tickets re-renders thirty spans per second instead of thirty full
 * cards — and the timers stay in phase with each other.
 *
 * Before hydration `now` is 0 and we render an em-dash: computing elapsed time
 * on the server would produce different markup than the client, which is a
 * hydration error on a screen that is otherwise entirely static.
 */
export function ElapsedTimer({
  since,
  className,
  colorByAge = true,
}: {
  since: string;
  className?: string;
  colorByAge?: boolean;
}) {
  const now = useNow();

  if (!now) {
    return (
      <span className={cn("font-mono tabular text-ink-4", className)}>—:—</span>
    );
  }

  const elapsed = now - new Date(since).getTime();
  const band = ageBand(elapsed);

  return (
    <span
      className={cn(
        "font-mono tabular",
        colorByAge ? AGE_BAND_CLASS[band] : "text-ink-3",
        className,
      )}
      title={`Waiting ${formatElapsed(elapsed)}`}
    >
      {formatElapsed(elapsed)}
    </span>
  );
}

export function useElapsedBand(since: string) {
  const now = useNow();
  if (!now) return "fresh" as const;
  return ageBand(now - new Date(since).getTime());
}

const clockFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** A live clock. Surprisingly luxurious on an ops screen. */
export function LiveClock({ className }: { className?: string }) {
  const now = useNow();
  return (
    <span className={cn("font-mono tabular text-ink-3", className)}>
      {now ? clockFormat.format(new Date(now)) : "--:--:--"}
    </span>
  );
}
