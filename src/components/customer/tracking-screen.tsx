"use client";

import Link from "next/link";
import * as React from "react";
import * as m from "motion/react-m";
import { ConciergeBell, Receipt } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUS_GUEST_LABEL } from "@/lib/domain/enums";
import { advanceOrder } from "@/lib/store/actions";
import { useOrder, useOrderItems } from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { formatMoney, formatMinutes, formatSeq } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { DishImage, EmptyState, Skeleton } from "@/components/ui/misc";
import { DiamondRule, Surface } from "@/components/ui/surface";
import { OrderTimeline } from "@/components/domain/order-timeline";
import { StatusPill } from "@/components/ui/status-pill";
import { HydrationGate } from "@/components/providers";
import { useTableRoute } from "./customer-shell";

export function TrackingScreen({ orderId }: { orderId: string }) {
  return (
    <HydrationGate fallback={<TrackingSkeleton />}>
      <TrackingContent orderId={orderId} />
    </HydrationGate>
  );
}

function TrackingContent({ orderId }: { orderId: string }) {
  const { base } = useTableRoute();
  const order = useOrder(orderId);
  const items = useOrderItems(orderId);
  const menuItems = useRmsStore((s) => s.menu_items);

  if (!order) {
    return (
      <EmptyState
        icon={Receipt}
        title="We can't find that order"
        description="It may have been cleared by our team. Please ask your waiter."
        action={
          <Button variant="outline" asChild>
            <Link href={base}>Back to the menu</Link>
          </Button>
        }
      />
    );
  }

  const eta = items.reduce(
    (max, i) => Math.max(max, menuItems[i.menuItemId]?.prepTimeMinutes ?? 0),
    0,
  );
  const canCancel = order.status === "placed";

  return (
    <div className="page-enter mx-auto max-w-[560px] px-5 pb-24 pt-8">
      <header className="text-center">
        <p className="font-mono text-2xs uppercase tracking-luxe text-gold-300">
          {formatSeq(order.seqNo)}
        </p>
        <h1 className="mt-3 font-display text-[clamp(1.75rem,7vw,2.5rem)] font-light leading-tight text-ink">
          {ORDER_STATUS_GUEST_LABEL[order.status]}
        </h1>
        <div className="mt-4 flex justify-center">
          <StatusPill status={order.status} />
        </div>
      </header>

      {/* the dishes, as a small marquee of what's coming */}
      <div className="no-scrollbar -mx-5 mt-8 flex gap-2 overflow-x-auto px-5">
        {items.map((i) => (
          <div
            key={i.id}
            className="dish-frame relative size-16 shrink-0 rounded-sm border border-line"
          >
            <DishImage
              src={i.imageUrlSnapshot}
              alt={i.nameSnapshot}
              sizes="64px"
            />
            {i.quantity > 1 ? (
              <span className="absolute -right-1 -top-1 z-[3] grid size-5 place-items-center rounded-full bg-gold-500 font-mono text-[10px] tabular text-gold-ink">
                {i.quantity}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <Surface variant="gilded" className="mt-8 p-5">
        <OrderTimeline order={order} />
      </Surface>

      {order.status !== "served" && order.status !== "cancelled" ? (
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-5 text-center text-sm text-ink-3"
        >
          {order.status === "ready"
            ? "Your table is being served now."
            : `Around ${formatMinutes(eta)} from the kitchen accepting.`}
        </m.p>
      ) : null}

      <DiamondRule className="mx-auto my-8 max-w-[9rem]" />

      <section>
        <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
          Ordered
        </p>
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-ink">
                  <span className="font-mono tabular text-ink-3">
                    {i.quantity}×
                  </span>{" "}
                  {i.nameSnapshot}
                </p>
                {i.specialInstructions ? (
                  <p className="mt-0.5 text-xs italic text-ink-4">
                    “{i.specialInstructions}”
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-sm tabular text-ink-2">
                {formatMoney(i.unitPriceSnapshot * i.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
          <span className="text-2xs uppercase tracking-luxe text-ink-3">
            Order value
          </span>
          <span className="font-display text-xl font-light tabular text-ink">
            {formatMoney(order.subtotal)}
          </span>
        </div>
      </section>

      <div className="mt-10 flex flex-col gap-2.5">
        <Button variant="outline" size="lg" asChild>
          <Link href={base}>
            <ConciergeBell className="size-4" strokeWidth={1.5} />
            Order something more
          </Link>
        </Button>
        {canCancel ? (
          <Button
            variant="quiet"
            size="sm"
            className="mx-auto"
            onClick={() => {
              void advanceOrder(order.id, "cancelled", "customer", "Cancelled by guest")
                .then(() => toast.success("Order cancelled"))
                .catch(() =>
                  toast.error("The kitchen has already started this order"),
                );
            }}
          >
            Cancel this order
          </Button>
        ) : null}
      </div>

      <p className="mt-10 text-center text-xs leading-relaxed text-ink-4">
        Your bill will be brought to the table at the end of service.
      </p>
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="mx-auto max-w-[560px] space-y-6 px-5 pt-10">
      <Skeleton className="mx-auto h-10 w-56" />
      <Skeleton className="h-16 w-full rounded-sm" />
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  );
}
