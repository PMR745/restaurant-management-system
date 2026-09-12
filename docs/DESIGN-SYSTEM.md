# Design system — Noir & Gold

**Thesis: candlelight on obsidian.** A warm near-black room, one champagne
light source from above, food photography as the only saturated colour in the
frame, and type that behaves like an engraved menu card.

Three rules hold the whole thing together:

1. **Gold is light, not fill.** Hairlines, top-edge speculars, small-caps
   labels, glow. At most **one solid-gold element per screen** — the primary
   action. Gold stops reading as precious the moment there are three of them.
2. **Every neutral is warm-tinted** (oklch hue 65–80). No `#000`, no `#fff`,
   no blue-grey. Blue-grey slate is the tell of a framework default.
3. **Serif talks, sans works.** Dish names, prices, table numbers and section
   titles are Cormorant. Buttons, labels and table cells are Instrument Sans.
   Never a sans H1.

Everything below lives in `src/app/globals.css` as a Tailwind v4 `@theme`
block. There is no `tailwind.config.js`.

---

## Colour

### Surfaces — warm obsidian, six elevations

| Token | oklch | Use |
|---|---|---|
| `void` | `0.118 0.004 65` | Behind everything; the kitchen board |
| `obsidian` | `0.150 0.005 65` | App background |
| `surface-1` | `0.192 0.006 65` | Cards, sidebar, sheet body |
| `surface-2` | `0.236 0.007 65` | Raised card, drawer, input |
| `surface-3` | `0.282 0.008 65` | Hover, kitchen ticket, table tile |
| `surface-4` | `0.330 0.009 65` | Active, tooltip |

### Champagne — `gold-100` … `gold-900`, plus `gold-ink`

`gold-500 oklch(0.745 0.090 85)` is the brand. `gold-300` and lighter for small
text.

> **Text on solid gold is `gold-ink` (12.6:1), never white (2.0:1).** This is
> the single most common way this palette gets ruined.

### Status — one jewel ramp at uniform lightness 0.78

| Status | oklch | Reads as |
|---|---|---|
| `available` | `0.780 0.100 158` | jade |
| `occupied` | `0.800 0.095 88` | champagne |
| `ordering` / `placed` | `0.780 0.110 55` | apricot |
| `preparing` / `accepted` | `0.780 0.090 268` | periwinkle |
| `ready` | `0.780 0.100 300` | orchid |
| `served` | `0.780 0.090 210` | glacier |
| `cancelled` | `0.700 0.140 25` | ember |

Holding every hue at the same lightness is what makes seven colours read as one
family instead of a bag of alert colours — and it guarantees 7.4–9.2:1 on
obsidian by construction. Tables and orders share the ramp so staff learn one
colour language across the floor map and the kitchen board.

They render as **dot at full chroma + 9% tint surface + 30% hairline**, never
as a filled block. A `data-status` attribute plus `color-mix` drives all of it,
so there is **zero per-status branching in JSX**:

```css
[data-status]         { --st: var(--color-st-draft);
                        --st-tint:   color-mix(in oklab, var(--st) 9%, transparent);
                        --st-stroke: color-mix(in oklab, var(--st) 30%, transparent); }
[data-status="ready"] { --st: var(--color-st-ready); }
```

```tsx
<div data-status={status} className="bg-[--st-tint] border-[--st-stroke] text-[--st]">
```

### Ticket aging — a separate axis

Status says *what*; age says *how urgent*. Age is allowed to be loud.

`fresh` (ink-3) → `warn` >6 min → `late` >12 min → `critical` >18 min, the last
with a breathing border. A ticket's colour and its timer's colour are
independent, which is the point.

---

## Typography

| Role | Family | Why |
|---|---|---|
| Display | **Cormorant Garamond** 300–600 + italic | True Garamond hairlines — *the* fine-dining face. ≥20px only; below that the hairlines disappear. |
| Sans | **Instrument Sans** | Real personality, dense enough for ops tables, and — critically — **not Inter**, which is what makes most dashboards look identical. |
| Mono | **IBM Plex Mono** | Ticket ids, aging timers, prices. Humanist warmth rather than dev-tool cold. |

> Cormorant ships **old-style figures** by default, where `0` sits at x-height
> and reads as a lowercase `o` — so `T06` renders as `To6` and `T11` as `Tıı`.
> Beautiful in a paragraph, wrong for a table number. `.font-display` forces
> `lining-nums`; the `tabular` utility layers on where columns must align.

The scale is mapped to usage, not to abstract steps:

| Slot | Spec |
|---|---|
| **Eyebrow** | `text-2xs uppercase tracking-luxe text-gold-300` — 11px at 0.22em. **This one style carries most of the luxury.** |
| Ops body | `text-sm` (13px) |
| Guest body | `text-base` (15px), 1.6 |
| Dish name | `font-display text-lg font-medium tracking-tight` |
| Price | `font-display text-md tabular text-gold-300` |
| Dish H1 | `font-display clamp(2rem, 7vw, 2.75rem)` |
| Table number | `font-display text-3xl font-light tabular` |
| **Kitchen dish** | `text-lg font-semibold` — 20px, readable at 3 metres |
| **Aging timer** | `font-mono text-[1.75rem] tabular` — 28px |

---

## The five effects that carry the look

Full CSS in `globals.css`.

**1. Gilded hairline** (`.gilded`) — a gradient border via
`mask-composite: exclude`, brighter at the top-left and fading to nothing. It
reads as a *light source above the card* rather than a stroke around it. Used
sparingly — the cart bar, dialogs, the primary CTA, a selected table. Scarcity
is what makes it feel expensive.

