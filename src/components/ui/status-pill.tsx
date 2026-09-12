import * as React from "react";
import {
  ORDER_STATUS_LABEL,
  TABLE_STATUS_LABEL,
  type OrderStatus,
  type TableStatus,
} from "@/lib/domain/enums";
import { cn } from "@/lib/utils/cn";

/**
 * Status is NEVER communicated by colour alone — every pill carries its label.
 * That is an accessibility requirement, but it is also just correct for a
 * kitchen: a new hire on their first shift cannot be expected to have learned
 * that orchid means "ready".
 *
 * Colour comes entirely from the `data-status` recipe in globals.css, so this
 * component contains no per-status branching.
 */

export type AnyStatus = OrderStatus | TableStatus;

const LABEL: Record<string, string> = {
  ...ORDER_STATUS_LABEL,
  ...TABLE_STATUS_LABEL,
};

/** Statuses where something is actively happening — the dot breathes. */
const LIVE = new Set<string>(["preparing", "ready", "ordering", "accepted"]);

export function StatusPill({
  status,
  label,
  size = "md",
  className,
}: {
  status: AnyStatus;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium uppercase tracking-label",
        "border-[--st-stroke] bg-[--st-tint] text-[--st]",
        size === "sm" ? "h-5 px-2 text-[10px]" : "h-6 px-2.5 text-2xs",
        className,
      )}
    >
      <span
        className="st-dot size-1.5 shrink-0 rounded-full"
        data-live={LIVE.has(status)}
        aria-hidden
      />
      {label ?? LABEL[status] ?? status}
    </span>
  );
}

/** Just the dot, for dense contexts that already have a written status nearby. */
export function StatusDot({
  status,
  className,
}: {
  status: AnyStatus;
  className?: string;
}) {
  return (
    <span
      data-status={status}
      className={cn("st-dot inline-block size-2 rounded-full", className)}
      data-live={LIVE.has(status)}
      aria-hidden
    />
  );
}

/** Neutral metadata — spice, diet, allergens. Never competes with status. */
export function Chip({
  children,
  className,
  tone = "neutral",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "neutral" | "gold" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-xs px-1.5 text-[10px] font-medium uppercase tracking-label",
        tone === "neutral" && "bg-surface-3 text-ink-3",
        tone === "gold" && "border border-line-gold bg-gold-500/8 text-gold-300",
        tone === "danger" && "bg-danger/12 text-danger",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The Indian veg/non-veg mark: a coloured dot inside a square outline. Using
 * an emoji here would be both inaccurate and visually cheap.
 */
export function DietMark({
  veg,
  className,
}: {
  veg: boolean;
  className?: string;
}) {
  const colour = veg ? "text-st-available" : "text-danger";
  return (
    <span
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center rounded-[2px] border current",
        colour,
        className,
      )}
      style={{ borderColor: "currentColor" }}
      title={veg ? "Vegetarian" : "Non-vegetarian"}
    >
      <span
        className="size-1.5 rounded-full bg-current"
        aria-hidden
      />
      <span className="sr-only">{veg ? "Vegetarian" : "Non-vegetarian"}</span>
    </span>
  );
}
