"use client";

import * as React from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Check, ConciergeBell } from "lucide-react";
import { toast } from "sonner";
import { advanceOrder, markItemServed } from "@/lib/store/actions";
import { useWaiterQueue, useWaiters } from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { formatMoney, formatSeq, pluralize } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeading, Surface } from "@/components/ui/surface";
import { ElapsedTimer } from "@/components/domain/elapsed";
import { TableTile } from "@/components/domain/table-tile";
import { HydrationGate } from "@/components/providers";

export function WaiterBoard() {
  return (
    <HydrationGate fallback={<WaiterSkeleton />}>
      <WaiterContent />
    </HydrationGate>
  );
}

function WaiterContent() {
  const waiters = useWaiters();
  const identity = useRmsStore((s) => s.identity);

  // A signed-in waiter sees their own tables. Without a session (the demo
  // launcher drops you straight in) you pick who you are, which is also how
  // you demonstrate assignment without logging in and out repeatedly.
  const [picked, setPicked] = React.useState<string>("all");
  const waiterId =
    identity?.role === "waiter" && identity.staffId
      ? identity.staffId
      : picked === "all"
        ? null
        : picked;

  const { tables, ready, pending } = useWaiterQueue(waiterId);

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <SectionHeading
        eyebrow="Service"
        title={
          waiterId
            ? (waiters.find((w) => w.id === waiterId)?.name ?? "My section")
            : "All sections"
        }
        description="Dishes appear here the moment the kitchen marks them ready."
        action={
          identity?.role === "waiter" ? null : (
            <SelectField
              ariaLabel="Waiter"
              className="w-48"
              value={picked}
              onValueChange={setPicked}
              options={[
                { value: "all", label: "All sections" },
                ...waiters.map((w) => ({ value: w.id, label: w.name })),
              ]}
            />
          )
        }
      />

      {/* ── ready to run ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
          Ready to serve · {ready.length}
        </h2>

        {ready.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {ready.map((task) => (
                <m.div
                  key={task.order.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                >
                  <Surface
                    variant="gilded"
                    data-status="ready"
                    data-order={task.order.seqNo}
                    className="flex h-full flex-col p-4"
                  >
                    <header className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-xl font-light text-ink">
                          {task.tableCode}
                        </p>
                        <p className="text-2xs uppercase tracking-label text-ink-4">
                          {task.tableLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-2xs uppercase tracking-label text-ink-3">
                          {formatSeq(task.order.seqNo)}
                        </p>
                        {task.readyAt ? (
                          <ElapsedTimer
                            since={task.readyAt}
                            className="text-md"
                          />
                        ) : null}
                      </div>
                    </header>

                    <ul className="mt-4 flex-1 space-y-2">
                      {task.items
                        .filter((i) => i.status !== "served" && i.status !== "cancelled")
                        .map((i) => (
                          <li
                            key={i.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="min-w-0 flex-1 truncate text-sm text-ink-2">
                              <span className="font-mono tabular text-gold-300">
                                {i.quantity}×
                              </span>{" "}
                              {i.nameSnapshot}
                            </span>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label={`Mark ${i.nameSnapshot} served`}
                              onClick={() => {
                                void markItemServed(i.id, "waiter").catch(() =>
                                  toast.error("Could not update that item"),
                                );
                              }}
                            >
                              <Check className="size-3.5" strokeWidth={2} />
                            </Button>
                          </li>
                        ))}
                    </ul>

                    <Button
                      variant="gold"
                      className="mt-4 w-full"
                      onClick={() => {
                        void advanceOrder(task.order.id, "served", "waiter")
                          .then(() =>
                            toast.success(
                              `${task.tableCode} served`,
                              { description: formatSeq(task.order.seqNo) },
                            ),
                          )
                          .catch(() => toast.error("Could not mark that served"));
                      }}
                    >
                      Serve all
                    </Button>
                  </Surface>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <Surface variant="flat" className="mt-4">
            <EmptyState
              icon={ConciergeBell}
              title="Nothing waiting at the pass."
              description="When the kitchen marks an order ready, it appears here immediately."
            />
          </Surface>
        )}
      </section>

      {/* ── still cooking ───────────────────────────────────────────────── */}
      {pending.length ? (
        <section>
          <h2 className="text-2xs font-medium uppercase tracking-luxe text-ink-3">
            Still with the kitchen · {pending.length}
          </h2>
          <Surface variant="flat" className="mt-4 divide-y divide-line">
            {pending.map((task) => (
              <div
                key={task.order.id}
                className="flex items-center gap-4 px-4 py-3"
              >
                <span className="w-12 shrink-0 font-display text-lg font-light text-ink">
                  {task.tableCode}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-3">
                  {task.items.length} {pluralize(task.items.length, "dish", "dishes")}
                  {" · "}
                  {formatMoney(task.order.subtotal)}
                </span>
                <StatusPill status={task.order.status} size="sm" />
              </div>
            ))}
          </Surface>
        </section>
      ) : null}

      {/* ── my tables ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-2xs font-medium uppercase tracking-luxe text-ink-3">
          {waiterId ? "My tables" : "All tables"} · {tables.length}
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tables.map((v) => (
            <TableTile key={v.table.id} view={v} className="min-h-32" />
          ))}
        </div>
      </section>
    </div>
  );
}

function WaiterSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-md" />
        ))}
      </div>
    </div>
  );
}
