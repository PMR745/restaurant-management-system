import type {
  CustomerSession,
  MenuCategory,
  MenuItem,
  Order,
  OrderEvent,
  OrderItem,
  Restaurant,
  RestaurantTable,
  Snapshot,
  StaffMember,
} from "@/lib/domain/types";
import { IMG } from "./images";

/**
 * The demo restaurant, as a pure function.
 *
 * No randomness and no `Date.now()` at module scope — a seed that differs
 * between the server render and the client render is a hydration mismatch, and
 * a seed that differs between two browsers makes the Supabase upsert
 * non-idempotent.
 *
 * IDs are hardcoded and deterministic. That means a bookmarked
 * /admin/menu/<id> link survives flipping between the local and Supabase
 * adapters, and `on conflict do nothing` genuinely does nothing on a re-seed.
 *
 * Bump SEED_VERSION whenever the content below changes — the local adapter
 * uses it to decide whether to rewrite its store.
 */

export const SEED_VERSION = "2026-09-12.2";

/** Fixed epoch so seeded rows have stable timestamps across renders. */
const EPOCH = "2026-01-01T00:00:00.000Z";

const R = "00000000-0000-4000-8000-000000000001";
const cat = (n: number) => `00000000-0000-4000-8000-0000000100${pad(n)}`;
const item = (n: number) => `00000000-0000-4000-8000-0000000200${pad(n)}`;
const tbl = (n: number) => `00000000-0000-4000-8000-0000000300${pad(n)}`;
const stf = (n: number) => `00000000-0000-4000-8000-0000000400${pad(n)}`;
const ses = (n: number) => `00000000-0000-4000-8000-0000000500${pad(n)}`;
const ord = (n: number) => `00000000-0000-4000-8000-0000000600${pad(n)}`;
const oit = (n: number) => `00000000-0000-4000-8000-0000000700${pad(n)}`;
const oev = (n: number) => `00000000-0000-4000-8000-0000000800${pad(n)}`;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export const RESTAURANT_ID = R;
export const RESTAURANT_SLUG = "noir";

/** Shared by every seeded row. */
const base = (id: string) => ({
  id,
  restaurantId: R,
  createdAt: EPOCH,
  updatedAt: EPOCH,
  rev: 1,
  updatedBy: "seed",
  lastOpId: null,
  deletedAt: null,
});

/* ══ restaurant ═══════════════════════════════════════════════════════════ */

const restaurant: Restaurant = {
  ...base(R),
  slug: RESTAURANT_SLUG,
  name: "Noir & Gold",
  tagline: "Contemporary Indian · Charcoal & Cellar",
  heroImageUrl: IMG.heroRoom,
  currency: "INR",
  timezone: "Asia/Kolkata",
};

/* ══ staff ════════════════════════════════════════════════════════════════ */

const staff: StaffMember[] = [
  { n: 1, name: "Aditi Verma", role: "admin", initials: "AV" },
  { n: 2, name: "Chef Rohan Kale", role: "kitchen", initials: "RK" },
  { n: 3, name: "Meera Nair", role: "waiter", initials: "MN" },
  { n: 4, name: "Kabir Shetty", role: "waiter", initials: "KS" },
  { n: 5, name: "Farah Qureshi", role: "waiter", initials: "FQ" },
  { n: 6, name: "Dev Mathur", role: "front_desk", initials: "DM" },
].map((s) => ({
  ...base(stf(s.n)),
  name: s.name,
  role: s.role as StaffMember["role"],
  initials: s.initials,
  isOnShift: true,
}));

export const WAITER_IDS = [stf(3), stf(4), stf(5)];

/* ══ tables ═══════════════════════════════════════════════════════════════
   x/y are percentages on the floor-map canvas so the map scales with the
   viewport instead of needing a fixed pixel grid.                          */

