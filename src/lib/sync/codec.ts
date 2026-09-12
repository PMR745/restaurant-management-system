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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToEntity<T>(row: Record<string, any>): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function entityToRow(entity: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(entity)) {
    // The server owns these — sending them would fight the touch_row trigger.
    if (k === "updatedAt" || k === "rev") continue;
    out[toSnake(k)] = v;
  }
  return out;
}
