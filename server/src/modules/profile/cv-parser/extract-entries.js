// Step 4b: education and experience entries.
import {
  COMPANY_SCORES,
  CV_LAYOUT,
  INSTITUTION_SCORE,
  JOB_TITLE_SCORES,
} from "shared/constants/cv-parser";
import { PROFILE_LIMITS as LIMITS } from "shared/constants/profile";
import { degreeToLevel } from "shared/logic/education";
import { stripBullet } from "./group-lines.js";
import {
  findCity,
  findDates,
  findState,
  findGrade,
  hasCompanySuffix,
  hasInstitutionWord,
  hasJobTitleWord,
  truncate,
  wordCount,
} from "./patterns.js";

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
};

// The usual vertical distance between two lines of the same page (PDF only).
export function typicalGap(lines) {
  const gaps = [];
  for (let i = 1; i < lines.length; i++) {
    const [above, line] = [lines[i - 1], lines[i]];
    if (line.y !== null && line.page === above.page && line.y > above.y)
      gaps.push(line.y - above.y);
  }
  return median(gaps);
}

const hasRange = (line) => findDates(line.text)?.range === true;

function startsEntry(line, previous, entry, gap) {
  const samePage = line.y !== null && previous.y !== null && line.page === previous.page;
  if (gap && samePage && line.y - previous.y > gap * CV_LAYOUT.entryGapFactor) return true;
  if (line.bullet) return false;
  if (previous.bullet && (line.bold || hasRange(line))) return true;
  // ponytail: two extra rules for entries without bullets or gaps (common in DOCX): a bold line after a plain one,
  // and a second date range in the same entry.
  if (line.bold && !previous.bold) return true;
  return hasRange(line) && entry.some(hasRange);
}

export function splitEntries(lines) {
  const gap = typicalGap(lines);
  const entries = [];
  lines.forEach((line, i) => {
    if (i === 0 || startsEntry(line, lines[i - 1], entries.at(-1), gap)) entries.push([]);
    entries.at(-1).push(line);
  });
  return entries;
}

// A non-bullet line that starts lower-case or is indented continues the bullet above it.
const continuesBullet = (line, bulletLine) =>
  !line.bullet && (/^\p{Ll}/u.test(line.text) || (line.x !== null && line.x > bulletLine.x + 1));

const isProse = (text) => wordCount(text) > CV_LAYOUT.candidateMaxWords && !findDates(text);

// Bullet lines (joined with their continuation lines) and the remaining "header" lines of an entry.
// Long plain lines without a date are prose responsibilities, so they count as bullets too.
export function splitBullets(lines) {
  const bullets = [];
  const headerLines = [];
  let lastBullet = null;
  for (const line of lines) {
    if (lastBullet && continuesBullet(line, lastBullet)) {
      bullets[bullets.length - 1] += ` ${line.text}`;
    } else if (line.bullet || isProse(line.text)) {
      bullets.push(stripBullet(line.text));
      lastBullet = line;
    } else {
      headerLines.push(line);
      lastBullet = null;
    }
  }
  return {
    headerLines,
    bullets: bullets
      .filter(Boolean)
      .slice(0, LIMITS.bullets)
      .map((bullet) => truncate(bullet, LIMITS.bullet)),
  };
}

// Header lines → candidate parts: "Software Engineer | Infosys Ltd, Pune" → three parts.
function toParts(headerLines, dateText) {
  return headerLines.flatMap((line) =>
    line.text
      .replace(dateText ?? "\u0000", " ")
      .split(/\s*[|•·]\s*|\s+[–—-]\s+|,\s+|\s+at\s+/)
      .map((text) => text.trim())
      .filter((text) => /\p{L}/u.test(text))
      .map((text) => ({ text, bold: line.bold })),
  );
}

const best = (parts, score) => {
  let winner = null;
  let top = 0;
  for (const part of parts) {
    const value = score(part);
    if (value > top) [winner, top] = [part, value];
  }
  return winner;
};

const entryDates = (lines) => {
  for (const line of lines) {
    const dates = findDates(line.text);
    if (dates?.range) return dates;
  }
  return lines.map((line) => findDates(line.text)).find(Boolean) ?? null;
};

export function titleScore(part) {
  let score = 0;
  if (hasJobTitleWord(part.text)) score += JOB_TITLE_SCORES.jobTitleWord;
  if (part.bold) score += JOB_TITLE_SCORES.bold;
  if (findDates(part.text)) score += JOB_TITLE_SCORES.date;
  return score;
}

export function companyScore(part) {
  let score = 0;
  if (part.bold) score += COMPANY_SCORES.bold;
  if (!hasJobTitleWord(part.text) && !findDates(part.text)) score += COMPANY_SCORES.plain;
  if (hasCompanySuffix(part.text)) score += COMPANY_SCORES.suffix;
  return score;
}

// "Pune" or "Maharashtra" on its own is the job's location, not a company.
const isPlace = (part) =>
  wordCount(part.text) <= 3 && Boolean(findCity(part.text) || findState(part.text));

// → { title, company, location, startDate, endDate, current, bullets } with null for anything not found.
export function toExperience(lines) {
  const { headerLines, bullets } = splitBullets(lines);
  const dates = entryDates(headerLines);
  const parts = toParts(headerLines, dates?.text).filter(
    (part) => wordCount(part.text) <= CV_LAYOUT.candidateMaxWords,
  );
  const places = parts.filter(isPlace);
  const candidates = parts.filter((part) => !isPlace(part));
  const title = best(candidates, titleScore);
  const company = best(
    candidates.filter((part) => part !== title),
    companyScore,
  );
  return {
    title: title?.text ?? null,
    company: company?.text ?? null,
    location: places.map((part) => findCity(part.text)).find(Boolean) ?? null,
    startDate: dates?.startDate ?? null,
    endDate: dates?.range ? dates.endDate : null,
    current: dates?.current ?? false,
    bullets,
  };
}

// "B.Tech in Computer Science" with degree "B.Tech" → "Computer Science".
function fieldOf(text, degree, grade) {
  const field = text
    .replace(degree, " ")
    .replace(grade ?? "\u0000", " ")
    .replace(/[()]/g, " ")
    .replace(/^[\s,:.-]*(?:in|of)?\s+/i, "")
    .replace(/[\s,:.-]+$/, "")
    .trim();
  return field || null;
}

// → { institution, degree, field, level, startDate, endDate, current, grade } with null for anything not found.
export function toEducation(lines) {
  const dates = entryDates(lines);
  const grade = lines.map((line) => findGrade(line.text)).find(Boolean) ?? null;
  const parts = toParts(lines, dates?.text);
  const institution = best(parts, (part) =>
    hasInstitutionWord(part.text) ? INSTITUTION_SCORE : 0,
  );
  const degreePart = parts
    .filter((part) => part !== institution)
    .map((part) => ({ part, match: degreeToLevel(part.text) }))
    .find(({ match }) => match);
  const single = dates && !dates.range;
  return {
    institution: institution?.text ?? null,
    degree: degreePart?.match.degree ?? null,
    field: degreePart ? fieldOf(degreePart.part.text, degreePart.match.degree, grade) : null,
    level: degreePart?.match.level ?? null,
    // A single year on an education entry is the passing year.
    startDate: single ? null : (dates?.startDate ?? null),
    endDate: single ? dates.startDate : (dates?.endDate ?? null),
    current: dates?.current ?? false,
    grade,
  };
}
