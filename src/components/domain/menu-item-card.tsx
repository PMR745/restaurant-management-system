"use client";

import Link from "next/link";
import * as m from "motion/react-m";
import { Plus } from "lucide-react";
import type { MenuItem } from "@/lib/domain/types";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { DishImage } from "@/components/ui/misc";
import { Chip, DietMark } from "@/components/ui/status-pill";

/**
 * Two forms, because a menu needs both a scannable list and a few dishes shown
 * the way a restaurant would actually photograph them.
 *
 * Sold-out items are not hidden — a guest asking about a dish that isn't there
 * is a worse experience than seeing it struck through. They go greyscale with
 * an "86'd" stamp, which is the kitchen's own word for it.
 */

export function MenuItemRow({
  item,
  href,
  onAdd,
  className,
}: {
  item: MenuItem;
  href: string;
  onAdd?: () => void;
  className?: string;
}) {
  const out = item.availability === "out_of_stock";
  const veg = item.dietTags.includes("veg") || item.dietTags.includes("vegan");

  return (
    <m.li
      layout
      className={cn("group relative", className)}
    >
      <Link
        href={href}
        aria-disabled={out}
        className={cn(
          "flex gap-4 py-4 outline-offset-4",
          out && "pointer-events-none",
        )}
      >
        <div className="dish-frame relative size-24 shrink-0 rounded-sm">
          <DishImage
            src={item.imageUrl}
            alt={item.name}
            sizes="96px"
            className={cn(out && "grayscale opacity-40")}
          />
          {out ? (
            <span className="absolute inset-0 grid place-items-center">
              <span className="-rotate-12 rounded-xs border border-danger/60 bg-void/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-label text-danger">
                86&apos;d
              </span>
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <DietMark veg={veg} className="mt-1" />
            <h3
              className={cn(
                "font-display text-lg font-medium leading-tight tracking-tight",
                out ? "text-ink-4" : "text-ink",
              )}
            >
              {item.name}
            </h3>
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink-3">
            {item.description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "font-display text-md tabular",
                out ? "text-ink-4" : "text-gold-300",
              )}
            >
              {formatMoney(item.price)}
            </span>
            {item.isSignature && !out ? (
              <Chip tone="gold">Signature</Chip>
            ) : null}
            {out ? <Chip tone="danger">Unavailable</Chip> : null}
          </div>
        </div>
      </Link>

      {onAdd && !out ? (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${item.name} to your order`}
          className="absolute bottom-4 left-[4.25rem] grid size-8 place-items-center rounded-full border border-line-gold bg-surface-2/90 text-gold-300 shadow-md backdrop-blur transition-[transform,background-color] duration-[--duration-micro] hover:scale-105 hover:bg-gold-500 hover:text-gold-ink active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2} />
        </button>
      ) : null}
    </m.li>
  );
}

/** The portrait form: used for chef's selections and the upsell rail. */
export function MenuItemFeature({
  item,
  href,
  className,
  priority,
}: {
  item: MenuItem;
  href: string;
  className?: string;
  priority?: boolean;
}) {
  const out = item.availability === "out_of_stock";

  return (
    <Link
      href={href}
      aria-disabled={out}
      className={cn(
        "dish-frame gilded group relative block aspect-4/5 overflow-hidden rounded-lg",
        out && "pointer-events-none",
        className,
      )}
      data-scrim
    >
      <DishImage
        src={item.imageUrl}
        alt={item.name}
        sizes="(max-width: 640px) 60vw, 280px"
        priority={priority}
        className={cn(out && "grayscale opacity-40")}
      />
      <div className="absolute inset-x-0 bottom-0 z-[3] p-4">
        <h3 className="text-engrave font-display text-lg font-medium leading-tight text-ink">
          {item.name}
        </h3>
        <p className="mt-1 font-display text-md tabular text-gold-200">
          {formatMoney(item.price)}
        </p>
      </div>
    </Link>
  );
}
