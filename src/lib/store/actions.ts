"use client";

import type { Actor, OrderStatus } from "@/lib/domain/enums";
import {
  canTransition,
  STATUS_TIMESTAMP,
  TransitionError,
} from "@/lib/domain/transitions";
import type {
  CustomerSession,
  ID,
  MenuItem,
  Order,
  OrderEvent,
  OrderItem,
  RestaurantTable,
} from "@/lib/domain/types";
import { RESTAURANT_ID } from "@/lib/seed/demo-data";
import { engine } from "@/lib/sync/engine";
import { nowIso, uuid } from "@/lib/utils/id";
import { rms } from "./store";
import { computeOrderItems, computeOrders } from "./selectors";

/**
 * Every write in the app goes through a function in this file.
 *
 * Two invariants that live here and nowhere else:
 *
 *  - Status changes are guarded by `canTransition`, so a screen can never
 *    invent an edge (and a stale button on a screen someone left open for an
 *    hour can't move an order backwards).
 *  - Derived writes happen in the action that CAUSED them, never in a
 *    reaction to a sync event. If "when the last item is served, serve the
 *    order" lived in a subscribe handler, every open tab would run it and race.
 */

const base = () => ({
  restaurantId: RESTAURANT_ID,
  createdAt: nowIso(),
  deletedAt: null,
});

/* ── sessions ─────────────────────────────────────────────────────────────── */

export async function openSession(
  tableId: ID,
  guestCount: number | null,
  deviceLabel: string,
): Promise<ID> {
  const state = rms.get();

  // Rejoin rather than duplicate: locking a phone mid-meal and coming back
  // should land you in the same session, not a second one on the same table.
  const existing = Object.values(state.customer_sessions).find(
    (s) => s.tableId === tableId && !s.closedAt && !s.deletedAt,
  );
  if (existing) {
    state.setSessionId(existing.id);
    return existing.id;
  }

  const id = uuid();
  const at = nowIso();
  const session: Omit<CustomerSession, "updatedAt" | "rev" | "updatedBy" | "lastOpId"> = {
    ...base(),
    id,
    tableId,
    startedAt: at,
    closedAt: null,
    guestCount,
    guestName: null,
    lastActivityAt: at,
    cartItemCount: 0,
    deviceLabel,
  };

  await engine.mutate([
    { entity: "customer_sessions", kind: "insert", id, patch: session },
  ]);
  state.setSessionId(id);
  return id;
}

/**
 * Throttled — un-throttled, every `+` tap becomes a network write and a
 * broadcast to every staff screen in the building.
 */
let cartCountTimer: ReturnType<typeof setTimeout> | null = null;
export function syncCartCount(sessionId: ID | null, count: number) {
  if (!sessionId) return;
  if (cartCountTimer) clearTimeout(cartCountTimer);
  cartCountTimer = setTimeout(() => {
    void engine.mutate([
      {
        entity: "customer_sessions",
        kind: "update",
        id: sessionId,
        patch: { cartItemCount: count, lastActivityAt: nowIso() },
      },
    ]);
  }, 2000);
}

export async function closeSession(sessionId: ID) {
  const at = nowIso();
  await engine.mutate([
    {
      entity: "customer_sessions",
      kind: "update",
      id: sessionId,
      patch: { closedAt: at, cartItemCount: 0 },
    },
  ]);
}

/** "Clear table": close the session so the tile returns to available. */
export async function clearTable(tableId: ID) {
  const state = rms.get();
  const session = Object.values(state.customer_sessions).find(
    (s) => s.tableId === tableId && !s.closedAt && !s.deletedAt,
  );
  const at = nowIso();
  const writes = [];
  if (session) {
    writes.push({
      entity: "customer_sessions" as const,
      kind: "update" as const,
      id: session.id,
      patch: { closedAt: at, cartItemCount: 0 },
    });
  }
  writes.push({
    entity: "restaurant_tables" as const,
    kind: "update" as const,
    id: tableId,
    patch: { statusOverride: null },
  });
  await engine.mutate(writes);
}

/* ── orders ───────────────────────────────────────────────────────────────── */

function nextSeqNo(): number {
  const orders = Object.values(rms.get().orders);
  return orders.reduce((max, o) => Math.max(max, o.seqNo), 0) + 1;
}

export interface PlaceOrderInput {
  type: Order["type"];
  channel: Order["channel"];
  tableId: ID | null;
  sessionId: ID | null;
  lines: Array<{ item: MenuItem; quantity: number; specialInstructions: string }>;
  customerName?: string | null;
  customerPhone?: string | null;
  externalRef?: string | null;
  note?: string | null;
  actor: Actor;
}

