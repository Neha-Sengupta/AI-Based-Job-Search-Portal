// Step 1a: PDF → text items { text, x, y, width, height, bold, page }.
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { AppError } from "../../../lib/errors.js";
import { CV_PARSER_MESSAGES } from "shared/constants/cv-parser";

const BOLD_FONT = /bold|black|heavy|semibold/i;
const round = (value) => Math.round(value * 100) / 100;

// The real font name only exists once the page's fonts are loaded; without it we don't guess.
function isBold(page, fontName) {
  if (!page.commonObjs.has(fontName)) return null;
  const name = page.commonObjs.get(fontName)?.name;
  return name ? BOLD_FONT.test(name) : null;
}

async function openPdf(buffer) {
  const task = getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    fontExtraProperties: true, // keeps the real font names ("ABCDEF+Helvetica-Bold") for isBold
    verbosity: 0,
  });
  try {
    return { task, doc: await task.promise };
  } catch {
    await task.destroy();
    // Corrupt or password-protected: the user sees one friendly message either way.
    throw new AppError("VALIDATION_ERROR", CV_PARSER_MESSAGES.unreadable);
  }
}

export async function readPdf(buffer) {
  const { task, doc } = await openPdf(buffer);
  const items = [];
  let offset = 0;
  try {
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      const { height: pageHeight } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      await page.getOperatorList(); // loads the fonts into commonObjs, so isBold can read their names
      for (const item of content.items) {
        if (!item.str?.trim()) continue;
        const [, , , , x, baseline] = item.transform;
        items.push({
          text: item.str,
          x: round(x),
          // Pages are stacked, so a 2-page CV reads as one long page from top to bottom.
          y: round(offset + pageHeight - baseline),
          width: round(item.width),
          height: round(item.height),
          bold: isBold(page, item.fontName),
          page: number,
        });
      }
      offset += pageHeight;
    }
  } finally {
    await task.destroy();
  }
  return items;
}
