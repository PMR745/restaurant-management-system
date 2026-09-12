"use client";

import * as React from "react";
import { toast } from "sonner";
import { Package, Plus, Search } from "lucide-react";
import { isLive } from "@/lib/domain/transitions";
import type { MenuItem } from "@/lib/domain/types";
import { advanceOrder, placeOrder } from "@/lib/store/actions";
import {
  useCategories,
  useMenuItems,
  useOrdersByType,
} from "@/lib/store/hooks";
import { formatMoney, formatSeq, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import {
  DishImage,
  EmptyState,
  QuantityStepper,
  Skeleton,
} from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeading, Surface } from "@/components/ui/surface";
import { ElapsedTimer } from "@/components/domain/elapsed";
import { HydrationGate } from "@/components/providers";

/** Front desk: build a takeaway order and track it to handover. */
export function TakeawayDesk() {
  return (
    <HydrationGate fallback={<TakeawaySkeleton />}>
      <TakeawayContent />
    </HydrationGate>
  );
}

function TakeawayContent() {
  const items = useMenuItems();
  const categories = useCategories();
  const orders = useOrdersByType("takeaway");

  const [lines, setLines] = React.useState<Record<string, number>>({});
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const available = items.filter((i) => i.availability === "available");
  const shown = query.trim()
    ? available.filter((i) =>
        i.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : available;

  const chosen = Object.entries(lines).filter(([, q]) => q > 0);
  const subtotal = chosen.reduce((n, [id, q]) => {
    const item = items.find((i) => i.id === id);
    return n + (item?.price ?? 0) * q;
  }, 0);

  async function submit() {
    if (!chosen.length || !name.trim() || busy) return;
    setBusy(true);
    try {
      await placeOrder({
        type: "takeaway",
        channel: "front_desk",
        tableId: null,
        sessionId: null,
        actor: "front_desk",
        customerName: name.trim(),
        customerPhone: phone.trim() || null,
        lines: chosen.map(([id, quantity]) => ({
          item: items.find((i) => i.id === id) as MenuItem,
          quantity,
          specialInstructions: "",
        })),
      });
      setLines({});
      setName("");
      setPhone("");
      toast.success("Takeaway order sent to the kitchen");
    } catch {
      toast.error("Could not create that order");
    } finally {
      setBusy(false);
    }
  }

  const live = orders.filter((o) => isLive(o.status));
  const done = orders.filter((o) => !isLive(o.status));

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <SectionHeading
        eyebrow="Front desk"
        title="Takeaway"
        description="Orders built here join the same kitchen queue as everything else."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        {/* ── builder ──────────────────────────────────────────────────── */}
        <Surface variant="flat" className="overflow-hidden">
          <div className="relative border-b border-line p-4">
            <Search
              className="pointer-events-none absolute left-7 top-1/2 size-3.5 -translate-y-1/2 text-ink-4"
              strokeWidth={1.5}
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu…"
              className="pl-9"
              aria-label="Search the menu"
            />
          </div>

          <div className="max-h-[32rem] overflow-y-auto">
            {categories.map((c) => {
              const catItems = shown.filter((i) => i.categoryId === c.id);
              if (!catItems.length) return null;
              return (
                <section key={c.id}>
                  <h3 className="sticky top-0 z-10 bg-surface-1/95 px-4 py-2 text-2xs font-medium uppercase tracking-luxe text-gold-300 backdrop-blur">
                    {c.name}
                  </h3>
                  <ul className="divide-y divide-line">
                    {catItems.map((i) => {
                      const qty = lines[i.id] ?? 0;
                      return (
                        <li
                          key={i.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 transition-colors",
                            qty > 0 && "bg-gold-500/5",
                          )}
                        >
                          <div className="dish-frame relative size-11 shrink-0 rounded-xs">
                            <DishImage src={i.imageUrl} alt={i.name} sizes="44px" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">{i.name}</p>
                            <p className="font-mono text-xs tabular text-ink-3">
                              {formatMoney(i.price)}
                            </p>
                          </div>
                          {qty > 0 ? (
                            <QuantityStepper
                              size="sm"
                              value={qty}
                              allowRemove
                              onChange={(q) =>
                                setLines((l) => ({ ...l, [i.id]: q }))
                              }
                            />
                          ) : (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Add ${i.name}`}
                              onClick={() =>
                                setLines((l) => ({ ...l, [i.id]: 1 }))
                              }
                            >
                              <Plus className="size-3.5" strokeWidth={2} />
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </Surface>

        {/* ── ticket ───────────────────────────────────────────────────── */}
        <Surface variant="gilded" className="h-fit p-5">
          <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
            New takeaway
          </p>

          <div className="mt-4 space-y-3">
            <Field label="Guest name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Who is collecting?"
              />
            </Field>
            <Field label="Phone" hint="Optional">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…"
                inputMode="tel"
              />
            </Field>
          </div>

          <div className="my-5 h-px bg-line" />

          {chosen.length ? (
            <ul className="space-y-2">
              {chosen.map(([id, q]) => {
                const item = items.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <li key={id} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink-2">
                      <span className="font-mono tabular text-ink-4">{q}×</span>{" "}
                      {item.name}
                    </span>
                    <span className="shrink-0 font-mono tabular text-ink-3">
                      {formatMoney(item.price * q)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-ink-4">
              Choose dishes from the menu.
            </p>
          )}

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-2xs uppercase tracking-luxe text-ink-3">
              Total
            </span>
            <span className="font-display text-2xl font-light tabular text-ink">
              {formatMoney(subtotal)}
            </span>
          </div>

          <Button
            variant="gold"
            className="mt-5 w-full"
            disabled={!chosen.length || !name.trim() || busy}
            onClick={submit}
          >
            Send to kitchen
          </Button>
        </Surface>
      </div>

      {/* ── queue ────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
          Awaiting collection · {live.length}
        </h2>
        {live.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {live.map((o) => (
              <Surface
                key={o.id}
                variant="elevated"
                data-status={o.status}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-light text-ink">
                      {o.customerName}
                    </p>
                    <p className="font-mono text-2xs uppercase tracking-label text-ink-4">
                      {formatSeq(o.seqNo)}
                      {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                    </p>
                  </div>
                  <StatusPill status={o.status} size="sm" />
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-mono tabular text-ink-2">
                    {formatMoney(o.subtotal)}
                  </span>
                  {o.placedAt ? <ElapsedTimer since={o.placedAt} /> : null}
                </div>

                {o.status === "ready" ? (
                  <Button
                    variant="gold"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => {
                      void advanceOrder(o.id, "served", "front_desk")
                        .then(() => toast.success("Handed over"))
                        .catch(() => toast.error("Could not complete that"));
                    }}
                  >
                    Hand over
                  </Button>
                ) : null}
              </Surface>
            ))}
          </div>
        ) : (
          <Surface variant="flat" className="mt-4">
            <EmptyState
              icon={Package}
              title="No takeaway orders waiting."
              description="Build one on the left and it goes straight to the pass."
            />
          </Surface>
        )}
      </section>

      {done.length ? (
        <section>
          <h2 className="text-2xs font-medium uppercase tracking-luxe text-ink-3">
            Collected earlier
          </h2>
          <Surface variant="flat" className="mt-4 divide-y divide-line">
            {done.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center gap-4 px-4 py-3">
                <span className="w-20 shrink-0 font-mono text-sm tabular text-ink-3">
                  {formatSeq(o.seqNo)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-2">
                  {o.customerName}
                </span>
                <span className="shrink-0 text-xs text-ink-4">
                  {formatTime(o.servedAt ?? o.placedAt)}
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-sm tabular text-ink-3">
                  {formatMoney(o.subtotal)}
                </span>
                <StatusPill status={o.status} size="sm" />
              </div>
            ))}
          </Surface>
        </section>
      ) : null}
    </div>
  );
}

function TakeawaySkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-44" />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Skeleton className="h-[32rem] rounded-md" />
        <Skeleton className="h-96 rounded-md" />
      </div>
    </div>
  );
}
