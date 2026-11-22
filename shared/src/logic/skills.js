import { SKILLS } from "../constants/skills.js";

// Longest skill spelling matchSkills tries, in words.
const MAX_WINDOW_WORDS = 3;

// "React.js", "reactjs" and "React JS" must compare equal, while "C", "C++", "C#" and ".NET"/"net" must not,
// so the symbols that carry meaning become letters before all other punctuation and spaces are dropped.
function baseKey(text) {
  return String(text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/^\./, "dot")
    .replaceAll("+", "plus")
    .replaceAll("#", "sharp")
    .replace(/[^a-z0-9]/g, "");
}

// key → { name, key (canonical), ambiguous }. Only the name's own key is ambiguous; aliases never are.
function buildLookup() {
  const lookup = new Map();
  for (const { name, aliases, ambiguous = false } of SKILLS) {
    const key = baseKey(name);
    lookup.set(key, { name, key, ambiguous });
    for (const alias of aliases) {
      const aliasKey = baseKey(alias);
      if (!lookup.has(aliasKey)) lookup.set(aliasKey, { name, key, ambiguous: false });
    }
  }
  return lookup;
}

const LOOKUP = buildLookup();

export function skillKey(text) {
  const key = baseKey(text);
  return LOOKUP.get(key)?.key ?? key;
}

export function normalizeSkill(text) {
  return LOOKUP.get(baseKey(text))?.name ?? String(text ?? "").trim();
}

export function sameSkill(a, b) {
  return skillKey(a) === skillKey(b);
}

// Clause breaks stop a window from spanning two sentences or list items. A dot only breaks when followed by
// a space or the end, so "Node.js" and ".NET" stay whole.
const SEGMENT_BREAK = /[\r\n,;:()[\]{}|•·!?"]+|\.(?=\s|$)|\s[-–—]\s/;

// Leading "." is kept for ".NET"; trailing "+" and "#" are kept for "C++" and "C#".
const trimToken = (token) => token.replace(/^[^\w.]+|[^\w#+]+$/g, "");

// "HTML/CSS" is two skills, but "CI/CD" and "PL/SQL" are one: split on "/" only when the whole is unknown.
function tokenize(segment) {
  return segment
    .split(/\s+/)
    .map(trimToken)
    .flatMap((token) =>
      token.includes("/") && !LOOKUP.has(baseKey(token))
        ? token.split("/").map(trimToken)
        : [token],
    )
    .filter((token) => baseKey(token));
}

function findInWindow(tokens, start, listContext) {
  for (let size = Math.min(MAX_WINDOW_WORDS, tokens.length - start); size > 0; size -= 1) {
    const written = tokens.slice(start, start + size).join(" ");
    const entry = LOOKUP.get(baseKey(written));
    if (entry && (!entry.ambiguous || listContext || written === entry.name)) {
      return { name: entry.name, size };
    }
  }
  return null;
}

export function matchSkills(text, { listContext = false } = {}) {
  const found = new Set();
  for (const segment of String(text ?? "").split(SEGMENT_BREAK)) {
    const tokens = tokenize(segment);
    let index = 0;
    while (index < tokens.length) {
      // Longest window first, so "Spring Boot" wins over "Spring" and "React Native" over "React".
      const match = findInWindow(tokens, index, listContext);
      if (match) found.add(match.name);
      index += match?.size ?? 1;
    }
  }
  return [...found];
}