const tableSpec: Array<{
  n: number;
  code: string;
  label: string;
  seats: number;
  zone: RestaurantTable["zone"];
  x: number;
  y: number;
  shape: RestaurantTable["shape"];
  waiter: number | null;
}> = [
  { n: 1, code: "T01", label: "Window One", seats: 2, zone: "indoor", x: 12, y: 18, shape: "round", waiter: 3 },
  { n: 2, code: "T02", label: "Window Two", seats: 2, zone: "indoor", x: 12, y: 44, shape: "round", waiter: 3 },
  { n: 3, code: "T03", label: "Window Three", seats: 4, zone: "indoor", x: 12, y: 72, shape: "square", waiter: 3 },
  { n: 4, code: "T04", label: "Hearth", seats: 4, zone: "indoor", x: 36, y: 20, shape: "square", waiter: 4 },
  { n: 5, code: "T05", label: "Hearth Two", seats: 4, zone: "indoor", x: 36, y: 48, shape: "square", waiter: 4 },
  { n: 6, code: "T06", label: "Banquette", seats: 6, zone: "indoor", x: 36, y: 76, shape: "booth", waiter: 4 },
  { n: 7, code: "T07", label: "Chef's Counter", seats: 4, zone: "indoor", x: 60, y: 22, shape: "booth", waiter: 5 },
  { n: 8, code: "T08", label: "Courtyard One", seats: 2, zone: "patio", x: 60, y: 50, shape: "round", waiter: 5 },
  { n: 9, code: "T09", label: "Courtyard Two", seats: 2, zone: "patio", x: 60, y: 76, shape: "round", waiter: 5 },
  { n: 10, code: "T10", label: "The Olive Tree", seats: 6, zone: "patio", x: 84, y: 24, shape: "round", waiter: null },
  { n: 11, code: "T11", label: "Cellar Nook", seats: 4, zone: "private", x: 84, y: 52, shape: "booth", waiter: null },
  { n: 12, code: "T12", label: "The Gold Room", seats: 8, zone: "private", x: 84, y: 78, shape: "square", waiter: null },
];

const tables: RestaurantTable[] = tableSpec.map((t) => ({
  ...base(tbl(t.n)),
  code: t.code,
  label: t.label,
  seats: t.seats,
  zone: t.zone,
  assignedWaiterId: t.waiter ? stf(t.waiter) : null,
  statusOverride: null,
  sortIndex: t.n,
  x: t.x,
  y: t.y,
  shape: t.shape,
}));

/* ══ menu ═════════════════════════════════════════════════════════════════ */

const categorySpec = [
  { n: 1, slug: "small-plates", name: "Small Plates", desc: "To begin — light, sharp, made for sharing.", img: IMG.catSmallPlates },
  { n: 2, slug: "from-the-josper", name: "From the Josper", desc: "Charcoal at 350°C. Smoke as a seasoning.", img: IMG.catJosper },
  { n: 3, slug: "signatures", name: "Signatures", desc: "The dishes people come back for.", img: IMG.catSignatures },
  { n: 4, slug: "breads-and-rice", name: "Breads & Rice", desc: "From the tandoor and the copper pot.", img: IMG.catBreads },
  { n: 5, slug: "desserts", name: "Desserts", desc: "A last, quiet flourish.", img: IMG.catDesserts },
  { n: 6, slug: "cellar-and-bar", name: "Cellar & Bar", desc: "Champagne, cocktails and a short, serious list.", img: IMG.catBar },
];

export const CATEGORY_IDS = {
  smallPlates: cat(1),
  josper: cat(2),
  signatures: cat(3),
  breads: cat(4),
  desserts: cat(5),
  bar: cat(6),
};

const categories: MenuCategory[] = categorySpec.map((c) => ({
  ...base(cat(c.n)),
  slug: c.slug,
  name: c.name,
  description: c.desc,
  imageUrl: c.img,
  sortIndex: c.n,
  isActive: true,
}));

type ItemSpec = {
  n: number;
  cat: number;
  name: string;
  desc: string;
  /** rupees — converted to paise below */
  price: number;
  img: string;
  prep: number;
  diet: MenuItem["dietTags"];
  spice?: MenuItem["spiceLevel"];
  signature?: boolean;
  out?: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: string[];
  upsell?: number[];
};

