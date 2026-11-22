// Renders the sample CV with each template and saves a first-page PNG to client/public/templates/{id}.png.
// Run from server/ (so Puppeteer finds .puppeteerrc.cjs): node scripts/generate-template-previews.js
import { mkdir, readFile } from "node:fs/promises";
import puppeteer from "puppeteer";
import { cvContentSchema } from "shared/schemas/cv";
import { TEMPLATES } from "shared/constants/templates";
import { renderCvHtml } from "../src/modules/cvs/render.js";

const OUT_DIR = new URL("../../client/public/templates/", import.meta.url);
const SAMPLE = new URL("../src/modules/cvs/__fixtures__/sample-cv.json", import.meta.url);
// A4 at 96 dpi is 794 × 1123 CSS px; scaled down to a ~600 px wide image.
const PAGE = { width: 794, height: 1123 };
const PREVIEW_WIDTH = 600;
// Neutral silhouette, so the Modern preview shows where the optional photo goes.
const PLACEHOLDER_PHOTO = `data:image/svg+xml;base64,${Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#c9d6e2"/><circle cx="50" cy="38" r="18" fill="#8fa5b9"/><ellipse cx="50" cy="92" rx="32" ry="26" fill="#8fa5b9"/></svg>',
).toString("base64")}`;

const sample = JSON.parse(await readFile(SAMPLE, "utf8"));
await mkdir(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({ headless: "shell" });
try {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setViewport({ ...PAGE, deviceScaleFactor: PREVIEW_WIDTH / PAGE.width });
  for (const template of TEMPLATES) {
    const content = cvContentSchema.parse({
      ...sample,
      basics: { ...sample.basics, showPhoto: template.supportsPhoto },
    });
    const html = renderCvHtml({
      templateId: template.id,
      content,
      photoDataUri: PLACEHOLDER_PHOTO,
    });
    await page.setContent(html, { waitUntil: "load" });
    const path = new URL(`${template.id}.png`, OUT_DIR).pathname;
    await page.screenshot({ path, clip: { x: 0, y: 0, ...PAGE } });
    process.stdout.write(`Saved ${path}\n`);
  }
} finally {
  await browser.close();
}
