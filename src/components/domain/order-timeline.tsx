"use client";

import * as m from "motion/react-m";
import { Check, XCircle } from "lucide-react";
import {
  ORDER_STATUS_GUEST_LABEL,
  type OrderStatus,
} from "@/lib/domain/enums";
import { GUEST_TIMELINE } from "@/lib/domain/transitions";
import type { Order } from "@/lib/domain/types";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/**
 * The guest's view of their order.
 *
 * The current step gets two concentric expanding rings — a heartbeat. It is
 * the one piece of ambient motion in the customer flow, and it answers the
 * only question a waiting guest actually has: "is anything happening?"
 */

const STAMP_KEY: Record<OrderStatus, keyof Order> = {
  draft: "createdAt",
  placed: "placedAt",
  accepted: "acceptedAt",
  preparing: "preparingAt",
  ready: "readyAt",
  served: "servedAt",
  cancelled: "cancelledAt",
};

export function OrderTimeline({
  order,
  orientation = "vertical",
  className,
}: {
  order: Order;
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  if (order.status === "cancelled") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-md border border-danger/30 bg-danger/8 p-4",
          className,
        )}
      >
        <XCircle className="size-5 shrink-0 text-danger" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium text-ink">This order was cancelled</p>
          {order.cancelReason ? (
            <p className="mt-0.5 text-xs text-ink-3">{order.cancelReason}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const currentIndex = GUEST_TIMELINE.indexOf(order.status);

  if (orientation === "horizontal") {
    return (
      <ol className={cn("flex items-center", className)} aria-live="polite">
        {GUEST_TIMELINE.map((step, i) => {
          const state =
            i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <Node step={step} state={state} />
              {i < GUEST_TIMELINE.length - 1 ? (
                <Rail filled={i < currentIndex} horizontal />
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("relative", className)} aria-live="polite">
      {GUEST_TIMELINE.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
        const stamp = order[STAMP_KEY[step]] as string | null;
        const last = i === GUEST_TIMELINE.length - 1;

        return (
          <li key={step} className="relative flex gap-4 pb-7 last:pb-0">
            {!last ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-1.5rem)] w-0.5 overflow-hidden rounded-full bg-line"
                aria-hidden
              >
                <m.span
                  className="block h-full w-full origin-top bg-gradient-to-b from-gold-600 to-gold-300"
                  initial={false}
                  animate={{ scaleY: i < currentIndex ? 1 : 0 }}
                  transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            ) : null}

            <Node step={step} state={state} />

            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  "text-sm transition-colors duration-[--duration-fast]",
                  state === "todo"
                    ? "text-ink-4"
                    : "font-medium text-ink",
                )}
              >
                {ORDER_STATUS_GUEST_LABEL[step]}
              </p>
              <p className="mt-0.5 font-mono text-2xs tabular text-ink-4">
                {stamp ? formatTime(stamp) : "—"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Node({
  step,
  state,
}: {
  step: OrderStatus;
  state: "done" | "current" | "todo";
}) {
  return (
    <span
      data-status={step}
      className="relative grid size-6 shrink-0 place-items-center"
    >
      {state === "current" ? (
        <>
          <span
            className="absolute inset-0 rounded-full bg-[--st] opacity-40"
            style={{ animation: "st-ring 2s var(--ease-standard) infinite" }}
            aria-hidden
          />
          <span
            className="absolute inset-0 rounded-full bg-[--st] opacity-40"
            style={{
              animation: "st-ring 2s var(--ease-standard) 0.6s infinite",
            }}
            aria-hidden
          />
        </>
      ) : null}

      {state === "done" ? (
        <span className="grid size-5 place-items-center rounded-full bg-gold-500">
          <Check className="size-3 text-gold-ink" strokeWidth={3} />
        </span>
      ) : state === "current" ? (
        <span className="relative size-3 rounded-full bg-[--st] shadow-[0_0_12px_var(--st-glow)]" />
      ) : (
        <span className="size-3 rounded-full border border-ink-4" />
      )}
    </span>
  );
}

function Rail({ filled, horizontal }: { filled: boolean; horizontal?: boolean }) {
  return (
    <span
      className={cn(
        "mx-1 overflow-hidden rounded-full bg-line",
        horizontal ? "h-0.5 flex-1" : "w-0.5 flex-1",
      )}
      aria-hidden
    >
      <m.span
        className="block h-full w-full origin-left bg-gradient-to-r from-gold-600 to-gold-300"
        initial={false}
        animate={{ scaleX: filled ? 1 : 0 }}
        transition={{ duration: 0.56, ease: [0.16, 1, 0.3, 1] }}
      />
    </span>
  );
}
