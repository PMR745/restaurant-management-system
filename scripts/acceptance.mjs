/**
 * End-to-end acceptance test for the POC success criteria.
 *
 * Drives two pages at once — a guest phone and the kitchen board — in one
 * browser context, which is exactly how the local sync adapter is meant to be
 * exercised (shared localStorage + BroadcastChannel across tabs).
 */
import puppeteer from "puppeteer-core";

// Point at a deployment with ACCEPT_BASE=https://… to verify it for real.
const BASE = process.env.ACCEPT_BASE ?? "http://localhost:3300";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SHOTS =
  "C:\\Users\\prath\\AppData\\Local\\Temp\\claude\\c--Users-prath-Desktop-PMR-Code-React\\3fa5a249-b81a-4db2-8294-95b96046fa92\\scratchpad\\shots";

const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
  return ok;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Case-insensitive on purpose: Chrome's `innerText` reflects CSS
 * `text-transform`, and much of this design sets small-caps labels in
 * `uppercase`. Matching case here would assert on styling, not content.
 */
async function waitForText(page, text, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await page.evaluate(
      (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      text,
    );
    if (found) return true;
    await sleep(250);
  }
  return false;
}

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, t) =>
      [...document.querySelectorAll(sel)].find((el) =>
        el.innerText.trim().toLowerCase().includes(t.toLowerCase()),
      ) ?? null,
    selector,
    text,
  );
  const el = handle.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

/** The guest's CURRENT status, read from the tracking headline. */
async function guestStatus(page) {
  return page.evaluate(
    () => document.querySelector("h1")?.innerText.trim() ?? "",
  );
}

/**
 * Click a labelled button inside the card for one specific order.
 *
 * Both the kitchen ticket and the waiter card carry `data-order="<seqNo>"`,
 * which makes this an exact lookup rather than DOM archaeology over nested
 * divs — the kind of heuristic that passes by clicking the wrong card.
 */
async function clickInOrderCard(page, seqNo, label) {
  const handle = await page.evaluateHandle(
    (n, l) => {
      const card = document.querySelector(`[data-order="${n}"]`);
      if (!card) return null;
      return (
        [...card.querySelectorAll("button")].find((b) =>
          b.innerText.trim().toLowerCase().includes(l.toLowerCase()),
        ) ?? null
      );
    },
    seqNo,
    label,
  );
  const el = handle.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});

const consoleErrors = [];

/**
 * Puppeteer's 30s default is fine against localhost and marginal against a
 * real deployment, where a cold lambda plus image optimisation on first hit
 * can exceed it. A timeout there is a property of the network, not of the app,
 * and failing the run for it would be noise.
 */
const NAV_TIMEOUT = BASE.startsWith("http://localhost") ? 30_000 : 90_000;
async function newPage() {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT);
  page.setDefaultTimeout(NAV_TIMEOUT);
  return page;
}

