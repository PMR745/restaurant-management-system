-- ============================================================================
-- Noir & Gold — Restaurant Management POC
-- Supabase schema. Paste into the SQL editor and run once.
--
-- Conventions:
--   * snake_case columns, mapped to camelCase by src/lib/sync/codec.ts
--   * soft deletes only — deleted_at, never DELETE
--   * the server owns updated_at and rev (see touch_row below)
--   * last_op_id carries the client's mutation id back, which is what makes
--     echo suppression possible over Realtime
-- ============================================================================

create extension if not exists pgcrypto;

-- ── enums ───────────────────────────────────────────────────────────────────
-- These must stay in lockstep with the `as const` arrays in
-- src/lib/domain/enums.ts. Drift is silent until a write fails with
-- "invalid input value for enum".

do $$ begin
  create type order_status as enum
    ('draft','placed','accepted','preparing','ready','served','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_item_status as enum
    ('pending','preparing','ready','served','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_type as enum ('dine_in','takeaway','online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_channel as enum ('qr','front_desk','zomato');
exception when duplicate_object then null; end $$;

do $$ begin
  create type table_status as enum
    ('available','occupied','ordering','preparing','ready','served');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_role as enum ('admin','kitchen','waiter','front_desk');
exception when duplicate_object then null; end $$;

do $$ begin
  create type item_availability as enum ('available','out_of_stock');
exception when duplicate_object then null; end $$;

-- ── shared trigger ──────────────────────────────────────────────────────────
-- The server, not the client, decides updated_at and rev. Those two columns
-- are the conflict-resolution inputs, so letting a client set them would let a
-- clock-skewed phone win every merge.

create or replace function public.touch_row() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.rev        := coalesce(old.rev, 0) + 1;
  new.created_at := coalesce(old.created_at, new.created_at, now());
  return new;
end $$;

-- ── tables ──────────────────────────────────────────────────────────────────
-- Declared parent-first so every foreign key resolves on a single pass.

create table if not exists public.restaurants (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  tagline        text not null default '',
  hero_image_url text not null default '',
  currency       text not null default 'INR',
  timezone       text not null default 'Asia/Kolkata',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  rev            integer not null default 1,
  updated_by     text not null default 'seed',
  last_op_id     uuid,
  deleted_at     timestamptz
);

create table if not exists public.staff (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  role          staff_role not null,
  initials      text not null default '',
  is_on_shift   boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  rev           integer not null default 1,
  updated_by    text not null default 'seed',
  last_op_id    uuid,
  deleted_at    timestamptz
);
-- NOTE: deliberately no credential column. Staff PINs live in server-only env
-- vars and are verified in an API route — see src/lib/auth/session.ts.

create table if not exists public.restaurant_tables (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references public.restaurants(id) on delete cascade,
  code               text not null,
  label              text not null,
  seats              smallint not null default 2 check (seats between 1 and 20),
  zone               text not null default 'indoor',
  assigned_waiter_id uuid references public.staff(id) on delete set null,
  status_override    table_status,
  sort_index         integer not null default 0,
  x                  numeric(5,2) not null default 50,
  y                  numeric(5,2) not null default 50,
  shape              text not null default 'square',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  rev                integer not null default 1,
  updated_by         text not null default 'seed',
  last_op_id         uuid,
  deleted_at         timestamptz,
  unique (restaurant_id, code)
);

create table if not exists public.menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  slug          text not null,
  name          text not null,
  description   text,
  image_url     text not null default '',
  sort_index    integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  rev           integer not null default 1,
  updated_by    text not null default 'seed',
  last_op_id    uuid,
  deleted_at    timestamptz,
  unique (restaurant_id, slug)
);

create table if not exists public.menu_items (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  category_id       uuid not null references public.menu_categories(id) on delete cascade,
  name              text not null,
  description       text not null default '',
  price             integer not null check (price >= 0),   -- minor units (paise)
  image_url         text not null default '',
  availability      item_availability not null default 'available',
  prep_time_minutes smallint not null default 10,
  nutrition         jsonb,
  diet_tags         jsonb not null default '[]'::jsonb,
  spice_level       text not null default 'none',
  is_signature      boolean not null default false,
  upsell_ids        jsonb not null default '[]'::jsonb,
  sort_index        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  rev               integer not null default 1,
  updated_by        text not null default 'seed',
  last_op_id        uuid,
  deleted_at        timestamptz
);

create table if not exists public.customer_sessions (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references public.restaurants(id) on delete cascade,
  table_id         uuid references public.restaurant_tables(id) on delete set null,
  started_at       timestamptz not null default now(),
  closed_at        timestamptz,
  guest_count      smallint,
  guest_name       text,
  last_activity_at timestamptz not null default now(),
  cart_item_count  smallint not null default 0,
  device_label     text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  rev              integer not null default 1,
  updated_by       text not null default 'anon',
  last_op_id       uuid,
  deleted_at       timestamptz
);

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants(id) on delete cascade,
  seq_no         bigint not null default 1,
  type           order_type not null,
  channel        order_channel not null,
  status         order_status not null default 'placed',
  table_id       uuid references public.restaurant_tables(id) on delete set null,
  session_id     uuid references public.customer_sessions(id) on delete set null,
  waiter_id      uuid references public.staff(id) on delete set null,
  customer_name  text,
  customer_phone text,
  external_ref   text,
  item_count     smallint not null default 0,
  subtotal       integer not null default 0,
  note           text,
  placed_at      timestamptz,
  accepted_at    timestamptz,
  preparing_at   timestamptz,
  ready_at       timestamptz,
  served_at      timestamptz,
  cancelled_at   timestamptz,
  cancel_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  rev            integer not null default 1,
  updated_by     text not null default 'anon',
  last_op_id     uuid,
  deleted_at     timestamptz
);

