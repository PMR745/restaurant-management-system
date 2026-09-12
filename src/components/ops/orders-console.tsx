"use client";

import * as React from "react";
import { toast } from "sonner";
import { Radio, ReceiptText, Zap } from "lucide-react";
import {
  ORDER_CHANNEL_LABEL,
  ORDER_TYPE_LABEL,
  type OrderStatus,
  type OrderType,
} from "@/lib/domain/enums";
import { isLive } from "@/lib/domain/transitions";
import { advanceOrder, cancelOrder, injectOnlineOrder } from "@/lib/store/actions";
import { useOrder, useOrderItems, useOrders } from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { formatMoney, formatSeq, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input, Toggle } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { SheetContent, SheetRoot } from "@/components/ui/sheet";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeading, Surface } from "@/components/ui/surface";
import { ElapsedTimer } from "@/components/domain/elapsed";
import { HydrationGate } from "@/components/providers";

type Filter = "all" | OrderType | "live";

export function OrdersConsole() {
  return (
    <HydrationGate fallback={<OrdersSkeleton />}>
      <OrdersContent />
    </HydrationGate>
  );
}

function OrdersContent() {
  const orders = useOrders();
  const tables = useRmsStore((s) => s.restaurant_tables);
  const [filter, setFilter] = React.useState<Filter>("live");
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const filtered = orders
    .filter((o) =>
      filter === "all" ? true : filter === "live" ? isLive(o.status) : o.type === filter,
    )
    .filter((o) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        String(o.seqNo).includes(q) ||
        (o.customerName ?? "").toLowerCase().includes(q) ||
        (o.externalRef ?? "").toLowerCase().includes(q) ||
        (o.tableId ? (tables[o.tableId]?.code ?? "").toLowerCase().includes(q) : false)
      );
    });

  const open = openId ? orders.find((o) => o.id === openId) : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <SectionHeading
        eyebrow="All channels"
        title="Orders"
        description="Dine-in, takeaway and online orders land in one queue — and in one kitchen."
        action={<ZomatoSimulator />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(
            [
              ["live", "Live"],
              ["all", "All"],
              ["dine_in", "Dine-in"],
              ["takeaway", "Takeaway"],
              ["online", "Online"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-2xs uppercase tracking-label transition-colors",
                filter === value
                  ? "border-line-gold bg-gold-500/8 text-gold-300"
                  : "border-transparent text-ink-3 hover:bg-surface-2 hover:text-ink-2",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order no., table, guest or reference…"
          className="ml-auto w-full max-w-72"
          aria-label="Search orders"
        />
      </div>

      {filtered.length ? (
        <Surface variant="flat" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem]">
              <thead>
                <tr className="border-b border-line-gold text-left">
                  {["Order", "Source", "Where", "Items", "Value", "Placed", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-2xs font-medium uppercase tracking-label text-ink-3"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setOpenId(o.id)}
                    className="group relative cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm tabular text-ink">
                        {formatSeq(o.seqNo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-3">
                      {ORDER_TYPE_LABEL[o.type]}
                      <span className="ml-1.5 text-ink-4">
                        · {ORDER_CHANNEL_LABEL[o.channel]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-2">
                      {o.tableId
                        ? (tables[o.tableId]?.code ?? "—")
                        : (o.customerName ?? "—")}
                      {o.externalRef ? (
                        <span className="ml-2 font-mono text-2xs text-ink-4">
                          {o.externalRef}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm tabular text-ink-3">
                      {o.itemCount}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm tabular text-ink-2">
                      {formatMoney(o.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-3">
                      {formatTime(o.placedAt)}
                      {isLive(o.status) && o.placedAt ? (
                        <ElapsedTimer
                          since={o.placedAt}
                          className="ml-2 text-xs"
                        />
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={o.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      ) : (
        <Surface variant="flat">
          <EmptyState
            icon={ReceiptText}
            title="No orders match"
            description="Try a different filter, or clear the search."
          />
        </Surface>
      )}

      <SheetRoot open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        {open ? (
          <SheetContent
            title={formatSeq(open.seqNo)}
            description={`${ORDER_TYPE_LABEL[open.type]} · ${ORDER_CHANNEL_LABEL[open.channel]}`}
            width="lg"
          >
            <OrderDetail orderId={open.id} onDone={() => setOpenId(null)} />
          </SheetContent>
        ) : null}
      </SheetRoot>
    </div>
  );
}

function OrderDetail({
  orderId,
  onDone,
}: {
  orderId: string;
  onDone: () => void;
}) {
  const order = useOrder(orderId);
  const items = useOrderItems(orderId);
  const tables = useRmsStore((s) => s.restaurant_tables);
  const [reason, setReason] = React.useState("");
  if (!order) return null;

  const next: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
    placed: { to: "accepted", label: "Accept" },
    accepted: { to: "preparing", label: "Start preparing" },
    preparing: { to: "ready", label: "Mark ready" },
    ready: { to: "served", label: "Mark served" },
  };
  const action = next[order.status];

  return (
    <div className="space-y-6 p-5">
      <div className="flex items-center justify-between gap-4">
        <StatusPill status={order.status} />
        <span className="text-sm text-ink-3">
          {order.tableId
            ? (tables[order.tableId]?.label ?? "—")
            : (order.customerName ?? "Guest")}
        </span>
      </div>

      <ul className="divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm text-ink">
                <span className="font-mono tabular text-ink-3">{i.quantity}×</span>{" "}
                {i.nameSnapshot}
              </p>
              {i.specialInstructions ? (
                <p className="mt-0.5 text-xs italic text-gold-300">
                  {i.specialInstructions}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 font-mono text-sm tabular text-ink-3">
              {formatMoney(i.unitPriceSnapshot * i.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-2xs uppercase tracking-luxe text-ink-3">
          Order value
        </span>
        <span className="font-display text-2xl font-light tabular text-ink">
          {formatMoney(order.subtotal)}
        </span>
      </div>

      {action ? (
        <Button
          variant="gold"
          className="w-full"
          onClick={() => {
            void advanceOrder(order.id, action.to, "admin")
              .then(() => toast.success(`${formatSeq(order.seqNo)} → ${action.label}`))
              .catch((err) =>
                toast.error("That move isn't allowed", {
                  description: err instanceof Error ? err.message : undefined,
                }),
              );
          }}
        >
          {action.label}
        </Button>
      ) : null}

      {isLive(order.status) ? (
        <div className="rounded-sm border border-danger/25 bg-danger/6 p-4">
          <p className="text-2xs font-medium uppercase tracking-label text-danger">
            Cancel this order
          </p>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            className="mt-3"
          />
          <Button
            variant="danger"
            className="mt-3 w-full"
            disabled={!reason.trim()}
            onClick={() => {
              void cancelOrder(order.id, reason.trim(), "admin")
                .then(() => {
                  toast.success(`${formatSeq(order.seqNo)} cancelled`);
                  onDone();
                })
                .catch(() => toast.error("Could not cancel that order"));
            }}
          >
            Cancel order
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The "Zomato" feed.
 *
 * It builds an order and pushes it through the exact same `placeOrder` action
 * a guest's phone uses — no special-casing anywhere downstream. That is the
 * whole point of the simulation: the kitchen genuinely cannot tell which
 * channel a ticket came from, which is what a real aggregator integration
 * would also give you.
 */
function ZomatoSimulator() {
  const [auto, setAuto] = React.useState(false);

  React.useEffect(() => {
    if (!auto) return;
    let cancelled = false;

    function schedule() {
      // 45-90s, so a demo left running fills the board at a believable pace.
      const delay = 45_000 + Math.random() * 45_000;
      return setTimeout(() => {
        if (cancelled) return;
        void injectOnlineOrder().then((id) => {
          if (id) toast("New Zomato order", { icon: <Radio className="size-4" /> });
        });
        timer = schedule();
      }, delay);
    }

    let timer = schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auto]);

  return (
    <div className="flex items-center gap-4">
      <Toggle checked={auto} onCheckedChange={setAuto} label="Auto" />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void injectOnlineOrder().then((id) =>
            id
              ? toast.success("Online order injected", {
                  description: "It is already on the kitchen board.",
                })
              : toast.error("Nothing on the menu is available"),
          );
        }}
      >
        <Zap className="size-3.5" strokeWidth={1.5} />
        Simulate online order
      </Button>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-96 w-full rounded-md" />
    </div>
  );
}
