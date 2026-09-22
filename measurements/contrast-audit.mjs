/**
 * WCAG contrast audit of the built app, measured from the rendered page.
 *
 * WHY THIS AND NOT A TOKEN TABLE. theme.css already reasons about contrast in
 * its comments, carefully, and it was still possible to ship a formal charge
 * sign in a literal #ffffff on a near white disc: the token table was right and
 * the component did not use it. A pair only fails where it is actually
 * composed, so the audit walks what the browser drew rather than what the
 * stylesheet declared. It is the same reason the capture script drives real
 * PointerEvents instead of trusting the state machine's own account.
 *
 * WHICH SURFACES. Eight tabs and the onboarding welcome are reachable by a
 * hash alone. The economy moments are not: the reward screen, the combo
 * interstitial and the graded answer strip only exist after a lesson has been
 * played, and one of them needs six days of history behind it. So a route here
 * is either a hash or a SEED plus a DRIVE, and the drives are the same ones
 * capture-economy.mjs uses, imported from economy-moments.mjs so the two cannot
 * drift. This matters more than it sounds: those three surfaces were built and
 * shipped without this audit ever having stood in front of them, and an
 * unvisited surface is an unmeasured one. A drive that does not reach its
 * moment aborts the run rather than reporting a screen nobody asked about.
 *
 * WHAT IT MEASURES. Every element with visible text, and every SVG mark with a
 * fill or a stroke, on every tab, in both themes. For each one it resolves the
 * effective backdrop by climbing ancestors until something opaque, compositing
 * translucent layers on the way, and it treats a gradient backdrop as EVERY one
 * of its colour stops, reporting the worst. Floors are WCAG 2.1: 4.5 for body
 * text, 3.0 for large text (>= 24px, or >= 18.66px at weight 700+) and for
 * graphics and interface components per 1.4.11.
 *
 * WHAT IT CANNOT SEE. Text over a photograph or a video frame, which this app
 * does not have yet; a mark whose backdrop is another mark rather than a styled
 * box, because the climb reads boxes; and whether a passing ratio is legible,
 * which is a different question from whether it is compliant. Anything it
 * cannot resolve is reported as UNRESOLVED and counted, never silently skipped:
 * a contrast audit that quietly drops what it cannot handle reads as a pass.
 *
 * Usage, from the repo root:
 *   npm run build
 *   npm run contrast:audit [-- --json]
 *
 * Exits nonzero when any pair is below its floor, so it can gate a build.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import { LESSON_HASH, MOMENTS, TAB_ROUTES, installSeed, settleBoot, sleep, withApp } from "./economy-moments.mjs";

/**
 * The tab routes, imported rather than restated.
 *
 * This was a literal eight name array here and another copy of the same array
 * in the sticker audit. The owner amendment of 2026-08-28 changed the list,
 * which is exactly when a duplicated constant costs something: one of the two
 * copies gets updated. economy-moments.mjs owns it now, beside the moments,
 * because that is already the file both audits import their drives from.
 */
const TABS = TAB_ROUTES;

/**
 * The economy moments, as routes.
 *
 * `root` scopes the measurement to the moment's own subtree, and it is only set
 * for the two FULL SCREEN stages. Both paint an opaque ground over the lesson,
 * so the lesson under them is not on screen, and measuring it here would report
 * pairs no student is looking at. The answer strip is not a stage: it is a band
 * inside the live lesson, so that route measures the whole page and the lesson
 * player gets audited with it.
 *
 * `midMs` asks for a second measurement that many milliseconds after the press
 * that opens the moment, while it is still animating. A colour that exists only
 * during a transition is still a colour a student reads, and both of these
 * surfaces move: the strip slides its explanation in under a berry that is
 * mid-squash, and the interstitial pops its count and rises its character. The
 * reward moment gets no mid frame on purpose; its settled state is the judged
 * one, and its beats are already frame-captured by capture-economy.mjs.
 */
