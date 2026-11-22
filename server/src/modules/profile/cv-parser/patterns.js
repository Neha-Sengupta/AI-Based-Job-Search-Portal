// Regexes and small text helpers shared by the extract-* steps, built from the shared word lists.
import {
  COMPANY_SUFFIXES,
  CURRENT_DATE_WORDS,
  INSTITUTION_WORDS,
  JOB_TITLE_WORDS,
  MONTHS,
} from "shared/constants/cv-parser";
import { INDIAN_CITIES, INDIAN_STATES } from "shared/constants/locations";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordsRegex = (words, flags = "i") =>
  new RegExp(`(?<![\\w])(?:${words.map(escapeRegex).join("|")})(?![\\w])`, flags);

const JOB_TITLE = wordsRegex(JOB_TITLE_WORDS);
const INSTITUTION = wordsRegex(INSTITUTION_WORDS);
const COMPANY_SUFFIX = wordsRegex(COMPANY_SUFFIXES);

export const hasJobTitleWord = (text) => JOB_TITLE.test(text);
export const hasInstitutionWord = (text) => INSTITUTION.test(text);
export const hasCompanySuffix = (text) => COMPANY_SUFFIX.test(text.replace(/\./g, ""));

// --- Contact details ---
export const EMAIL = /[^\s@|,;:<>()[\]]+@[^\s@|,;:<>()[\]]+\.[a-z]{2,}/i;
// Indian mobile: optional +91 / 91 / 0, then 10 digits starting with 6–9; single spaces or dashes allowed.
const INDIAN_PHONE = /(?<![\d+])(?:(?:\+91|91)[\s-]?|0)?[6-9](?:[\s-]?\d){9}(?!\d)/;
// Otherwise an international number, which must start with "+" (so year ranges like "2019 - 2023" don't match).
const INTERNATIONAL_PHONE = /\+\d[\d ()-]{5,17}\d/;
export const findPhone = (text) =>
  (text.match(INDIAN_PHONE) ?? text.match(INTERNATIONAL_PHONE))?.[0];

export const LINKEDIN = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[\w%-]+/i;
export const GITHUB = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+(?:\/[\w.-]+)?/i;
export const URL = /https?:\/\/[^\s|,;()<>]+/i;
export const withProtocol = (url) =>
  (/^https?:\/\//i.test(url) ? url : `https://${url}`).replace(/[.)]+$/, "");

// --- Locations ---
const placeRegex = ({ name, aliases }) =>
  // Short all-caps aliases ("AP", "NCR") must match exactly, or they'd hit ordinary words.
  [name, ...aliases].map((alias) =>
    /^[A-Z]{1,3}$/.test(alias) ? wordsRegex([alias], "") : wordsRegex([alias]),
  );
const CITIES = INDIAN_CITIES.map((city) => ({ name: city.name, patterns: placeRegex(city) }));
const STATES = INDIAN_STATES.map((state) => ({ name: state.name, patterns: placeRegex(state) }));
const findPlace = (places, text) =>
  places.find((place) => place.patterns.some((pattern) => pattern.test(text)))?.name ?? null;

export const findCity = (text) => findPlace(CITIES, text);
export const findState = (text) => findPlace(STATES, text);

// --- Dates ---
const MONTH = [...MONTHS.map((month) => `${month.slice(0, 3)}(?:${month.slice(3)})?`), "sept"].join(
  "|",
);
const CURRENT = CURRENT_DATE_WORDS.map(escapeRegex).join("|");
// One date: "Jan 2022", "January, 2022", "Jan '22", "01/2022", "2022", or a "still doing this" word.
const DATE_TOKEN = new RegExp(
  `\\b(?:(${MONTH})\\.?[\\s,]*(\\d{4}|'\\d{2})|(\\d{1,2})[/.-]((?:19|20)\\d{2})|((?:19|20)\\d{2}))\\b|\\b(${CURRENT})\\b`,
  "gi",
);
const RANGE_JOIN = /^\s*(?:[-–—]|to|until|till)?\s*$/i;

const iso = (year, month) => `${year}-${String(month).padStart(2, "0")}-01`;
const monthNumber = (name) =>
  MONTHS.findIndex((month) => month.startsWith(name.slice(0, 3).toLowerCase())) + 1;

function toToken(match) {
  const [text, monthName, monthYear, monthDigits, numericYear, plainYear, current] = match;
  const base = { start: match.index, end: match.index + text.length };
  if (current) return { ...base, current: true };
  if (monthName) {
    const year = monthYear.startsWith("'") ? 2000 + Number(monthYear.slice(1)) : Number(monthYear);
    return { ...base, date: iso(year, monthNumber(monthName)) };
  }
  if (monthDigits) {
    const month = Number(monthDigits);
    return month >= 1 && month <= 12 ? { ...base, date: iso(numericYear, month) } : null;
  }
  return { ...base, date: iso(plainYear, 1) };
}

// → { startDate, endDate, current, range, text } for the first range (or single date) in the text, else null.
export function findDates(text) {
  const tokens = [...text.matchAll(DATE_TOKEN)].map(toToken).filter(Boolean);
  for (let i = 0; i + 1 < tokens.length; i++) {
    const [from, to] = [tokens[i], tokens[i + 1]];
    if (from.date && RANGE_JOIN.test(text.slice(from.end, to.start))) {
      return {
        startDate: from.date,
        endDate: to.current ? null : to.date,
        current: Boolean(to.current),
        range: true,
        text: text.slice(from.start, to.end),
      };
    }
  }
  const single = tokens.find((token) => token.date);
  if (!single) return null;
  const singleText = text.slice(single.start, single.end);
  return { startDate: single.date, endDate: null, current: false, range: false, text: singleText };
}

// "8.4/10", "8.4 CGPA", "CGPA: 8.4", "86%", "86.5 %".
const GRADE =
  /\d{1,2}(?:\.\d{1,2})?\s*(?:\/\s*10\b|(?:cgpa|cpi|gpa)\b)|\b(?:cgpa|cpi|gpa)\s*:?\s*\d{1,2}(?:\.\d{1,2})?(?:\s*\/\s*10)?|\d{1,3}(?:\.\d{1,2})?\s?%/i;
export const findGrade = (text) => text.match(GRADE)?.[0].trim() ?? null;

export const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;

// Cut at a word boundary so we never store half a word.
export function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : text.slice(0, max)).trim();
}
