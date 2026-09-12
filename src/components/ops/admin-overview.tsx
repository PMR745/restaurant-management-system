"use client";

import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";
import { ArrowRight, RotateCcw } from "lucide-react";
import {
  useKitchenLoad,
  useServiceStats,
  useTableViews,
} from "@/lib/store/hooks";
import { engine } from "@/lib/sync/engine";
import { formatMoney } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Skeleton, Stat } from "@/components/ui/misc";
import { DialogContent, DialogClose, DialogRoot, DialogTrigger } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeading, Surface } from "@/components/ui/surface";
import { TableTile } from "@/components/domain/table-tile";
import { HydrationGate } from "@/components/providers";

export function AdminOverview() {
  return (
    <HydrationGate fallback={<OverviewSkeleton />}>
      <OverviewContent />
    </HydrationGate>
  );
}

function OverviewContent() {
  const stats = useServiceStats();
  const load = useKitchenLoad();
  const views = useTableViews();

  const needsAttention = views.filter((v) => v.status === "ready");

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <SectionHeading
        eyebrow="Service in progress"
        title="This evening"
        description="Everything below updates the instant a guest, the kitchen or a waiter acts."
        action={<ResetDemoButton />}
      />

      <Surface variant="gilded" className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-5">
        <Stat
          label="Tables seated"
          value={`${stats.tablesSeated}/${stats.tablesTotal}`}
          sub={`${stats.covers} covers`}
        />
        <Stat label="Live orders" value={stats.liveOrders} sub="on the floor" />
        <Stat label="In the kitchen" value={load.active} sub={`${load.incoming} waiting to be accepted`} />
        <Stat
          label="Awaiting service"
          value={stats.awaitingService}
          sub="tables with food ready"
        />
        <Stat
          label="Open value"
          value={formatMoney(stats.openValue)}
          sub="unsettled orders"
        />
      </Surface>

      {needsAttention.length ? (
        <section>
          <SectionHeading
            eyebrow="Needs a runner"
            title="Food is ready"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/waiter">
                  Service board
                  <ArrowRight className="size-3.5" strokeWidth={1.5} />
                </Link>
              </Button>
            }
          />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {needsAttention.map((v) => (
              <TableTile key={v.table.id} view={v} className="min-h-32" />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeading
          eyebrow="The room"
          title="Floor at a glance"
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/tables">
                Open floor map
                <ArrowRight className="size-3.5" strokeWidth={1.5} />
              </Link>
            </Button>
          }
        />
        <Surface variant="flat" className="mt-5 divide-y divide-line">
          {views.map((v) => (
            <Link
              key={v.table.id}
              href="/admin/tables"
              className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
            >
              <span className="w-12 shrink-0 font-display text-lg font-light tabular text-ink">
                {v.table.code}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink-2">
                {v.table.label}
              </span>
              <span className="hidden w-36 shrink-0 truncate text-xs text-ink-4 sm:block">
                {v.waiter?.name ?? "Unassigned"}
              </span>
              <span className="w-24 shrink-0 text-right font-mono text-sm tabular text-ink-3">
                {v.total ? formatMoney(v.total) : "—"}
              </span>
              <StatusPill status={v.status} size="sm" className="shrink-0" />
            </Link>
          ))}
        </Surface>
      </section>
    </div>
  );
}

/**
 * A demo that cannot be restored is a demo you present exactly once. This is
 * a soft reset in both adapters — on Supabase it tombstones strays and
 * rewrites the seed rather than deleting anything.
 */
function ResetDemoButton() {
  const [busy, setBusy] = React.useState(false);
  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <RotateCcw className="size-3.5" strokeWidth={1.5} />
          Reset demo
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Reset the demo?"
        description="Every order placed during this session is cleared and the restaurant returns to its seeded state — twelve tables, the full menu, and three orders mid-service."
      >
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Keep as is</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="gold"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void engine
                  .resetDemo()
                  .then(() => toast.success("Demo data restored"))
                  .catch(() => toast.error("Could not reset the demo"))
                  .finally(() => setBusy(false));
              }}
            >
              Reset everything
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-32 w-full rounded-md" />
      <Skeleton className="h-96 w-full rounded-md" />
    </div>
  );
}