const itemSpec: ItemSpec[] = [
  /* ── small plates ───────────────────────────────────────────────────── */
  { n: 1, cat: 1, name: "Burrata, Truffle & Kasundi", desc: "Puglian burrata, black winter truffle, Bengali mustard, charred sourdough.", price: 1250, img: IMG.burrataTruffle, prep: 9, diet: ["veg"], kcal: 480, protein: 19, carbs: 22, fat: 34, allergens: ["Milk", "Gluten"], signature: true, upsell: [31, 25] },
  { n: 2, cat: 1, name: "Hokkaido Scallop, Curry Leaf", desc: "Seared scallop, curry-leaf beurre blanc, toasted coconut, lime pearls.", price: 1650, img: IMG.scallop, prep: 12, diet: ["non_veg"], kcal: 320, protein: 24, carbs: 9, fat: 20, allergens: ["Shellfish", "Milk"], signature: true },
  { n: 3, cat: 1, name: "Foie Gras Chaat", desc: "Seared foie, tamarind gel, crisp papdi, pomegranate, sev. Our most argued-about dish.", price: 1850, img: IMG.chaatFoie, prep: 11, diet: ["non_veg"], spice: "mild", kcal: 540, protein: 17, carbs: 28, fat: 39, allergens: ["Gluten"], signature: true },
  { n: 4, cat: 1, name: "Beetroot Tartare", desc: "Slow-roasted beet, smoked yoghurt, walnut praline, dill oil.", price: 950, img: IMG.beetTartare, prep: 8, diet: ["veg", "contains_nuts"], kcal: 290, protein: 8, carbs: 24, fat: 18, allergens: ["Milk", "Nuts"] },
  { n: 5, cat: 1, name: "Oysters, Kokum Mignonette", desc: "Half dozen, Konkan kokum, shallot, cracked pepper.", price: 1450, img: IMG.oyster, prep: 7, diet: ["non_veg"], kcal: 110, protein: 12, carbs: 6, fat: 3, allergens: ["Shellfish"] },
  { n: 6, cat: 1, name: "Galouti, Bone Marrow", desc: "Lucknowi lamb galouti, roasted marrow, warm ulte tawa parantha.", price: 1350, img: IMG.galouti, prep: 14, diet: ["non_veg"], spice: "medium", kcal: 610, protein: 31, carbs: 26, fat: 42, allergens: ["Gluten", "Milk"], signature: true },
  { n: 7, cat: 1, name: "Soft Shell Crab Tempura", desc: "Ajwain tempura, green chilli aioli, pickled kohlrabi.", price: 1550, img: IMG.tempuraSoftShell, prep: 13, diet: ["non_veg"], spice: "medium", kcal: 460, protein: 22, carbs: 30, fat: 27, allergens: ["Shellfish", "Gluten", "Egg"], out: true },

  /* ── from the josper ────────────────────────────────────────────────── */
  { n: 8, cat: 2, name: "Charcoal Lamb Chops", desc: "New Zealand rack, 24-hour cardamom marinade, burnt onion jus.", price: 2450, img: IMG.lambChop, prep: 24, diet: ["non_veg"], spice: "medium", kcal: 720, protein: 48, carbs: 8, fat: 54, allergens: ["Milk"], signature: true, upsell: [23, 34] },
  { n: 9, cat: 2, name: "Whole Sea Bass, Banana Leaf", desc: "Line-caught bass, Chettinad masala, grilled in banana leaf.", price: 2150, img: IMG.seabass, prep: 26, diet: ["non_veg"], spice: "hot", kcal: 540, protein: 52, carbs: 6, fat: 32, allergens: ["Fish"] },
  { n: 10, cat: 2, name: "Cauliflower Steak", desc: "Whole roasted cauliflower, makhani velouté, almond crumb, micro coriander.", price: 1150, img: IMG.cauliflowerSteak, prep: 22, diet: ["veg", "contains_nuts"], spice: "mild", kcal: 380, protein: 12, carbs: 29, fat: 24, allergens: ["Milk", "Nuts"] },
  { n: 11, cat: 2, name: "Tandoori Quail", desc: "Whole quail, Kashmiri chilli, honey-hung curd glaze, pickled onion.", price: 1750, img: IMG.tandooriQuail, prep: 20, diet: ["non_veg"], spice: "medium", kcal: 490, protein: 41, carbs: 11, fat: 31, allergens: ["Milk"] },
  { n: 12, cat: 2, name: "Wagyu Seekh", desc: "A5 Wagyu seekh, smoked garlic chutney, burnt tomato.", price: 3250, img: IMG.wagyuSkewer, prep: 18, diet: ["non_veg"], spice: "medium", kcal: 680, protein: 44, carbs: 5, fat: 55, allergens: [], signature: true },
  { n: 13, cat: 2, name: "Charred Octopus", desc: "Spanish octopus, kokum glaze, potato terrine, squid-ink crumb.", price: 1950, img: IMG.charredOctopus, prep: 21, diet: ["non_veg"], kcal: 420, protein: 38, carbs: 18, fat: 22, allergens: ["Shellfish"] },

  /* ── signatures ─────────────────────────────────────────────────────── */
  { n: 14, cat: 3, name: "Butter Chicken, 1947", desc: "Our great-grandmother's ratio. Tandoori thigh, San Marzano, white butter, fenugreek.", price: 1450, img: IMG.butterChicken, prep: 18, diet: ["non_veg"], spice: "mild", kcal: 690, protein: 42, carbs: 19, fat: 48, allergens: ["Milk", "Nuts"], signature: true, upsell: [23, 22] },
  { n: 15, cat: 3, name: "Laal Maas", desc: "Mathania chilli, mutton on the bone, ghee, smoked in the Rajasthani way.", price: 1850, img: IMG.laalMaas, prep: 26, diet: ["non_veg"], spice: "hot", kcal: 780, protein: 46, carbs: 12, fat: 58, allergens: ["Milk"] },
  { n: 16, cat: 3, name: "Daal Noir", desc: "Black urad, 36 hours over coal, finished with cream and a great deal of patience.", price: 950, img: IMG.blackDaal, prep: 12, diet: ["veg"], spice: "mild", kcal: 520, protein: 20, carbs: 42, fat: 30, allergens: ["Milk"], signature: true },
  { n: 17, cat: 3, name: "Malai Kofta, Saffron", desc: "Paneer and khoya dumplings, Kashmiri saffron velouté, gold leaf.", price: 1250, img: IMG.malaiKofta, prep: 19, diet: ["veg", "contains_nuts"], spice: "mild", kcal: 610, protein: 22, carbs: 34, fat: 41, allergens: ["Milk", "Nuts"] },
  { n: 18, cat: 3, name: "Kerala Prawn Moilee", desc: "Tiger prawns, first-press coconut milk, green chilli, curry leaf.", price: 1950, img: IMG.keralaPrawn, prep: 17, diet: ["non_veg"], spice: "medium", kcal: 470, protein: 38, carbs: 14, fat: 29, allergens: ["Shellfish"] },
  { n: 19, cat: 3, name: "Truffle Khichdi Risotto", desc: "Gobindobhog rice, moong daal, aged parmesan, shaved black truffle.", price: 1650, img: IMG.truffleRisotto, prep: 20, diet: ["veg"], kcal: 580, protein: 18, carbs: 62, fat: 28, allergens: ["Milk"], out: true },
  { n: 20, cat: 3, name: "Duck Dum Biryani", desc: "Sealed in pastry, opened at the table. Rohu duck, kewra, birista.", price: 2250, img: IMG.duckBiryani, prep: 28, diet: ["non_veg"], spice: "medium", kcal: 850, protein: 44, carbs: 78, fat: 40, allergens: ["Milk", "Gluten", "Nuts"], signature: true },

  /* ── breads & rice ──────────────────────────────────────────────────── */
  { n: 21, cat: 4, name: "Truffle & Cheese Naan", desc: "Aged cheddar, black truffle paste, cultured butter.", price: 650, img: IMG.truffleNaan, prep: 8, diet: ["veg"], kcal: 420, protein: 14, carbs: 44, fat: 22, allergens: ["Gluten", "Milk"], signature: true },
  { n: 22, cat: 4, name: "Laccha Parantha", desc: "Hundred folds, clarified butter, flaked sea salt.", price: 350, img: IMG.laccha, prep: 7, diet: ["veg"], kcal: 310, protein: 7, carbs: 38, fat: 15, allergens: ["Gluten", "Milk"] },
  { n: 23, cat: 4, name: "Khameeri Roti", desc: "Naturally leavened overnight, baked to order.", price: 300, img: IMG.khameeri, prep: 6, diet: ["veg", "vegan"], kcal: 240, protein: 8, carbs: 46, fat: 3, allergens: ["Gluten"] },
  { n: 24, cat: 4, name: "Saffron Pulao", desc: "Aged basmati, saffron, fried onion, whole spice.", price: 550, img: IMG.saffronPulao, prep: 11, diet: ["veg"], kcal: 380, protein: 8, carbs: 68, fat: 9, allergens: ["Milk"] },
  { n: 25, cat: 4, name: "Burnt Garlic Rice", desc: "Short grain, black garlic, spring onion, sesame.", price: 450, img: IMG.burntGarlicRice, prep: 9, diet: ["veg", "vegan"], kcal: 340, protein: 7, carbs: 64, fat: 7, allergens: ["Sesame"] },

  /* ── desserts ───────────────────────────────────────────────────────── */
  { n: 26, cat: 5, name: "24-Karat Kulfi", desc: "Pistachio malai kulfi, edible gold leaf, rose falooda.", price: 850, img: IMG.goldLeafKulfi, prep: 6, diet: ["veg", "contains_nuts"], kcal: 390, protein: 9, carbs: 38, fat: 23, allergens: ["Milk", "Nuts"], signature: true },
  { n: 27, cat: 5, name: "Chocolate Sphere", desc: "Valrhona dome, cardamom ganache, hot salted caramel poured at the table.", price: 1050, img: IMG.chocolateSphere, prep: 10, diet: ["veg"], kcal: 620, protein: 8, carbs: 58, fat: 40, allergens: ["Milk", "Soy"], signature: true },
  { n: 28, cat: 5, name: "Rasmalai Tart", desc: "Saffron custard, pistachio sablé, rose petal.", price: 750, img: IMG.rasmalaiTart, prep: 8, diet: ["veg", "contains_nuts"], kcal: 440, protein: 11, carbs: 46, fat: 24, allergens: ["Milk", "Gluten", "Nuts"] },
  { n: 29, cat: 5, name: "Mishti Doi Tiramisu", desc: "Bengali jaggery yoghurt, espresso sponge, cocoa nib.", price: 800, img: IMG.mishtiTiramisu, prep: 7, diet: ["veg", "egg"], kcal: 470, protein: 12, carbs: 49, fat: 25, allergens: ["Milk", "Egg", "Gluten"] },
  { n: 30, cat: 5, name: "Sorbet Trio", desc: "Aam panna, kokum, and bitter chocolate.", price: 600, img: IMG.sorbetTrio, prep: 5, diet: ["veg", "vegan"], kcal: 210, protein: 2, carbs: 48, fat: 2, allergens: [], out: true },

  /* ── cellar & bar ───────────────────────────────────────────────────── */
  { n: 31, cat: 6, name: "Champagne, by the glass", desc: "Billecart-Salmon Brut Réserve. 150ml.", price: 1950, img: IMG.champagne, prep: 4, diet: ["veg", "vegan"], kcal: 120, protein: 0, carbs: 4, fat: 0, allergens: ["Sulphites"], signature: true },
  { n: 32, cat: 6, name: "Smoked Old Fashioned", desc: "Bourbon, jaggery, applewood smoke under a cloche.", price: 1150, img: IMG.smokedOldFashioned, prep: 8, diet: ["veg", "vegan"], kcal: 230, protein: 0, carbs: 12, fat: 0, allergens: [], signature: true },
  { n: 33, cat: 6, name: "Saffron Martini", desc: "Gin, Kashmiri saffron, dry vermouth, lemon oil.", price: 1250, img: IMG.saffronMartini, prep: 7, diet: ["veg", "vegan"], kcal: 190, protein: 0, carbs: 3, fat: 0, allergens: [] },
  { n: 34, cat: 6, name: "Barrel-Aged Red", desc: "Sula Rasa Cabernet Sauvignon, Nashik. 150ml.", price: 950, img: IMG.redWine, prep: 4, diet: ["veg", "vegan"], kcal: 125, protein: 0, carbs: 4, fat: 0, allergens: ["Sulphites"] },
  { n: 35, cat: 6, name: "Masala Cold Brew", desc: "18-hour cold brew, cardamom, star anise, jaggery foam.", price: 450, img: IMG.masalaCoffee, prep: 6, diet: ["veg"], kcal: 140, protein: 3, carbs: 22, fat: 5, allergens: ["Milk"] },
  { n: 36, cat: 6, name: "Tender Coconut Cooler", desc: "Fresh coconut water, lime, mint, pink salt. No alcohol.", price: 400, img: IMG.tenderCoconut, prep: 5, diet: ["veg", "vegan"], kcal: 90, protein: 1, carbs: 20, fat: 0, allergens: [] },
];

