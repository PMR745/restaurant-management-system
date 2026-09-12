import type { EntityName, EntityOf, ID, ISODate, Snapshot } from "@/lib/domain/types";

/**
 * The pluggability seam.
 *
 * Deliberately tiny: no query(), no filters, no pagination. The adapter moves
 * WHOLE RECORDS and nothing else; every join, filter and sort happens in
 * selectors above the store. The whole restaurant fits comfortably in memory
 * (12 tables, 36 items, a few hundred orders), so paging would be complexity
 * with no payoff — and, more importantly, a narrow surface is what keeps the
 * two implementations honestly interchangeable. A richer interface would let
 * the Supabase adapter quietly grow capabilities the local one cannot match,
 * and then the local mode silently degrades.
 */

export type AdapterKind = "local" | "supabase";

/** Soft deletes only, so a removal is just another update. */
export type ChangeKind = "insert" | "update";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "live"
  | "degraded"
  | "error";

export interface Mutation<K extends EntityName = EntityName> {
  /** Generated client-side and echoed back on the row — see engine.ts. */
  opId: ID;
  entity: K;
  kind: ChangeKind;
  id: ID;
  /** Full record on insert, sparse patch on update. Never carries updatedAt/rev. */
  patch: Partial<EntityOf<K>> & { id: ID };
  clientId: string;
  at: ISODate;
}

export interface ChangeEvent<K extends EntityName = EntityName> {
  entity: K;
  kind: ChangeKind;
  /** Always the full post-image, never a diff. */
  record: EntityOf<K>;
}

export interface ApplyResult {
  ok: boolean;
  /** Authoritative post-images. The engine merges these over its optimistic copy. */
  applied: ChangeEvent[];
  failed: Array<{ opId: ID; reason: string }>;
}

export interface AdapterContext {
  restaurantId: ID;
  restaurantSlug: string;
  /** Stable per browser profile. Used for echo suppression and LWW tiebreaks. */
  clientId: string;
}

export interface SyncAdapter {
  readonly kind: AdapterKind;

  init(ctx: AdapterContext): Promise<void>;
  dispose(): Promise<void>;

  /** Full scoped read. Called on start and after every reconnect. */
  snapshot(): Promise<Snapshot>;

  /** Idempotent bootstrap. Resolves true only if it actually wrote. */
  seedIfEmpty(seed: Snapshot): Promise<boolean>;

  apply(mutations: Mutation[]): Promise<ApplyResult>;

  /** One firehose for the whole restaurant. Events arrive coalesced. */
  subscribe(handler: (events: ChangeEvent[]) => void): () => void;

  onStatusChange(
    handler: (state: ConnectionState, detail?: string) => void,
  ): () => void;

  /** Wipe and re-seed. Backs the admin "Reset demo data" button. */
  reset(seed: Snapshot): Promise<void>;
}