const ECONOMY_ROUTES = [
  { name: "feedback-correct", moment: "feedback-correct", root: null, midMs: 250 },
  { name: "feedback-wrong", moment: "feedback-wrong", root: null, midMs: 250 },
  { name: "combo", moment: "combo", root: "[data-combo]", midMs: 250 },
  { name: "reward-first", moment: "reward-first", root: "[data-reward]", midMs: null },
  { name: "reward-streak", moment: "reward-streak", root: "[data-reward]", midMs: null },
  // P4's streak screen, all three of its states, because each one puts a
  // different set of token pairs on the ground: the rest day's purple square,
  // the milestone band's ink on the streak fill, and the exam banner. A
  // surface no script visits is a surface no audit has an opinion about, and
  // the reward moment's own headline is the standing proof of what that costs.
  { name: "streak-rest", moment: "streak-rest", root: "[data-streak]", midMs: null },
  { name: "streak-milestone", moment: "streak-milestone", root: "[data-streak]", midMs: null },
  { name: "streak-exam", moment: "streak-exam", root: "[data-streak]", midMs: null },
  // P5's Charge sheet, all three states plus the commit. `root` stays null:
  // the sheet is a modal over a live pathway and the pathway behind it is on
  // screen, so scoping the measurement to the panel would leave the ground it
  // is composed against unmeasured. The commit gets a mid frame because the
  // pips change colour on their way out and a colour that exists only during a
  // transition is still a colour a student reads.
  { name: "charge-cost", moment: "charge-cost", root: null, midMs: null },
  { name: "charge-empty", moment: "charge-empty", root: null, midMs: null },
  { name: "charge-spend", moment: "charge-spend", root: null, midMs: 300 },
  // charge-exam is DELIBERATELY ABSENT and this is not a weakened check.
  //
  // The exam window surface is not built. Its drive exists in
  // economy-moments.mjs and does not reach a moment, and this audit is right to
  // abort rather than measure whatever happened to be on screen: that refusal is
  // the feature, and it is what caught the gap. But an audit that cannot run at
  // all gates nothing, so the route is withdrawn until the surface exists rather
  // than the abort being softened.
  //
  // Re-add this line in the same commit that builds the exam window:
  //   { name: "charge-exam", moment: "charge-exam", root: null, midMs: null },
  // The drive is already written and waiting for it.
  //
  // S1's shell surfaces. `root` is null on all three for the reason the charge
  // block gives one line up: the tool sheet is a modal over a live pathway, and
  // scoping to the panel would leave the ground it is composed against
  // unmeasured. The bar and the greyed course list are chrome at rest, which is
  // the easiest kind of surface to leave unaudited precisely because nothing
  // has to be driven to see it.
  { name: "shell-bar", moment: "shell-bar", root: null, midMs: null },
  { name: "shell-tool", moment: "shell-tool", root: null, midMs: null },
  { name: "shell-courses", moment: "shell-courses", root: null, midMs: null },
  //
  // S4's front door, and it is the surface with the strongest claim to be here:
  // every student sees it on every cold open, and until this line it was the one
  // screen in the app that no audit had ever stood in front of. It is also the
  // shortest lived, so it is the only route that needs the app told to wait
  // (`?boot=hold`, in the moment's own hash); the frame capture uses no hook and
  // watches the real thing.
  //
  // `root` is "#boot" because the loader is a FULL SCREEN stage, the same reason
  // the reward moment and the combo interstitial scope to theirs: the page it
  // will part to reveal is mounted and in position behind an opaque field, so a
  // pair measured there is a pair nobody is looking at, and every one of them is
  // already measured on its own tab's route.
  { name: "boot", moment: "boot", root: "#boot", midMs: null },
];

