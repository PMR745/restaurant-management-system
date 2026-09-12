"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { TABLE_ZONE, type TableZone } from "@/lib/domain/enums";
import { advanceOrder, assignWaiter, clearTable } from "@/lib/store/actions";
import {
  useOrder,
  useOrderItems,
  useTableViews,
  useWaiters,
} from "@/lib/store/hooks";
import type { TableView } from "@/lib/store/selectors";
import { formatMoney, formatSeq, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/misc";
import { SheetContent, SheetRoot } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status-pill";
import { Surface } from "@/components/ui/surface";
import { FloorLegend, TableTile } from "@/components/domain/table-tile";
import { ElapsedTimer } from "@/components/domain/elapsed";
import { HydrationGate } from "@/components/providers";

const ZONE_LABEL: Record<TableZone, string> = {
  indoor: "Dining room",
  patio: "Courtyard",
  private: "Private",
};

export function FloorMap() {
  return (
    <HydrationGate fallback={<FloorSkeleton />}>
      <FloorContent />
    </HydrationGate>
  );
}

function FloorContent() {
  const views = useTableViews();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zone, setZone] = React.useState<TableZone | "all">("all");

  const filtered = zone === "all" ? views : views.filter((v) => v.table.zone === zone);
  const selected = views.find((v) => v.table.id === selectedId) ?? null;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1">
          {(["all", ...TABLE_ZONE] as const).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZone(z)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-2xs uppercase tracking-label transition-colors",
                zone === z
                  ? "border-line-gold bg-gold-500/8 text-gold-300"
                  : "border-transparent text-ink-3 hover:bg-surface-2 hover:text-ink-2",
              )}
            >
              {z === "all" ? "All" : ZONE_LABEL[z]}
            </button>
          ))}
        </div>
        <FloorLegend />
      </div>

      {/* Percentage-positioned canvas on large screens so the room keeps its
          real geometry; a plain responsive grid below `lg`, where absolute
          positions would produce a cramped mess. */}
      <div className="mt-6 hidden lg:block">
        <Surface
          variant="flat"
          className="relative aspect-[16/9] w-full overflow-hidden p-6"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(oklch(1 0 0 / 0.02) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.02) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
            aria-hidden
          />
          {filtered.map((v) => (
            <div
              key={v.table.id}
              className="absolute w-[13%] min-w-24 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${v.table.x}%`, top: `${v.table.y}%` }}
            >
              <TableTile
                view={v}
                selected={selectedId === v.table.id}
                onSelect={() => setSelectedId(v.table.id)}
              />
            </div>
          ))}
        </Surface>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:hidden">
        {filtered.map((v) => (
          <TableTile
            key={v.table.id}
            view={v}
            selected={selectedId === v.table.id}
            onSelect={() => setSelectedId(v.table.id)}
            className="min-h-36"
          />
        ))}
      </div>

      <SheetRoot
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
      >
        {selected ? (
          <SheetContent
            title={selected.table.label}
            description={`${selected.table.code} · ${selected.table.seats} seats · ${ZONE_LABEL[selected.table.zone]}`}
            width="lg"
          >
            <TableDetail view={selected} />
          </SheetContent>
        ) : null}
      </SheetRoot>
    </div>
  );
}

export function TableDetail({ view }: { view: TableView }) {
  const waiters = useWaiters();
  const { table, status, orders, openedAt, total } = view;

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between gap-4">
        <StatusPill status={status} />
        {openedAt ? (
          <span className="text-xs text-ink-3">
            Seated <ElapsedTimer since={openedAt} colorByAge={false} />
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Surface variant="elevated" className="p-4">
          <p className="text-2xs uppercase tracking-label text-ink-4">Orders</p>
          <p className="mt-1.5 font-display text-2xl font-light tabular text-ink">
            {orders.length}
          </p>
        </Surface>
        <Surface variant="elevated" className="p-4">
          <p className="text-2xs uppercase tracking-label text-ink-4">Value</p>
          <p className="mt-1.5 font-display text-2xl font-light tabular text-ink">
            {formatMoney(total)}
          </p>
        </Surface>
      </div>

      <div>
        <p className="mb-1.5 text-2xs font-medium uppercase tracking-label text-ink-3">
          Assigned waiter
        </p>
        <SelectField
          ariaLabel="Assigned waiter"
          value={table.assignedWaiterId ?? "none"}
          onValueChange={(v) => {
            void assignWaiter(table.id, v === "none" ? null : v).then(() =>
              toast.success(
                v === "none"
                  ? `${table.code} unassigned`
                  : `${table.code} assigned to ${waiters.find((w) => w.id === v)?.name}`,
              ),
            );
          }}
          options={[
            { value: "none", label: "Unassigned" },
            ...waiters.map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
      </div>

      <div>
        <p className="mb-3 text-2xs font-medium uppercase tracking-label text-ink-3">
          Orders at this table
        </p>
        {orders.length ? (
          <ul className="space-y-3">
            {orders.map((o) => (
              <OrderRow key={o.id} orderId={o.id} />
            ))}
          </ul>
        ) : (
          <p className="rounded-sm border border-line bg-surface-2 px-4 py-6 text-center text-sm text-ink-4">
            Nothing ordered yet.
          </p>
        )}
      </div>

      {status !== "available" ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            void clearTable(table.id).then(() =>
              toast.success(`${table.code} cleared`),
            );
          }}
        >
          <Sparkles className="size-4" strokeWidth={1.5} />
          Clear table
        </Button>
      ) : null}
    </div>
  );
}

function OrderRow({ orderId }: { orderId: string }) {
  const order = useOrder(orderId);
  const items = useOrderItems(orderId);
  if (!order) return null;

  return (
    <li className="rounded-sm border border-line bg-surface-2 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-label text-ink-3">
          {formatSeq(order.seqNo)}
        </span>
        <StatusPill status={order.status} size="sm" />
      </div>
      <ul className="mt-2.5 space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink-2">
              <span className="font-mono tabular text-ink-4">{i.quantity}×</span>{" "}
              {i.nameSnapshot}
            </span>
            <span className="shrink-0 font-mono tabular text-ink-3">
              {formatMoney(i.unitPriceSnapshot * i.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-2xs text-ink-4">
          {formatTime(order.placedAt)}
        </span>
        {order.status === "ready" ? (
          <Button
            size="sm"
            variant="gold"
            onClick={() => {
              void advanceOrder(order.id, "served", "admin").then(() =>
                toast.success(`${formatSeq(order.seqNo)} served`),
              );
            }}
          >
            Mark served
          </Button>
        ) : (
          <span className="font-mono text-sm tabular text-ink-2">
            {formatMoney(order.subtotal)}
          </span>
        )}
      </div>
    </li>
  );
}

function FloorSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="aspect-[16/9] w-full rounded-md" />
    </div>
  );
}
