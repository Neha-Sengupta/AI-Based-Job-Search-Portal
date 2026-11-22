import { CASE_SENSITIVE_DEGREES, DEGREE_SPELLINGS } from "../constants/education.js";
import { EDUCATION_LEVELS } from "../constants/profile.js";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function spellingToRegExp(spelling) {
  const body = escapeRegExp(spelling).replaceAll("\\.", "\\.?\\s*").replaceAll(" ", "[\\s-]*");
  const flags = CASE_SENSITIVE_DEGREES.includes(spelling) ? "g" : "gi";
  return new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])`, flags);
}

const DEGREE_PATTERNS = Object.entries(DEGREE_SPELLINGS).flatMap(([level, spellings]) =>
  spellings.map((spelling) => ({ level, regExp: spellingToRegExp(spelling) })),
);

// All degree words in reading order. Overlaps keep the longest match, so "post graduate" is one master's
// mention, not also a "graduate".
function findDegrees(text) {
  const normalized = String(text ?? "").replace(/[‘’]/g, "'");
  const matches = DEGREE_PATTERNS.flatMap(({ level, regExp }) =>
    [...normalized.matchAll(regExp)].map((m) => ({
      level,
      degree: m[0],
      start: m.index,
      end: m.index + m[0].length,
    })),
  ).sort((a, b) => a.start - b.start || b.end - a.end);

  const kept = [];
  for (const match of matches) {
    if (!kept.length || match.start >= kept.at(-1).end) kept.push(match);
  }
  return kept;
}

export function degreeToLevel(text) {
  const [first] = findDegrees(text);
  return first ? { level: first.level, degree: first.degree } : null;
}

// A job asking for "B.Tech or M.Tech" accepts a bachelor's, so requirements use the lowest level mentioned.
export function lowestLevelMentioned(text) {
  const positions = findDegrees(text).map(({ level }) => EDUCATION_LEVELS.indexOf(level));
  return positions.length ? EDUCATION_LEVELS[Math.min(...positions)] : null;
}
