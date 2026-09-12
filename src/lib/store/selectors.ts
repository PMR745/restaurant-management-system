import { deriveTableStatus, pickUpsells } from "@/lib/domain/derive";
import { isLive, KDS_LANES } from "@/lib/domain/transitions";
import type { OrderStatus, TableStatus } from "@/lib/domain/enums";
import type {
  CustomerSession,
  ID,
  MenuCategory,
  MenuItem,
  Order,
  OrderEvent,
  OrderItem,
  Restaurant,
  RestaurantTable,
  StaffMember,
} from "@/lib/domain/types";
import { CATEGORY_IDS } from "@/lib/seed/demo-data";
import type { CartLine } from "./store";

/**
 * Pure derivation over the entity maps.
 *
 * These take maps explicitly rather than reading the store, because every one
 * of them builds NEW objects — and a store selector that returns a new object
 * on each call gives `useSyncExternalStore` a snapshot that never compares
 * equal, which is an infinite render loop rather than a subtle inefficiency.
 * `useShallow` does not save you either: it compares one level deep, and the
 * churn here is in the nested objects.
 *
 * So: components subscribe to the raw maps (stable references, only replaced
 * when that entity actually changes) and memoise these functions over them.
 * See store/hooks.ts — that is the only place these should be called from.
 */

type Map<T> = Record<ID, T>;

const alive = <T extends { deletedAt: string | null }>(rows: T[]): T[] =>
  rows.filter((r) => !r.deletedAt);

const list = <T>(map: Map<T>): T[] => Object.values(map);

/* ── menu ─────────────────────────────────────────────────────────────────── */

export function computeCategories(
  categories: Map<MenuCategory>,
  onlyActive = true,
): MenuCategory[] {
  return alive(list(categories))
    .filter((c) => (onlyActive ? c.isActive : true))
    .sort((a, b) => a.sortIndex - b.sortIndex);
}

export function computeMenuItems(items: Map<MenuItem>): MenuItem[] {
  return alive(list(items)).sort((a, b) => a.sortIndex - b.sortIndex);
}

export function computeSignatureItems(items: Map<MenuItem>): MenuItem[] {
  return computeMenuItems(items).filter(
    (i) => i.isSignature && i.availability === "available",
  );
}

export function computeUpsells(
  forItemIds: ID[],
  items: Map<MenuItem>,
): MenuItem[] {
  const all = computeMenuItems(items);
  const explicit = forItemIds.flatMap((id) => items[id]?.upsellIds ?? []);
  return pickUpsells(
    explicit,
    all,
    [CATEGORY_IDS.desserts, CATEGORY_IDS.bar],
    forItemIds,
    3,
  );
}

/* ── tables ───────────────────────────────────────────────────────────────── */

export interface TableView {
  table: RestaurantTable;
  status: TableStatus;
  waiter: StaffMember | undefined;
  orders: Order[];
  liveOrders: Order[];
  openedAt: string | null;
  guestCount: number | null;
  total: number;
}

export function computeTableViews(
  tables: Map<RestaurantTable>,
  orders: Map<Order>,
  sessions: Map<CustomerSession>,
  staff: Map<StaffMember>,
): TableView[] {
  const rows = alive(list(tables)).sort((a, b) => a.sortIndex - b.sortIndex);
  const allOrders = alive(list(orders));
  const openSessions = alive(list(sessions)).filter((s) => !s.closedAt);

  return rows.map((table) => {
    const session = openSessions.find((s) => s.tableId === table.id);
    const mine = allOrders
      .filter((o) => o.tableId === table.id && o.status !== "cancelled")
      .sort((a, b) => b.seqNo - a.seqNo);

    return {
      table,
      status: deriveTableStatus(table, session, mine),
      waiter: table.assignedWaiterId ? staff[table.assignedWaiterId] : undefined,
      orders: mine,
      liveOrders: mine.filter((o) => isLive(o.status)),
      openedAt: session?.startedAt ?? null,
      guestCount: session?.guestCount ?? null,
      total: mine.reduce((sum, o) => sum + o.subtotal, 0),
    };
  });
}

export function computeTableByCode(
  tables: Map<RestaurantTable>,
  code: string,
): RestaurantTable | undefined {
  return alive(list(tables)).find(
    (t) => t.code.toLowerCase() === code.toLowerCase(),
  );
}

/* ── orders ───────────────────────────────────────────────────────────────── */

export function computeOrders(orders: Map<Order>): Order[] {
  return alive(list(orders)).sort((a, b) => b.seqNo - a.seqNo);
}

export function computeOrderItems(
  orderItems: Map<OrderItem>,
  orderId: ID,
): OrderItem[] {
  return alive(list(orderItems))
    .filter((i) => i.orderId === orderId)
    .sort((a, b) => a.sortIndex - b.sortIndex);
}

