import type { TableStatus } from "./enums";
import type { CustomerSession, Order, RestaurantTable } from "./types";

/**
 * Table status is NEVER persisted. It is a pure function of the open session
 * plus the table's live orders.
 *
 * This is the single most important modelling call in the build: because the
 * floor map *derives* rather than *stores*, "kitchen taps Ready → the tile
 * turns orchid" falls out for free. The alternative — writing a status onto
 * the table whenever an order changes — means two writers per action, races
 * between tabs, and a floor map that drifts out of sync with reality.
 *
 * Order of the array below is the priority order: the most urgent thing
 * happening at a table is what staff need to see.
 */
const ACTION_PRIORITY: TableStatus[] = [
  "ready", // someone must walk food over — highest urgency
  "preparing",
  "ordering",
  "served",
  "occupied",
  "available",
];

export function deriveTableStatus(
  table: RestaurantTable,
  session: CustomerSession | undefined,
  orders: Order[],
): TableStatus {
  if (table.statusOverride) return table.statusOverride;

  const live = orders.filter(
    (o) => o.status !== "cancelled" && o.status !== "draft",
  );
  const candidates = new Set<TableStatus>();

  if (live.some((o) => o.status === "ready")) candidates.add("ready");
  if (live.some((o) => o.status === "accepted" || o.status === "preparing"))
    candidates.add("preparing");

  // `ordering` means either an order is placed but unacknowledged, or the
  // guest is actively composing one on their phone.
  if (live.some((o) => o.status === "placed")) candidates.add("ordering");
  if (session && session.cartItemCount > 0 && live.length === 0)
    candidates.add("ordering");

  // `served` only once everything live is served AND the guest is still seated.
  if (live.length > 0 && live.every((o) => o.status === "served"))
    candidates.add("served");

  if (session) candidates.add("occupied");
  candidates.add("available");

  return ACTION_PRIORITY.find((s) => candidates.has(s))!;
}

/**
 * Upsell suggestions.
 *
 * Explicit `upsellIds` first; otherwise fall back to signature items from the
 * dessert and bar categories. Deterministic ordering matters — random upsells
 * look broken the second time you demo the same flow.
 */
export function pickUpsells<
  T extends {
    id: string;
    categoryId: string;
    isSignature: boolean;
    availability: string;
    sortIndex: number;
  },
>(
  explicitIds: string[],
  allItems: T[],
  fallbackCategoryIds: string[],
  excludeIds: string[],
  limit = 3,
): T[] {
  const excluded = new Set(excludeIds);
  const byId = new Map(allItems.map((i) => [i.id, i]));

  const explicit = explicitIds
    .map((id) => byId.get(id))
    .filter(
      (i): i is T =>
        !!i && i.availability === "available" && !excluded.has(i.id),
    );

  if (explicit.length >= limit) return explicit.slice(0, limit);

  const seen = new Set(explicit.map((i) => i.id));
  const fallback = allItems
    .filter(
      (i) =>
        fallbackCategoryIds.includes(i.categoryId) &&
        i.isSignature &&
        i.availability === "available" &&
        !excluded.has(i.id) &&
        !seen.has(i.id),
    )
    .sort((a, b) => a.sortIndex - b.sortIndex);

  return [...explicit, ...fallback].slice(0, limit);
}
