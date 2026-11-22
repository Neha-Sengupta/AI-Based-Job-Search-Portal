// Step 3: lines → header + sections.
import {
  CV_LAYOUT,
  CV_SECTION_KEYWORDS,
  SECTION_TITLE_MAX_WORDS,
  SECTION_TITLE_SCORES as SCORES,
  SECTION_TITLE_THRESHOLD,
} from "shared/constants/cv-parser";
import { wordCount } from "./patterns.js";

const SECTION_BY_KEYWORD = new Map(
  Object.entries(CV_SECTION_KEYWORDS).flatMap(([section, keywords]) =>
    keywords.map((keyword) => [keyword, section]),
  ),
);

const normalizeTitle = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[\s:–—-]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

export const sectionKeyword = (text) => SECTION_BY_KEYWORD.get(normalizeTitle(text)) ?? null;

// The most common line height is the body text size. DOCX lines have no height.
export function bodyHeight(lines) {
  const counts = new Map();
  for (const { height } of lines) if (height) counts.set(height, (counts.get(height) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function sectionTitleScore(line, body = null) {
  let score = 0;
  if (sectionKeyword(line.text)) score += SCORES.keyword;
  if (line.bold || line.heading) score += SCORES.bold;
  if (line.allCaps) score += SCORES.allCaps;
  if (wordCount(line.text) <= SECTION_TITLE_MAX_WORDS && line.itemCount === 1)
    score += SCORES.short;
  if (body && line.height > body * CV_LAYOUT.biggerTextFactor) score += SCORES.bigger;
  if (/[\d@]/.test(line.text)) score += SCORES.dateOrDigit;
  return score;
}

// → { header: lines, sections: [{ name, title, lines }] }. `name` is a CV_SECTION_KEYWORDS key, or null for a
// title we don't know. Before the first section, unknown "titles" (the name, often big, bold and in capitals) stay in
// the header. A "contact" section is part of the header.
export function findSections(lines) {
  const body = bodyHeight(lines);
  const header = [];
  const sections = [];
  let current = { lines: header };
  for (const line of lines) {
    const name = sectionKeyword(line.text);
    const isTitle = sectionTitleScore(line, body) >= SECTION_TITLE_THRESHOLD;
    if (isTitle && name === "contact") {
      current = { lines: header };
    } else if (isTitle && (name || sections.length)) {
      current = { name, title: line.text, lines: [] };
      sections.push(current);
    } else {
      current.lines.push(line);
    }
  }
  return { header, sections };
}