const items: MenuItem[] = itemSpec.map((s) => ({
  ...base(item(s.n)),
  categoryId: cat(s.cat),
  name: s.name,
  description: s.desc,
  price: s.price * 100, // rupees -> paise
  imageUrl: s.img,
  availability: s.out ? "out_of_stock" : "available",
  prepTimeMinutes: s.prep,
  nutrition: {
    calories: s.kcal,
    protein: s.protein,
    carbs: s.carbs,
    fat: s.fat,
    allergens: s.allergens,
  },
  dietTags: s.diet,
  spiceLevel: s.spice ?? "none",
  isSignature: s.signature ?? false,
  upsellIds: (s.upsell ?? []).map(item),
  sortIndex: s.n,
}));

/* ══ pre-seeded live service ══════════════════════════════════════════════
   A demo that opens to an empty kitchen board needs a tour guide. Three
   orders across three statuses, so every screen has something to show on
   first load.                                                              */

/**
 * Seated times are relative to `now`, not to the fixed epoch.
 *
 * Timestamps that drive a DISPLAYED duration cannot be frozen: a session
 * pinned to the epoch shows a dwell time of "365653:16" on the floor map,
 * which is arithmetically correct and completely absurd. Only identities and
 * content are frozen; anything a clock reads is anchored to the present.
 */
