# Noir & Gold

A restaurant management system, built as a proof of concept.

One guest scans the QR code on their table, browses the menu and places an
order. Before they have put their phone down, the ticket is on the kitchen
board, the table has changed colour on the floor map, and the waiter assigned
to that section has a delivery task. Every status the kitchen sets flows back
to the guest's phone.

That loop — **Customer → Kitchen → Floor → Waiter → Customer**, live, in both
directions — is what this POC exists to prove.

```
Guest scans QR  →  menu  →  cart  →  place order
                                          ↓
                              kitchen: New → Accepted → Preparing → Ready
                                          ↓
                              floor map + guest timeline follow every step
                                          ↓
                              waiter serves  →  guest sees "Served"
```

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Open **/** for the demo launcher, which links to every role.

> **This machine only:** npm here sits behind a TLS-inspecting corporate proxy
> and cannot reach the registry without the CA bundle. Set it once:
> ```powershell
> setx NODE_EXTRA_CA_CERTS "C:\Users\prath\.certs\corp-ca-bundle.pem"
> ```
> Reopen the terminal afterwards. Vercel's build does not need this.

### The 60-second demo

Two browser windows, side by side:

| # | Window | Do this |
|---|---|---|
| 1 | `/t/noir/T07` | Scroll the menu. Open **Butter Chicken, 1947**. Add 2, with a note. |
| 2 | | Tap the cart bar → **Place order**. You land on live tracking. |
| 3 | `/kitchen` | The ticket is already in **New**. Accept → Start preparing → Mark ready. |
| 4 | back to window 1 | The guest's timeline has followed every step. |
| 5 | `/admin/tables` | T07 has changed colour without a refresh. |
| 6 | `/waiter` | The order is queued under **Ready to serve**. Hit **Serve all**. |
| 7 | back to window 1 | The guest now reads **Served**. |

Two more worth showing:

- `/admin/orders` → **Simulate online order**. A "Zomato" order lands on the
  same kitchen board, indistinguishable from a QR one — because it goes through
  exactly the same code path.
- `/admin/menu` → toggle a dish to out-of-stock. It greys out on the guest menu
  immediately, with an `86'd` stamp.

**Reset at any time:** `/admin` → *Reset demo*.

---

## Two ways to run

The sync layer is pluggable. Which one is live is always shown in the pill at
the top right of every staff screen — this matters, so it is never hidden in a
config file.

| Mode | When | Behaviour |
|---|---|---|
| **Local** (default) | No env vars set | Everything syncs instantly across tabs and windows of **one browser**. Zero configuration. A second device gets its own separate demo. |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_*` set | Real cross-device sync. Scan the QR on a phone and the order appears on the laptop's kitchen screen. |

Local mode is genuinely useful — it is how you develop, and it demos perfectly
on one machine. It is not a fallback or a stub; it implements the same
interface, including optimistic writes and conflict resolution.

To switch on Supabase, see [docs/SUPABASE.md](docs/SUPABASE.md). It is a
five-minute setup and needs no code change.

---

## Staff access

The staff gate is **off by default** (`DEMO_OPEN_ACCESS`), because the point of
a POC link is that anyone can walk every role without being handed four PINs
first. The login screen still works and shows the demo PIN for whichever role
you pick.

To turn the gate on, set `DEMO_OPEN_ACCESS=0`.

| Role | PIN | Lands on |
|---|---|---|
| Manager | `4829` | `/admin` |
| Kitchen | `7712` | `/kitchen` |
| Waiter | `3305` | `/waiter` |
| Front desk | `9044` | `/takeaway` |

Waiters additionally choose which waiter they are; that is what makes
"my section" mean something.

**What this is not:** shared per-role PINs are not identities, there is no
revocation, and there is no rate limiting beyond a fixed delay on each attempt.
What it *does* get right is that no credential ships to the browser and the
cookie is HMAC-signed, so it cannot be forged from devtools. That is the right
bar for a demo gate; it is not the bar for production.

---

## What's in scope

Everything up to and including **Served**.

✅ QR menu with categories, photography, nutrition, prep times and availability
✅ Cart with quantities, per-dish notes, and upsell suggestions
✅ Live order tracking for the guest
✅ Kitchen display: four lanes, aging timers, allergen warnings, tickets that
   fly between lanes on a status change
✅ Floor map: twelve tables, live derived status, waiter assignment
✅ Waiter board: assigned sections, delivery queue, per-item or whole-order serving
✅ Takeaway desk and simulated online (Zomato) orders, in the same queue
✅ Menu management: categories and dishes, pricing, 86'ing an item
✅ Printable QR table tents, generated against the live deployment URL

**Deliberately out of scope**, as agreed: billing, payment, guest reviews, and
the sales dashboard. These are Phase 2. There are no stub routes for them —
a half-built screen is worse than an absent one.

A requirement-by-requirement map against the original brief is in
[docs/POC-COVERAGE.md](docs/POC-COVERAGE.md).

---

## How it is built

| | |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind v4, CSS-first `@theme` — no `tailwind.config.js` |
| State | Zustand, with a pluggable sync engine on top |
| Motion | `motion`, used surgically; everything else is CSS |
| UI | Radix primitives for behaviour, hand-written skins. No component kit. |

The two documents worth reading before changing anything:

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the sync seam, why table
  status is derived rather than stored, conflict resolution, the order state
  machine, and the rules that keep the realtime layer from eating itself.
- **[docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)** — tokens, type scale, the
  five effects that carry the look, motion contract, accessibility floor.

---

## Verifying it

```bash
npx tsc --noEmit                 # types
npx eslint src --max-warnings 0  # lint
npm run build                    # production build

npm run dev                      # then, in another terminal:
node scripts/acceptance.mjs      # 43 checks, drives a real browser
```

`scripts/acceptance.mjs` walks the entire success-criteria flow in Chrome —
guest places an order, kitchen advances it through all four states, floor map
and guest timeline are asserted at each step, waiter serves it, and every ops
screen is checked for render and console errors. It needs Chrome installed and
the dev server running.

`scripts/shots.mjs` captures every screen, waiting for photographs to decode
rather than for the network to go quiet, and reports any image that failed.

---

## Deploying

Push to GitHub and import at [vercel.com/new](https://vercel.com/new), or:

```bash
npx vercel            # first run links the project
npx vercel --prod
```

No `vercel.json` is needed. If you are using Supabase mode, set
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel
project settings for **both** Production and Preview — `NEXT_PUBLIC_*` values
are inlined at build time, so changing one requires a redeploy, not a restart.

See [.env.example](.env.example) for every variable.

---

## Known limitations

- **Local mode is per-browser.** A deployed link in local mode gives every
  visitor a private demo; two people on a call will not see each other's
  orders. This is correct and documented, and the connection pill says so on
  screen — but a shared live demo needs Supabase mode.
- **Free Supabase projects pause after ~7 days idle.** The first request after
  a pause takes 10-30 seconds. Open the Supabase dashboard once before demoing.
- **Dish photography is stock.** Pinned Unsplash ids, art-directed with a shared
  warm grade so the grid reads as one shoot. A few dishes are approximations
  rather than exact matches.
- **`seqNo` is display-only.** Allocation differs between the two adapters
  (a max+1 scan locally, a column default on Postgres). Nothing keys off it.
