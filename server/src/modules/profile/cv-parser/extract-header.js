// Step 4a: name, headline, email, phone, links and location.
import { NAME_SCORES as SCORES, NAME_WORDS } from "shared/constants/cv-parser";
import { sectionKeyword } from "./find-sections.js";
import {
  EMAIL,
  GITHUB,
  LINKEDIN,
  URL,
  findCity,
  findPhone,
  findState,
  hasJobTitleWord,
  wordCount,
  withProtocol,
} from "./patterns.js";

const titleCase = (text) =>
  text.toLowerCase().replace(/(^|[\s.])\p{L}/gu, (match) => match.toUpperCase());

export function nameScore(line, index, biggestHeight) {
  const words = wordCount(line.text);
  let score = 0;
  if (/^[\p{L} .]+$/u.test(line.text)) score += SCORES.lettersOnly;
  if (biggestHeight && line.height === biggestHeight) score += SCORES.biggest;
  if (index === 0) score += SCORES.firstLine;
  if (line.bold) score += SCORES.bold;
  if (words >= NAME_WORDS.min && words <= NAME_WORDS.max) score += SCORES.wordCount;
  if (/[@\d/,|]/.test(line.text)) score += SCORES.badCharacters;
  if (sectionKeyword(line.text) || hasJobTitleWord(line.text)) score += SCORES.keywordOrJobTitle;
  return score;
}

// The highest-scoring header line, if it scores above 0. Returns its index too, for the headline.
function findName(header, biggestHeight) {
  let best = { index: -1, score: 0 };
  header.forEach((line, index) => {
    const score = nameScore(line, index, biggestHeight);
    if (score > best.score) best = { index, score };
  });
  return best.index;
}

const firstMatch = (lines, find) => {
  for (const line of lines) {
    const found = find(line.text);
    if (found) return found;
  }
  return null;
};

function findLinks(lines) {
  const linkedin = firstMatch(lines, (text) => text.match(LINKEDIN)?.[0]);
  const github = firstMatch(lines, (text) => text.match(GITHUB)?.[0]);
  const portfolio = firstMatch(lines, (text) =>
    text.match(new RegExp(URL, "gi"))?.find((url) => !LINKEDIN.test(url) && !GITHUB.test(url)),
  );
  const links = {
    linkedin: linkedin && withProtocol(linkedin),
    github: github && withProtocol(github),
    portfolio: portfolio && withProtocol(portfolio),
  };
  return Object.values(links).some(Boolean) ? links : undefined;
}

function findLocation(lines, phone) {
  const city = firstMatch(lines, findCity);
  const state = firstMatch(lines, findState);
  const indianPhone = /^\+?91/.test(phone ?? "");
  return city || state || indianPhone ? { city, country: "IN" } : undefined;
}

// `header` = lines before the first section (plus any "contact" section); `searchable` = every line that isn't in an
// ignored section, the fallback for email and phone. Links and location come from the header only, so a project's
// GitHub link or a college's city isn't mistaken for the person's own.
export function extractHeader(header, searchable = header) {
  const biggestHeight = Math.max(
    0,
    ...header.filter((line) => line.page === 1).map((line) => line.height),
  );
  const nameIndex = findName(header, biggestHeight);
  const nameLine = header[nameIndex];
  const next = header[nameIndex + 1];

  const email =
    firstMatch(header, (text) => text.match(EMAIL)?.[0]) ??
    firstMatch(searchable, (text) => text.match(EMAIL)?.[0]);
  const phone = firstMatch(header, findPhone) ?? firstMatch(searchable, findPhone);

  return {
    fullName: nameLine && (nameLine.allCaps ? titleCase(nameLine.text) : nameLine.text),
    headline:
      next && hasJobTitleWord(next.text) && !next.text.includes("@") ? next.text : undefined,
    contactEmail: email?.toLowerCase(),
    phone: phone?.trim(),
    location: findLocation(header, phone),
    links: findLinks(header),
  };
}