const sessionSpec = [
  { n: 1, table: 4, guests: 4, device: "iPhone · Safari", agoMinutes: 38 },
  { n: 2, table: 6, guests: 5, device: "Android · Chrome", agoMinutes: 22 },
  { n: 3, table: 11, guests: 2, device: "iPad · Safari", agoMinutes: 64 },
];

function buildSessions(now: Date): CustomerSession[] {
  return sessionSpec.map((s) => {
    const startedAt = new Date(
      now.getTime() - s.agoMinutes * 60_000,
    ).toISOString();
    return {
      ...base(ses(s.n)),
      createdAt: startedAt,
      updatedAt: startedAt,
      tableId: tbl(s.table),
      startedAt,
      closedAt: null,
      guestCount: s.guests,
      guestName: null,
      lastActivityAt: startedAt,
      cartItemCount: 0,
      deviceLabel: s.device,
    };
  });
}

type SeedOrderSpec = {
  n: number;
  table: number | null;
  session: number | null;
  waiter: number | null;
  status: Order["status"];
  type: Order["type"];
  channel: Order["channel"];
  lines: Array<{ item: number; qty: number; note?: string }>;
  customerName?: string;
  externalRef?: string;
  /** minutes before "now" that this order was placed */
  agoMinutes: number;
};

