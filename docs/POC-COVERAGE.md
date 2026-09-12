# Coverage against the brief

Every requirement in the original POC document, mapped to where it lives.

**Scope agreed with the client: everything up to and including *Served*.**
Billing, payment, guest review and the sales dashboard are Phase 2 and have no
routes — a half-built screen is worse than an absent one.

Legend: ✅ built · ⏭️ deliberately out of scope

---

## 2. Admin / restaurant management

### 2.1 Table management

| Requirement | Status | Where |
|---|---|---|
| View all tables | ✅ | `/admin/tables` — floor map at `lg+`, responsive grid below |
| Table status | ✅ | Six statuses, **derived** from session + live orders (`domain/derive.ts`) |
| — Available / Occupied / Ordering / Preparing / Ready / Served | ✅ | |
| — Billing / Completed | ⏭️ | Exist only to serve billing |
| View table order details | ✅ | Click any table → detail drawer |
| View total order amount | ✅ | Drawer, and the floor-at-a-glance list on `/admin` |
| Assign waiter to a table | ✅ | Drawer select, and `/admin/staff` |
| Track responsible waiter | ✅ | On the tile, the drawer and the Team board |

### 2.2 Kitchen order management

| Requirement | Status | Where |
|---|---|---|
| Receive orders from tables | ✅ | `/kitchen` — arrives without a refresh |
| Display new and pending orders | ✅ | Four lanes: New · Accepted · Preparing · Ready |
| Update order status | ✅ | One action per lane, guarded by the state machine |
| Auto-sync with table and customer | ✅ | Table status derives; the guest timeline reads `order_events` |

*Beyond the brief:* aging timers on a four-band urgency scale, allergen
warnings pulled from the menu, special instructions surfaced per line, and a
Glare mode for bright kitchens.

### 2.3 Waiter management

| Requirement | Status | Where |
|---|---|---|
| View assigned tables | ✅ | `/waiter` — filtered by signed-in waiter, or pick a section |
| View items to deliver | ✅ | "Ready to serve" queue |
| View order status | ✅ | Status pill per order |
| Mark items/order served | ✅ | Per item, or "Serve all" |
| Track pending deliveries | ✅ | "Still with the kitchen" list |

### 2.4 Takeaway orders

| Requirement | Status | Where |
|---|---|---|
| Front desk creates takeaway orders | ✅ | `/takeaway` — menu picker + guest details |
| Manage takeaway status | ✅ | Same kitchen queue; "Hand over" when ready |
| Generate bill | ⏭️ | Billing out of scope |
| Record payment status | ⏭️ | Payment out of scope |

### 2.5 Online orders

| Requirement | Status | Where |
|---|---|---|
| Manage orders from external platforms | ✅ | `/admin/orders`, filter **Online** |
| Zomato simulated for the POC | ✅ | "Simulate online order", plus an auto feed every 45–90s |
| Appear in the central dashboard | ✅ | Same queue, same kitchen board |

The simulator calls the **same `placeOrder` action** a guest's phone uses, so
nothing downstream special-cases it. The kitchen genuinely cannot tell which
channel a ticket came from — which is the point of the simulation.

---

## 3. Customer — QR menu & ordering

| Requirement | Status | Where |
|---|---|---|
| Scan QR → digital menu | ✅ | `/t/noir/T07`; printable tents at `/admin/qr` |
| Category → item → cart → order → tracking | ✅ | Full flow |

### 3.2 Digital menu

| | Status | Note |
|---|---|---|
| Food categories | ✅ | Six, with a sticky scroll-spy rail |
| Food items | ✅ | 36 |
| Food images | ✅ | Pinned Unsplash, shared warm grade |
| Videos | ⏭️ | Omitted — every clip available was worse than the stills |
| Description | ✅ | |
| Pricing | ✅ | Integer minor units throughout |
| Nutritional information | ✅ | Calories, macros, allergens |
| Approximate preparation time | ✅ | Per dish; the cart quotes the slowest, not the sum |
| Item availability | ✅ | Out-of-stock greys out with an `86'd` stamp, live |

### 3.3 Ordering

| | Status |
|---|---|
| Select items | ✅ |
| Add/remove from cart | ✅ |
| Change quantity | ✅ |
| Special instructions | ✅ Per dish, shown on the kitchen ticket |
| Place order from the table | ✅ |