**2. Film grain** (`.grain`) — one fixed SVG `feTurbulence` layer at 3.5%
opacity, `mix-blend-mode: overlay`, drifting on an 8s step animation. This is
the single cheapest thing that stops a dark UI reading as flat vector. Dropped
to 1.5% and static on the kitchen board, where at three metres it would just
look like a dirty screen.

**3. Ambient glow + vignette** (`.glow-backdrop`, `.vignette`) — layered radial
gradients from top-centre, edges falling into shadow so content floats.

**4. Dish frame** (`.dish-frame`) — a shared warm grade
(`saturate(1.06) contrast(1.06) brightness(0.94)`), a soft-light gold wash, a
two-stop legibility scrim, and ken-burns on hover. Stock photography varies
wildly in colour temperature; a shared grade is what makes a grid of it look
art-directed rather than scraped.

**5. Sheen + shimmer** (`.sheen`, `.shimmer`) — a specular crossing gold
buttons on hover; skeletons that shimmer champagne rather than grey. Skeletons
are visible on every cold load, so they are part of the design, not a
placeholder for it.

Plus `text-gilt` (gradient text), `text-engrave` (letterpress over photos), and
`.rule-diamond` — the ◆ centre divider, a classic printed-menu device.

---

## Motion

`motion` only where CSS genuinely cannot go: `layoutId` FLIP, `AnimatePresence`
exits, and drag. Hover, press, shimmer, pulse, grain, ken-burns and sheen are
pure CSS — no JS, no hydration cost. `LazyMotion` + `domAnimation` keeps the
bundle around 18KB.

| Curve | Use |
|---|---|
| `--ease-luxe` `cubic-bezier(.16,1,.30,1)` | Entrances — fast start, long settle |
| `--ease-swift` `cubic-bezier(.32,.72,0,1)` | Sheets and drawers |
| `--ease-standard` | Hover, colour, opacity |
| `--ease-in-luxe` | Exits, always ~40% faster than the entrance |

Signature moments:

- **Kitchen ticket status change** — the card physically *flies* between lanes
  via `layoutId` inside one `LayoutGroup`, the status bar cross-fades, and
  neighbours reflow on the same spring. This is the single most expensive-feeling
  moment in the app.
- **Guest timeline** — the rail fills by `scaleY`, the node morphs hollow→filled,
  and the current step keeps a two-ring heartbeat. That heartbeat answers the
  only question a waiting guest has: *is anything happening?*
- **Cart bar** — springs up from `y:80` the first time the cart becomes
  non-empty. Before that it does not exist; a permanently visible empty cart is
  clutter.
- **Floor map** — tint cross-fade and a dot ring, but **no layout movement
  ever**. Staff navigate that screen by spatial memory.

Nothing runs longer than 600ms except ambient loops.

---

## Layout

**Guest (phone-first).** Glass header whose gold hairline fades in on scroll →
sticky scroll-snap category rail with a `layoutId` underline and edge-fade mask
→ content at `max-w-[560px]` → floating gilded cart pill.
`100dvh` everywhere, `env(safe-area-inset-bottom)` respected. The QR landing is
a full-bleed curtain-raiser with no chrome at all.

**Ops.** 72px icon rail (260px labelled at `xl+`, a sheet under `lg`) with a
`layoutId` gold active bar; glass topbar with a live mono clock and the
connection pill.

**Kitchen.** Its own shell, no rail — fullscreen `bg-void`, vignette,
independently scrolling lanes at `minmax(20rem, 1fr)`. Root font-size steps to
17px at 1920 and 19px at 2560. Plus **Glare mode**, which raises every surface
an elevation and kills the grain, because a pure-dark UI washes out under the
harsh overhead light of a real pass.

---

## Accessibility floor

- All status colours land 7.4–9.2:1 on obsidian by construction.
- **Status is never colour-only.** Every pill carries its label; the floor map
  legend is always visible. A new hire on their first shift cannot be expected
  to know that orchid means ready.
- Focus ring: 2px obsidian gap + 3.5px `gold-400` + a soft glow. Never a
  browser default, never a white `ring-offset`.
- 44×44 minimum touch targets on guest screens.
- `prefers-reduced-motion` kills ken-burns, grain drift, shimmer and sheen —
  but **keeps** the status colour transition. Removing all feedback from a state
  change is worse for comprehension than a little motion.
- `prefers-contrast: more` lifts hairlines and `ink-3`.
- Radix supplies focus trap and return, Escape, scroll lock and aria wiring on
  every dialog and sheet.

---

## Component inventory

`components/ui/` — Button (5 variants), Surface / GlassPanel, SectionHeading,
DiamondRule, StatusPill / StatusDot / Chip / DietMark, Sheet, Dialog, Input,
Textarea, SelectField, Toggle, Field, QuantityStepper, Skeleton, EmptyState,
Stat, Initials, DishImage.

`components/domain/` — KitchenTicket, LaneHeader, TableTile, FloorLegend,
OrderTimeline, MenuItemRow, MenuItemFeature, ElapsedTimer, LiveClock.

**Radix for behaviour, hand-written skins.** No `shadcn init`: its defaults
(zinc neutrals, `rounded-md` everywhere, `ring-offset-background`) are exactly
the fingerprint being avoided here, and a half-overridden component kit always
leaks. The composition patterns are worth stealing; the code is not.

Two details worth calling out:

- **`DishImage` can never leave a hole in the page.** A pinned Unsplash id can
  still be taken down, so on error it falls back to a warm gradient carrying the
  dish's initial in the display serif — which reads as deliberate plated-ware,
  not as a broken image.
- **`TableTile` renders round tables round.** That is what makes a floor plan
  feel like a room. A circle has far less usable area than its bounding box, so
  round tiles carry a reduced set of detail rather than clipping the full one.
