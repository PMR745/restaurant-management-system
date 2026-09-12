"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import * as m from "motion/react-m";
import { ChevronLeft, Clock, Flame, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { DIET_TAG_LABEL, SPICE_LEVEL_LABEL } from "@/lib/domain/enums";
import { useMenuItem, useUpsells } from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { formatMoney, formatMinutes } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { DishImage, EmptyState, QuantityStepper, Skeleton } from "@/components/ui/misc";
import { Chip, DietMark } from "@/components/ui/status-pill";
import { DiamondRule, GlassPanel } from "@/components/ui/surface";
import { MenuItemFeature } from "@/components/domain/menu-item-card";
import { HydrationGate } from "@/components/providers";
import { useTableRoute } from "./customer-shell";

export function ItemScreen({ itemId }: { itemId: string }) {
  return (
    <HydrationGate fallback={<ItemSkeleton />}>
      <ItemContent itemId={itemId} />
    </HydrationGate>
  );
}

function ItemContent({ itemId }: { itemId: string }) {
  const { base } = useTableRoute();
  const router = useRouter();
  const item = useMenuItem(itemId);
  const upsells = useUpsells([itemId]);
  const addToCart = useRmsStore((s) => s.addToCart);

  const [quantity, setQuantity] = React.useState(1);
  const [note, setNote] = React.useState("");

  if (!item) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="That dish is no longer on the menu"
        description="Our menu changes with the season. Do have a look at what's on today."
        action={
          <Button variant="outline" asChild>
            <Link href={base}>Back to the menu</Link>
          </Button>
        }
      />
    );
  }

  const out = item.availability === "out_of_stock";
  const veg = item.dietTags.includes("veg") || item.dietTags.includes("vegan");

  function add() {
    if (!item || out) return;
    addToCart(item.id, quantity, note.trim());
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(12);
    }
    toast.success(`${quantity} × ${item.name} added`);
    router.push(base);
  }

  return (
    <div className="page-enter -mt-14 pb-40">
      {/* ── hero ───────────────────────────────────────────────────────── */}
      <div className="relative h-[58vh] min-h-72">
        <div className="dish-frame absolute inset-0" data-kenburns data-scrim="hero">
          <DishImage
            src={item.imageUrl}
            alt={item.name}
            sizes="100vw"
            priority
            className={cn(out && "grayscale opacity-50")}
          />
        </div>
        <Link
          href={base}
          aria-label="Back to the menu"
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-[4] grid size-10 place-items-center rounded-full border border-line bg-void/50 text-ink backdrop-blur-md transition-colors hover:bg-void/75"
        >
          <ChevronLeft className="size-4" strokeWidth={1.5} />
        </Link>
      </div>

      {/* ── the sheet, pulled up over the photograph ───────────────────── */}
      <m.article
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-[5] -mt-8 rounded-t-xl border-t border-line-gold bg-surface-1 px-5 pt-7"
      >
        <div className="mx-auto max-w-[560px]">
          <div className="flex items-start gap-2.5">
            <DietMark veg={veg} className="mt-2.5" />
            <h1 className="font-display text-[clamp(2rem,7vw,2.75rem)] font-light leading-[1.05] tracking-display text-ink">
              {item.name}
            </h1>
          </div>

          <p className="mt-4 text-base leading-relaxed text-ink-2">
            {item.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="font-display text-xl tabular text-gold-300">
              {formatMoney(item.price)}
            </span>
            <span className="text-ink-4">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
              <Clock className="size-3.5" strokeWidth={1.5} />
              {formatMinutes(item.prepTimeMinutes)}
            </span>
            {item.spiceLevel !== "none" ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-3">
                <Flame className="size-3.5" strokeWidth={1.5} />
                {SPICE_LEVEL_LABEL[item.spiceLevel]}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {item.isSignature ? <Chip tone="gold">Signature</Chip> : null}
            {item.dietTags.map((t) => (
              <Chip key={t}>{DIET_TAG_LABEL[t]}</Chip>
            ))}
            {out ? <Chip tone="danger">Unavailable today</Chip> : null}
          </div>

          {/* ── nutrition ────────────────────────────────────────────── */}
          {item.nutrition ? (
            <section className="mt-8">
              <DiamondRule className="mb-6" />
              <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
                Per serving
              </p>
              <dl className="mt-4 grid grid-cols-4 gap-3">
                {[
                  { k: "Energy", v: `${item.nutrition.calories}`, u: "kcal" },
                  { k: "Protein", v: `${item.nutrition.protein}`, u: "g" },
                  { k: "Carbs", v: `${item.nutrition.carbs}`, u: "g" },
                  { k: "Fat", v: `${item.nutrition.fat}`, u: "g" },
                ].map((n) => (
                  <div
                    key={n.k}
                    className="rounded-sm border border-line bg-surface-2 px-2 py-3 text-center"
                  >
                    <dd className="font-display text-xl font-light tabular text-ink">
                      {n.v}
                      <span className="ml-0.5 text-2xs text-ink-4">{n.u}</span>
                    </dd>
                    <dt className="mt-1 text-[10px] uppercase tracking-label text-ink-4">
                      {n.k}
                    </dt>
                  </div>
                ))}
              </dl>
              {item.nutrition.allergens.length ? (
                <p className="mt-3 text-xs text-ink-3">
                  <span className="text-ink-4">Allergens · </span>
                  {item.nutrition.allergens.join(", ")}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* ── special instructions ─────────────────────────────────── */}
          {!out ? (
            <section className="mt-8">
              <label
                htmlFor="note"
                className="mb-1.5 block text-2xs font-medium uppercase tracking-label text-ink-3"
              >
                Anything we should know?
              </label>
              <Textarea
                id="note"
                value={note}
                maxLength={180}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Allergies, spice level, how you'd like it cooked…"
              />
              <p className="mt-1 text-right font-mono text-[10px] tabular text-ink-4">
                {note.length}/180
              </p>
            </section>
          ) : null}

          {/* ── upsell ───────────────────────────────────────────────── */}
          {upsells.length ? (
            <section className="mt-10">
              <DiamondRule className="mb-6" />
              <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
                Pairs beautifully with
              </p>
              <div className="no-scrollbar -mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5">
                {upsells.map((u) => (
                  <MenuItemFeature
                    key={u.id}
                    item={u}
                    href={`${base}/item/${u.id}`}
                    className="w-40 shrink-0 snap-start"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </m.article>

      {/* ── sticky action bar ──────────────────────────────────────────── */}
      <GlassPanel className="fixed inset-x-0 bottom-0 z-40 border-t border-line-gold pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto flex max-w-[560px] items-center gap-3 px-5">
          {out ? (
            <p className="flex-1 text-center text-sm text-ink-3">
              Not available today — our apologies.
            </p>
          ) : (
            <>
              <QuantityStepper value={quantity} onChange={setQuantity} />
              <Button
                variant="gold"
                size="lg"
                luxe
                className="flex-1"
                onClick={add}
              >
                Add · {formatMoney(item.price * quantity)}
              </Button>
            </>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div className="-mt-14">
      <Skeleton className="h-[58vh] rounded-none" />
      <div className="mx-auto max-w-[560px] space-y-4 p-5">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}
