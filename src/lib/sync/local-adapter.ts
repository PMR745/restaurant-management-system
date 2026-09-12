import { ENTITY_ORDER, type AnyEntity, type EntityName, type Snapshot } from "@/lib/domain/types";
import { SEED_VERSION } from "@/lib/seed/demo-data";
import { nowIso } from "@/lib/utils/id";
import type {
  AdapterContext,
  ApplyResult,
  ChangeEvent,
  ConnectionState,
  Mutation,
  SyncAdapter,
} from "./adapter";
import { makeBus, type Bus } from "./bus";

/**
 * localStorage + BroadcastChannel. Zero configuration, works offline, syncs
 * every tab of the same browser instantly.
 *
 * Storage layout is one key per entity rather than one blob for everything —
 * rewriting a 2MB JSON string on every quantity tap is what makes localStorage
 * demos feel laggy.
 */

const EMPTY_SNAPSHOT: Snapshot = {
  restaurants: [],
  restaurant_tables: [],
  menu_categories: [],
  menu_items: [],
  staff: [],
  customer_sessions: [],
  orders: [],
  order_items: [],
  order_events: [],
};

interface BusMessage {
  from: string;
  events: ChangeEvent[];
}

export class LocalAdapter implements SyncAdapter {
  readonly kind = "local" as const;

  private ctx!: AdapterContext;
  private prefix = "";
  private bus: Bus<BusMessage> | null = null;
  private unbus: (() => void) | null = null;
  private statusHandlers = new Set<
    (s: ConnectionState, detail?: string) => void
  >();
  private changeHandlers = new Set<(e: ChangeEvent[]) => void>();

  // Incoming events are coalesced on a short debounce so a batched write from
  // another tab lands as one render rather than nine.
  private inbox: ChangeEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  async init(ctx: AdapterContext): Promise<void> {
    this.ctx = ctx;
    this.prefix = `rms:v1:${ctx.restaurantSlug}`;
    this.bus = makeBus<BusMessage>(`rms:${ctx.restaurantSlug}`);
    this.unbus = this.bus.subscribe((msg) => {
      if (msg.from === this.ctx.clientId) return; // belt and braces
      this.inbox.push(...msg.events);
      this.scheduleFlush();
    });
    this.emitStatus("live");
  }

  async dispose(): Promise<void> {
    this.unbus?.();
    this.bus?.close();
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.statusHandlers.clear();
    this.changeHandlers.clear();
  }

  /* ── storage ──────────────────────────────────────────────────────────── */

  private key(entity: EntityName) {
    return `${this.prefix}:${entity}`;
  }

  private read<K extends EntityName>(entity: K): Snapshot[K] {
    try {
      const raw = window.localStorage.getItem(this.key(entity));
      return raw ? (JSON.parse(raw) as Snapshot[K]) : ([] as unknown as Snapshot[K]);
    } catch {
      return [] as unknown as Snapshot[K];
    }
  }

  private write<K extends EntityName>(entity: K, rows: Snapshot[K]): void {
    try {
      window.localStorage.setItem(this.key(entity), JSON.stringify(rows));
    } catch (err) {
      this.emitStatus("degraded", "Local storage is full or unavailable.");
      throw err;
    }
  }

  async snapshot(): Promise<Snapshot> {
    if (typeof window === "undefined") return EMPTY_SNAPSHOT;
    const out = {} as Snapshot;
    for (const entity of ENTITY_ORDER) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[entity] = this.read(entity);
    }
    return out;
  }

  async seedIfEmpty(seed: Snapshot): Promise<boolean> {
    const metaKey = `${this.prefix}:meta`;
    let meta: { seedVersion?: string } = {};
    try {
      meta = JSON.parse(window.localStorage.getItem(metaKey) ?? "{}");
    } catch {
      /* treat as unseeded */
    }
    if (meta.seedVersion === SEED_VERSION) return false;

    this.writeAll(seed);
    window.localStorage.setItem(
      metaKey,
      JSON.stringify({ seedVersion: SEED_VERSION, seededAt: nowIso() }),
    );
    return true;
  }

  private writeAll(seed: Snapshot) {
    for (const entity of ENTITY_ORDER) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.write(entity, (seed as any)[entity]);
    }
  }

  async reset(seed: Snapshot): Promise<void> {
    this.writeAll(seed);
    window.localStorage.setItem(
      `${this.prefix}:meta`,
      JSON.stringify({ seedVersion: SEED_VERSION, seededAt: nowIso() }),
    );
    // Other tabs can't diff a wholesale replace, so tell them to re-read.
    this.bus?.post({ from: this.ctx.clientId, events: [] });
  }

  /* ── writes ───────────────────────────────────────────────────────────── */

  async apply(mutations: Mutation[]): Promise<ApplyResult> {
    const applied: ChangeEvent[] = [];
    const failed: ApplyResult["failed"] = [];

    // Group by entity so each localStorage key is read and written once per
    // batch rather than once per mutation.
    const byEntity = new Map<EntityName, Mutation[]>();
    for (const m of mutations) {
      const list = byEntity.get(m.entity) ?? [];
      list.push(m);
      byEntity.set(m.entity, list);
    }

    const at = nowIso();

    for (const entity of ENTITY_ORDER) {
      const batch = byEntity.get(entity);
      if (!batch) continue;

      const rows = this.read(entity) as AnyEntity[];
      const index = new Map(rows.map((r, i) => [r.id, i]));

      for (const m of batch) {
        try {
          const existingIdx = index.get(m.id);
          const existing =
            existingIdx === undefined ? undefined : rows[existingIdx];

          if (m.kind === "insert" && existing) {
            // An insert of a row that already exists is an idempotent retry.
            applied.push({ entity, kind: "update", record: existing });
            continue;
          }
          if (m.kind === "update" && !existing) {
            failed.push({ opId: m.opId, reason: `No ${entity} row ${m.id}` });
            continue;
          }

          const next = {
            ...(existing ?? {}),
            ...m.patch,
            id: m.id,
            updatedAt: at,
            rev: (existing?.rev ?? 0) + 1,
            updatedBy: m.clientId,
            lastOpId: m.opId,
          } as AnyEntity;

          if (existingIdx === undefined) {
            index.set(m.id, rows.length);
            rows.push(next);
          } else {
            rows[existingIdx] = next;
          }
          applied.push({ entity, kind: m.kind, record: next });
        } catch (err) {
          failed.push({
            opId: m.opId,
            reason: err instanceof Error ? err.message : "Write failed",
          });
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.write(entity, rows as any);
    }

    if (applied.length) {
      this.bus?.post({ from: this.ctx.clientId, events: applied });
    }

    return { ok: failed.length === 0, applied, failed };
  }

  /* ── subscriptions ────────────────────────────────────────────────────── */

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
      if (!events.length) {
        // An empty batch is the "I replaced everything" signal from reset().
        for (const h of this.changeHandlers) h([]);
        return;
      }
      for (const h of this.changeHandlers) h(events);
    }, 16);
  }
}