try {
  /* ── 1. guest opens the QR link ─────────────────────────────────────── */
  const guest = await newPage();
  await guest.setViewport({ width: 420, height: 900, isMobile: true });
  guest.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[guest] ${m.text()}`);
  });
  guest.on("pageerror", (e) => consoleErrors.push(`[guest] ${e.message}`));

  await guest.goto(`${BASE}/t/noir/T07`, { waitUntil: "networkidle2" });
  check("guest: QR landing renders the restaurant", await waitForText(guest, "Noir"));
  check(
    "guest: table identity shown",
    await waitForText(guest, "Chef's Counter"),
  );
  check("guest: menu loaded", await waitForText(guest, "Small Plates"));
  check(
    "guest: signature dish present",
    await waitForText(guest, "Butter Chicken, 1947"),
  );
  check(
    "guest: sold-out item is marked, not hidden",
    await waitForText(guest, "86"),
  );
  await guest.screenshot({ path: `${SHOTS}/01-guest-landing.png` });

  /* ── 2. open a dish, add to the order ───────────────────────────────── */
  await guest.goto(
    `${BASE}/t/noir/T07/item/00000000-0000-4000-8000-000000020014`,
    { waitUntil: "networkidle2" },
  );
  check(
    "guest: dish detail renders",
    await waitForText(guest, "Butter Chicken, 1947"),
  );
  check("guest: nutrition panel present", await waitForText(guest, "Per serving"));
  check("guest: prep time shown", await waitForText(guest, "min"));
  check(
    "guest: upsell suggestions present",
    await waitForText(guest, "Pairs beautifully with"),
  );
  await guest.screenshot({ path: `${SHOTS}/02-dish-detail.png`, fullPage: true });

  // bump quantity to 2, then add
  await clickByText(guest, "button", "+");
  const plus = await guest.$('button[aria-label="Increase quantity"]');
  if (plus) await plus.click();
  await sleep(200);
  check("guest: add-to-order button", await clickByText(guest, "button", "Add ·"));
  await sleep(1200);

  /* ── 3. cart, then place the order ──────────────────────────────────── */
  await guest.goto(`${BASE}/t/noir/T07/cart`, { waitUntil: "networkidle2" });
  check("guest: cart holds the dish", await waitForText(guest, "Butter Chicken"));
  check("guest: order value shown", await waitForText(guest, "Order value"));
  await guest.screenshot({ path: `${SHOTS}/03-cart.png`, fullPage: true });

  check("guest: place order", await clickByText(guest, "button", "Place order"));
  await sleep(2500);

  const trackingUrl = guest.url();
  check(
    "guest: routed to live tracking",
    /\/order\/[0-9a-f-]{36}$/.test(trackingUrl),
    trackingUrl,
  );
  check(
    "guest: timeline shows order received",
    (await guestStatus(guest)) === "Order received",
    await guestStatus(guest),
  );

  // The order number identifies this exact ticket on the kitchen board.
  const seq = await guest.evaluate(
    () => document.body.innerText.match(/#\d{4}/)?.[0] ?? "",
  );
  check("guest: order number assigned", /^#\d{4}$/.test(seq), seq);
  const seqNo = Number(seq.slice(1));
  await guest.screenshot({ path: `${SHOTS}/04-tracking-placed.png`, fullPage: true });

  /* ── 4. the kitchen sees it ─────────────────────────────────────────── */
  const kitchen = await newPage();
  kitchen.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[kitchen] ${m.text()}`);
  });
  kitchen.on("pageerror", (e) => consoleErrors.push(`[kitchen] ${e.message}`));

  await kitchen.goto(`${BASE}/kitchen`, { waitUntil: "networkidle2" });
  check("kitchen: board renders", await waitForText(kitchen, "The Pass"));
  check(
    "kitchen: guest order arrived in a lane",
    await waitForText(kitchen, "Butter Chicken, 1947"),
  );
  check("kitchen: lanes present", await waitForText(kitchen, "Preparing"));
  check(
    "kitchen: pre-seeded Zomato ticket present",
    await waitForText(kitchen, "Ishaan Gupta"),
  );
  await kitchen.screenshot({ path: `${SHOTS}/05-kitchen-new.png` });

  /* ── 5. walk the state machine on THIS ticket ───────────────────────── */
  check(
    `kitchen: accept ${seq}`,
    await clickInOrderCard(kitchen, seqNo, "Accept"),
  );
  await sleep(1000);
  check(
    `kitchen: start preparing ${seq}`,
    await clickInOrderCard(kitchen, seqNo, "Start preparing"),
  );
  await sleep(1000);
  check(
    `kitchen: mark ready ${seq}`,
    await clickInOrderCard(kitchen, seqNo, "Mark ready"),
  );
  await sleep(1400);
  await kitchen.screenshot({ path: `${SHOTS}/06-kitchen-ready.png` });

  /* ── 6. the guest's timeline followed along ─────────────────────────── */
  await guest.reload({ waitUntil: "networkidle2" });
  await sleep(800);
  const readyStatus = await guestStatus(guest);
  check(
    "guest: timeline reached Ready",
    readyStatus.includes("on its way"),
    readyStatus,
  );
  await guest.screenshot({ path: `${SHOTS}/07-tracking-ready.png`, fullPage: true });

  /* ── 7. floor map reflects the table ────────────────────────────────── */
  const floor = await newPage();
  floor.on("pageerror", (e) => consoleErrors.push(`[floor] ${e.message}`));
  await floor.goto(`${BASE}/admin/tables`, { waitUntil: "networkidle2" });
  check("floor: map renders", await waitForText(floor, "Available"));
  const t07Ready = await floor.evaluate(() => {
    const el = [...document.querySelectorAll("[data-status]")].find((n) =>
      n.getAttribute("aria-label")?.includes("Chef's Counter"),
    );
    return el?.getAttribute("data-status") ?? "missing";
  });
  check("floor: T07 derived status is Ready", t07Ready === "ready", t07Ready);
  await floor.screenshot({ path: `${SHOTS}/08-floor-map.png` });

  /* ── 8. waiter serves it ────────────────────────────────────────────── */
  const waiter = await newPage();
  waiter.on("pageerror", (e) => consoleErrors.push(`[waiter] ${e.message}`));
  await waiter.goto(`${BASE}/waiter`, { waitUntil: "networkidle2" });
  check("waiter: board renders", await waitForText(waiter, "Ready to serve"));
  check(
    "waiter: the ready order is queued",
    await waitForText(waiter, "Butter Chicken"),
  );
  await waiter.screenshot({ path: `${SHOTS}/09-waiter.png` });

  // Serve the card carrying this order, not merely the first one on screen.
  check(
    `waiter: serve ${seq}`,
    await clickInOrderCard(waiter, seqNo, "Serve all"),
  );
  await sleep(1500);

  await guest.reload({ waitUntil: "networkidle2" });
  await sleep(800);
  const servedStatus = await guestStatus(guest);
  check(
    "guest: timeline reached Served",
    servedStatus === "Served",
    servedStatus,
  );
  await guest.screenshot({ path: `${SHOTS}/10-tracking-served.png`, fullPage: true });

  /* ── 8b. the table settles back on the floor map ────────────────────── */
  await floor.reload({ waitUntil: "networkidle2" });
  await sleep(800);
  const t07Served = await floor.evaluate(() => {
    const el = [...document.querySelectorAll("[data-status]")].find((n) =>
      n.getAttribute("aria-label")?.includes("Chef's Counter"),
    );
    return el?.getAttribute("data-status") ?? "missing";
  });
  check("floor: T07 derived status is Served", t07Served === "served", t07Served);

  /* ── 9. menu management propagates ──────────────────────────────────── */
  const menu = await newPage();
  menu.on("pageerror", (e) => consoleErrors.push(`[menu] ${e.message}`));
  await menu.goto(`${BASE}/admin/menu`, { waitUntil: "networkidle2" });
  check("menu: manager renders", await waitForText(menu, "The menu"));
  await menu.screenshot({ path: `${SHOTS}/11-menu-manager.png` });

  /* ── 10. remaining ops screens render ───────────────────────────────── */
  const admin = await newPage();
  admin.on("pageerror", (e) => consoleErrors.push(`[admin] ${e.message}`));

  await admin.goto(`${BASE}/admin`, { waitUntil: "networkidle2" });
  check("admin: overview renders", await waitForText(admin, "This evening"));
  check("admin: live stats present", await waitForText(admin, "Tables seated"));
  await admin.screenshot({ path: `${SHOTS}/12-admin-overview.png` });

  await admin.goto(`${BASE}/admin/orders`, { waitUntil: "networkidle2" });
  check("orders: console renders", await waitForText(admin, "Orders"));
  check(
    "orders: online channel visible",
    await waitForText(admin, "Zomato"),
  );
  await admin.screenshot({ path: `${SHOTS}/13-orders.png` });

  await admin.goto(`${BASE}/takeaway`, { waitUntil: "networkidle2" });
  check("takeaway: desk renders", await waitForText(admin, "New takeaway"));
  await admin.screenshot({ path: `${SHOTS}/14-takeaway.png` });

  await admin.goto(`${BASE}/admin/qr`, { waitUntil: "networkidle2" });
  check("qr: sheet renders", await waitForText(admin, "Scan to view the menu"));
  const qrOk = await admin.evaluate(() => {
    const img = document.querySelector('img[alt*="QR code"]');
    return img?.getAttribute("src")?.startsWith("data:image/png") ?? false;
  });
  check("qr: codes actually generated", qrOk);
  await admin.screenshot({ path: `${SHOTS}/15-qr.png` });

  await admin.goto(`${BASE}/admin/staff`, { waitUntil: "networkidle2" });
  check("staff: board renders", await waitForText(admin, "On shift"));
  await admin.screenshot({ path: `${SHOTS}/16-staff.png` });

  await admin.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  check("login: screen renders", await waitForText(admin, "Staff access"));
  await admin.screenshot({ path: `${SHOTS}/17-login.png` });

  await admin.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  check("launcher: renders", await waitForText(admin, "How to see it working"));
  await admin.screenshot({ path: `${SHOTS}/18-launcher.png`, fullPage: true });

  /* ── 11. responsive sanity ──────────────────────────────────────────── */
  await admin.setViewport({ width: 400, height: 860 });
  await admin.goto(`${BASE}/admin/tables`, { waitUntil: "networkidle2" });
  const overflow = await admin.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  check("responsive: no horizontal overflow at 400px", !overflow);
  await admin.screenshot({ path: `${SHOTS}/19-mobile-floor.png` });
} catch (err) {
  check("harness completed without throwing", false, err.message);
} finally {
  console.log("\n" + results.join("\n"));
  if (consoleErrors.length) {
    console.log("\nCONSOLE ERRORS:");
    console.log([...new Set(consoleErrors)].slice(0, 20).join("\n"));
  } else {
    console.log("\nNo console or page errors.");
  }
  console.log(`\n${results.length - failures}/${results.length} checks passed.`);
  await browser.close();
  process.exit(failures ? 1 : 0);
}