create table if not exists public.order_items (
  id                   uuid primary key default gen_random_uuid(),
  restaurant_id        uuid not null references public.restaurants(id) on delete cascade,
  order_id             uuid not null references public.orders(id) on delete cascade,
  menu_item_id         uuid references public.menu_items(id) on delete set null,
  -- Snapshots, so an order's history survives a menu edit or a price change.
  name_snapshot        text not null,
  unit_price_snapshot  integer not null,
  image_url_snapshot   text not null default '',
  quantity             smallint not null check (quantity between 1 and 50),
  special_instructions text,
  status               order_item_status not null default 'pending',
  served_at            timestamptz,
  sort_index           integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  rev                  integer not null default 1,
  updated_by           text not null default 'anon',
  last_op_id           uuid,
  deleted_at           timestamptz
);

create table if not exists public.order_events (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id      uuid not null references public.orders(id) on delete cascade,
  from_status   order_status,
  to_status     order_status not null,
  actor         text not null,
  actor_id      uuid,
  note          text,
  at            timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  rev           integer not null default 1,
  updated_by    text not null default 'anon',
  last_op_id    uuid,
  deleted_at    timestamptz
);

-- ── triggers ────────────────────────────────────────────────────────────────

do $$ declare t text;
begin
  foreach t in array array['restaurants','staff','restaurant_tables','menu_categories',
                           'menu_items','customer_sessions','orders','order_items','order_events']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before insert or update on public.%I
                    for each row execute function public.touch_row()', t, t);
  end loop;
end $$;

-- ── indexes ─────────────────────────────────────────────────────────────────

create index if not exists idx_tables_sort      on public.restaurant_tables (restaurant_id, sort_index);
create index if not exists idx_categories_sort  on public.menu_categories   (restaurant_id, sort_index);
create index if not exists idx_items_category   on public.menu_items        (restaurant_id, category_id, sort_index);
create index if not exists idx_items_avail      on public.menu_items        (restaurant_id, availability);
create index if not exists idx_orders_status    on public.orders            (restaurant_id, status);
create index if not exists idx_orders_updated   on public.orders            (restaurant_id, updated_at desc);
create index if not exists idx_orders_table     on public.orders            (table_id) where deleted_at is null;
create index if not exists idx_order_items_ord  on public.order_items       (order_id);
create index if not exists idx_order_events_ord on public.order_events      (order_id, at desc);
create index if not exists idx_sessions_open    on public.customer_sessions (table_id) where closed_at is null;

-- ── row level security ──────────────────────────────────────────────────────
--
-- READ THIS BEFORE DEPLOYING ANYTHING REAL.
--
-- This is a public demo database. The anon key ships in the JavaScript bundle
-- by definition, so anyone who can open the app can read and rewrite the demo
-- restaurant's data. That is acceptable here ONLY because there is no PII, no
-- money and no billing in scope.
--
-- What is actually mitigated:
--   * No DELETE policy exists, so the demo can be vandalised but not destroyed.
--   * "Reset demo data" in /admin restores the seed in one click.
--   * The service_role key never appears in the repo or in any NEXT_PUBLIC_ var.
--
-- Production would replace all of this with Supabase Auth and per-role JWT
-- claims, e.g.  using (auth.jwt() ->> 'restaurant_id' = restaurant_id::text).
--
-- One non-obvious consequence: Realtime enforces RLS on DELIVERY. The
-- permissive SELECT policies below are load-bearing — tighten them and the
-- socket goes quiet with no error anywhere.

do $$ declare t text;
begin
  foreach t in array array['restaurants','staff','restaurant_tables','menu_categories',
                           'menu_items','customer_sessions','orders','order_items','order_events']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists demo_select on public.%I', t);
    execute format('drop policy if exists demo_insert on public.%I', t);
    execute format('drop policy if exists demo_update on public.%I', t);

    execute format('create policy demo_select on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy demo_insert on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('create policy demo_update on public.%I for update to anon, authenticated using (true) with check (true)', t);
    -- deliberately NO delete policy
  end loop;
end $$;

-- ── realtime ────────────────────────────────────────────────────────────────
-- A table emits change events only if it is in this publication. Forgetting
-- one produces a screen that looks broken without throwing anything. Verify:
--   select * from pg_publication_tables where pubname = 'supabase_realtime';
--
-- `restaurants` is intentionally excluded: it changes approximately never, and
-- the initial snapshot already covers it.

do $$ declare t text;
begin
  foreach t in array array['staff','restaurant_tables','menu_categories','menu_items',
                           'customer_sessions','orders','order_items','order_events']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
