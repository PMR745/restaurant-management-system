import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  ENTITY_ORDER,
  type AnyEntity,
  type EntityName,
  type Snapshot,
} from "@/lib/domain/types";
import { RESTAURANT_ID } from "@/lib/seed/demo-data";
import type {
  AdapterContext,
  ApplyResult,
  ChangeEvent,
  ConnectionState,
  Mutation,
  SyncAdapter,
} from "./adapter";
import { entityToRow, rowToEntity } from "./codec";

/**
 * Postgres + Realtime. Gives true cross-device sync — a guest's phone and the
 * kitchen screen on the pass see the same service.
 *
 * Two things about Supabase Realtime that are easy to get wrong and both
 * produce a board that looks broken without throwing:
 *
 *  - Realtime enforces RLS on DELIVERY. The permissive SELECT policies in
 *    schema.sql are load-bearing; tighten them and the socket goes quiet.
 *  - A table only emits events if it is in the `supabase_realtime`
 *    publication. Verify with:
 *      select * from pg_publication_tables where pubname = 'supabase_realtime';
 */

/** Tables that carry live service state. `restaurants` changes ~never. */
const LIVE_TABLES: EntityName[] = [
  "restaurant_tables",
  "menu_categories",
  "menu_items",
  "staff",
  "customer_sessions",
  "orders",
  "order_items",
  "order_events",
];

export class SupabaseAdapter implements SyncAdapter {
  readonly kind = "supabase" as const;

  private client!: SupabaseClient;
  private ctx!: AdapterContext;
  private channel: RealtimeChannel | null = null;
  private statusHandlers = new Set<
    (s: ConnectionState, detail?: string) => void
  >();
  private changeHandlers = new Set<(e: ChangeEvent[]) => void>();

  private inbox: ChangeEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  async init(ctx: AdapterContext): Promise<void> {
    this.ctx = ctx;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    this.client = createClient(url, key, {
      auth: { persistSession: false },
      // Throttled so the Zomato auto-simulator cannot stampede the socket.
      realtime: { params: { eventsPerSecond: 20 } },
    });

    this.emitStatus("connecting");
    this.openChannel();
  }

  private openChannel() {
    const channel = this.client.channel(`rms:${this.ctx.restaurantId}`);

    for (const table of LIVE_TABLES) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `restaurant_id=eq.${this.ctx.restaurantId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null;
          if (!row || !row.id) return;
          this.inbox.push({
            entity: table,
            kind: payload.eventType === "INSERT" ? "insert" : "update",
            record: rowToEntity<AnyEntity>(row),
          });
          this.scheduleFlush();
        },
      );
    }

    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        // Fires on every reconnect too. The engine re-snapshots on 'live',
        // which is how we cover the gap Realtime does not replay.
        this.emitStatus("live");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.emitStatus(
          "degraded",
          err?.message ?? "Realtime connection interrupted. Retrying…",
        );
      } else if (status === "CLOSED") {
        this.emitStatus("degraded", "Realtime connection closed.");
      }
    });

    this.channel = channel;
  }

  async dispose(): Promise<void> {
    if (this.channel) await this.client.removeChannel(this.channel);
    this.channel = null;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.statusHandlers.clear();
    this.changeHandlers.clear();
  }

  async snapshot(): Promise<Snapshot> {
    const results = await Promise.all(
      ENTITY_ORDER.map(async (entity) => {
        const { data, error } = await this.client
          .from(entity)
          .select("*")
          .eq(entity === "restaurants" ? "id" : "restaurant_id", RESTAURANT_ID);
        if (error) throw new Error(`${entity}: ${error.message}`);
        return [entity, (data ?? []).map((r) => rowToEntity(r))] as const;
      }),
    );
    return Object.fromEntries(results) as unknown as Snapshot;
  }

  async seedIfEmpty(seed: Snapshot): Promise<boolean> {
    const { data, error } = await this.client
      .from("restaurants")
      .select("id")
      .eq("id", RESTAURANT_ID)
      .maybeSingle();

    if (error) throw new Error(`Seed check failed: ${error.message}`);
    if (data) return false; // already seeded — leave any edits alone

    // FK-safe order matters here; parents must land before children.
    for (const entity of ENTITY_ORDER) {
      const rows = (seed[entity] as AnyEntity[]).map(entityToRow);
      if (!rows.length) continue;
      const { error: upsertError } = await this.client
        .from(entity)
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (upsertError)
        throw new Error(`Seeding ${entity} failed: ${upsertError.message}`);
    }
    return true;
  }

  async apply(mutations: Mutation[]): Promise<ApplyResult> {
    const applied: ChangeEvent[] = [];
    const failed: ApplyResult["failed"] = [];

    const byEntity = new Map<EntityName, Mutation[]>();
    for (const m of mutations) {
      const list = byEntity.get(m.entity) ?? [];
      list.push(m);
      byEntity.set(m.entity, list);
    }

    for (const entity of ENTITY_ORDER) {
      const batch = byEntity.get(entity);
      if (!batch) continue;

      // An update here is a partial upsert, which Postgres cannot express
      // directly — so merge the patch over the current row first.
      const rows: Record<string, unknown>[] = [];
      for (const m of batch) {
        rows.push(
          entityToRow({
            ...m.patch,
            id: m.id,
            restaurant_id: undefined,
            restaurantId: RESTAURANT_ID,
            updatedBy: m.clientId,
            lastOpId: m.opId,
          }),
        );
      }

      const { data, error } = await this.client
        .from(entity)
        .upsert(rows, { onConflict: "id" })
        .select();

      if (error) {
        for (const m of batch) failed.push({ opId: m.opId, reason: error.message });
        continue;
      }
      for (const row of data ?? []) {
        applied.push({
          entity,
          kind: "update",
          record: rowToEntity<AnyEntity>(row),
        });
      }
    }

    return { ok: failed.length === 0, applied, failed };
  }

  /**
   * Soft-reset: there is no DELETE policy, by design. Rows that aren't part of
   * the seed are tombstoned; seed rows are restored to canonical values.
   */
  async reset(seed: Snapshot): Promise<void> {
    const seedIds = new Set<string>();
    for (const entity of ENTITY_ORDER)
      for (const r of seed[entity] as AnyEntity[]) seedIds.add(r.id);

    const current = await this.snapshot();
    const at = new Date().toISOString();

    for (const entity of [...ENTITY_ORDER].reverse()) {
      const strays = (current[entity] as AnyEntity[])
        .filter((r) => !seedIds.has(r.id) && !r.deletedAt)
        .map((r) => ({ id: r.id, deleted_at: at, restaurant_id: RESTAURANT_ID }));
      if (strays.length) {
        await this.client.from(entity).upsert(strays, { onConflict: "id" });
      }
    }

    for (const entity of ENTITY_ORDER) {
      const rows = (seed[entity] as AnyEntity[]).map(entityToRow);
      if (rows.length) await this.client.from(entity).upsert(rows, { onConflict: "id" });
    }
  }

  subscribe(handler: (events: ChangeEvent[]) => void): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  onStatusChange(
    handler: (s: ConnectionState, detail?: string) => void,
  ): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  private emitStatus(s: ConnectionState, detail?: string) {
    for (const h of this.statusHandlers) h(s, detail);
  }

  private scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      const events = this.inbox;
      this.inbox = [];
      if (!events.length) return;
      for (const h of this.changeHandlers) h(events);
    }, 16);
  }
}
