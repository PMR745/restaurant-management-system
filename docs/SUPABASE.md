# Turning on cross-device sync

Without this, the app runs on the **local adapter**: everything syncs instantly
across tabs of one browser, but a phone gets its own separate demo. That is
fine for development and for a one-machine demo.

Switch to Supabase when you want a guest's phone and the kitchen screen to share
one live service. No code changes — two environment variables.

**About five minutes.**

---

## 1. Create a project

[database.new](https://database.new) → new project. Free tier, no card.

Choose a region near you; every write makes a round trip.

## 2. Run the schema

Supabase dashboard → **SQL Editor** → paste all of
[`supabase/schema.sql`](../supabase/schema.sql) → **Run**.

It is idempotent — safe to re-run after a pull.

That creates nine tables, the enums, the `touch_row` trigger that makes the
server own `updated_at`/`rev`, the indexes, the RLS policies, and the Realtime
publication.

## 3. Copy the keys

**Project Settings → API**:

| Field | Goes to |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> Never copy the `service_role` key anywhere. It bypasses RLS entirely, and a
> `NEXT_PUBLIC_` variable is inlined into the JavaScript bundle every visitor
> downloads.

## 4. Wire it up

**Locally** — create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Restart the dev server.

**On Vercel** — Project Settings → Environment Variables. Add both to
**Production *and* Preview**, then **redeploy**. `NEXT_PUBLIC_*` values are
baked in at build time, so a restart is not enough.

## 5. Seed and verify

> **Two things the local adapter can never exercise**, both of which bit this
> project the first time it met a real Postgres. Worth knowing if you extend
> the adapter:
>
> - `restaurants` is the tenant root and has **no `restaurant_id` column**,
>   though `Restaurant` extends `SyncBase` like every other entity and so
>   carries a `restaurantId`. The codec strips it on write and synthesises it
>   on read. Add a new entity and it needs no special handling; add a new
>   tenant-root table and it does.
> - **Updates must be a PATCH, not an upsert.** An upsert is
>   `INSERT … ON CONFLICT DO UPDATE`, and Postgres validates the INSERT arm
>   first — so a partial patch like `{id, status, accepted_at}` is rejected for
>   violating NOT NULL on `orders.type`, a column it never meant to touch.
>   Inserts batch into one upsert; updates issue a real `.update()` each.

Open the app. The first client to load it seeds the demo restaurant
automatically (twelve tables, the full menu, five orders mid-service), guarded
by an idempotent upsert so concurrent loads are harmless.

Check the pill at the top right of any staff screen:

- **`SUPABASE · LIVE`** — connected.
- **`LOCAL · THIS BROWSER`** — the env vars did not reach the build.

Then prove it properly: open `/admin/qr`, scan a table's code with a phone,
place an order, and watch it land on `/kitchen` on the laptop.

---

## If it does not work

**Pill still says LOCAL.** The variables were not present at build time. On
Vercel, redeploy after adding them. Locally, restart `npm run dev`. Both must be
set and the URL must start with `https://`.

**Data loads but nothing updates live.** Realtime is the problem, not the
database. Two usual causes:

```sql
-- 1. Is every table actually published?
select tablename from pg_publication_tables where pubname = 'supabase_realtime';
```

You should see all eight (`restaurants` is intentionally excluded — it never
changes, and the initial snapshot covers it). A missing table produces a screen
that looks broken without throwing anything.

```sql
-- 2. Are the SELECT policies still permissive?
select tablename, policyname, cmd from pg_policies where schemaname = 'public';
```

**Realtime enforces RLS on delivery.** If you tighten SELECT, events stop
arriving and the socket goes quiet with no error anywhere. Those policies are
load-bearing.

**Everything is slow, or the first load times out.** Free projects pause after
about seven days of inactivity, and the first request after a pause takes 10–30
seconds. Open the Supabase dashboard once to wake it — worth doing before any
demo.

**Writes fail with `invalid input value for enum`.** The TypeScript `as const`
arrays in `src/lib/domain/enums.ts` have drifted from the Postgres enums. Make
them match.

---

## About the security posture

The policies in `schema.sql` let anyone with the anon key read and write
everything. Since the anon key ships in the bundle by definition, that means
anyone who can open the app.

That is acceptable **only** because this is a demo with no PII, no money and no
billing. What is actually mitigated:

- There is **no DELETE policy**, so the demo can be vandalised but not
  destroyed.
- **Reset demo** in `/admin` restores the seed in one click.
- The `service_role` key never leaves Supabase.

Production would replace all of it with Supabase Auth and per-role JWT claims:

```sql
using (auth.jwt() ->> 'restaurant_id' = restaurant_id::text)
```

...plus write policies scoped by role, so a guest's phone cannot advance an
order to `ready`. Worth stating plainly rather than leaving implied.

---

## Starting over

```sql
-- Wipe the demo data but keep the schema.
truncate public.order_events, public.order_items, public.orders,
         public.customer_sessions, public.menu_items, public.menu_categories,
         public.restaurant_tables, public.staff, public.restaurants cascade;
```

Reload the app and it re-seeds itself.