export function computeOrderEvents(
  events: Map<OrderEvent>,
  orderId: ID,
): OrderEvent[] {
  return alive(list(events))
    .filter((e) => e.orderId === orderId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

/* ── kitchen ──────────────────────────────────────────────────────────────── */

export interface KitchenTicketView {
  order: Order;
  items: OrderItem[];
  tableCode: string | null;
  /** When this ticket's clock started — drives the aging colour. */
  since: string;
}

export type KdsLanes = Record<OrderStatus, KitchenTicketView[]>;

export function computeKdsLanes(
  orders: Map<Order>,
  orderItems: Map<OrderItem>,
  tables: Map<RestaurantTable>,
): KdsLanes {
  const lanes = Object.fromEntries(
    KDS_LANES.map((l) => [l, [] as KitchenTicketView[]]),
  ) as KdsLanes;

  const items = alive(list(orderItems));

  for (const order of alive(list(orders))) {
    if (!KDS_LANES.includes(order.status)) continue;
    lanes[order.status].push({
      order,
      items: items
        .filter((i) => i.orderId === order.id)
        .sort((a, b) => a.sortIndex - b.sortIndex),
      tableCode: order.tableId ? (tables[order.tableId]?.code ?? null) : null,
      since: order.placedAt ?? order.createdAt,
    });
  }

  // Oldest first: whatever has waited longest is what to cook next.
  for (const lane of KDS_LANES) {
    lanes[lane].sort((a, b) => a.since.localeCompare(b.since));
  }
  return lanes;
}

export function computeKitchenLoad(lanes: KdsLanes) {
  return {
    incoming: lanes.placed.length,
    active: lanes.accepted.length + lanes.preparing.length,
    ready: lanes.ready.length,
    total:
      lanes.placed.length +
      lanes.accepted.length +
      lanes.preparing.length +
      lanes.ready.length,
  };
}

/* ── waiter ───────────────────────────────────────────────────────────────── */

export interface DeliveryTask {
  order: Order;
  items: OrderItem[];
  tableCode: string;
  tableLabel: string;
  readyAt: string | null;
}

export function computeWaiterQueue(
  views: TableView[],
  orderItems: Map<OrderItem>,
  waiterId: ID | null,
) {
  const mine = waiterId
    ? views.filter((v) => v.table.assignedWaiterId === waiterId)
    : views;

  const items = alive(list(orderItems));
  const ready: DeliveryTask[] = [];
  const pending: DeliveryTask[] = [];

  for (const v of mine) {
    for (const order of v.liveOrders) {
      const task: DeliveryTask = {
        order,
        items: items
          .filter((i) => i.orderId === order.id)
          .sort((a, b) => a.sortIndex - b.sortIndex),
        tableCode: v.table.code,
        tableLabel: v.table.label,
        readyAt: order.readyAt,
      };
      if (order.status === "ready") ready.push(task);
      else pending.push(task);
    }
  }

  ready.sort((a, b) => (a.readyAt ?? "").localeCompare(b.readyAt ?? ""));
  return { tables: mine, ready, pending };
}

/* ── staff ────────────────────────────────────────────────────────────────── */

export function computeStaff(staff: Map<StaffMember>): StaffMember[] {
  return alive(list(staff)).sort((a, b) => a.name.localeCompare(b.name));
}

/* ── cart ─────────────────────────────────────────────────────────────────── */

export interface CartView {
  lines: Array<{
    item: MenuItem;
    quantity: number;
    specialInstructions: string;
    lineTotal: number;
  }>;
  count: number;
  subtotal: number;
}

export function computeCartView(
  cart: CartLine[],
  items: Map<MenuItem>,
): CartView {
  const lines = cart
    .map((l) => {
      const item = items[l.menuItemId];
      if (!item) return null;
      return {
        item,
        quantity: l.quantity,
        specialInstructions: l.specialInstructions,
        lineTotal: item.price * l.quantity,
      };
    })
    .filter((x): x is CartView["lines"][number] => x !== null);

  return {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
  };
}

/* ── service overview ─────────────────────────────────────────────────────── */

export function computeServiceStats(views: TableView[], orders: Map<Order>) {
  const live = alive(list(orders)).filter((o) => isLive(o.status));
  const seated = views.filter((v) => v.status !== "available");

  return {
    tablesSeated: seated.length,
    tablesTotal: views.length,
    covers: seated.reduce((n, v) => n + (v.guestCount ?? 0), 0),
    liveOrders: live.length,
    awaitingService: views.filter((v) => v.status === "ready").length,
    openValue: live.reduce((n, o) => n + o.subtotal, 0),
  };
}

export function computeRestaurant(
  restaurants: Map<Restaurant>,
): Restaurant | undefined {
  return alive(list(restaurants))[0];
}
