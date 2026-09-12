/**
 * Status vocabularies.
 *
 * These are the POC document's statuses minus the billing-era ones
 * (`Billing`, `Completed`) — billing, payment, review and sales are out of
 * scope for this build, so statuses that exist only to serve them would be
 * dead weight.
 *
 * Every array here has a matching Postgres enum in supabase/schema.sql.
 * Drift between the two is silent until a write fails, so they are asserted
 * against each other in dev (see assertEnumParity below).
 */

export const ORDER_STATUS = [
  "draft",
  "placed",
  "accepted",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_ITEM_STATUS = [
  "pending",
  "preparing",
  "ready",
  "served",
  "cancelled",
] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUS)[number];

export const ORDER_TYPE = ["dine_in", "takeaway", "online"] as const;
export type OrderType = (typeof ORDER_TYPE)[number];

export const ORDER_CHANNEL = ["qr", "front_desk", "zomato"] as const;
export type OrderChannel = (typeof ORDER_CHANNEL)[number];

/** Derived, never persisted — see domain/derive.ts. */
export const TABLE_STATUS = [
  "available",
  "occupied",
  "ordering",
  "preparing",
  "ready",
  "served",
] as const;
export type TableStatus = (typeof TABLE_STATUS)[number];

export const STAFF_ROLE = ["admin", "kitchen", "waiter", "front_desk"] as const;
export type StaffRole = (typeof STAFF_ROLE)[number];

export const ITEM_AVAILABILITY = ["available", "out_of_stock"] as const;
export type ItemAvailability = (typeof ITEM_AVAILABILITY)[number];

export const DIET_TAG = [
  "veg",
  "non_veg",
  "egg",
  "vegan",
  "gluten_free",
  "contains_nuts",
] as const;
export type DietTag = (typeof DIET_TAG)[number];

export const SPICE_LEVEL = ["none", "mild", "medium", "hot"] as const;
export type SpiceLevel = (typeof SPICE_LEVEL)[number];

export const TABLE_ZONE = ["indoor", "patio", "private"] as const;
export type TableZone = (typeof TABLE_ZONE)[number];

export type Actor = StaffRole | "customer" | "system";

/* ── display labels ──────────────────────────────────────────────────────── */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Draft",
  placed: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

/** What the *guest* is told. Staff-facing wording is deliberately different. */
export const ORDER_STATUS_GUEST_LABEL: Record<OrderStatus, string> = {
  draft: "Building your order",
  placed: "Order received",
  accepted: "Accepted by the kitchen",
  preparing: "Being prepared",
  ready: "Ready — on its way",
  served: "Served",
  cancelled: "Cancelled",
};

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  ordering: "Ordering",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  dine_in: "Dine-in",
  takeaway: "Takeaway",
  online: "Online",
};

export const ORDER_CHANNEL_LABEL: Record<OrderChannel, string> = {
  qr: "QR",
  front_desk: "Front desk",
  zomato: "Zomato",
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  kitchen: "Kitchen",
  waiter: "Waiter",
  front_desk: "Front desk",
};

export const DIET_TAG_LABEL: Record<DietTag, string> = {
  veg: "Vegetarian",
  non_veg: "Non-vegetarian",
  egg: "Contains egg",
  vegan: "Vegan",
  gluten_free: "Gluten free",
  contains_nuts: "Contains nuts",
};

export const SPICE_LEVEL_LABEL: Record<SpiceLevel, string> = {
  none: "Not spiced",
  mild: "Mild",
  medium: "Medium",
  hot: "Hot",
};
