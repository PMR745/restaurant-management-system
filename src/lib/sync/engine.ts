"use client";

import type { AnyEntity, EntityName, ID, Snapshot } from "@/lib/domain/types";
import { buildSeed, RESTAURANT_ID, RESTAURANT_SLUG } from "@/lib/seed/demo-data";
import { rms } from "@/lib/store/store";
import { nowIso, uuid } from "@/lib/utils/id";
import type {
  AdapterKind,
  Mutation,
  SyncAdapter,
} from "./adapter";
import { createAdapter, pickAdapterKind } from "./factory";

/**
 * The sync engine. Owns the adapter, drives hydration, and is the ONLY thing
 * that writes to the entity maps in the store.
 *
 * Three rules that keep this from becoming a distributed-systems project:
 *
 *  1. Optimistic write, then merge the authoritative post-image back. The UI
 *     never waits on the network to feel responsive.
 *  2. Echo suppression by `lastOpId`. Without it, our own write comes back
 *     over the wire and clobbers a newer local edit.
 *  3. Re-snapshot on every reconnect. Supabase Realtime has no replay — a
 *     dropped socket silently loses events, and re-reading 300 rows costs
 *     nothing. This is the single line that separates "solid" from
 *     "the kitchen board is mysteriously stale".
 *
 * And one prohibition: never write from inside a subscribe handler. Derived
 * writes belong in the action that caused them, otherwise every open tab
 * reacts to the same event and you get a write storm.
 */

const CLIENT_ID_KEY = "rms:v1:clientId";

function getClientId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const fresh = uuid();
    window.localStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  } catch {
    return uuid(); // private mode — a per-session id still works
  }
}

class SyncEngine {
  private adapter: SyncAdapter | null = null;
  private starting: Promise<void> | null = null;
  private clientId = "server";
  private teardown: Array<() => void> = [];

  get kind(): AdapterKind {
    return this.adapter?.kind ?? pickAdapterKind();
  }

  get ready(): boolean {
    return this.adapter !== null;
  }

  async start(): Promise<void> {
    if (this.starting) return this.starting;
    this.starting = this.doStart();
    return this.starting;
  }

  private async doStart(): Promise<void> {
    this.clientId = getClientId();
    rms.get().setConnection("connecting");

    try {
      const adapter = await createAdapter();
      this.adapter = adapter;
      rms.get().setAdapterKind(adapter.kind);

      await adapter.init({
        restaurantId: RESTAURANT_ID,
        restaurantSlug: RESTAURANT_SLUG,
        clientId: this.clientId,
      });

      await adapter.seedIfEmpty(buildSeed());
      const snap = await adapter.snapshot();
      rms.get().hydrate(snap);

      this.teardown.push(
        adapter.subscribe((events) => {
          // An empty batch is the "everything was replaced" signal.
          if (events.length === 0) {
            void this.resnapshot();
            return;
          }
          const pending = rms.get().pendingOps;
          const accepted = events
            .filter((e) => !(e.record.lastOpId && pending.has(e.record.lastOpId)))
            .map((e) => ({
              entity: e.entity as EntityName,
              record: e.record as AnyEntity,
            }));
          if (accepted.length) rms.get().mergeMany(accepted);
        }),
      );

      this.teardown.push(
        adapter.onStatusChange((state, detail) => {
          rms.get().setConnection(state, detail);
          // Realtime has no replay, so a fresh connection means a fresh read.
          if (state === "live") void this.resnapshot();
        }),
      );

      rms.get().setConnection("live");
    } catch (err) {
      rms.get().setConnection(
        "error",
        err instanceof Error ? err.message : "Could not start sync.",
      );
      // Still mark hydrated so screens render their empty states rather than
      // spinning forever on a skeleton.
      rms.get().hydrate(emptySnapshot());
      throw err;
    }
  }

  private resnapshotting = false;

  private async resnapshot(): Promise<void> {
    if (!this.adapter || this.resnapshotting) return;
    this.resnapshotting = true;
    try {
      const snap = await this.adapter.snapshot();
      const entries: Array<{ entity: EntityName; record: AnyEntity }> = [];
      for (const entity of Object.keys(snap) as EntityName[]) {
        for (const record of snap[entity] as AnyEntity[]) {
          entries.push({ entity, record });
        }
      }
      rms.get().mergeMany(entries);
    } catch {
      /* a failed re-read is not fatal; the next event or reconnect retries */
    } finally {
      this.resnapshotting = false;
    }
  }

  /**
   * The single write path. Applies optimistically, then reconciles.
   */
  async mutate(
    specs: Array<{
      entity: EntityName;
      kind: "insert" | "update";
      id: ID;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      patch: Record<string, any>;
    }>,
  ): Promise<void> {
    if (!this.adapter) await this.start();
    const adapter = this.adapter;
    if (!adapter) return;

    const at = nowIso();
    const state = rms.get();
    const mutations: Mutation[] = [];
    const optimistic: Array<{ entity: EntityName; record: AnyEntity }> = [];

    for (const spec of specs) {
      const opId = uuid();
      mutations.push({
        opId,
        entity: spec.entity,
        kind: spec.kind,
        id: spec.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        patch: { ...spec.patch, id: spec.id } as any,
        clientId: this.clientId,
        at,
      });

      const current = (state[spec.entity] as Record<ID, AnyEntity>)[spec.id];
      optimistic.push({
        entity: spec.entity,
        record: {
          ...(current ?? {}),
          ...spec.patch,
          id: spec.id,
          updatedAt: at,
          rev: (current?.rev ?? 0) + 1,
          updatedBy: this.clientId,
          lastOpId: opId,
        } as AnyEntity,
      });
      state.addPending(opId);
    }

    rms.get().mergeMany(optimistic);

    try {
      const result = await adapter.apply(mutations);
      if (result.applied.length) {
        rms.get().mergeMany(
          result.applied.map((e) => ({
            entity: e.entity as EntityName,
            record: e.record as AnyEntity,
          })),
        );
      }
      if (result.failed.length) {
        rms.get().setConnection(
          "degraded",
          result.failed[0]?.reason ?? "A change could not be saved.",
        );
        // Pull authoritative state back over the failed optimism.
        void this.resnapshot();
      }
    } catch (err) {
      rms.get().setConnection(
        "degraded",
        err instanceof Error ? err.message : "A change could not be saved.",
      );
      void this.resnapshot();
      throw err;
    } finally {
      rms.get().clearPending(mutations.map((m) => m.opId));
    }
  }

  async resetDemo(): Promise<void> {
    if (!this.adapter) await this.start();
    if (!this.adapter) return;
    const seed = buildSeed();
    await this.adapter.reset(seed);
    rms.get().hydrate(seed);
    rms.get().clearCart();
  }

  async stop(): Promise<void> {
    for (const fn of this.teardown) fn();
    this.teardown = [];
    await this.adapter?.dispose();
    this.adapter = null;
    this.starting = null;
  }
}

function emptySnapshot(): Snapshot {
  return {
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
}

export const engine = new SyncEngine();
