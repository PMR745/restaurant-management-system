"use client";

import * as m from "motion/react-m";
import { AlertTriangle, CornerDownRight } from "lucide-react";
import { ORDER_CHANNEL_LABEL, type OrderStatus } from "@/lib/domain/enums";
import type { KitchenTicketView } from "@/lib/store/selectors";
import { useRmsStore } from "@/lib/store/store";
import { formatSeq } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { ElapsedTimer, useElapsedBand } from "./elapsed";

/**
 * The hardest component in the app, and the one that sells the whole thing.
 *
 * Three constraints drove every decision here:
 *
 *  - It is read at 2-3 metres, standing, under harsh light, by someone whose
 *    hands are full. Dish names are 20px minimum and the timer is 28px.
 *  - It must be scannable in peripheral vision, so status lives in a 4px left
 *    bar and in the timer's colour, not in body text.
 *  - Age is a SEPARATE axis from status, and age is allowed to shout. A ticket
 *    past 18 minutes breathes at the border until someone deals with it.
 *
 * `layoutId` makes the card physically fly between lanes on a status change
 * rather than vanishing here and appearing there. That single detail is the
 * difference between "a web page updated" and "the kitchen moved".
 */
export function KitchenTicket({
  view,
  actionLabel,
  onAdvance,
  compact = false,
}: {
  view: KitchenTicketView;
  actionLabel?: string;
  onAdvance?: () => void;
  compact?: boolean;
}) {
  const { order, items, tableCode, since } = view;
  const band = useElapsedBand(since);
  const critical = band === "critical";

  // Allergens are surfaced on the ticket itself rather than left for someone
  // to remember from the menu — this is the last point before the plate.
  const menuItems = useRmsStore((s) => s.menu_items);
  const allergens = new Set<string>();
  for (const i of items) {
    for (const a of menuItems[i.menuItemId]?.nutrition?.allergens ?? []) {
      allergens.add(a);
    }
  }

  return (
    <m.article
      layoutId={`ticket-${order.id}`}
      layout
      initial={{ opacity: 0, y: -24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      data-status={order.status}
      data-order={order.seqNo}
      className={cn(
        "group relative overflow-hidden rounded-md border bg-surface-3 shadow-md",
        critical ? "age-critical border-age-critical/50" : "border-line",
      )}
    >
      {/* the status bar — the thing you actually read across the room */}
      <span
        className="st-bar absolute inset-y-0 left-0 w-1 bg-[--st] transition-colors duration-[--duration-base]"
        aria-hidden
      />

      <div className="pl-4">
        <header className="flex items-start justify-between gap-3 border-b border-line px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-ink-3">
              {formatSeq(order.seqNo)}
            </p>
            <p className="mt-1 truncate font-display text-lg font-light text-ink">
              {tableCode ?? order.customerName ?? "Takeaway"}
            </p>
          </div>
          <div className="text-right">
            <ElapsedTimer
              since={since}
              className={cn(compact ? "text-xl" : "text-[1.75rem] leading-none")}
            />
            <p className="mt-1 text-[10px] uppercase tracking-label text-ink-4">
              {order.type === "dine_in"
                ? "Dine-in"
                : ORDER_CHANNEL_LABEL[order.channel]}
            </p>
          </div>
        </header>

        <ul className="divide-y divide-line px-3">
          {items.map((item) => (
            <li key={item.id} className="py-2.5">
              <div className="flex items-start gap-3">
                <span className="mt-px grid min-w-7 shrink-0 justify-center rounded-xs bg-surface-4 px-1.5 py-0.5 font-mono text-sm tabular text-gold-300">
                  {item.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-snug text-ink">
                    {item.nameSnapshot}
                  </p>
                  {item.specialInstructions ? (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-gold-300">
                      <CornerDownRight
                        className="mt-0.5 size-3 shrink-0"
                        strokeWidth={1.5}
                      />
                      <span>{item.specialInstructions}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {allergens.size ? (
          <p className="mx-3 mb-2 flex items-center gap-2 rounded-xs bg-danger/12 px-2 py-1.5 text-xs text-danger">
            <AlertTriangle className="size-3.5" strokeWidth={1.5} />
            {[...allergens].join(", ")}
          </p>
        ) : null}

        {onAdvance && actionLabel ? (
          <div className="p-3 pt-1">
            <Button
              variant={order.status === "preparing" ? "gold" : "outline"}
              size="md"
              className="w-full"
              onClick={onAdvance}
            >
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </m.article>
  );
}

/** Lane header: the status colour, the name, and a live count. */
export function LaneHeader({
  status,
  label,
  count,
}: {
  status: OrderStatus;
  label: string;
  count: number;
}) {
  return (
    <div
      data-status={status}
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[--st-stroke] bg-void/85 px-3 py-3 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2.5">
        <span className="st-dot size-2 rounded-full" data-live aria-hidden />
        <h2 className="text-2xs font-medium uppercase tracking-luxe text-[--st]">
          {label}
        </h2>
      </div>
      <span className="font-mono text-sm tabular text-ink-3">{count}</span>
    </div>
  );
}
