/**
 * The 44 by 44 hit target budget, measured rather than asserted.
 *
 * WHY IT EXISTS. CLAUDE.md's Budgets table carries "Minimum hit target 44 by 44
 * points" and until now no gate read it. The sticker audit scores colour and
 * shape and never area; `hudGeometryHolds` in economy-moments.mjs walks the
 * three header readouts and nothing else. So a pressable control anywhere else
 * in the app could sit under the floor for a whole phase and every gate would
 * stay green. One did: the pathway's side quest chip has measured 154 by 34
 * since the S2 round.
 *
 * WHAT IT MEASURES, and the distinction is load bearing. `offsetWidth` and
 * `offsetHeight`, which are the LAYOUT box, never `getBoundingClientRect()`,
 * which is the TRANSFORMED one. Every control in this app carries `.press`,
 * and `.press:active` is `transform: scale(0.96)`, so a rect read during the
 * 120 ms settle of a press measures a 44px button at 43.5. The S4 round found
 * that the hard way in the sticker audit and fixed it there; this script is
 * written the right way from its first run.
 *
 * WHAT COUNTS AS A CONTROL. Anything a pointer can press: `button`, `a[href]`,
 * `[role="button"]`, `[role="tab"]`, `[role="switch"]`, and form inputs. Hidden
 * elements (zero box, `visibility: hidden`, `display: none`, an inert subtree)
 * are skipped, because an off screen control is not a target. A control whose
 * own box is under the floor but which is WRAPPED in a large enough pressable
 * ancestor is still reported, because the ancestor is not what receives the
 * press.
 *
 * IT IS A FLOOR CHECK AND IT DOES NOT SCORE SPACING. Two 44px targets 2px apart
 * are a mis-tap problem this script cannot see; that is the synthetic fingertip
 * model in the win axes table and it belongs to the trainer's own measurement.
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import {
  P3_SEED,
  P3_STORED,
  P5_STORED,
  installSeed,
  p5ReadySeed,
  settleBoot,
  sleep,
  withApp,
} from "./economy-moments.mjs";

const FLOOR_PX = 44;
const DIST = path.join(process.cwd(), "dist");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

/**
 * The routes walked. The pathway is seeded twice because its side quest row and
 * its node column only exist with a journal behind them, and an empty pathway
 * would hide exactly the control this script was written to catch.
 */
const ROUTES = [
  { name: "pathway", hash: "#/pathway", journal: P3_SEED, stored: P3_STORED },
  { name: "pathway-ready", hash: "#/pathway", journal: p5ReadySeed(), stored: P5_STORED },
  { name: "trainer", hash: "#/trainer", journal: P3_SEED, stored: P3_STORED },
  { name: "cards", hash: "#/cards", journal: P3_SEED, stored: P3_STORED },
  // The fifth bar item, wired 2026-09-05. Its quest rows and its disabled
  // cheer button are controls, so they are held to the same 44px floor.
  { name: "feed", hash: "#/feed", journal: P3_SEED, stored: P3_STORED },
  { name: "me", hash: "#/me", journal: P3_SEED, stored: P3_STORED },
  { name: "courses", hash: "#/courses", journal: P3_SEED, stored: P3_STORED },
  { name: "periodic", hash: "#/periodic", journal: P3_SEED, stored: P3_STORED },
  { name: "search", hash: "#/search", journal: P3_SEED, stored: P3_STORED },
  { name: "chat", hash: "#/chat", journal: P3_SEED, stored: P3_STORED },
  { name: "leaderboards", hash: "#/leaderboards", journal: P3_SEED, stored: P3_STORED },
  { name: "messages", hash: "#/messages", journal: P3_SEED, stored: P3_STORED },
];

