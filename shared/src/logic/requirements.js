import {
  FRESHER_WORDS,
  HEADING_MAX_WORDS,
  MAX_MUST_HAVE,
  MAX_NICE_TO_HAVE,
  MAX_REASONABLE_YEARS,
  NICE_TO_HAVE_CUES,
  REQUIRED_CUES,
  SKIPPED_SECTION_CUES,
} from "../constants/requirements.js";
import { lowestLevelMentioned } from "./education.js";
import { matchSkills } from "./skills.js";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordsRegExp = (words) => new RegExp(`\\b(?:${words.map(escapeRegExp).join("|")})\\b`, "i");

const NICE_RE = wordsRegExp(NICE_TO_HAVE_CUES);
const REQUIRED_RE = wordsRegExp(REQUIRED_CUES);
const FRESHER_RE = wordsRegExp(FRESHER_WORDS);
const SKIPPED_SECTION_RE = new RegExp(
  `^(?:${SKIPPED_SECTION_CUES.map(escapeRegExp).join("|")})\\b`,
  "i",
);

// Year patterns: the first capture group is the lower bound. A number only counts in a requirement-like
// phrase, so "a 5 years old company" or "aged 18-25 years" is ignored.
const NUM = String.raw`(?<![\d.])(\d{1,2}(?:\.\d+)?)`;
const YEARS = String.raw`(?:years?|yrs?)\b(?!\s*(?:old|of\s+age))`;
const YEAR_PATTERNS = [
  String.raw`${NUM}\s*(?:-|–|to)\s*\d{1,2}(?:\.\d+)?\s*\+?\s*${YEARS}`, // 2-5 yrs, 2 to 4 years
  String.raw`${NUM}\s*\+\s*${YEARS}`, // 3+ years
  String.raw`(?:minimum|min\.?|at\s*least)\s*(?:of\s*)?${NUM}\s*\+?\s*${YEARS}`, // at least 1 year
  String.raw`${NUM}\s*${YEARS}(?=\s+(?:of\s+)?(?:[\w-]+\s+){0,2}?(?:experience|exp)\b|\s+(?:in|with|as|building|working|developing)\b)`, // 1 year of experience
  String.raw`\b(?:experience|exp)\s*(?:of|:|-)?\s*${NUM}\s*${YEARS}`, // experience: 2 years
].map((source) => new RegExp(source, "gi"));

// Lines first, then sentences, because a cue like "Nice to have: Kubernetes" covers only its own sentence.
function splitUnits(text) {
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((unit) => unit.replace(/^[\s•·*\-–—]+/, "").trim())
    .filter(Boolean);
}

const isHeading = (unit) => unit.endsWith(":") || unit.split(/\s+/).length <= HEADING_MAX_WORDS;

function splitSkills(text) {
  const must = [];
  const nice = [];
  let inNiceSection = false;
  let inSkippedSection = false;
  for (const unit of splitUnits(text)) {
    if (SKIPPED_SECTION_RE.test(unit)) {
      inSkippedSection = true;
      continue;
    }
    const skills = matchSkills(unit);
    if (inSkippedSection) {
      // Any other heading ends the company/benefits section.
      if (!skills.length && isHeading(unit)) inSkippedSection = false;
      else continue;
    }
    const hasNiceCue = NICE_RE.test(unit);
    if (!skills.length && isHeading(unit)) {
      // "Nice to have:" opens a section for the bullet lines below it; any other heading closes it.
      inNiceSection = hasNiceCue;
    } else if (hasNiceCue) {
      nice.push(...skills);
    } else {
      if (REQUIRED_RE.test(unit)) inNiceSection = false;
      (inNiceSection ? nice : must).push(...skills);
    }
  }
  const mustHave = [...new Set(must)];
  const niceToHave = [...new Set(nice)].filter((skill) => !mustHave.includes(skill));
  return {
    mustHave: mustHave.slice(0, MAX_MUST_HAVE),
    niceToHave: niceToHave.slice(0, MAX_NICE_TO_HAVE),
  };
}

function findMinYears(text) {
  const bounds = YEAR_PATTERNS.flatMap((regExp) =>
    [...text.matchAll(regExp)].map((m) => Number.parseFloat(m[1])),
  ).filter((years) => years <= MAX_REASONABLE_YEARS);
  if (FRESHER_RE.test(text)) bounds.push(0);
  return bounds.length ? Math.min(...bounds) : null;
}

export function extractRequirements(descriptionText) {
  const text = String(descriptionText ?? "");
  const { mustHave, niceToHave } = splitSkills(text);
  const minYears = findMinYears(text);
  const education = lowestLevelMentioned(text);
  const nothingFound = !mustHave.length && !niceToHave.length && minYears === null && !education;
  return nothingFound ? null : { mustHave, niceToHave, minYears, education };
}
