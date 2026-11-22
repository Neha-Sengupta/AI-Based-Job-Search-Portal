// Launches the real chrome-headless-shell (no external services involved).
import { afterAll, describe, expect, it, vi } from "vitest";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { cvContentSchema } from "shared/schemas/cv";
import sample from "./__fixtures__/sample-cv.json" with { type: "json" };
import { renderCvHtml } from "./render.js";

vi.mock("../../lib/logger.js", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

// Puppeteer reads its config when first imported, and server/.puppeteerrc.cjs isn't found from the repo root.
process.env.PUPPETEER_CACHE_DIR ??= new URL("../../../.cache/puppeteer", import.meta.url).pathname;
const { closePdfBrowser, htmlToPdf } = await import("./pdf.js");

const TIMEOUT_MS = 30_000;
const NAME = "Priya <script>alert(1)</script> Sharma";
const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const content = cvContentSchema.parse({
  ...sample,
  basics: { ...sample.basics, fullName: NAME, showPhoto: true },
});

const withoutSpaces = (text) => text.replace(/\s/g, "");

async function pdfText(buffer) {
  const task = getDocument({ data: new Uint8Array(buffer) });
  const pdf = await task.promise;
  const pages = [];
  for (let number = 1; number <= pdf.numPages; number += 1) {
    const page = await pdf.getPage(number);
    const { items } = await page.getTextContent();
    pages.push(items.map((item) => item.str + (item.hasEOL ? " " : "")).join(""));
  }
  await task.destroy();
  return pages.join(" ").replace(/\s+/g, " ");
}

const render = (templateId) =>
  htmlToPdf(renderCvHtml({ templateId, content, photoDataUri: PHOTO }));

describe("htmlToPdf", () => {
  afterAll(closePdfBrowser);

  it.each(["classic", "modern", "compact"])(
    "%s prints real, selectable text with user text shown literally",
    async (templateId) => {
      const buffer = await render(templateId);
      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");

      const text = await pdfText(buffer);
      // A long name may wrap onto two lines, so compare without whitespace.
      expect(withoutSpaces(text)).toContain(withoutSpaces(NAME));
      expect(text).toMatch(/experience/i);
      expect(text).toContain("Rewrote the customer search page in React");
    },
    TIMEOUT_MS,
  );

  it(
    "finishes parallel renders beyond the concurrency limit",
    async () => {
      const buffers = await Promise.all(["classic", "modern", "compact"].map(render));
      expect(buffers.every((buffer) => buffer.length > 0)).toBe(true);
    },
    TIMEOUT_MS,
  );
});
