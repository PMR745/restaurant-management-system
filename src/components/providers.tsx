"use client";

import * as React from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { Toaster } from "sonner";
import { engine } from "@/lib/sync/engine";
import { useRmsStore } from "@/lib/store/store";
import { Skeleton } from "@/components/ui/misc";

/* ── sync ───────────────────────────────────────────────────────────────────
   Hydration happens in an effect, never during render. The store's initial
   state is empty and identical on the server and the client, so the first
   client render matches the server's exactly and React never complains.      */

export function SyncProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    void engine.start().catch(() => {
      /* the store already carries the error; screens render empty states */
    });
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict={false}>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}

/**
 * Gates anything that reads synced data until the first snapshot has landed.
 *
 * This is the component that makes the SSR/localStorage mismatch impossible
 * rather than merely unlikely: no screen is allowed to read entity maps during
 * the first render pass.
 */
export function HydrationGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hydrated = useRmsStore((s) => s.hydrated);
  if (!hydrated) return <>{fallback ?? <DefaultSkeleton />}</>;
  return <>{children}</>;
}

function DefaultSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <Skeleton className="h-8 w-52" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** Sonner, retuned to the palette. */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      duration={3600}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-2 !border !border-line-gold !text-ink !shadow-lg !rounded-sm !font-sans !text-sm",
          description: "!text-ink-3",
          actionButton: "!bg-gold-500 !text-gold-ink !rounded-xs",
          cancelButton: "!bg-surface-4 !text-ink-2 !rounded-xs",
        },
      }}
    />
  );
}
