// HTML → PDF with one shared headless browser.
import puppeteer from "puppeteer";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

// ponytail: in-process limit, fine for one server instance; a queue is needed only with several workers.
export const PDF_MAX_CONCURRENT = 2;
const PDF_TIMEOUT_MS = 30_000;
const PDF_MARGIN = "12mm";

const LAUNCH_OPTIONS = {
  headless: "shell",
  // No sandbox (Render doesn't support it); pages run with JavaScript off and no network, which keeps this safe.
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
};

const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  margin: { top: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_MARGIN, left: PDF_MARGIN },
  timeout: PDF_TIMEOUT_MS,
};

let browserPromise = null;
let activeRenders = 0;
const waiting = [];

// Launched on first use; relaunched if it crashed or was closed.
async function getBrowser() {
  const pending = (browserPromise ??= puppeteer.launch(LAUNCH_OPTIONS));
  let browser;
  try {
    browser = await pending;
  } catch (error) {
    if (browserPromise === pending) browserPromise = null;
    throw error;
  }
  if (browser.connected) return browser;
  if (browserPromise === pending) browserPromise = null;
  return getBrowser();
}

async function acquireSlot() {
  if (activeRenders < PDF_MAX_CONCURRENT) {
    activeRenders += 1;
    return;
  }
  await new Promise((resolve) => waiting.push(resolve));
}

// Hands the slot straight to the next waiting render, so the count never goes over the limit.
function releaseSlot() {
  const next = waiting.shift();
  if (next) next();
  else activeRenders -= 1;
}

function allowOnlyDataUrls(request) {
  if (request.url().startsWith("data:")) request.continue();
  else request.abort();
}

async function renderPdf(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", allowOnlyDataUrls);
    await page.setContent(html, { waitUntil: "load", timeout: PDF_TIMEOUT_MS });
    return Buffer.from(await page.pdf(PDF_OPTIONS));
  } finally {
    await page.close();
  }
}

export async function htmlToPdf(html) {
  await acquireSlot();
  try {
    return await renderPdf(html);
  } catch (error) {
    logger.error({ err: error }, "PDF generation failed");
    throw new AppError("UPSTREAM_FAILED", "We couldn't create the PDF. Please try again.");
  } finally {
    releaseSlot();
  }
}

// Called on graceful shutdown.
export async function closePdfBrowser() {
  const pending = browserPromise;
  browserPromise = null;
  if (!pending) return;
  try {
    const browser = await pending;
    await browser.close();
  } catch (error) {
    logger.warn({ err: error }, "Closing the PDF browser failed");
  }
}
