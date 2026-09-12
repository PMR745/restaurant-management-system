"use client";

import * as React from "react";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { BLUR_OBSIDIAN } from "@/lib/seed/images";
import { cn } from "@/lib/utils/cn";

/* ── dish image ──────────────────────────────────────────────────────────── */

/**
 * A remote photo that can never leave a hole in the page.
 *
 * Unsplash ids are pinned, but a pinned id can still be taken down, and a
 * missing hero on the customer menu would be far more damaging than a slightly
 * plainer card. On error we fall back to a warm gradient with the dish's
 * initial set in the display serif — which reads as a deliberate plated-ware
 * placeholder rather than a broken image.
 */
export function DishImage({
  src,
  alt,
  fill = true,
  sizes,
  className,
  priority,
  width,
  height,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed || !src) {
    return (
      <div
        className={cn(
          "grid h-full w-full place-items-center bg-gradient-to-br from-surface-3 to-surface-1",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <span className="font-display text-3xl font-light text-gold-800">
          {alt.trim().charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width: width ?? 800, height: height ?? 600 })}
      sizes={sizes ?? "(max-width: 640px) 100vw, 33vw"}
      placeholder="blur"
      blurDataURL={BLUR_OBSIDIAN}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}

/* ── quantity stepper ────────────────────────────────────────────────────── */

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  size = "md",
  allowRemove = false,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  /** At `min`, turn the minus into a delete affordance instead of disabling it. */
  allowRemove?: boolean;
  className?: string;
}) {
  const atMin = value <= min;
  const showTrash = atMin && allowRemove;
  const btn =
    "grid place-items-center rounded-full text-ink-2 transition-colors duration-[--duration-micro] hover:bg-surface-4 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";
  const dim = size === "sm" ? "size-8" : "size-10";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-line-gold bg-surface-2 p-0.5",
        className,
      )}
    >
      <button
        type="button"
        className={cn(btn, dim, showTrash && "text-ink-3 hover:text-danger")}
        onClick={() => onChange(showTrash ? 0 : value - 1)}
        disabled={atMin && !allowRemove}
        aria-label={showTrash ? "Remove from order" : "Decrease quantity"}
      >
        {showTrash ? (
          <Trash2 className="size-3.5" strokeWidth={1.5} />
        ) : (
          <Minus className="size-3.5" strokeWidth={2} />
        )}
      </button>
      <span
        className={cn(
          "min-w-8 text-center font-mono tabular text-ink",
          size === "sm" ? "text-sm" : "text-md",
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, dim)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ── skeleton ────────────────────────────────────────────────────────────── */

/**
 * Champagne shimmer, not a grey box. Skeletons are visible on every cold load,
 * so they are part of the design rather than a placeholder for it.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("shimmer rounded-sm", className)}
      aria-hidden
      {...props}
    />
  );
}

/* ── empty state ─────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative grid place-items-center px-6 py-16 text-center",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(22rem 12rem at 50% 40%, oklch(0.745 0.09 85 / 0.06), transparent 70%)",
        }}
        aria-hidden
      />
      <div className="relative">
        {Icon ? (
          <Icon className="mx-auto mb-4 size-10 text-gold-700" strokeWidth={1} />
        ) : null}
        <p className="font-display text-xl font-light text-ink">{title}</p>
        {description ? (
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-3">{description}</p>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

/* ── stat ────────────────────────────────────────────────────────────────── */

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-2xs font-medium uppercase tracking-luxe text-ink-3">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-light tabular text-ink">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-ink-4">{sub}</p> : null}
    </div>
  );
}

/* ── avatar ──────────────────────────────────────────────────────────────── */

export function Initials({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border border-line-gold bg-surface-3 font-display text-xs font-medium text-gold-300",
        className,
      )}
    >
      {initials}
    </span>
  );
}
