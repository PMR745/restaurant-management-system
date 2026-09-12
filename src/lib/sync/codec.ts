/**
 * camelCase (TypeScript) <-> snake_case (Postgres).
 *
 * Generic rather than per-entity: the domain has ~90 fields across 9 entities
 * and a hand-written mapping for each would drift the first time someone adds
 * a column. The only special cases are the two `*Status` fields on
 * order_events, which map to reserved-ish column names.
 */

const SPECIAL_TO_DB: Record<string, string> = {
  fromStatus: "from_status",
  toStatus: "to_status",
};

const SPECIAL_FROM_DB: Record<string, string> = {
  from_status: "fromStatus",
  to_status: "toStatus",
};

export function toSnake(key: string): string {
  return SPECIAL_TO_DB[key] ?? key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function toCamel(key: string): string {
  return (
    SPECIAL_FROM_DB[key] ?? key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
  );
}

/**
 * `restaurants` is the tenant root: every other table has a `restaurant_id`
 * foreign key, but the restaurant itself does not — its own `id` IS the tenant.
 *
 * The domain model does not make that distinction, because `Restaurant`
 * extends `SyncBase` like everything else and so carries a `restaurantId`.
 * That mismatch has to be absorbed at the boundary: strip the column on the
 * way out, synthesise it on the way back in. Doing it here rather than in the
 * adapter keeps the round trip lossless and in one place.
 */
const TENANT_ROOT = "restaurants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToEntity<T>(row: Record<string, any>, entity?: string): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  if (entity === TENANT_ROOT && out.restaurantId === undefined) {
    out.restaurantId = out.id;
  }
  return out as T;
}

export function entityToRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: Record<string, any>,
  table?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(entity)) {
    // The server owns these — sending them would fight the touch_row trigger.
    if (k === "updatedAt" || k === "rev") continue;
    if (v === undefined) continue;
    const column = toSnake(k);
    if (table === TENANT_ROOT && column === "restaurant_id") continue;
    out[column] = v;
  }
  return out;
}
