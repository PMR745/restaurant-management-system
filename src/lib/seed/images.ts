/**
 * Every image URL in the app lives here.
 *
 * Two rules:
 *  1. Photo ids are PINNED. Never `source.unsplash.com` — a photo that changes
 *     on every refresh reads as a bug, not as variety.
 *  2. One file, so re-art-directing a crop or swapping a dead photo is a
 *     single edit rather than a hunt through thirty components.
 *
 * Images are requested through next/image, which re-encodes to AVIF/WebP and
 * serves the right width per breakpoint. `DishImage` degrades to a gilded
 * gradient if a photo ever 404s, so a dead id is cosmetic, never broken.
 */

const UNSPLASH = "https://images.unsplash.com/photo-";

function u(id: string, w = 900, q = 75): string {
  return `${UNSPLASH}${id}?auto=format&fit=crop&w=${w}&q=${q}`;
}

export const IMG = {
  /* ── rooms & atmosphere ───────────────────────────────────────────────── */
  heroRoom: u("1550966871-3ed3cdb5ed0c", 2000, 78),
  roomDim: u("1414235077428-338989a2e8c0", 1600, 75),
  roomTable: u("1552566626-52f8b828add9", 1600, 75),

  /* ── category cards ───────────────────────────────────────────────────── */
  catSmallPlates: u("1476718406336-bb5a9690ee2a", 800),
  catJosper: u("1544025162-d76694265947", 800),
  catSignatures: u("1504674900247-0877df9cc836", 800),
  catBreads: u("1509440159596-0249088772ff", 800),
  catDesserts: u("1551024709-8f23befc6f87", 800),
  catBar: u("1514362545857-3bc16c4c7d1b", 800),

  /* ── small plates ─────────────────────────────────────────────────────── */
  burrataTruffle: u("1546069901-ba9599a7e63c"),
  scallop: u("1467003909585-2f8a72700288"),
  chaatFoie: u("1601050690597-df0568f70950"),
  beetTartare: u("1512621776951-a57141f2eefd"),
  oyster: u("1563379091339-03b21ab4a4f8"),
  galouti: u("1585937421612-70a008356fbe"),
  tempuraSoftShell: u("1476224203421-9ac39bcb3327"),

  /* ── from the josper ──────────────────────────────────────────────────── */
  lambChop: u("1544025162-d76694265947"),
  seabass: u("1467003909585-2f8a72700288"),
  cauliflowerSteak: u("1540189549336-e6e99c3679fe"),
  tandooriQuail: u("1555939594-58d7cb561ad1"),
  wagyuSkewer: u("1504674900247-0877df9cc836"),
  charredOctopus: u("1432139555190-58524dae6a55"),

  /* ── signatures ───────────────────────────────────────────────────────── */
  butterChicken: u("1604382354936-07c5d9983bd3"),
  laalMaas: u("1631515243349-e0cb75fb8d3a"),
  blackDaal: u("1585937421612-70a008356fbe"),
  malaiKofta: u("1596797038530-2c107229654b"),
  keralaPrawn: u("1473093295043-cdd812d0e601"),
  truffleRisotto: u("1476718406336-bb5a9690ee2a"),
  duckBiryani: u("1601050690597-df0568f70950"),

  /* ── breads & rice ────────────────────────────────────────────────────── */
  truffleNaan: u("1596797038530-2c107229654b"),
  laccha: u("1509440159596-0249088772ff"),
  khameeri: u("1510812431401-41d2bd2722f3"),
  saffronPulao: u("1563379091339-03b21ab4a4f8"),
  burntGarlicRice: u("1512058564366-18510be2db19"),

  /* ── desserts ─────────────────────────────────────────────────────────── */
  goldLeafKulfi: u("1551024709-8f23befc6f87"),
  chocolateSphere: u("1497534446932-c925b458314e"),
  rasmalaiTart: u("1565958011703-44f9829ba187"),
  mishtiTiramisu: u("1559847844-5315695dadae"),
  sorbetTrio: u("1432139555190-58524dae6a55"),

  /* ── cellar & bar ─────────────────────────────────────────────────────── */
  champagne: u("1481931098730-318b6f776db0"),
  smokedOldFashioned: u("1514362545857-3bc16c4c7d1b"),
  saffronMartini: u("1544145945-f90425340c7e"),
  masalaCoffee: u("1470337458703-46ad1756a187"),
  tenderCoconut: u("1587314168485-3236d6710814"),
  redWine: u("1563805042-7684c019e1cb"),
} as const;

export type ImageKey = keyof typeof IMG;

/**
 * A warm gradient for next/image `placeholder="blur"`. Kept as a URL-encoded
 * SVG rather than base64 so it needs no `Buffer` — this module is imported by
 * client components, where `Buffer` does not exist.
 *
 * A grey blur would break the warm palette for the ~200ms it is visible.
 */
export const BLUR_OBSIDIAN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%2325231F'/%3E%3Cstop offset='100%25' stop-color='%23141310'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='8' height='8' fill='url(%23g)'/%3E%3C/svg%3E";
