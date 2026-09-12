/**
 * Visual capture pass.
 *
 * Separate from the acceptance test on purpose: that one asserts behaviour and
 * should stay fast, this one waits for every photograph to actually decode
 * before it presses the shutter. It also reports any image that failed to
 * load, which is the failure mode that quietly ruins a design like this one.
 */
import puppeteer from "puppeteer-core";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3300";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = process.env.SHOT_DIR ?? "./shots";

const PAGES = [
  { name: "01-launcher", url: "/", w: 1440, h: 1000, full: true },
  { name: "02-guest-landing", url: "/t/noir/T07", w: 420, h: 900, mobile: true },
  { name: "03-guest-menu", url: "/t/noir/T07", w: 420, h: 900, mobile: true, scroll: 1100 },
  {
    name: "04-dish-detail",
    url: "/t/noir/T07/item/00000000-0000-4000-8000-000000020014",
    w: 420,
    h: 900,
    mobile: true,
    full: true,
  },
  { name: "05-kitchen", url: "/kitchen", w: 1600, h: 950 },
  { name: "06-floor-map", url: "/admin/tables", w: 1600, h: 950 },
  { name: "07-admin", url: "/admin", w: 1600, h: 1050 },
  { name: "08-waiter", url: "/waiter", w: 1600, h: 950 },
  { name: "09-orders", url: "/admin/orders", w: 1600, h: 950 },
  { name: "10-menu-manager", url: "/admin/menu", w: 1600, h: 950 },
  { name: "11-takeaway", url: "/takeaway", w: 1600, h: 1000 },
  { name: "12-qr", url: "/admin/qr", w: 1440, h: 950 },
  { name: "13-staff", url: "/admin/staff", w: 1440, h: 950 },
  { name: "14-login", url: "/login", w: 1200, h: 900 },
  { name: "15-mobile-kitchen", url: "/kitchen", w: 400, h: 860, mobile: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

const page = await browser.newPage();
let broken = 0;

for (const spec of PAGES) {
  await page.setViewport({
    width: spec.w,
    height: spec.h,
    isMobile: !!spec.mobile,
    deviceScaleFactor: 2,
  });
  await page.goto(BASE + spec.url, { waitUntil: "networkidle2", timeout: 90000 });

  // Let hydration paint, then force every lazy image into view.
  await sleep(1200);
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
  });

  // Wait for decode rather than for the network to go quiet.
  const report = await page
    .evaluate(async () => {
      const imgs = [...document.images];
      await Promise.all(
        imgs.map((i) =>
          i.complete ? Promise.resolve() : i.decode().catch(() => {}),
        ),
      );
      return {
        total: imgs.length,
        failed: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
      };
    })
    .catch(() => ({ total: 0, failed: 0 }));

  if (spec.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), spec.scroll);
    await sleep(900);
  }
  await sleep(700);

  await page.screenshot({
    path: `${OUT}/${spec.name}.png`,
    fullPage: !!spec.full,
  });

  broken += report.failed;
  console.log(
    `${spec.name.padEnd(20)} images ${String(report.total).padStart(3)}  broken ${report.failed}`,
  );
}

console.log(broken ? `\n${broken} broken image(s).` : "\nAll images loaded.");
await browser.close();