const orderSpec: SeedOrderSpec[] = [
  {
    n: 1,
    table: 4,
    session: 1,
    waiter: 4,
    status: "preparing",
    type: "dine_in",
    channel: "qr",
    agoMinutes: 9,
    lines: [
      { item: 14, qty: 2 },
      { item: 21, qty: 2, note: "Extra truffle, please" },
      { item: 16, qty: 1 },
    ],
  },
  {
    n: 2,
    table: 6,
    session: 2,
    waiter: 4,
    status: "placed",
    type: "dine_in",
    channel: "qr",
    agoMinutes: 2,
    lines: [
      { item: 1, qty: 1 },
      { item: 8, qty: 2, note: "One medium rare, one well done" },
      { item: 31, qty: 2 },
    ],
  },
  {
    n: 3,
    table: 11,
    session: 3,
    waiter: null,
    status: "ready",
    type: "dine_in",
    channel: "qr",
    agoMinutes: 16,
    lines: [
      { item: 26, qty: 2 },
      { item: 35, qty: 2 },
    ],
  },
  {
    n: 4,
    table: null,
    session: null,
    waiter: null,
    status: "accepted",
    type: "online",
    channel: "zomato",
    agoMinutes: 5,
    customerName: "Ishaan Gupta",
    externalRef: "ZOM-48231",
    lines: [
      { item: 14, qty: 1 },
      { item: 23, qty: 3 },
      { item: 16, qty: 1 },
    ],
  },
  {
    n: 5,
    table: null,
    session: null,
    waiter: null,
    status: "placed",
    type: "takeaway",
    channel: "front_desk",
    agoMinutes: 1,
    customerName: "Priya Raghavan",
    lines: [
      { item: 20, qty: 1 },
      { item: 30, qty: 1 },
    ],
  },
];

