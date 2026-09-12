/**
 * Cross-device sync check.
 *
 * The acceptance suite runs every role in ONE browser, which the local adapter
 * satisfies via BroadcastChannel. This one uses two *isolated* browser
 * contexts — separate storage, separate origins of truth, no shared tab bus —
 * which is as close to "a phone and the kitchen screen" as a single machine
 * gets. Only a real backend can pass it.
 *
 * Crucially it never reloads the observing page: the order has to arrive over
 * the websocket, or not at all.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.ACCEPT_BASE ?? "https://noir-and-gold.vercel.app";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
  return ok;
}

async function waitFor(page, fn, timeout = 45000, poll = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn)) return true;
    await sleep(poll);
  }
  return false;
}

/** Same, for predicates that need an argument passed into the page context. */
async function waitForArg(page, fn, arg, timeout = 45000, poll = 500) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await page.evaluate(fn, arg)) return true;
    await sleep(poll);
  }
  return false;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

try {
  // Two independent contexts = two devices.
  const phoneCtx = await browser.createBrowserContext();
  const passCtx = await browser.createBrowserContext();

  const phone = await phoneCtx.newPage();
  const pass = await passCtx.newPage();
  for (const p of [phone, pass]) {
    p.setDefaultNavigationTimeout(120000);
    p.setDefaultTimeout(120000);
  }
  await phone.setViewport({ width: 420, height: 900, isMobile: true });
  await pass.setViewport({ width: 1600, height: 950 });

  const errors = [];
  phone.on("pageerror", (e) => errors.push(`[phone] ${e.message}`));
  pass.on("pageerror", (e) => errors.push(`[pass] ${e.message}`));

  /* ── 1. both devices connect to the backend ─────────────────────────── */
  await pass.goto(`${BASE}/kitchen`, { waitUntil: "networkidle2" });
  const passLive = await waitFor(pass, () =>
    document.body.innerText.toLowerCase().includes("supabase"),
  );
  check("kitchen screen reports Supabase mode", passLive);

  await phone.goto(`${BASE}/t/noir/T09`, { waitUntil: "networkidle2" });
  check(
    "phone loads the menu from Postgres",
    await waitFor(phone, () =>
      document.body.innerText.includes("Butter Chicken, 1947"),
    ),
  );

  /* ── 2. snapshot what the kitchen sees BEFORE the order ─────────────── */
  const before = await pass.evaluate(
    () => document.querySelectorAll("[data-order]").length,
  );

  /* ── 3. the phone orders ────────────────────────────────────────────── */
  await phone.goto(
    `${BASE}/t/noir/T09/item/00000000-0000-4000-8000-000000020012`,
    { waitUntil: "networkidle2" },
  );
  check(
    "phone opens a dish",
    await waitFor(phone, () => document.body.innerText.includes("Wagyu Seekh")),
  );

  const added = await phone.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.innerText.trim().toLowerCase().startsWith("add ·"),
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  check("phone adds the dish", added);
  await sleep(1500);

  await phone.goto(`${BASE}/t/noir/T09/cart`, { waitUntil: "networkidle2" });
  const placed = await phone.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.innerText.toLowerCase().includes("place order"),
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  check("phone places the order", placed);
  await sleep(3000);

  const seq = await phone.evaluate(
    () => document.body.innerText.match(/#\d{4}/)?.[0] ?? "",
  );
  check("order number issued by Postgres", /^#\d{4}$/.test(seq), seq);
  const seqNo = Number(seq.slice(1));

  /* ── 4. THE TEST: it must appear on the other device, unreloaded ────── */
  const arrivedLive = await waitForArg(
    pass,
    (n) => !!document.querySelector(`[data-order="${n}"]`),
    seqNo,
  );
  check(
    "*** order reached the kitchen screen over the websocket (no reload) ***",
    arrivedLive,
  );

  const after = await pass.evaluate(
    () => document.querySelectorAll("[data-order]").length,
  );
  check("kitchen ticket count grew", after > before, `${before} → ${after}`);

  /* ── 5. and the reverse direction ───────────────────────────────────── */
  const advanced = await pass.evaluate((n) => {
    const card = document.querySelector(`[data-order="${n}"]`);
    if (!card) return false;
    const btn = [...card.querySelectorAll("button")].find((b) =>
      b.innerText.toLowerCase().includes("accept"),
    );
    if (!btn) return false;
    btn.click();
    return true;
  }, seqNo);
  check("kitchen accepts the order", advanced);

  const guestSaw = await (async () => {
    const start = Date.now();
    while (Date.now() - start < 45000) {
      const h1 = await phone.evaluate(
        () => document.querySelector("h1")?.innerText.trim() ?? "",
      );
      if (h1.toLowerCase().includes("accepted")) return true;
      await sleep(500);
    }
    return false;
  })();
  check(
    "*** status flowed back to the phone over the websocket (no reload) ***",
    guestSaw,
  );

  console.log("\n" + results.join("\n"));
  console.log(
    errors.length ? `\nPage errors:\n${[...new Set(errors)].join("\n")}` : "\nNo page errors.",
  );
  console.log(`\n${results.length - failures}/${results.length} checks passed.`);
} finally {
  await browser.close();
}

process.exit(failures ? 1 : 0);
