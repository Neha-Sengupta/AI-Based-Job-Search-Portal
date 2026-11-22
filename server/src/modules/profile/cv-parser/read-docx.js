// Step 1b: DOCX → lines. mammoth already gives structure, so DOCX skips step 2.
import mammoth from "mammoth";
import { parse } from "node-html-parser";
import { AppError } from "../../../lib/errors.js";
import { CV_PARSER_MESSAGES } from "shared/constants/cv-parser";
import { makeLine } from "./group-lines.js";

const BLOCKS = "h1, h2, h3, h4, h5, h6, p, li";
const squash = (text) => text.replace(/\s+/g, "");

async function toHtml(buffer) {
  try {
    return (await mammoth.convertToHtml({ buffer })).value;
  } catch {
    // Corrupt, password-protected or not really a DOCX: one friendly message either way.
    throw new AppError("VALIDATION_ERROR", CV_PARSER_MESSAGES.unreadable);
  }
}

// A list item's own text, without the text of any list nested inside it.
function ownText(node) {
  return node.childNodes
    .filter((child) => !["UL", "OL"].includes(child.tagName))
    .map((child) => child.text)
    .join("");
}

function blockToLines(node) {
  const text = node.tagName === "LI" ? ownText(node) : node.text;
  const boldText = node
    .querySelectorAll("strong")
    .map((strong) => strong.text)
    .join("");
  const flags = {
    bold: squash(text) !== "" && squash(boldText) === squash(text),
    heading: /^H[1-6]$/.test(node.tagName),
    bullet: node.tagName === "LI",
  };
  // A soft line break (<br>) inside a paragraph starts a new line.
  return text.split("\n").map((part) => makeLine({ text: part, ...flags }));
}

export async function readDocx(buffer) {
  const html = (await toHtml(buffer)).replace(/<br\s*\/?>/g, "\n");
  return parse(html)
    .querySelectorAll(BLOCKS)
    .filter((node) => !node.querySelector(BLOCKS) || node.tagName === "LI")
    .flatMap(blockToLines)
    .filter((line) => line.text);
}