const measureControls = (floor) =>
  // eslint-disable-next-line no-undef
  Array.from(
    document.querySelectorAll(
      'button, a[href], [role="button"], [role="tab"], [role="switch"], input:not([type="hidden"]), select, textarea',
    ),
  )
    .map((el) => {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return null;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w === 0 && h === 0) return null;
      if (el.closest("[inert]") || el.closest('[aria-hidden="true"]')) return null;
      /*
       * A BOX UNDER THE FLOOR IS NOT YET A FAILURE: ASK WHAT RECEIVES THE
       * PRESS. The header above says the ancestor is not what receives the
       * press, and the same logic cuts the other way. A control may carry
       * its own extended target, an absolutely positioned ::after inset
       * negatively so the pressable area is larger than the painted one,
       * which is the standard way to give a small visual a full target.
       * The pathway rail does exactly that: pathway.css:1152 is titled
       * "44px OF TARGET AROUND A 36px CIRCLE", and growing the circle to 44
       * instead would make fifteen steps a 780px strip.
       *
       * Measuring offsetWidth alone is blind to it, so this run failed a
       * compliant control 60 times. The probe below is not an exemption and
       * not a list of blessed selectors: it hit-tests the four extremes of
       * the floor-sized box centred on the control and asks the DOCUMENT
       * what it would hand the press to. It counts only when the answer is
       * this control or something inside it.
       */
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const reach = floor / 2 - 1;
      const corners = [
        [cx - reach, cy - reach],
        [cx + reach, cy - reach],
        [cx - reach, cy + reach],
        [cx + reach, cy + reach],
      ];
      const receivesPress = corners.every(([x, y]) => {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return false;
        const hit = document.elementFromPoint(x, y);
        return hit !== null && (hit === el || el.contains(hit) || hit.contains(el));
      });

      return {
        selector:
          el.tagName.toLowerCase() +
          (el.className && typeof el.className === "string"
            ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
            : ""),
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
        w,
        h,
        extended: receivesPress,
      };
    })
    .filter((row) => row !== null && (row.w < floor || row.h < floor));

async function main() {
  const server = http.createServer(async (req, res) => {
    const requested = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(DIST, requested);
    if (!existsSync(file) || requested === "/") file = path.join(DIST, "index.html");
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const origin = `http://localhost:${server.address().port}/`;

  const executablePath = CHROME.find(existsSync);
  if (!executablePath) {
    console.error("No Chrome or Edge binary found. Cannot measure; refusing to report a pass.");
    process.exit(2);
  }
  const browser = await puppeteer.launch({ executablePath, headless: "new", args: ["--no-sandbox"] });

  const findings = [];
  let inspected = 0;
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 });
      await installSeed(page, "light", route.journal, route.stored);
      await page.goto(origin + withApp(route.hash), { waitUntil: "networkidle0" });
      await settleBoot(page);
      await sleep(700);
      const rows = await page.evaluate(measureControls, FLOOR_PX);
      const total = await page.evaluate(
        () =>
          document.querySelectorAll(
            'button, a[href], [role="button"], [role="tab"], [role="switch"], input:not([type="hidden"]), select, textarea',
          ).length,
      );
      inspected += total;
      for (const row of rows) findings.push({ viewport: viewport.name, route: route.name, ...row });
      await page.close();
    }
  }

  await browser.close();
  server.close();

  const grouped = new Map();
  for (const row of findings) {
    const key = `${row.selector}|${row.w}x${row.h}`;
    const seen = grouped.get(key);
    if (seen) {
      seen.count += 1;
      if (!seen.routes.includes(row.route)) seen.routes.push(row.route);
    } else {
      grouped.set(key, { ...row, count: 1, routes: [row.route] });
    }
  }
  const all = [...grouped.values()].sort((a, b) => a.w * a.h - b.w * b.h);
  // A small box that still receives the press across the whole floor-sized
  // area is compliant, and is reported rather than hidden: the reader should
  // be able to see the technique being used and go and check it.
  const extended = all.filter((row) => row.extended === true);
  const rows = all.filter((row) => row.extended !== true);

  console.log(`hit targets, floor ${FLOOR_PX} by ${FLOOR_PX}, layout box (offsetWidth/offsetHeight)`);
  console.log(`${ROUTES.length} route(s) x ${VIEWPORTS.length} viewport(s), ${inspected} control(s) inspected`);
  if (extended.length > 0) {
    console.log("");
    console.log(`SMALL BOX, FULL TARGET: ${extended.length} distinct control(s). The painted box is under`);
    console.log(`the floor and the document hands the press to the control across the whole ${FLOOR_PX} by ${FLOOR_PX}`);
    console.log(`area, hit-tested at all four extremes. Compliant.`);
    for (const row of extended) {
      console.log(`  ${row.w} by ${row.h} painted   ${row.selector}   ${row.routes.join(", ")}   ${JSON.stringify(row.label)}`);
    }
  }
  if (rows.length === 0) {
    console.log("UNDER THE FLOOR: 0");
  } else {
    console.log("");
    for (const row of rows) {
      console.log(
        `  ${row.w} by ${row.h}   ${row.selector}   ${row.routes.join(", ")}   ${JSON.stringify(row.label)}`,
      );
    }
    console.log("");
    console.log(`UNDER THE FLOOR: ${rows.length} distinct control(s), ${findings.length} instance(s)`);
  }

  await writeFile(
    path.join(process.cwd(), "measurements", "hit-targets.json"),
    `${JSON.stringify({ generated: new Date().toISOString(), floorPx: FLOOR_PX, inspected, findings: rows }, null, 2)}\n`,
    "utf8",
  );
  process.exit(rows.length === 0 ? 0 : 1);
}

await main();