*Beyond the brief:* the cart survives a reload (localStorage, per table), and a
guest returning to the same table rejoins their existing session rather than
starting a second one.

### 3.4 Upselling

✅ Explicit per-dish pairings with a deterministic fallback to signature
desserts and drinks. Shown on the dish page ("Pairs beautifully with") and in
the cart ("To complete the table"). Deterministic by design — random
suggestions look broken the second time you demo the same flow.

### 3.5 Order status

✅ `Order received → Accepted → Preparing → Ready → Served`, synchronised with
the kitchen and the waiter. The current step carries a heartbeat animation.

---

## 4–6. Out of scope

| Section | Status |
|---|---|
| 4.1 Billing | ⏭️ Phase 2 |
| 4.2 Payment (gateway / cash) | ⏭️ Phase 2 |
| 5. Customer review | ⏭️ Phase 2 |
| 6. Sales dashboard | ⏭️ Phase 2 |

No routes, no nav entries, no placeholder screens. The domain model is shaped
so these slot in without rework: orders already carry a `subtotal` and per-item
price snapshots, and `order_events` is a complete audit trail.

---

## 7. Menu & pricing management

| Requirement | Status | Where |
|---|---|---|
| Add / edit / delete category | ✅ | `/admin/menu` |
| Add / edit / delete food item | ✅ | |
| Update price | ✅ | Rupees in, integer paise stored |
| Mark Available / Out of Stock | ✅ | Toggle; reaches guest phones with no refresh |

Deletes are soft everywhere, so an order placed before a dish was removed keeps
its own name and price snapshot and history stays intact.

---

## 8. Screens

The brief asked for 10–12. There are 14 routes.

| # | Brief | Route |
|---|---|---|
| 1 | Admin Login | `/login` |
| 2 | Admin Dashboard | `/admin` |
| 3 | Table Management | `/admin/tables` |
| 4 | Table Order Details | drawer on `/admin/tables` |
| 5 | Kitchen Display | `/kitchen` |
| 6 | Waiter Dashboard | `/waiter` |
| 7 | Takeaway / Online Orders | `/takeaway`, `/admin/orders` |
| 8 | Customer QR Menu | `/t/[slug]/[tableCode]` |
| 9 | Food Details & Upselling | `…/item/[itemId]` |
| 10 | Cart & Place Order | `…/cart` |
| 11 | Order Tracking | `…/order/[orderId]` |
| 12 | Billing / Payment | ⏭️ |
| 12 | Sales Dashboard | ⏭️ |
| + | Menu management | `/admin/menu` |
| + | Team & sections | `/admin/staff` |
| + | QR table tents | `/admin/qr` |
| + | Demo launcher | `/` |

---

## 9. Primary success criteria

The brief's twelve-step flow, steps 1–8 (the agreed scope). All of it is
asserted automatically by `scripts/acceptance.mjs`, which drives a real browser:

| Step | Asserted |
|---|---|
| 1. Customer scans QR | ✅ Landing renders, table identity correct |
| 2. Browses and places an order | ✅ Menu, dish detail, cart, place |
| 3. Order appears on Admin / Front Desk | ✅ Orders console and floor map |
| 4. Appears in the Kitchen | ✅ Ticket lands in the New lane |
| 5. Kitchen updates status | ✅ Accept → Start → Ready, on that exact ticket |
| 6. Synced with Customer and Table | ✅ Guest headline and derived table status checked at each step |
| 7. Waiter receives the task | ✅ Queued under Ready to serve |
| 8. Waiter marks served | ✅ Order and table both settle to `served` |
| 9–12. Bill → payment → review → sales | ⏭️ Out of scope |

**43 of 43 checks pass**, with no console or page errors.

---

## 10. Notes on scope

The brief's stated focus was "proving the real-time synchronisation between
Customer, Admin/Front Desk, Kitchen, Waiter, Billing and Sales." Billing and
Sales are out, so what is proven is the synchronisation across the four
remaining modules — which is the hard part and the part the other two would
have depended on.

The sync layer is **pluggable**: local storage by default (zero configuration,
syncs across tabs of one browser) or Supabase Postgres + Realtime for true
cross-device sync. Both implement the same interface. Which one is live is
shown on screen rather than buried in a config file, because the difference
matters during a demo.