/** Item status implied by the order's status, for seeded rows. */
function seedItemStatus(o: Order["status"]): OrderItem["status"] {
  if (o === "ready") return "ready";
  if (o === "preparing") return "preparing";
  return "pending";
}

function buildService(now: Date) {
  const orders: Order[] = [];
  const orderItems: OrderItem[] = [];
  const orderEvents: OrderEvent[] = [];
  const itemById = new Map(items.map((i) => [i.id, i]));
  let lineNo = 0;
  let eventNo = 0;

  for (const spec of orderSpec) {
    const placedAt = new Date(
      now.getTime() - spec.agoMinutes * 60_000,
    ).toISOString();

    let subtotal = 0;
    let itemCount = 0;

    for (const [idx, line] of spec.lines.entries()) {
      const mi = itemById.get(item(line.item))!;
      subtotal += mi.price * line.qty;
      itemCount += line.qty;
      lineNo += 1;
      orderItems.push({
        ...base(oit(lineNo)),
        createdAt: placedAt,
        updatedAt: placedAt,
        orderId: ord(spec.n),
        menuItemId: mi.id,
        nameSnapshot: mi.name,
        unitPriceSnapshot: mi.price,
        imageUrlSnapshot: mi.imageUrl,
        quantity: line.qty,
        specialInstructions: line.note ?? null,
        status: seedItemStatus(spec.status),
        servedAt: null,
        sortIndex: idx,
      });
    }

    // Walk the state machine so the guest timeline has real timestamps.
    const path: Order["status"][] = [
      "placed",
      "accepted",
      "preparing",
      "ready",
    ];
    const reached = path.slice(0, path.indexOf(spec.status) + 1);
    const stamps: Partial<Record<Order["status"], string>> = {};
    reached.forEach((s, i) => {
      stamps[s] = new Date(
        new Date(placedAt).getTime() + i * 3 * 60_000,
      ).toISOString();
    });

    reached.forEach((s, i) => {
      eventNo += 1;
      orderEvents.push({
        ...base(oev(eventNo)),
        createdAt: stamps[s]!,
        updatedAt: stamps[s]!,
        orderId: ord(spec.n),
        fromStatus: i === 0 ? null : reached[i - 1]!,
        toStatus: s,
        actor: i === 0 ? (spec.channel === "qr" ? "customer" : "system") : "kitchen",
        actorId: null,
        note: null,
        at: stamps[s]!,
      });
    });

    orders.push({
      ...base(ord(spec.n)),
      createdAt: placedAt,
      updatedAt: placedAt,
      seqNo: spec.n,
      type: spec.type,
      channel: spec.channel,
      status: spec.status,
      tableId: spec.table ? tbl(spec.table) : null,
      sessionId: spec.session ? ses(spec.session) : null,
      waiterId: spec.waiter ? stf(spec.waiter) : null,
      customerName: spec.customerName ?? null,
      customerPhone: null,
      externalRef: spec.externalRef ?? null,
      itemCount,
      subtotal,
      note: null,
      placedAt: stamps.placed ?? null,
      acceptedAt: stamps.accepted ?? null,
      preparingAt: stamps.preparing ?? null,
      readyAt: stamps.ready ?? null,
      servedAt: null,
      cancelledAt: null,
      cancelReason: null,
    });
  }

  return { orders, orderItems, orderEvents };
}

/**
 * `now` is injected rather than read, so the caller controls it. The local
 * adapter passes the real clock (so aging timers look alive on first open);
 * anything that needs byte-stable output can pass the fixed epoch.
 */
export function buildSeed(now: Date = new Date()): Snapshot {
  const service = buildService(now);
  return {
    restaurants: [restaurant],
    staff,
    restaurant_tables: tables,
    menu_categories: categories,
    menu_items: items,
    customer_sessions: buildSessions(now),
    orders: service.orders,
    order_items: service.orderItems,
    order_events: service.orderEvents,
  };
}

export const SEED_ORDER_COUNT = orderSpec.length;
