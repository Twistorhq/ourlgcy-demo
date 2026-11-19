// TW-1209 capture harness: habitat stills, gesture frames, and
// the buck's rock, at desktop and phone widths.
// Usage: node capture.mjs <rootDir> <outDir> <tag>
// Sandbox honesty, same as TW-1147/TW-1152: the renderer is
// SwiftShader (software), which the page precheck rejects, so
// captures use the ?gl=force-a QA override; the vendored Lenis
// module is stubbed at the network layer (harness only) so a
// programmatic scroll can hold on camera.
import { createRequire } from "module";
import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const require = createRequire(
  "/home/hatch/workspace/custom-skills/local-twistor-agent-eyes/upstream/"
);
const { chromium } = require("playwright");

const ROOT = process.argv[2];
const OUT = process.argv[3];
const TAG = process.argv[4] || "after";
const PORT = 8209;
const CHROME = "/home/hatch/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome";
const LENIS_STUB = "export default class Lenis { constructor() {} raf() {} destroy() {} }";

fs.mkdirSync(OUT, { recursive: true });

const server = spawn("python3", ["-m", "http.server", String(PORT)], {
  cwd: ROOT, stdio: "ignore"
});
await new Promise((r) => setTimeout(r, 1200));

function get(p) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}${p}`, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", reject);
  });
}
const indexHtml = await get("/index.html");
if (!indexHtml.includes("buck-break")) {
  console.error("port serves a foreign directory; aborting");
  server.kill();
  process.exit(1);
}
console.log("@@SERVER@@ ok root=" + ROOT + " scatter=" + indexHtml.includes("scatter.js"));

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ["--use-angle=swiftshader"]
});

async function run(width, height, wtag) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.route("**/gl/vendor/lenis.mjs", (route) =>
    route.fulfill({ contentType: "text/javascript", body: LENIS_STUB })
  );
  page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
  page.on("console", (m) => {
    const t = m.text();
    if (t.includes("lgcy")) console.log("CONSOLE", t.slice(0, 160));
  });
  await page.goto(`http://127.0.0.1:${PORT}/index.html?gl=force-a`, {
    waitUntil: "load", timeout: 60000
  });
  await page.waitForTimeout(1500);

  async function shootSection(sel, name, extraWait) {
    await page.evaluate((s) => {
      document.querySelector(s).scrollIntoView({ block: "center" });
    }, sel);
    await page.waitForTimeout(extraWait || 1200);
    const box = await page.evaluate((s) => {
      const r = document.querySelector(s).getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, sel);
    const clip = {
      x: Math.max(0, box.x), y: Math.max(0, box.y),
      width: Math.min(width, box.width),
      height: Math.min(height, box.height)
    };
    try {
      await page.screenshot({ path: path.join(OUT, `${name}-${wtag}.png`), clip, timeout: 90000 });
      console.log("SHOT", name, wtag);
    } catch (e) {
      console.log("SHOT FAILED", name, wtag, String(e).slice(0, 120));
    }
  }

  async function shootHabitat(sec, name) {
    const el = page.locator(`#${sec} .habitat`);
    try {
      await el.screenshot({ path: path.join(OUT, `${name}-${wtag}.png`), timeout: 90000 });
      console.log("SHOT", name, wtag);
    } catch (e) {
      console.log("SHOT FAILED", name, wtag, String(e).slice(0, 120));
    }
  }

  // habitats: scroll each into view, wait for the live handover
  const ALL_HABITATS = [
    ["gen-0", "jay"], ["gen-2", "woodpecker"],
    ["gen-3", "owl"], ["gen-4", "squirrel"]
  ];
  const habitats = process.env.SKIP_HABITATS ? []
    : process.env.SUBJECTS
      ? ALL_HABITATS.filter(([, k]) => process.env.SUBJECTS.split(",").includes(k))
      : ALL_HABITATS;
  for (const [sec, key] of habitats) {
    await page.evaluate((s) => {
      document.querySelector("#" + s).scrollIntoView({ block: "center" });
    }, sec);
    try {
      await page.waitForFunction(
        (s) => document.querySelector("#" + s).classList.contains("habitat-live"),
        sec, { timeout: 45000 }
      );
    } catch (e) {
      console.log("HABITAT NOT LIVE", key);
      continue;
    }
    await page.waitForTimeout(2500);
    const rect = await page.evaluate((k) => {
      const fn = window.__lgcyScatter[k + "Rect"];
      return fn ? fn() : null;
    }, key);
    console.log("RECT", key, JSON.stringify(rect));
    await shootHabitat(sec, `habitat-${key}`);
    await shootSection("#" + sec, `section-${key}`, 300);
    // signature gesture frames
    await page.evaluate((k) => {
      const sig = {
        jay: "Jay_Peck", woodpecker: "Woodpecker_Peck",
        owl: "Owl_Turn", squirrel: "Squirrel_Nibble"
      }[k];
      window.__lgcyScatter[k + "Play"](sig);
    }, key);
    await page.waitForTimeout(1300);
    await shootHabitat(sec, `gesture-${key}-a`);
    await page.waitForTimeout(1300);
    await shootHabitat(sec, `gesture-${key}-b`);
  }

  // the buck and his rock
  if (process.env.SUBJECTS && !process.env.SUBJECTS.split(",").includes("buck")) {
    await ctx.close();
    return;
  }
  await page.evaluate(() => {
    document.querySelector("#buck-break").scrollIntoView({ block: "center" });
  });
  try {
    await page.waitForFunction(
      () => document.documentElement.dataset.glTier === "A" ||
            document.documentElement.dataset.glTier === "B",
      null, { timeout: 45000 }
    );
  } catch (e) {
    console.log("BUCK TIER NOT SET", await page.evaluate(() => document.documentElement.dataset.glTier));
  }
  await page.waitForTimeout(3000);
  try {
    await page.locator("#buck-break").screenshot({
      path: path.join(OUT, `buck-${wtag}.png`), timeout: 90000
    });
    console.log("SHOT buck", wtag);
  } catch (e) {
    console.log("SHOT FAILED buck", wtag, String(e).slice(0, 120));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  try {
    await page.screenshot({ path: path.join(OUT, `top-${wtag}.png`), timeout: 90000 });
  } catch (e) {
    console.log("SHOT FAILED top", wtag);
  }
  await ctx.close();
}

if (!process.env.WIDTHS || process.env.WIDTHS.includes("1440")) await run(1440, 900, "1440");
if (!process.env.WIDTHS || process.env.WIDTHS.includes("390")) await run(390, 844, "390");
await browser.close();
server.kill();
console.log("DONE", TAG);
