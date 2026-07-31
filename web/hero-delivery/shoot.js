const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const PORT = process.env.PORT || 3311;
const LABEL = process.env.LABEL || "before";
const OUT =
  process.env.OUT ||
  "/private/tmp/claude-501/-Users-jarvis-jarvis-lab/2a1052d2-0b02-4d95-a15f-65a1715c0c4b/scratchpad/shots";

const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900, dsfs: [1, 2] },
  { name: "mobile-390x844", width: 390, height: 844, dsfs: [1, 2, 3] },
];

fs.mkdirSync(OUT, { recursive: true });

// The hero is the biggest <img> on the page in every layout.
const HERO = () => {
  const imgs = [...document.querySelectorAll("img")];
  return imgs
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]?.el;
};

(async () => {
  const browser = await chromium.launch();
  const report = {};
  for (const vp of VIEWPORTS) {
    for (const dsf of vp.dsfs) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: dsf,
        reducedMotion: "reduce",
      });
      const page = await ctx.newPage();
      const bytes = { total: 0, byUrl: {} };
      page.on("response", (res) => {
        const len = Number(res.headers()["content-length"] || 0);
        if (len) {
          bytes.total += len;
          bytes.byUrl[res.url().replace(`http://localhost:${PORT}`, "")] = len;
        }
      });
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
      await page.addStyleTag({
        content: `*,*::before,*::after{animation:none!important;transition:none!important}`,
      });
      // Scroll the hero into view WITHOUT resizing the viewport: a fullPage
      // screenshot expands the viewport, which changes what `sizes: 45vh`
      // resolves to and makes the browser swap srcset candidates mid-capture.
      await page.evaluate(() => {
        const imgs = [...document.querySelectorAll("img")];
        const img = imgs
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]
          ?.el;
        img?.scrollIntoView({ block: "center", behavior: "instant" });
      });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1200);

      const geom = await page.evaluate(`(${HERO.toString()})()`).then(() =>
        page.evaluate(() => {
          const imgs = [...document.querySelectorAll("img")];
          const img = imgs
            .map((el) => ({ el, r: el.getBoundingClientRect() }))
            .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]
            ?.el;
          const r = img.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            pageY: r.y + window.scrollY,
            width: r.width,
            height: r.height,
            scrollY: window.scrollY,
            docWidth: document.documentElement.scrollWidth,
            docHeight: document.documentElement.scrollHeight,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
            currentSrc: img.currentSrc,
            sizes: img.getAttribute("sizes"),
            fetchpriority: img.getAttribute("fetchpriority"),
            loading: img.getAttribute("loading"),
          };
        }),
      );

      const key = `${vp.name}@${dsf}x`;
      report[key] = { geom, bytes: bytes.total, assets: bytes.byUrl };

      // Presentation shot: the viewport as the user sees it, top of page.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${LABEL}--${key}-top.png`) });

      // Diff shot: a fixed rect around the hero, in the scrolled viewport.
      // Rect is derived from the BASELINE geometry so before/after crop the
      // exact same pixels.
      await page.evaluate(() => {
        const imgs = [...document.querySelectorAll("img")];
        const img = imgs
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]
          ?.el;
        img?.scrollIntoView({ block: "center", behavior: "instant" });
      });
      await page.waitForTimeout(500);
      const rect = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll("img")];
        const img = imgs
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]
          ?.el;
        const r = img.getBoundingClientRect();
        return {
          x: Math.floor(r.x) - 2,
          y: Math.floor(r.y) - 2,
          width: Math.ceil(r.width) + 4,
          height: Math.ceil(r.height) + 4,
        };
      });
      report[key].clip = rect;
      await page.screenshot({
        path: path.join(OUT, `${LABEL}--${key}-hero.png`),
        clip: rect,
      });

      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(
    path.join(OUT, `${LABEL}--report.json`),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
})();