/**
 * Always creates a NEW order — an extra round of drinks never reopens an order
 * the kitchen has already cooked. Tables aggregate orders; tickets stay
 * immutable once they're on the pass.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<ID> {
  const orderId = uuid();
  const at = nowIso();

  const state = rms.get();
  const table = input.tableId ? state.restaurant_tables[input.tableId] : undefined;

  const itemCount = input.lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = input.lines.reduce(
    (n, l) => n + l.item.price * l.quantity,
    0,
  );

  const order: Partial<Order> = {
    ...base(),
    id: orderId,
    seqNo: nextSeqNo(),
    type: input.type,
    channel: input.channel,
    status: "placed",
    tableId: input.tableId,
    sessionId: input.sessionId,
    // Snapshot the waiter at placement — reassigning the table later should
    // not silently move an order that is already on someone's list.
    waiterId: table?.assignedWaiterId ?? null,
    customerName: input.customerName ?? null,
    customerPhone: input.customerPhone ?? null,
    externalRef: input.externalRef ?? null,
    itemCount,
    subtotal,
    note: input.note ?? null,
    placedAt: at,
    acceptedAt: null,
    preparingAt: null,
    readyAt: null,
    servedAt: null,
    cancelledAt: null,
    cancelReason: null,
  };

  const writes: Parameters<typeof engine.mutate>[0] = [
    { entity: "orders", kind: "insert", id: orderId, patch: order },
  ];

  input.lines.forEach((line, idx) => {
    const id = uuid();
    const item: Partial<OrderItem> = {
      ...base(),
      id,
      orderId,
      menuItemId: line.item.id,
      nameSnapshot: line.item.name,
      unitPriceSnapshot: line.item.price,
      imageUrlSnapshot: line.item.imageUrl,
      quantity: line.quantity,
      specialInstructions: line.specialInstructions || null,
      status: "pending",
      servedAt: null,
      sortIndex: idx,
    };
    writes.push({ entity: "order_items", kind: "insert", id, patch: item });
  });

  writes.push(makeEvent(orderId, null, "placed", input.actor, at));

  await engine.mutate(writes);
  return orderId;
}

function makeEvent(
  orderId: ID,
  from: OrderStatus | null,
  to: OrderStatus,
  actor: Actor,
  at: string,
  note?: string,
) {
  const id = uuid();
  const event: Partial<OrderEvent> = {
    ...base(),
    id,
    orderId,
    fromStatus: from,
    toStatus: to,
    actor,
    actorId: rms.get().identity?.staffId ?? null,
    note: note ?? null,
    at,
  };
  return { entity: "order_events" as const, kind: "insert" as const, id, patch: event };
}

/**
 * The one place an order changes status.
 *
 * Guards the edge, stamps the timestamp, writes the audit event in the SAME
 * batch (the guest's timeline reads from order_events, so a split batch would
 * show a status with no corresponding step), and cascades item statuses.
 */
export async function advanceOrder(
  orderId: ID,
  to: OrderStatus,
  actor: Actor,
  note?: string,
): Promise<void> {
  const state = rms.get();
  const order = state.orders[orderId];
  if (!order) throw new Error(`No order ${orderId}`);

  if (!canTransition(order.status, to, actor)) {
    throw new TransitionError(order.status, to, actor);
  }

  const at = nowIso();
  const stampKey = STATUS_TIMESTAMP[to];
  const patch: Record<string, unknown> = { status: to };
  if (stampKey) patch[stampKey] = at;
  if (to === "cancelled" && note) patch.cancelReason = note;

  const writes: Parameters<typeof engine.mutate>[0] = [
    { entity: "orders", kind: "update", id: orderId, patch },
  ];

  // Item cascade: the kitchen works on the whole ticket, so items follow.
  const items = computeOrderItems(state.order_items, orderId);
  const cascade: Record<string, OrderItem["status"] | undefined> = {
    preparing: "preparing",
    ready: "ready",
    served: "served",
    cancelled: "cancelled",
  };
  const itemStatus = cascade[to];
  if (itemStatus) {
    for (const item of items) {
      if (item.status === "cancelled" || item.status === itemStatus) continue;
      writes.push({
        entity: "order_items",
        kind: "update",
        id: item.id,
        patch: {
          status: itemStatus,
          ...(itemStatus === "served" ? { servedAt: at } : {}),
        },
      });
    }
  }

  writes.push(makeEvent(orderId, order.status, to, actor, at, note));
  await engine.mutate(writes);
}

/**
 * Serving one item at a time. When the last outstanding item lands, the order
 * advances itself — computed here, once, rather than raced between clients.
 */
