import type { Actor, OrderStatus } from "./enums";

/**
 * The order state machine.
 *
 *   draft ─place→ placed ─accept→ accepted ─start→ preparing ─ready→ ready ─serve→ served
 *                                                                                    ✓
 *   any non-terminal ──────────────────────────────────────────────→ cancelled
 *
 * Two tables: which edges exist, and who is allowed to walk them. Enforcement
 * lives in one place (actions/orders.ts) so a screen can never quietly invent
 * a transition.
 */

export const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  draft: ["placed", "cancelled"],
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

type Edge = `${OrderStatus}->${OrderStatus}`;

export const ACTORS: Partial<Record<Edge, Actor[]>> = {
  "draft->placed": ["customer", "front_desk", "system"], // system = the Zomato simulator
  "draft->cancelled": ["customer", "admin"],
  "placed->accepted": ["kitchen", "admin"],
  "placed->cancelled": ["customer", "kitchen", "admin"], // guests may cancel pre-accept only
  "accepted->preparing": ["kitchen", "admin"],
  "accepted->cancelled": ["admin"],
  "preparing->ready": ["kitchen", "admin"],
  "preparing->cancelled": ["admin"],
  "ready->served": ["waiter", "front_desk", "admin"], // front_desk = takeaway handover
  "ready->cancelled": ["admin"],
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: Actor,
): boolean {
  if (!ALLOWED[from].includes(to)) return false;
  return (ACTORS[`${from}->${to}` as Edge] ?? []).includes(actor);
}

export class TransitionError extends Error {
  constructor(
    public from: OrderStatus,
    public to: OrderStatus,
    public actor: Actor,
  ) {
    super(`${actor} may not move an order from ${from} to ${to}.`);
    this.name = "TransitionError";
  }
}

/** The timestamp column each status stamps on arrival. */
export const STATUS_TIMESTAMP: Partial<Record<OrderStatus, string>> = {
  placed: "placedAt",
  accepted: "acceptedAt",
  preparing: "preparingAt",
  ready: "readyAt",
  served: "servedAt",
  cancelled: "cancelledAt",
};

/** The guest-facing tracking timeline. Cancelled is handled separately. */
export const GUEST_TIMELINE: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
  "served",
];

/** The kitchen display lanes, left to right. */
export const KDS_LANES: OrderStatus[] = [
  "placed",
  "accepted",
  "preparing",
  "ready",
];

/** The button a kitchen lane shows, and where it leads. */
export const KDS_ACTION: Record<string, { label: string; to: OrderStatus }> = {
  placed: { label: "Accept", to: "accepted" },
  accepted: { label: "Start preparing", to: "preparing" },
  preparing: { label: "Mark ready", to: "ready" },
  ready: { label: "Awaiting service", to: "served" },
};

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED[status].length === 0;
}

/** Live = on the floor right now. Drives table derivation and the KDS. */
export function isLive(status: OrderStatus): boolean {
  return status !== "draft" && status !== "cancelled" && status !== "served";
}
