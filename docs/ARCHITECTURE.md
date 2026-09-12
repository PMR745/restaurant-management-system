# Architecture

## The shape of it

```
components  ──▶  store/hooks.ts  ──▶  zustand store  ◀──  sync engine  ──▶  SyncAdapter
                       │                                                        ├─ LocalAdapter     (localStorage + BroadcastChannel)
                       └─ useMemo over                                          └─ SupabaseAdapter  (Postgres + Realtime)
                          pure compute fns
```

No component imports an adapter, a Supabase client, or the engine. A screen
calls `useKdsLanes()` and `advanceOrder(id, "ready", "kitchen")`. That is the
entire contract, and it is why the storage backend can be swapped at runtime
from an environment variable.

---

## 1. The sync seam

`src/lib/sync/adapter.ts`

```ts
interface SyncAdapter {
  readonly kind: "local" | "supabase";
  init(ctx): Promise<void>;
  snapshot(): Promise<Snapshot>;                  // full scoped read
  seedIfEmpty(seed: Snapshot): Promise<boolean>;  // idempotent bootstrap
  apply(mutations: Mutation[]): Promise<ApplyResult>;
  subscribe(handler: (events: ChangeEvent[]) => void): () => void;
  onStatusChange(handler: (state, detail?) => void): () => void;
  reset(seed: Snapshot): Promise<void>;
  dispose(): Promise<void>;
}
```

**What is deliberately absent: `query()`.** No filters, no pagination, no
sorting. The adapter moves whole records and nothing else; every join and
filter happens in selectors above the store.

That is not laziness. A restaurant is twelve tables, thirty-six dishes and a
few hundred orders — it fits in memory with room to spare, so paging would be
complexity with no payoff. More importantly, a narrow interface is what keeps
the two implementations *honestly* interchangeable. Give the adapter a rich
query surface and the Supabase one quietly grows capabilities the local one
cannot match, and then local mode silently degrades into something that only
half works.

Selection happens once, at startup:

```ts
const kind = NEXT_PUBLIC_SUPABASE_URL && NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? "supabase" : "local";
```

`NEXT_PUBLIC_*` is inlined at build time, so the choice is per-deployment.
`@supabase/supabase-js` is imported dynamically and never enters the local-mode
bundle.

---

## 2. The engine

`src/lib/sync/engine.ts` — the only thing that writes to the entity maps.

### Optimistic write, then reconcile

```
mutate(specs):
  1. merge an optimistic post-image into the store, stamped with a fresh opId
  2. adapter.apply(mutations)
  3. merge the authoritative post-images back over the optimism
  4. on failure: mark degraded, re-snapshot, surface a toast
```

The UI never waits on the network to feel responsive, and the server still
wins.

### Three rules that keep this from becoming a distributed-systems project

**Echo suppression by `lastOpId`.** Every row carries the id of the mutation
that produced it. When our own write comes back over Realtime, we drop it —
otherwise it clobbers a newer local edit that happened while it was in flight.
Postgres change payloads have no notion of "who wrote this", so this column is
what makes it possible at all.

**Last-write-wins at *record* granularity** (`merge` in `store.ts`):
`rev`, then `updatedAt`, then `updatedBy` as a deterministic tiebreak.
Field-level merge is the "correct" answer for a collaborative editor and the
wrong answer here: two people editing the same dish in the same second is not a
problem this system has, and record-level LWW is the only rule that stays
comprehensible while you are debugging a live board at 11pm.

**Re-snapshot on every reconnect.** Supabase Realtime has no replay. A dropped
socket silently loses every event that occurred while it was down, and
re-reading three hundred rows costs nothing. This single line is the difference
between "solid" and "the kitchen board is mysteriously stale".

### One prohibition

**Never write from inside a subscribe handler.** Derived writes — "when the
last item is served, serve the order" — belong in the action that *caused*
them. Put that logic in a reaction and every open tab runs it simultaneously,
and you get a write storm that is very hard to diagnose because each tab looks
individually reasonable.