export async function markItemServed(
  orderItemId: ID,
  actor: Actor,
): Promise<void> {
  const state = rms.get();
  const item = state.order_items[orderItemId];
  if (!item) return;

  const at = nowIso();
  const siblings = computeOrderItems(state.order_items, item.orderId);
  const order = state.orders[item.orderId];

  const writes: Parameters<typeof engine.mutate>[0] = [
    {
      entity: "order_items",
      kind: "update",
      id: orderItemId,
      patch: { status: "served", servedAt: at },
    },
  ];

  const allServed = siblings.every(
    (s) =>
      s.id === orderItemId ||
      s.status === "served" ||
      s.status === "cancelled",
  );

  if (allServed && order && canTransition(order.status, "served", actor)) {
    writes.push({
      entity: "orders",
      kind: "update",
      id: order.id,
      patch: { status: "served", servedAt: at },
    });
    writes.push(makeEvent(order.id, order.status, "served", actor, at));
  }

  await engine.mutate(writes);
}

export async function cancelOrder(orderId: ID, reason: string, actor: Actor) {
  await advanceOrder(orderId, "cancelled", actor, reason);
}

/* ── tables ───────────────────────────────────────────────────────────────── */

export async function assignWaiter(tableId: ID, waiterId: ID | null) {
  await engine.mutate([
    {
      entity: "restaurant_tables",
      kind: "update",
      id: tableId,
      patch: { assignedWaiterId: waiterId },
    },
  ]);
}

export async function setTableOverride(
  tableId: ID,
  statusOverride: RestaurantTable["statusOverride"],
) {
  await engine.mutate([
    { entity: "restaurant_tables", kind: "update", id: tableId, patch: { statusOverride } },
  ]);
}

/* ── menu management ──────────────────────────────────────────────────────── */

export async function setItemAvailability(
  itemId: ID,
  availability: MenuItem["availability"],
) {
  await engine.mutate([
    { entity: "menu_items", kind: "update", id: itemId, patch: { availability } },
  ]);
}

export async function saveMenuItem(
  itemId: ID | null,
  patch: Partial<MenuItem>,
): Promise<ID> {
  const id = itemId ?? uuid();
  await engine.mutate([
    {
      entity: "menu_items",
      kind: itemId ? "update" : "insert",
      id,
      patch: itemId ? patch : { ...base(), id, ...patch },
    },
  ]);
  return id;
}

export async function deleteMenuItem(itemId: ID) {
  await engine.mutate([
    { entity: "menu_items", kind: "update", id: itemId, patch: { deletedAt: nowIso() } },
  ]);
}

export async function saveCategory(
  categoryId: ID | null,
  patch: Partial<{ name: string; description: string; slug: string; imageUrl: string; sortIndex: number; isActive: boolean }>,
): Promise<ID> {
  const id = categoryId ?? uuid();
  await engine.mutate([
    {
      entity: "menu_categories",
      kind: categoryId ? "update" : "insert",
      id,
      patch: categoryId ? patch : { ...base(), id, isActive: true, ...patch },
    },
  ]);
  return id;
}

export async function deleteCategory(categoryId: ID) {
  const state = rms.get();
  const at = nowIso();
  const writes: Parameters<typeof engine.mutate>[0] = [
    { entity: "menu_categories", kind: "update", id: categoryId, patch: { deletedAt: at } },
  ];
  // Orphaned items would vanish from every category rail but still appear in
  // search — tombstone them with the category.
  for (const item of Object.values(state.menu_items)) {
    if (item.categoryId === categoryId && !item.deletedAt) {
      writes.push({ entity: "menu_items", kind: "update", id: item.id, patch: { deletedAt: at } });
    }
  }
  await engine.mutate(writes);
}

/* ── the Zomato simulator ─────────────────────────────────────────────────── */

const ZOMATO_NAMES = [
  "Ishaan Gupta",
  "Riya Menon",
  "Aryan Bhatt",
  "Sana Kapoor",
  "Vikram Iyer",
  "Nikita Rao",
];

/**
 * Builds an online order from whatever is currently available and pushes it
 * through the same `placeOrder` path a guest uses — so the kitchen genuinely
 * cannot tell the difference, which is the entire point of the simulation.
 */
export async function injectOnlineOrder(): Promise<ID | null> {
  const state = rms.get();
  const available = Object.values(state.menu_items).filter(
    (i) => !i.deletedAt && i.availability === "available",
  );
  if (!available.length) return null;

  const count = 1 + Math.floor(Math.random() * 3);
  const chosen = new Map<ID, number>();
  for (let i = 0; i < count; i++) {
    const pick = available[Math.floor(Math.random() * available.length)]!;
    chosen.set(pick.id, (chosen.get(pick.id) ?? 0) + 1);
  }

  const seq = computeOrders(state.orders).length + 1;
  return placeOrder({
    type: "online",
    channel: "zomato",
    tableId: null,
    sessionId: null,
    actor: "system",
    customerName: ZOMATO_NAMES[Math.floor(Math.random() * ZOMATO_NAMES.length)]!,
    externalRef: `ZOM-${String(48000 + seq * 37).padStart(5, "0")}`,
    lines: [...chosen.entries()].map(([id, quantity]) => ({
      item: state.menu_items[id]!,
      quantity,
      specialInstructions: "",
    })),
  });
}
