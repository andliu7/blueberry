/**
 * How big the phone bar's tab glyphs really draw: each glyph's painted box and ink area,
 * in CSS px, rendered by the browser (shell round 8, 2026-10-07).
 *
 * WHY. The critic measured the bar's glyphs against Duolingo's and found ours about a
 * third lighter (round 7: 411 to 584 px2 of ink against 685 to 880). The svg's own size
 * says nothing about that, because each drawing leaves air inside its grid. This counts
 * the pixels that are actually painted.
 *
 * HOW. For each glyph in the phone bar: clone the svg, write every shape's computed fill
 * and stroke onto it (the shapes read --site-tab-* variables, which an image cut loose
 * from the page cannot resolve), draw it into a canvas at 4 pixels per CSS px, and count
 * the pixels with alpha of at least 128 (half covered or more), and their bounding box.
 * src/test/siteTabInk.test.ts pins the same floors from the geometry, without a browser.
 *
 * Usage: node measurements/tab-glyph-ink.mjs [base] [route]
 *   base defaults to http://localhost:5530, route to study-decks (Review is current there).
 */
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:5530";
const ROUTE = process.argv[3] ?? "study-decks";
const CHROME = process.env.CHROME ?? "C:/Users/zeusa/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await page.evaluateOnNewDocument(() => {
    try {
      sessionStorage.setItem("bb-loader-seen", "1");
    } catch {
      /* private mode: the loader plays, the bar is the same */
    }
  });
  await page.goto(`${BASE}/#/${ROUTE}`, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".site-bar svg[data-tab-icon]", { timeout: 15000 });
  const rows = await page.evaluate(async () => {
    const K = 4;
    const out = [];
    for (const a of document.querySelectorAll(".site-bar a.site-nav-item")) {
      const svg = a.querySelector("svg[data-tab-icon]");
      const css = svg.getBoundingClientRect().width;
      const clone = svg.cloneNode(true);
      const src = svg.querySelectorAll("*");
      clone.querySelectorAll("*").forEach((el, i) => {
        const cs = getComputedStyle(src[i]);
        el.style.fill = cs.fill;
        el.style.stroke = cs.stroke;
      });
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("width", css * K);
      clone.setAttribute("height", css * K);
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
      await img.decode();
      const cv = document.createElement("canvas");
      cv.width = cv.height = css * K;
      const g = cv.getContext("2d");
      g.drawImage(img, 0, 0);
      const { data } = g.getImageData(0, 0, cv.width, cv.height);
      let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++)
        for (let x = 0; x < cv.width; x++)
          if (data[(y * cv.width + x) * 4 + 3] >= 128) {
            n++;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
      const face = a.querySelector(".site-nav-face").getBoundingClientRect();
      out.push({
        id: svg.dataset.tabIcon,
        current: a.getAttribute("aria-current") === "page",
        svg: css,
        chip: `${face.width}x${face.height}`,
        w: +((x1 - x0 + 1) / K).toFixed(2),
        h: +((y1 - y0 + 1) / K).toFixed(2),
        ink: Math.round(n / (K * K)),
      });
    }
    const bar = document.querySelector(".site-bar").getBoundingClientRect();
    return { barHeight: bar.height, items: out };
  });
  console.log(`bar ${rows.barHeight}px`);
  for (const r of rows.items) {
    console.log(`${r.id.padEnd(9)} ${r.current ? "current" : "       "} svg ${r.svg} chip ${r.chip}  ${r.w} x ${r.h}  longer ${Math.max(r.w, r.h)}  ink ${r.ink} px2`);
  }
} finally {
  await browser.close();
}