---

## 3. Reads: why there are hooks and not selectors

This one bit us during development and is worth stating plainly.

A zustand selector is a `getSnapshot` for `useSyncExternalStore`. If it returns
a **new object or array on every call**, React compares the new snapshot to the
previous one, sees a difference, re-renders, calls it again, sees a difference…
The result is not a slow screen. It is `Maximum update depth exceeded` and a
dead page.

`useShallow` does not save you either — it compares one level deep, and the
churn in something like `computeTableViews` is in the nested objects.

So the read layer is split:

- `store/selectors.ts` — **pure functions over entity maps**. They build new
  objects freely, because nothing subscribes to them directly.
- `store/hooks.ts` — subscribes only to **raw entity maps** (which the store
  replaces only when that entity actually changes) and memoises the derivation
  with `useMemo`.

```ts
export function useTableViews() {
  const tables   = useRmsStore((s) => s.restaurant_tables);  // stable ref
  const orders   = useRmsStore((s) => s.orders);
  const sessions = useRmsStore((s) => s.customer_sessions);
  const staff    = useRmsStore((s) => s.staff);
  return React.useMemo(
    () => computeTableViews(tables, orders, sessions, staff),
    [tables, orders, sessions, staff],
  );
}
```

**Rule:** `useRmsStore` directly is fine only for a stable slice — an entity
map, a primitive, or an action. Anything derived goes through `hooks.ts`.

---

## 4. Table status is derived, never stored

`src/lib/domain/derive.ts`

This is the single most important modelling decision in the build.

```ts
deriveTableStatus(table, session, orders) → TableStatus
```

A table's status is a pure function of its open session plus its live orders,
evaluated at read time. The most urgent thing happening wins:

```
ready  >  preparing  >  ordering  >  served  >  occupied  >  available
```

Because the floor map *derives* rather than *stores*, "the kitchen taps Ready
and the tile turns orchid" falls out for free. The alternative — writing a
status onto the table row whenever an order changes — means two writers per
action, races between tabs, and a floor map that drifts out of sync with the
orders it is supposed to be describing.

`statusOverride` exists as a manual escape hatch for staff, and is the only
persisted status.

---

## 5. The order state machine

`src/lib/domain/transitions.ts`

```
draft ─place→ placed ─accept→ accepted ─start→ preparing ─ready→ ready ─serve→ served ✓

any non-terminal ──────────────────────────────────────────────→ cancelled
```

Two tables: which edges exist (`ALLOWED`) and who may walk them (`ACTORS`).

| Edge | Who |
|---|---|
| `draft → placed` | customer, front desk, system (the Zomato simulator) |
| `placed → accepted` | kitchen, admin |
| `accepted → preparing` | kitchen, admin |
| `preparing → ready` | kitchen, admin |
| `ready → served` | waiter, front desk, admin |
| `placed → cancelled` | customer (pre-accept only), kitchen, admin |
| any → `cancelled` | admin, with a reason |

Enforcement lives in exactly one place — `advanceOrder` in
`store/actions.ts` — which guards with `canTransition`, stamps the matching
timestamp, cascades item statuses, and writes an `OrderEvent` **in the same
mutation batch**. The guest's tracking timeline reads from `order_events`, so a
split batch would briefly show a status with no corresponding step.

Two consequences worth knowing:

**Adding dishes to a seated table creates a NEW order.** An extra round of
drinks never reopens an order the kitchen has already cooked. Tables aggregate
orders; tickets stay immutable once they are on the pass. This kills an entire
class of "why did this ticket go back to preparing" bugs.

**`markItemServed` auto-advances the order** when the last outstanding item
lands — computed once inside the action, never raced between clients.

---

## 6. Seed data

`src/lib/seed/demo-data.ts` — `buildSeed(now)`, a pure function.

