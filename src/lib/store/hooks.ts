"use client";

import * as React from "react";
import type { ID, Order } from "@/lib/domain/types";
import {
  computeCartView,
  computeCategories,
  computeKdsLanes,
  computeKitchenLoad,
  computeMenuItems,
  computeOrderEvents,
  computeOrderItems,
  computeOrders,
  computeRestaurant,
  computeServiceStats,
  computeSignatureItems,
  computeStaff,
  computeTableByCode,
  computeTableViews,
  computeUpsells,
  computeWaiterQueue,
} from "./selectors";
import { useRmsStore } from "./store";

/**
 * The read API for every screen.
 *
 * The rule these hooks exist to enforce: a zustand selector must return a
 * REFERENTIALLY STABLE value. Anything that builds a new array or object per
 * call makes `useSyncExternalStore` see a changed snapshot on every render,
 * and React responds with an infinite update loop — not a slow screen, a dead
 * one.
 *
 * So each hook subscribes only to raw entity maps (which the store replaces
 * only when that entity actually changes) and memoises the derivation over
 * them. Deriving in `useMemo` rather than in the selector is what makes the
 * whole thing stable.
 */

/* ── menu ─────────────────────────────────────────────────────────────────── */

export function useCategories(onlyActive = true) {
  const categories = useRmsStore((s) => s.menu_categories);
  return React.useMemo(
    () => computeCategories(categories, onlyActive),
    [categories, onlyActive],
  );
}

export function useMenuItems() {
  const items = useRmsStore((s) => s.menu_items);
  return React.useMemo(() => computeMenuItems(items), [items]);
}

export function useMenuItem(id: ID) {
  return useRmsStore((s) => s.menu_items[id]);
}

export function useSignatureItems() {
  const items = useRmsStore((s) => s.menu_items);
  return React.useMemo(() => computeSignatureItems(items), [items]);
}

export function useUpsells(forItemIds: ID[]) {
  const items = useRmsStore((s) => s.menu_items);
  // Call sites build the id array inline, so its identity churns every render.
  // Key the memo on the contents instead.
  const key = forItemIds.join(",");
  return React.useMemo(
    () => computeUpsells(key ? key.split(",") : [], items),
    [key, items],
  );
}

/* ── tables ───────────────────────────────────────────────────────────────── */

export function useTableViews() {
  const tables = useRmsStore((s) => s.restaurant_tables);
  const orders = useRmsStore((s) => s.orders);
  const sessions = useRmsStore((s) => s.customer_sessions);
  const staff = useRmsStore((s) => s.staff);
  return React.useMemo(
    () => computeTableViews(tables, orders, sessions, staff),
    [tables, orders, sessions, staff],
  );
}

export function useTableByCode(code: string) {
  const tables = useRmsStore((s) => s.restaurant_tables);
  return React.useMemo(() => computeTableByCode(tables, code), [tables, code]);
}

/* ── orders ───────────────────────────────────────────────────────────────── */

export function useOrders() {
  const orders = useRmsStore((s) => s.orders);
  return React.useMemo(() => computeOrders(orders), [orders]);
}

export function useOrder(id: ID) {
  return useRmsStore((s) => s.orders[id]);
}

export function useOrdersByType(type: Order["type"]) {
  const orders = useRmsStore((s) => s.orders);
  return React.useMemo(
    () => computeOrders(orders).filter((o) => o.type === type),
    [orders, type],
  );
}

export function useOrderItems(orderId: ID) {
  const orderItems = useRmsStore((s) => s.order_items);
  return React.useMemo(
    () => computeOrderItems(orderItems, orderId),
    [orderItems, orderId],
  );
}

export function useOrderEvents(orderId: ID) {
  const events = useRmsStore((s) => s.order_events);
  return React.useMemo(
    () => computeOrderEvents(events, orderId),
    [events, orderId],
  );
}

/* ── kitchen ──────────────────────────────────────────────────────────────── */

export function useKdsLanes() {
  const orders = useRmsStore((s) => s.orders);
  const orderItems = useRmsStore((s) => s.order_items);
  const tables = useRmsStore((s) => s.restaurant_tables);
  return React.useMemo(
    () => computeKdsLanes(orders, orderItems, tables),
    [orders, orderItems, tables],
  );
}

export function useKitchenLoad() {
  const lanes = useKdsLanes();
  return React.useMemo(() => computeKitchenLoad(lanes), [lanes]);
}

/* ── waiter ───────────────────────────────────────────────────────────────── */

export function useWaiterQueue(waiterId: ID | null) {
  const views = useTableViews();
  const orderItems = useRmsStore((s) => s.order_items);
  return React.useMemo(
    () => computeWaiterQueue(views, orderItems, waiterId),
    [views, orderItems, waiterId],
  );
}

/* ── staff ────────────────────────────────────────────────────────────────── */

export function useStaff() {
  const staff = useRmsStore((s) => s.staff);
  return React.useMemo(() => computeStaff(staff), [staff]);
}

export function useWaiters() {
  const staff = useStaff();
  return React.useMemo(
    () => staff.filter((m) => m.role === "waiter"),
    [staff],
  );
}

/* ── cart ─────────────────────────────────────────────────────────────────── */

export function useCartView() {
  const cart = useRmsStore((s) => s.cart);
  const items = useRmsStore((s) => s.menu_items);
  return React.useMemo(() => computeCartView(cart, items), [cart, items]);
}

/** Just the badge number — cheaper than building the whole cart view. */
export function useCartCount() {
  return useRmsStore((s) =>
    s.cart.reduce((n, l) => n + l.quantity, 0),
  );
}

/* ── overview ─────────────────────────────────────────────────────────────── */

export function useServiceStats() {
  const views = useTableViews();
  const orders = useRmsStore((s) => s.orders);
  return React.useMemo(
    () => computeServiceStats(views, orders),
    [views, orders],
  );
}

export function useRestaurant() {
  const restaurants = useRmsStore((s) => s.restaurants);
  return React.useMemo(() => computeRestaurant(restaurants), [restaurants]);
}
