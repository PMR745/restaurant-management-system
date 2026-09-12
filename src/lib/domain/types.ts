import type {
  DietTag,
  ItemAvailability,
  OrderChannel,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  SpiceLevel,
  StaffRole,
  TableStatus,
  TableZone,
} from "./enums";

/** Always ISO 8601 UTC. A `Date` never enters store state — it breaks equality. */
export type ISODate = string;
export type ID = string;

/**
 * Every synced record carries these.
 *
 * `rev` / `updatedAt` / `updatedBy` are the LWW conflict inputs, and `lastOpId`
 * is what makes echo suppression possible on Supabase, where a realtime payload
 * has no notion of who wrote it.
 *
 * Nothing is ever hard-deleted — `deletedAt` only. That keeps the demo
 * vandalisable but not destroyable, and sidesteps REPLICA IDENTITY FULL.
 */
export interface SyncBase {
  id: ID;
  restaurantId: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
  rev: number;
  updatedBy: string;
  lastOpId: ID | null;
  deletedAt: ISODate | null;
}

export interface Restaurant extends SyncBase {
  slug: string;
  name: string;
  tagline: string;
  heroImageUrl: string;
  currency: "INR";
  timezone: string;
}

export interface RestaurantTable extends SyncBase {
  /** The human code printed on the table tent — `T07`, not a UUID. */
  code: string;
  label: string;
  seats: number;
  zone: TableZone;
  assignedWaiterId: ID | null;
  /** Admin escape hatch. `null` means derive — see derive.ts. */
  statusOverride: TableStatus | null;
  sortIndex: number;
  /** Percentage coordinates on the floor map canvas, so it scales. */
  x: number;
  y: number;
  shape: "round" | "square" | "booth";
}

export interface MenuCategory extends SyncBase {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string;
  sortIndex: number;
  isActive: boolean;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: string[];
}

export interface MenuItem extends SyncBase {
  categoryId: ID;
  name: string;
  description: string;
  /** Minor units (paise). Integers only — never a float in money. */
  price: number;
  imageUrl: string;
  availability: ItemAvailability;
  prepTimeMinutes: number;
  nutrition: Nutrition | null;
  dietTags: DietTag[];
  spiceLevel: SpiceLevel;
  isSignature: boolean;
  /** Explicit cross-sell. Empty falls back to a deterministic rule. */
  upsellIds: ID[];
  sortIndex: number;
}

export interface StaffMember extends SyncBase {
  name: string;
  role: StaffRole;
  initials: string;
  isOnShift: boolean;
}

export interface CustomerSession extends SyncBase {
  tableId: ID | null;
  startedAt: ISODate;
  closedAt: ISODate | null;
  guestCount: number | null;
  guestName: string | null;
  lastActivityAt: ISODate;
  /** Throttled write. This is what makes a table read `ordering`. */
  cartItemCount: number;
  deviceLabel: string;
}

export interface OrderItem extends SyncBase {
  orderId: ID;
  menuItemId: ID;
  /** Denormalised so order history survives menu edits. */
  nameSnapshot: string;
  unitPriceSnapshot: number;
  imageUrlSnapshot: string;
  quantity: number;
  specialInstructions: string | null;
  status: OrderItemStatus;
  servedAt: ISODate | null;
  sortIndex: number;
}

export interface Order extends SyncBase {
  /** Display only — allocation differs per adapter. Never key anything on it. */
  seqNo: number;
  type: OrderType;
  channel: OrderChannel;
  status: OrderStatus;
  tableId: ID | null;
  sessionId: ID | null;
  waiterId: ID | null;
  customerName: string | null;
  customerPhone: string | null;
  externalRef: string | null;
  itemCount: number;
  /** Order value readout, not a bill. Minor units. */
  subtotal: number;
  note: string | null;
  placedAt: ISODate | null;
  acceptedAt: ISODate | null;
  preparingAt: ISODate | null;
  readyAt: ISODate | null;
  servedAt: ISODate | null;
  cancelledAt: ISODate | null;
  cancelReason: string | null;
}

export interface OrderEvent extends SyncBase {
  orderId: ID;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actor: string;
  actorId: ID | null;
  note: string | null;
  at: ISODate;
}

/** The shape both adapters read and write. */
export interface Snapshot {
  restaurants: Restaurant[];
  restaurant_tables: RestaurantTable[];
  menu_categories: MenuCategory[];
  menu_items: MenuItem[];
  staff: StaffMember[];
  customer_sessions: CustomerSession[];
  orders: Order[];
  order_items: OrderItem[];
  order_events: OrderEvent[];
}

export type EntityName = keyof Snapshot;
export type EntityOf<K extends EntityName> = Snapshot[K][number];
export type AnyEntity = Snapshot[EntityName][number];

/** FK-safe write order. Parents before children, always. */
export const ENTITY_ORDER: EntityName[] = [
  "restaurants",
  "staff",
  "restaurant_tables",
  "menu_categories",
  "menu_items",
  "customer_sessions",
  "orders",
  "order_items",
  "order_events",
];
