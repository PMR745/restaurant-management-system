"use client";

import Link from "next/link";
import { AnimatePresence, LayoutGroup } from "motion/react";
import { ArrowLeft, Maximize2, Sun } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS_LABEL } from "@/lib/domain/enums";
import { KDS_ACTION, KDS_LANES } from "@/lib/domain/transitions";
import { usePersistedFlag } from "@/lib/hooks/use-client-store";
import { advanceOrder } from "@/lib/store/actions";
import { useKdsLanes } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { KitchenTicket, LaneHeader } from "@/components/domain/kitchen-ticket";
import { LiveClock } from "@/components/domain/elapsed";
import { HydrationGate } from "@/components/providers";
import { ConnectionPill } from "./connection-pill";

/**
 * The kitchen display. Its own shell — no sidebar, no breadcrumb, nothing that
 * is not a ticket. This screen lives on a wall.
 *
 * "Glare mode" is not a gimmick: a pure-dark UI washes out badly under the
 * harsh overhead light of a real pass, and the answer is to raise every
 * surface an elevation and drop the grain rather than to abandon the palette.
 */
export function KitchenBoard() {
  const [glare, setGlare] = usePersistedFlag("rms:glare");

  return (
    <div
      className={cn(
        "flex h-dvh flex-col bg-void",
        glare ? "kds-glare" : "vignette",
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line px-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-2xs uppercase tracking-label text-ink-4 transition-colors hover:text-gold-300"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">Service</span>
        </Link>

        <div className="flex items-baseline gap-3">
          <span className="font-display text-md font-light text-ink">
            The Pass
          </span>
          <TicketCount />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGlare(!glare)}
            aria-pressed={glare}
            title="Glare mode — for bright kitchens"
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-2xs uppercase tracking-label transition-colors",
              glare
                ? "border-line-gold bg-gold-500/10 text-gold-300"
                : "border-line-strong text-ink-4 hover:text-ink-2",
            )}
          >
            <Sun className="size-3" strokeWidth={1.5} />
            <span className="hidden sm:inline">Glare</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen().catch(() => {});
            }}
            aria-label="Toggle fullscreen"
            className="grid size-7 place-items-center rounded-full border border-line-strong text-ink-4 transition-colors hover:text-ink-2"
          >
            <Maximize2 className="size-3" strokeWidth={1.5} />
          </button>
          <LiveClock className="hidden text-sm md:block" />
          <ConnectionPill />
        </div>
      </header>

      <HydrationGate fallback={<BoardSkeleton />}>
        <Lanes />
      </HydrationGate>
    </div>
  );
}

function TicketCount() {
  const lanes = useKdsLanes();
  const total = KDS_LANES.reduce((n, l) => n + lanes[l].length, 0);
  return (
    <span className="font-mono text-2xs uppercase tracking-label text-ink-4">
      {total} open
    </span>
  );
}

function Lanes() {
  const lanes = useKdsLanes();
  const total = KDS_LANES.reduce((n, l) => n + lanes[l].length, 0);

  if (total === 0) {
    return (
      <EmptyState
        className="flex-1"
        title="The pass is clear."
        description="Every ticket has been sent. New orders will arrive here the moment a guest places one."
      />
    );
  }

  return (
    // One LayoutGroup across all four lanes is what lets a ticket physically
    // fly from Preparing to Ready instead of disappearing and reappearing.
    <LayoutGroup>
      <div className="grid min-h-0 flex-1 auto-cols-[minmax(20rem,1fr)] grid-flow-col overflow-x-auto">
        {KDS_LANES.map((lane) => (
          <section
            key={lane}
            className="flex min-h-0 flex-col border-r border-line last:border-r-0"
          >
            <LaneHeader
              status={lane}
              label={ORDER_STATUS_LABEL[lane]}
              count={lanes[lane].length}
            />
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {lanes[lane].map((view) => {
                  const action = KDS_ACTION[lane];
                  const isTerminalLane = lane === "ready";
                  return (
                    <KitchenTicket
                      key={view.order.id}
                      view={view}
                      actionLabel={isTerminalLane ? undefined : action?.label}
                      onAdvance={
                        isTerminalLane || !action
                          ? undefined
                          : () => {
                              void advanceOrder(
                                view.order.id,
                                action.to,
                                "kitchen",
                              ).catch((err) =>
                                toast.error("That move isn't allowed", {
                                  description:
                                    err instanceof Error ? err.message : undefined,
                                }),
                              );
                            }
                      }
                    />
                  );
                })}
              </AnimatePresence>

              {lanes[lane].length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-ink-4">
                  {lane === "ready" ? "Nothing waiting to go out." : "Empty."}
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </LayoutGroup>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid flex-1 auto-cols-[minmax(20rem,1fr)] grid-flow-col gap-3 p-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-10 rounded-sm" />
          <Skeleton className="h-48 rounded-md" />
          <Skeleton className="h-40 rounded-md" />
        </div>
      ))}
    </div>
  );
}
