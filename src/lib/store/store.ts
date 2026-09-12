"use client";

import { create } from "zustand";
import type { AdapterKind, ConnectionState } from "@/lib/sync/adapter";
import type {
  AnyEntity,
  EntityName,
  ID,
  MenuItem,
  Snapshot,
} from "@/lib/domain/types";
import { ENTITY_ORDER } from "@/lib/domain/types";

/* ── cart lives only on the guest's device; it is never synced ───────────── */

export interface CartLine {
  menuItemId: ID;
  quantity: number;
  specialInstructions: string;
}

export interface StaffIdentity {
  role: "admin" | "kitchen" | "waiter" | "front_desk";
  staffId: ID | null;
  name: string;
}

type EntityMaps = { [K in EntityName]: Record<ID, Snapshot[K][number]> };

export interface RmsState extends EntityMaps {
  /* sync */
  hydrated: boolean;
  connection: ConnectionState;
  adapterKind: AdapterKind | null;
  pendingOps: Set<ID>;
  lastError: string | null;

  /* local-only */
  cart: CartLine[];
  sessionId: ID | null;
  identity: StaffIdentity | null;

  /* actions — all called by the engine or by lib/store/actions/* */
  hydrate: (snap: Snapshot) => void;
  mergeRecord: (entity: EntityName, record: AnyEntity) => void;
  mergeMany: (entries: Array<{ entity: EntityName; record: AnyEntity }>) => void;
  setConnection: (c: ConnectionState, detail?: string) => void;
  setAdapterKind: (k: AdapterKind) => void;
  addPending: (id: ID) => void;
  clearPending: (ids: ID[]) => void;
  setIdentity: (i: StaffIdentity | null) => void;

  setSessionId: (id: ID | null) => void;
  replaceCart: (lines: CartLine[]) => void;
  addToCart: (menuItemId: ID, quantity: number, note?: string) => void;
  setCartQuantity: (menuItemId: ID, quantity: number) => void;
  setCartNote: (menuItemId: ID, note: string) => void;
  clearCart: () => void;
}

const emptyMaps = (): EntityMaps =>
  Object.fromEntries(ENTITY_ORDER.map((e) => [e, {}])) as EntityMaps;

/**
 * Last-write-wins at RECORD granularity. Field-level merge would be the
 * "correct" answer for a collaborative editor, but two people editing the same
 * menu item inside the same second is not a problem this POC has, and
 * record-level LWW is the only rule that stays comprehensible when you are
 * debugging a live board at 11pm.
 */
function shouldAccept(existing: AnyEntity | undefined, incoming: AnyEntity) {
  if (!existing) return true;
  if (incoming.rev > existing.rev) return true;
  if (incoming.rev < existing.rev) return false;
  if (incoming.updatedAt > existing.updatedAt) return true;
  if (incoming.updatedAt < existing.updatedAt) return false;
  return incoming.updatedBy > existing.updatedBy; // deterministic tiebreak
}

export const useRmsStore = create<RmsState>()((set) => ({
  ...emptyMaps(),

  hydrated: false,
  connection: "idle",
  adapterKind: null,
  pendingOps: new Set<ID>(),
  lastError: null,

  cart: [],
  sessionId: null,
  identity: null,

  hydrate: (snap) =>
    set(() => {
      const maps = emptyMaps();
      for (const entity of ENTITY_ORDER) {
        const rows = snap[entity] as AnyEntity[];
        const map: Record<ID, AnyEntity> = {};
        for (const r of rows) map[r.id] = r;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (maps as any)[entity] = map;
      }
      return { ...maps, hydrated: true };
    }),

  mergeRecord: (entity, record) =>
    set((state) => {
      const map = state[entity] as Record<ID, AnyEntity>;
      if (!shouldAccept(map[record.id], record)) return {};
      return { [entity]: { ...map, [record.id]: record } } as Partial<RmsState>;
    }),

  mergeMany: (entries) =>
    set((state) => {
      const touched: Partial<Record<EntityName, Record<ID, AnyEntity>>> = {};
      for (const { entity, record } of entries) {
        const map =
          touched[entity] ?? ({ ...(state[entity] as Record<ID, AnyEntity>) });
        if (!shouldAccept(map[record.id], record)) {
          touched[entity] = map;
          continue;
        }
        map[record.id] = record;
        touched[entity] = map;
      }
      return touched as Partial<RmsState>;
    }),

  setConnection: (connection, detail) =>
    set({ connection, lastError: detail ?? null }),
  setAdapterKind: (adapterKind) => set({ adapterKind }),

  addPending: (id) =>
    set((s) => {
      const next = new Set(s.pendingOps);
      next.add(id);
      return { pendingOps: next };
    }),

  clearPending: (ids) =>
    set((s) => {
      if (!ids.length) return {};
      const next = new Set(s.pendingOps);
      for (const id of ids) next.delete(id);
      return { pendingOps: next };
    }),

  setIdentity: (identity) => set({ identity }),

  /* ── cart ───────────────────────────────────────────────────────────── */

  setSessionId: (sessionId) => set({ sessionId }),

  /** Used when restoring a cart a guest left behind on this device. */
  replaceCart: (cart) => set({ cart }),

  addToCart: (menuItemId, quantity, note) =>
    set((s) => {
      const idx = s.cart.findIndex((l) => l.menuItemId === menuItemId);
      if (idx === -1) {
        return {
          cart: [
            ...s.cart,
            { menuItemId, quantity, specialInstructions: note ?? "" },
          ],
        };
      }
      const cart = [...s.cart];
      cart[idx] = {
        ...cart[idx]!,
        quantity: cart[idx]!.quantity + quantity,
        specialInstructions: note || cart[idx]!.specialInstructions,
      };
      return { cart };
    }),

  setCartQuantity: (menuItemId, quantity) =>
    set((s) => ({
      cart:
        quantity <= 0
          ? s.cart.filter((l) => l.menuItemId !== menuItemId)
          : s.cart.map((l) =>
              l.menuItemId === menuItemId ? { ...l, quantity } : l,
            ),
    })),

  setCartNote: (menuItemId, specialInstructions) =>
    set((s) => ({
      cart: s.cart.map((l) =>
        l.menuItemId === menuItemId ? { ...l, specialInstructions } : l,
      ),
    })),

  clearCart: () => set({ cart: [] }),
}));

/**
 * Components should read through the hooks in store/hooks.ts, not from here.
 * A selector that builds a new array or object per call gives
 * `useSyncExternalStore` a snapshot that never compares equal, which React
 * turns into an infinite render loop. Direct use of `useRmsStore` is fine only
 * for stable slices: an entity map, a primitive, or an action.
 */

/** For non-React callers (the sync engine, action modules). */
export const rms = {
  get: useRmsStore.getState,
  set: useRmsStore.setState,
};

/** Menu items sorted, with out-of-stock last. Shared by several screens. */
export function sortMenuItems(items: MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => {
    const aOut = a.availability === "out_of_stock" ? 1 : 0;
    const bOut = b.availability === "out_of_stock" ? 1 : 0;
    if (aOut !== bOut) return aOut - bOut;
    return a.sortIndex - b.sortIndex;
  });
}