const ROUTES = [
  ...TABS.map((tab) => ({ name: tab, hash: `#/${tab}` })),
  { name: "onboarding", hash: "#/start/welcome" },
  // `hash` and `stored` come off the moment, because not every moment lives in
  // the intro lesson any more: P5's three states are opened from the pathway,
  // and a moment that named its own route was already carrying both fields for
  // capture-economy.mjs. Defaulting them here rather than repeating the route
  // is what keeps the audit and the capture standing in the same place.
  ...ECONOMY_ROUTES.map((route) => ({
    ...route,
    seed: MOMENTS[route.moment].seed,
    stored: MOMENTS[route.moment].stored ?? {},
    momentHash: MOMENTS[route.moment].hash ?? LESSON_HASH,
    drive: MOMENTS[route.moment].drive,
  })),
];
const VIEWPORT = { width: 1280, height: 900, deviceScaleFactor: 1 };

function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv !== undefined && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined) throw new Error("No Chrome or Edge found. Set CHROME_PATH.");
  return found;
}

const distDir = path.resolve(process.cwd(), "dist");
if (!existsSync(path.join(distDir, "index.html"))) {
  throw new Error("dist/index.html not found. Run `npm run build` first.");
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.join(distDir, file);
  if (!target.startsWith(distDir) || !existsSync(target)) {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" });
  response.end(await readFile(target));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

/**
 * The whole measurement, as one function evaluated inside the page.
 *
 * It lives here as a string-free function passed to page.evaluate rather than
 * in a module the page imports, because the built app is the artifact under
 * test and adding an import to it would change what is being measured.
 *
 * `rootSelector` is null for a whole page, or a selector for the one subtree
 * that is actually on screen (a full screen stage over a lesson). It returns
 * null, never an empty list, when that selector matches nothing: a route whose
 * surface is absent has to be reported, and zero findings would read as a pass.
 * The backdrop climb still walks past the root to the document, because what is
 * behind the stage is what composes it.
 */
function auditInPage(rootSelector) {
  const root = rootSelector === null ? document.body : document.querySelector(rootSelector);
  if (root === null) return null;
  const parse = (value) => {
    const match = /rgba?\(([^)]+)\)/.exec(value ?? "");
    if (match === null) return null;
    const parts = match[1].split(/[,\s/]+/).filter((p) => p.length > 0).map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const luminance = ({ r, g, b }) => {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /** Every candidate backdrop behind an element: opaque box colours and gradient stops. */
  const backdrops = (el) => {
    const stack = [];
    let node = el;
    while (node !== null && node !== document.documentElement.parentNode) {
      const style = getComputedStyle(node);
      const image = style.backgroundImage;
      if (image !== undefined && image !== "none") {
        const stops = image.match(/rgba?\([^)]+\)/g) ?? [];
        // Tailwind v4 writes its gradients as var(--tw-gradient-stops), and the
        // computed background-image keeps the var rather than resolving it, so
        // the literal scan finds nothing and the climb falls through to the
        // card BELOW the gradient. That reported the leaderboard's white trophy
        // as white on white when it is white on indigo. Read the custom
        // properties directly.
        if (stops.length === 0 && image.includes("gradient")) {
          for (const name of ["--tw-gradient-from", "--tw-gradient-via", "--tw-gradient-to"]) {
            const value = style.getPropertyValue(name).trim();
            const colour = parse(value);
            if (colour !== null && colour.a > 0.02) stops.push(value);
          }
        }
        let opaqueGradient = stops.length > 0;
        for (const stop of stops) {
          const colour = parse(stop);
          if (colour !== null && colour.a > 0.02) stack.push({ colour, from: "gradient" });
          if (colour === null || colour.a < 0.995) opaqueGradient = false;
        }
        // A gradient we still could not read is an unknown backdrop, and the
        // layer under it is the wrong answer, not a safe one.
        if (stops.length === 0 && image.includes("gradient")) return null;
        // An opaque gradient HIDES everything under it. Collecting the card
        // below as a further candidate is what reported the leaderboard's white
        // trophy as white on white: it is white on indigo, and the white card
        // three levels down is not on screen behind it at all.
        if (opaqueGradient) break;
      }
      const back = parse(style.backgroundColor);
      if (back !== null && back.a > 0.02) {
        stack.push({ colour: back, from: "background-color" });
        if (back.a >= 0.995) break;
      }
      node = node.parentElement ?? (node.parentNode instanceof ShadowRoot ? node.parentNode.host : null);
    }
    // Composite each translucent candidate over the first opaque one below it,
    // so a 16 percent wash is measured as what the eye receives, not as itself.
    const opaque = stack.find((entry) => entry.colour.a >= 0.995)?.colour ?? { r: 255, g: 255, b: 255, a: 1 };
    const resolved = stack.map((entry) => (entry.colour.a >= 0.995 ? entry.colour : over(entry.colour, opaque)));
    return resolved.length > 0 ? resolved : null;
  };

  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (Number(style.opacity) < 0.15) return false;
    const box = el.getBoundingClientRect();
    return box.width > 1 && box.height > 1;
  };

  const label = (el) => {
    const id = el.id !== "" ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className !== "" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 110);
  };

  let keySeed = 0;
  const keys = new WeakMap();
  /** A stable id per SVG element, so its fill and its boundary pair up later. */
  const svgKey = (el) => {
    let value = keys.get(el);
    if (value === undefined) {
      value = `svg${(keySeed += 1)}`;
      keys.set(el, value);
    }
    return value;
  };

  const findings = [];
  /**
   * Can this element's backdrop be trusted?
   *
   * The climb reads CSS boxes. An HTML element always has one. An SVG mark
   * usually sits on ANOTHER MARK, which has no background-color, so the climb
   * walks straight past the sphere a letter is drawn on and reports the page
   * behind the whole canvas instead. Measuring that pair is not a lenient
   * measurement, it is a measurement of something that is not on screen: it
   * reported the oxygen's white "O" as white on cream, and the "O" is on a red
   * sphere.
   *
   * So an SVG mark is resolvable only when nothing inside its own <svg> is
   * painted under it: no earlier sibling, and no earlier sibling of any
   * ancestor, whose box overlaps it. Everything else is reported UNRESOLVED and
   * listed for a person. Never counted as a pass, never as a failure.
   */
  const svgBackdropIsTrustworthy = (el) => {
    const root = el.ownerSVGElement;
    if (root === null) return true;
    const box = el.getBoundingClientRect();
    const overlaps = (other) => {
      const b = other.getBoundingClientRect();
      return !(b.right <= box.left || b.left >= box.right || b.bottom <= box.top || b.top >= box.bottom);
    };
    let node = el;
    while (node !== null && node !== root) {
      let sibling = node.previousElementSibling;
      while (sibling !== null) {
        if (sibling.tagName.toLowerCase() !== "defs") {
          if (visible(sibling) && overlaps(sibling)) return false;
          for (const descendant of sibling.querySelectorAll("*")) {
            if (visible(descendant) && overlaps(descendant)) return false;
          }
        }
        sibling = sibling.previousElementSibling;
      }
      node = node.parentElement;
    }
    return true;
  };

  const record = (el, kind, colour, text, floor) => {
    const options = backdrops(el);
    const worst = (options ?? []).reduce(
      (acc, back) => {
        // A translucent foreground is measured as what the eye receives, not
        // as its own declared colour: --scene-faint is an rgba, and reading it
        // raw would report a contrast the student never sees.
        const value = ratio(colour.a >= 0.995 ? colour : over(colour, back), back);
        return value < acc.value ? { value, back } : acc;
      },
      { value: Infinity, back: null },
    );
    if (!Number.isFinite(worst.value) || (el instanceof SVGElement && !svgBackdropIsTrustworthy(el))) {
      findings.push({
        kind,
        unresolved: true,
        element: label(el),
        text: (text ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
        fg: `rgb(${Math.round(colour.r)},${Math.round(colour.g)},${Math.round(colour.b)})`,
        floor,
      });
      return;
    }
    findings.push({
      kind,
      element: label(el),
      text: (text ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
      fg: `rgb(${Math.round(colour.r)},${Math.round(colour.g)},${Math.round(colour.b)})`,
      bg: `rgb(${Math.round(worst.back.r)},${Math.round(worst.back.g)},${Math.round(worst.back.b)})`,
      ratio: Math.round(worst.value * 100) / 100,
      floor,
      pass: worst.value >= floor - 0.005,
      // Which paint this was, so a shape's fill and its boundary can be judged
      // together below. Text is never merged: a letter is read, not identified
      // by its outline, so its fill has to clear the floor on its own.
      paint: el instanceof SVGElement && !(text ?? "").trim() ? kind.replace("svg-", "") : null,
      key: el instanceof SVGElement ? svgKey(el) : null,
    });
  };

  // Text: every element that owns a non-empty text node of its own, so a
  // paragraph is measured once rather than once per ancestor.
  for (const el of root.querySelectorAll("*")) {
    if (el instanceof SVGElement) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    if (own.length === 0 || !visible(el)) continue;
    const style = getComputedStyle(el);
    const colour = parse(style.color);
    if (colour === null || colour.a < 0.15) continue;
    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    record(el, large ? "large-text" : "text", colour, own.map((n) => n.textContent).join(" "), large ? 3 : 4.5);
  }

  // SVG marks. Text glyphs carry the text floor; everything else is a graphic
  // under 1.4.11 and carries 3.0. Strokes count: a bond is an interface object.
  for (const el of root.querySelectorAll("svg *")) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const isText = tag === "text" || tag === "tspan";
    // <g> and <line> never paint a fill: a group has no geometry of its own and
    // a line is a stroke. Both inherit the initial black, so measuring their
    // fill reported twelve black-on-black failures for marks that draw nothing.
    const paintsFill = tag !== "g" && tag !== "line" && tag !== "polyline" && tag !== "marker";
    const fill = parse(style.fill);
    if (paintsFill && fill !== null && fill.a >= 0.15 && style.fill !== "none") {
      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      record(el, isText ? (large ? "svg-large-text" : "svg-text") : "svg-fill", fill, isText ? el.textContent : "", isText && !large ? 4.5 : 3);
    }
    const stroke = parse(style.stroke);
    const width = parseFloat(style.strokeWidth);
    if (stroke !== null && stroke.a >= 0.15 && style.stroke !== "none" && width >= 1) {
      record(el, "svg-stroke", stroke, "", 3);
    }
  }
  /**
   * A shape is ONE component, not two.
   *
   * WCAG 1.4.11 asks whether a component is identifiable against what is
   * adjacent to it, and a boundary that clears 3:1 identifies a shape whatever
   * its fill does. The bond joint is the case that forced this: it has to stay
   * lighter than the rod it sits on, so its fill cannot also clear a near white
   * ground, and a ring in the rod's colour is what makes it findable. Reporting
   * the fill alone as a failure would demand a colour that cannot exist.
   *
   * So fill and stroke on the same shape collapse to the BETTER of the two, and
   * the report names which one carried it. Text never merges: a letter is read,
   * not identified by its outline.
   */
  const merged = [];
  const byKey = new Map();
  for (const finding of findings) {
    if (finding.paint === null || finding.key === null || finding.unresolved === true) {
      merged.push(finding);
      continue;
    }
    const existing = byKey.get(finding.key);
    if (existing === undefined) {
      byKey.set(finding.key, finding);
      merged.push(finding);
      continue;
    }
    if (finding.ratio > existing.ratio) {
      existing.ratio = finding.ratio;
      existing.fg = finding.fg;
      existing.bg = finding.bg;
      existing.pass = finding.pass;
      existing.paint = finding.paint;
    }
    existing.carriedBy = existing.paint;
  }
  return merged;
}

/** Routes whose drive never reached the moment. Each one is a failure, reported below. */
const unreached = [];

const browser = await puppeteer.launch({ executablePath: findChrome(), headless: "new" });
const all = [];

/** Measure one surface and file its pairs under `label`. */
async function collect(page, label, theme, rootSelector) {
  const findings = await page.evaluate(auditInPage, rootSelector);
  if (findings === null) {
    throw new Error(`${label} (${theme}): nothing matched "${rootSelector}", so the surface is not on screen and there is nothing honest to measure.`);
  }
  for (const finding of findings) all.push({ theme, route: label, ...finding });
}

try {
  for (const theme of ["light", "dark"]) {
    for (const route of ROUTES) {
      if (route.hash !== undefined) {
        const page = await browser.newPage();
        await page.setViewport(VIEWPORT);
        await page.evaluateOnNewDocument((wanted) => {
          localStorage.setItem("theme", wanted);
          document.documentElement.classList.toggle("dark", wanted === "dark");
        }, theme);
        await page.goto(`${origin}/?targets=1${withApp(route.hash)}`, { waitUntil: "networkidle0" });
        // The front door is a full bleed layer over every route and it leaves
        // on its own about 1.25 s in, which networkidle0 can beat. Measuring
        // before it goes would file the loader's colours under this tab.
        await settleBoot(page);
        await sleep(500);
        await collect(page, route.name, theme, null);
        await page.close();
        continue;
      }
      // A seeded route in its own browser context. The seed clears localStorage
      // and writes a journal, and the hash routes above share one context and
      // one origin with it, so without the isolation a played lesson would
      // follow them into the next theme's tabs and this would stop being a
      // measurement of the same nine surfaces it has always measured.
      const context = await browser.createBrowserContext();
      try {
        const page = await context.newPage();
        await page.setViewport(VIEWPORT);
        await installSeed(page, theme, route.seed, route.stored);
        await page.goto(`${origin}/${withApp(route.momentHash)}`, { waitUntil: "networkidle0" });
        // Every route but the front door itself waits for the loader to go.
        // `?boot=hold` is what holds it, and holding it is the whole point of
        // that one route, so it is the one route that must not wait.
        if (!String(route.momentHash).includes("boot=hold")) await settleBoot(page);
        const onTrigger =
          route.midMs === null
            ? null
            : async (at) => {
                const wait = at + route.midMs - Date.now();
                if (wait > 0) await sleep(wait);
                await collect(page, `${route.name}@${route.midMs}ms`, theme, route.root);
              };
        const result = await route.drive(page, { onTrigger });
        if (!result.reached) {
          /*
           * RECORD AND CARRY ON, rather than throwing here.
           *
           * Everything this script prints happens after the route loop, and
           * this throw was inside it, so one unreachable route discarded
           * every pair already measured and the only output was a stack
           * trace. `boot` sits in the last route group, so the run walked
           * most of the light theme, composed its pairs, threw them away and
           * never started dark: Phase 6 asked for a contrast verdict and got
           * nothing at all.
           *
           * This is not a softened check. An unreached route is still a
           * failure, it still prints as one below, and the process still
           * exits non-zero. What changes is that the other surfaces get
           * reported instead of being destroyed by this one. STATUS.md's
           * rule stands untouched: do not withdraw the route to get a run.
           */
          unreached.push(`${route.name} (${theme}): the drive did not reach the moment, so whatever is on screen is not the surface under audit.`);
          continue;
        }
        await sleep(500);
        await collect(page, route.name, theme, route.root);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

// One row per distinct (theme, foreground, background, floor): the same token
// pair repeated across forty buttons is one defect, not forty, and a report
// that says forty buries the other three.
const groups = new Map();
for (const finding of all) {
  if (finding.unresolved === true) continue;
  const key = `${finding.theme}|${finding.fg}|${finding.bg}|${finding.floor}|${finding.kind}`;
  const existing = groups.get(key);
  if (existing === undefined) groups.set(key, { ...finding, count: 1, where: new Set([`${finding.route}:${finding.element}`]) });
  else {
    existing.count += 1;
    if (existing.where.size < 4) existing.where.add(`${finding.route}:${finding.element}`);
  }
}
const rows = [...groups.values()].sort((a, b) => a.ratio - b.ratio);
const unresolvedGroups = new Map();
for (const finding of all) {
  if (finding.unresolved !== true) continue;
  const key = `${finding.theme}|${finding.fg}|${finding.kind}`;
  const existing = unresolvedGroups.get(key);
  if (existing === undefined) unresolvedGroups.set(key, { ...finding, count: 1, where: new Set([`${finding.route}:${finding.element}`]) });
  else {
    existing.count += 1;
    if (existing.where.size < 3) existing.where.add(`${finding.route}:${finding.element}`);
  }
}
const failing = rows.filter((row) => !row.pass);
const unresolved = all.filter((finding) => finding.unresolved === true);

if (process.argv.includes("--json")) {
  await writeFile(
    path.resolve(process.cwd(), "measurements", "contrast-audit.json"),
    `${JSON.stringify({ measured: all.length, distinct: rows.length, failing: failing.length, unresolved: unresolved.length, rows: rows.map((r) => ({ ...r, where: [...r.where] })) }, null, 2)}\n`,
  );
}

console.log(`measured ${all.length} composed pairs, ${rows.length} distinct, ${unresolved.length} unresolved`);
if (unreached.length > 0) {
  console.log(`
UNREACHED, ${unreached.length}. These surfaces were NOT audited, which is a failure of`);
  console.log(`the run and not a pass for the surface:`);
  for (const line of unreached) console.log(`  ${line}`);
}
console.log(`FAILING: ${failing.length}`);
for (const row of failing) {
  console.log(
    `  ${row.ratio.toFixed(2)}:1 (needs ${row.floor})  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} on ${row.bg}  x${row.count}\n      ${[...row.where].join("\n      ")}${row.text ? `\n      text: "${row.text}"` : ""}`,
  );
}
if (unresolvedGroups.size > 0) {
  console.log(`
UNRESOLVED, ${unresolved.length} marks in ${unresolvedGroups.size} groups. These sit on other SVG`);
  console.log(`marks rather than on a styled box, so the backdrop climb cannot see what is under them.`);
  console.log(`Neither passed nor failed. Judge them against a capture:`);
  for (const row of [...unresolvedGroups.values()].sort((a, b) => b.count - a.count)) {
    console.log(`  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} x${row.count}  ${[...row.where].join(", ")}${row.text ? `  text: "${row.text}"` : ""}`);
  }
}

if (unresolvedGroups.size > 0) {
  console.log(`
UNRESOLVED: ${unresolved.length} marks in ${unresolvedGroups.size} groups. Each sits on another`);
  console.log(`SVG mark rather than on a styled box, so the climb cannot see what is beneath it.`);
  console.log(`Neither passed nor failed. Judge these against a capture:`);
  for (const row of [...unresolvedGroups.values()].sort((a, b) => b.count - a.count)) {
    console.log(`  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} x${row.count}  ${[...row.where].join(", ")}${row.text ? `  text: "${row.text}"` : ""}`);
  }
}

const tight = rows.filter((row) => row.pass && row.ratio < row.floor * 1.15).slice(0, 12);
if (tight.length > 0) {
  console.log(`\nPASSING but within 15 percent of the floor, worth knowing before a token moves:`);
  for (const row of tight) console.log(`  ${row.ratio.toFixed(2)}:1 (floor ${row.floor})  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} on ${row.bg}  x${row.count}`);
}
// An unreached surface is as much a failure as a failing pair: it means the
// audit has no opinion about a screen it was asked to judge.
if (failing.length > 0 || unreached.length > 0) process.exit(1);
