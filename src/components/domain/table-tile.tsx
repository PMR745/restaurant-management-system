"use client";

import * as m from "motion/react-m";
import { Users } from "lucide-react";
import { TABLE_STATUS_LABEL } from "@/lib/domain/enums";
import type { TableView } from "@/lib/store/selectors";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ElapsedTimer } from "./elapsed";

/**
 * A node on the floor map.
 *
 * Round tables render round. That sounds trivial and is the single thing that
 * makes a floor plan feel like a room rather than a grid of divs — staff
 * navigate it by spatial memory, so the shapes have to match the furniture.
 *
 * Deliberately NO layout animation on status change: the tile changes colour
 * and emits a ring, but never moves. Moving a table under someone's cursor
 * because an order elsewhere changed state would be actively hostile.
 */
export function TableTile({
  view,
  selected,
  onSelect,
  className,
}: {
  view: TableView;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}) {
  const { table, status, waiter, openedAt, guestCount, total } = view;
  const seated = status !== "available";
  const round = table.shape === "round";

  return (
    <m.button
      type="button"
      onClick={onSelect}
      data-status={status}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group relative flex flex-col overflow-hidden border transition-[background-color,border-color,box-shadow,transform] duration-[--duration-base] ease-[--ease-standard]",
        "bg-[--st-tint] hover:bg-[--st-tint-strong]",
        selected
          ? "border-line-gold-hot shadow-[--shadow-gold]"
          : "border-[--st-stroke] hover:-translate-y-0.5 hover:shadow-md",
        // A round table renders round — that is what makes a floor plan read
        // as a room rather than a grid of divs. But a circle has far less
        // usable area than its bounding box, so it carries a reduced set of
        // detail rather than clipping the full one.
        round
          ? "aspect-square items-center justify-center rounded-full px-6 text-center"
          : "justify-between rounded-md p-3 text-left",
        table.shape === "booth" && "rounded-lg",
        className,
      )}
      aria-label={`${table.label}, ${TABLE_STATUS_LABEL[status]}`}
    >
      <span
        className={cn(
          "st-dot absolute size-2 rounded-full",
          round ? "right-[18%] top-[14%]" : "right-3 top-3",
        )}
        data-live={status === "ready" || status === "preparing"}
        aria-hidden
      />

      <div className="min-w-0 max-w-full">
        <p className="font-display text-3xl font-light tabular leading-none text-ink">
          {table.code.replace(/^T/, "")}
        </p>
        <p className="mt-1 truncate text-[10px] uppercase tracking-label text-ink-4">
          {table.label}
        </p>
      </div>

      <div className={cn("min-w-0 max-w-full", round ? "mt-2" : "mt-3 space-y-1")}>
        <p className="truncate text-2xs font-medium uppercase tracking-label text-[--st]">
          {TABLE_STATUS_LABEL[status]}
        </p>

        <div
          className={cn(
            "flex items-center gap-2 text-[10px] text-ink-4",
            round && "justify-center",
          )}
        >
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" strokeWidth={1.5} />
            {guestCount ?? table.seats}
          </span>
          {seated && openedAt ? (
            <ElapsedTimer
              since={openedAt}
              colorByAge={false}
              className="text-[10px]"
            />
          ) : null}
        </div>

        {/* Value and section belong to the wider shapes; a circle has no room
            for them without crowding the curve. */}
        {!round && total > 0 ? (
          <p className="font-mono text-[10px] tabular text-ink-3">
            {formatMoney(total)}
          </p>
        ) : null}
        {!round && waiter ? (
          <p className="truncate text-[10px] text-ink-4">{waiter.name}</p>
        ) : null}
      </div>
    </m.button>
  );
}

/** Always-visible legend. Status must never be colour-only. */
export function FloorLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {(Object.keys(TABLE_STATUS_LABEL) as Array<keyof typeof TABLE_STATUS_LABEL>).map(
        (s) => (
          <span
            key={s}
            data-status={s}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-label text-ink-3"
          >
            <span className="st-dot size-1.5 rounded-full" aria-hidden />
            {TABLE_STATUS_LABEL[s]}
          </span>
        ),
      )}
    </div>
  );
}
