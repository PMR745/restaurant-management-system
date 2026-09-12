"use client";

import { Tooltip } from "radix-ui";
import { Cloud, MonitorSmartphone } from "lucide-react";
import { useIsClient } from "@/lib/hooks/use-client-store";
import { useRmsStore } from "@/lib/store/store";
import { cn } from "@/lib/utils/cn";

/**
 * Which sync mode is live, stated plainly and permanently.
 *
 * In local mode every visitor gets their own private copy of the restaurant —
 * two people on a call will NOT see each other's orders. That is correct
 * behaviour for a zero-config demo, but discovering it halfway through a
 * presentation would be awful, so the app says so out loud rather than leaving
 * it to the README.
 */
export function ConnectionPill({ className }: { className?: string }) {
  const kind = useRmsStore((s) => s.adapterKind);
  const connection = useRmsStore((s) => s.connection);
  const lastError = useRmsStore((s) => s.lastError);

  // The adapter is only known on the client, so there is nothing honest to
  // render on the server.
  const isClient = useIsClient();
  if (!isClient) return null;

  const supabase = kind === "supabase";
  const Icon = supabase ? Cloud : MonitorSmartphone;

  const tone =
    connection === "live"
      ? supabase
        ? "border-st-available/30 bg-st-available/8 text-st-available"
        : "border-line-gold bg-gold-500/8 text-gold-300"
      : connection === "connecting"
        ? "border-line-strong bg-surface-3 text-ink-3"
        : "border-warning/30 bg-warning/8 text-warning";

  const label = supabase ? "Supabase · live" : "Local · this browser";

  const explanation = supabase
    ? "Connected to Supabase. Every device that opens this link shares one live service — scan the QR on a phone and it appears here."
    : "Running on local storage. All roles sync instantly across tabs and windows of THIS browser, but another device gets its own separate demo. Add Supabase credentials to sync across devices.";

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span
            className={cn(
              "inline-flex h-7 shrink-0 cursor-help items-center gap-1.5 rounded-full border px-2.5 text-2xs font-medium uppercase tracking-label",
              tone,
              className,
            )}
          >
            <Icon className="size-3" strokeWidth={1.5} />
            <span className="hidden sm:inline">
              {connection === "connecting" ? "Connecting…" : label}
            </span>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            align="end"
            sideOffset={8}
            className="z-[70] max-w-72 rounded-sm border border-line-strong bg-surface-4 px-3 py-2 text-xs leading-relaxed text-ink-2 shadow-lg"
          >
            {explanation}
            {lastError ? (
              <span className="mt-1.5 block text-warning">{lastError}</span>
            ) : null}
            <Tooltip.Arrow className="fill-surface-4" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