- **Hardcoded deterministic UUIDs.** A bookmarked `/admin/menu/<id>` survives
  switching adapters, and `on conflict do nothing` genuinely does nothing.
- **No randomness, and no `Date.now()` at module scope.** A seed that differs
  between server and client render is a hydration mismatch; one that differs
  between two browsers makes the Supabase upsert non-idempotent.
- **Timestamps that drive a displayed duration are relative to `now`.** Freezing
  them means the floor map shows a dwell time of `365653:16`, which is
  arithmetically correct and completely absurd.
- `SEED_VERSION` gates the local adapter's rewrite. Bump it when content changes.

Both adapters bootstrap through the same `seedIfEmpty` — local compares the
seed version, Supabase checks whether the restaurant row exists and upserts in
FK-safe order if not.

---

## 7. Local adapter

`src/lib/sync/local-adapter.ts`

- **One localStorage key per entity**, not one blob. Rewriting a 2MB JSON
  string on every quantity tap is what makes localStorage demos feel laggy.
- **Cross-tab bus**: `BroadcastChannel`, falling back to the `storage` event.
  Neither delivers to the posting tab — which is fine, because `apply()`
  returns authoritative post-images synchronously, so the originating tab never
  depends on the bus to see its own write.
- Incoming events coalesce on a 16ms debounce, so a batched write from another
  tab lands as one render rather than nine.
- Same-origin only. It will not bridge `localhost:3000` and a phone on the LAN.
  That is not a bug — it is precisely why the Supabase adapter exists.

---

## 8. Auth

Shared per-role PIN → constant-time compare in a route handler → HMAC-signed
httpOnly cookie → edge guard in `src/proxy.ts`.

`src/lib/auth/session.ts` is **Web Crypto only**. It is imported by the proxy,
which runs on the edge runtime; pulling `node:crypto` into its dependency graph
breaks the entire guard at build time.

Guests have no auth at all. The customer layout mints a `CustomerSession` and
remembers its id per table in localStorage, so a guest who locks their phone
mid-meal rejoins the same session rather than starting a second one on the same
table.

The **cart is never synced** — it is the guest's private draft, and
broadcasting each tap to every staff screen would be both noisy and slightly
creepy. It *is* persisted to localStorage per table, because "not synced" must
not mean "lost when the browser discards the tab".

---

## 9. Things that will bite you

| | |
|---|---|
| **SSR ↔ localStorage** | The store's initial state is empty and identical on server and client. Hydration happens in an effect. Every data screen renders through `<HydrationGate>`. Do **not** add zustand's `persist` middleware — the adapter *is* persistence, and two persistence layers is a day lost to a rehydration race. |
| **Impure render** | `Date.now()` during render makes output depend on when React happened to run. One shared clock via `useSyncExternalStore` (`lib/hooks/use-client-store.ts`), and only the timer leaves subscribe to it. |
| **Realtime + RLS** | Realtime enforces RLS on *delivery*. The permissive SELECT policies are load-bearing; tighten them and the socket goes quiet with no error. |
| **The publication** | A table emits events only if it is in `supabase_realtime`. Forgetting one looks like a broken screen, not a config error. |
| **Enum drift** | The TS `as const` arrays and the Postgres enums must match. Drift is silent until a write fails with `invalid input value for enum`. |
| **Money** | Integer minor units everywhere. One `0.1 + 0.2` in a demo total is a credibility hit. |
| **Timer re-renders** | A shared ticker, not thirty intervals. Thirty would re-render the whole board every second and drift out of phase. |
| **Cart count writes** | Throttled to ~2s. Un-throttled, every `+` tap is a network write broadcast to every staff screen in the building. |
| **Edge runtime** | `src/proxy.ts` must stay Web-Crypto-only. |
| **Old-style figures** | Cormorant defaults to text figures, where `0` sits at x-height and reads as `o` — so `T06` renders as `To6`. `lining-nums` is forced on `.font-display`. |
