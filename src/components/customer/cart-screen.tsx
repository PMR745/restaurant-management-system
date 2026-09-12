"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import * as m from "motion/react-m";
import { AnimatePresence } from "motion/react";
import { Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { placeOrder } from "@/lib/store/actions";
import { useCartView, useTableByCode, useUpsells } from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { formatMoney, formatMinutes, pluralize } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import {
  DishImage,
  EmptyState,
  QuantityStepper,
  Skeleton,
} from "@/components/ui/misc";
import { DiamondRule, GlassPanel, Surface } from "@/components/ui/surface";
import { MenuItemFeature } from "@/components/domain/menu-item-card";
import { HydrationGate } from "@/components/providers";
import { useTableRoute } from "./customer-shell";

export function CartScreen() {
  return (
    <HydrationGate fallback={<CartSkeleton />}>
      <CartContent />
    </HydrationGate>
  );
}

function CartContent() {
  const { tableCode, base } = useTableRoute();
  const router = useRouter();
  const cart = useCartView();
  const table = useTableByCode(tableCode);
  const sessionId = useRmsStore((s) => s.sessionId);
  const setCartQuantity = useRmsStore((s) => s.setCartQuantity);
  const setCartNote = useRmsStore((s) => s.setCartNote);
  const clearCart = useRmsStore((s) => s.clearCart);

  const upsells = useUpsells(cart.lines.map((l) => l.item.id));
  const addToCart = useRmsStore((s) => s.addToCart);

  const [placing, setPlacing] = React.useState(false);
  const [openNote, setOpenNote] = React.useState<string | null>(null);

  // The kitchen quotes the slowest dish, not the sum — everything on a ticket
  // is cooked in parallel.
  const eta = cart.lines.reduce(
    (max, l) => Math.max(max, l.item.prepTimeMinutes),
    0,
  );

  if (!cart.lines.length) {
    return (
      <div className="mx-auto max-w-[560px] px-5">
        <EmptyState
          icon={ShoppingBag}
          title="Nothing chosen yet"
          description="Your order will appear here as you add dishes."
          action={
            <Button variant="outline" asChild>
              <Link href={base}>Browse the menu</Link>
            </Button>
          }
        />
      </div>
    );
  }

  async function submit() {
    if (!table || placing) return;
    setPlacing(true);
    try {
      const orderId = await placeOrder({
        type: "dine_in",
        channel: "qr",
        tableId: table.id,
        sessionId,
        actor: "customer",
        lines: cart.lines.map((l) => ({
          item: l.item,
          quantity: l.quantity,
          specialInstructions: l.specialInstructions,
        })),
      });
      clearCart();
      router.push(`${base}/order/${orderId}`);
    } catch (err) {
      setPlacing(false);
      toast.error("We couldn't send that to the kitchen", {
        description:
          err instanceof Error ? err.message : "Please try once more.",
      });
    }
  }

  return (
    <div className="page-enter mx-auto max-w-[560px] px-5 pb-40 pt-8">
      <header className="text-center">
        <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
          {table?.label ?? tableCode}
        </p>
        <h1 className="mt-2 font-display text-3xl font-light text-ink">
          Your order
        </h1>
        <DiamondRule className="mx-auto mt-5 max-w-[9rem]" />
      </header>

      <ul className="mt-2 divide-y divide-line">
        <AnimatePresence initial={false}>
          {cart.lines.map((line) => (
            <m.li
              key={line.item.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex gap-4 py-4">
                <div className="dish-frame relative size-20 shrink-0 rounded-sm">
                  <DishImage
                    src={line.item.imageUrl}
                    alt={line.item.name}
                    sizes="80px"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-medium leading-tight text-ink">
                    {line.item.name}
                  </h2>
                  <p className="mt-1 font-display text-md tabular text-gold-300">
                    {formatMoney(line.lineTotal)}
                  </p>

                  {line.specialInstructions && openNote !== line.item.id ? (
                    <p className="mt-1.5 text-xs italic text-ink-3">
                      “{line.specialInstructions}”
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setOpenNote(
                        openNote === line.item.id ? null : line.item.id,
                      )
                    }
                    className="mt-2 text-2xs uppercase tracking-label text-ink-4 underline-offset-4 hover:text-gold-300 hover:underline"
                  >
                    {line.specialInstructions
                      ? "Edit note"
                      : "Add a note"}
                  </button>
                </div>

                <QuantityStepper
                  value={line.quantity}
                  size="sm"
                  allowRemove
                  onChange={(q) => setCartQuantity(line.item.id, q)}
                  className="self-start"
                />
              </div>

              <AnimatePresence>
                {openNote === line.item.id ? (
                  <m.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pb-4"
                  >
                    <Textarea
                      autoFocus
                      maxLength={180}
                      value={line.specialInstructions}
                      onChange={(e) =>
                        setCartNote(line.item.id, e.target.value)
                      }
                      placeholder="Allergies, spice level, how you'd like it cooked…"
                    />
                  </m.div>
                ) : null}
              </AnimatePresence>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>

      {upsells.length ? (
        <section className="mt-10">
          <DiamondRule className="mb-6" />
          <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
            To complete the table
          </p>
          <div className="no-scrollbar -mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5">
            {upsells.map((u) => (
              <div key={u.id} className="w-40 shrink-0 snap-start">
                <MenuItemFeature item={u} href={`${base}/item/${u.id}`} />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => {
                    addToCart(u.id, 1);
                    toast.success(`${u.name} added`);
                  }}
                >
                  Add · {formatMoney(u.price)}
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Surface variant="gilded" className="mt-10 p-5">
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-3">
              {cart.count} {pluralize(cart.count, "item")}
            </dt>
            <dd className="tabular text-ink-2">{formatMoney(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">Estimated preparation</dt>
            <dd className="tabular text-ink-2">{formatMinutes(eta)}</dd>
          </div>
        </dl>
        <div className="my-4 h-px bg-line" />
        <div className="flex items-baseline justify-between">
          <span className="text-2xs uppercase tracking-luxe text-ink-3">
            Order value
          </span>
          <span className="font-display text-2xl font-light tabular text-ink">
            {formatMoney(cart.subtotal)}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-4">
          Taxes and service are settled on the final bill, brought to your
          table at the end of service.
        </p>
      </Surface>

      <GlassPanel className="fixed inset-x-0 bottom-0 z-40 border-t border-line-gold pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-[560px] px-5">
          <Button
            variant="gold"
            size="lg"
            luxe
            className="w-full"
            disabled={placing}
            onClick={submit}
          >
            {placing ? (
              <>
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                Sending to the kitchen
              </>
            ) : (
              <>Place order · {formatMoney(cart.subtotal)}</>
            )}
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div className="mx-auto max-w-[560px] space-y-4 px-5 pt-10">
      <Skeleton className="mx-auto h-9 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="size-20 shrink-0 rounded-sm" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
