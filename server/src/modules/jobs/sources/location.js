import { JOB_LIMITS, TARGET_COUNTRIES } from "shared/constants/jobs";
import { COUNTRY_NAMES, INDIAN_CITIES, INDIAN_STATES } from "shared/constants/locations";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Abbreviations written in capitals ("UP", "TN", "US") only match in capitals, so "set up" is not
// Uttar Pradesh. Everything else matches case-insensitively.
const wordPattern = (word) => {
  const flags = word === word.toUpperCase() ? "u" : "iu";
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, flags);
};

const placePatterns = (places) =>
  places.flatMap(({ name, aliases }) =>
    [name, ...aliases].map((word) => ({ name, pattern: wordPattern(word) })),
  );

const CITY_PATTERNS = placePatterns(INDIAN_CITIES);
const STATE_PATTERNS = placePatterns(INDIAN_STATES);
const COUNTRY_PATTERNS = Object.entries(COUNTRY_NAMES).map(([word, code]) => ({
  name: code,
  pattern: wordPattern(word),
}));

// The place mentioned first in the text wins ("Mumbai, Bengaluru" → Mumbai).
function firstMatch(text, patterns) {
  let best = null;
  for (const { name, pattern } of patterns) {
    const index = text.search(pattern);
    if (index !== -1 && (best === null || index < best.index)) best = { name, index };
  }
  return best?.name ?? null;
}

// Free-text location → { city, country, raw }. Only Indian cities are recognised (the launch market).
// India wins when it is named anywhere; otherwise the first named country; otherwise an Indian city
// or state implies India.
export function parseLocation(raw) {
  const text = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, JOB_LIMITS.rawLocation);
  const city = firstMatch(text, CITY_PATTERNS);
  const indiaNamed = COUNTRY_PATTERNS.some(
    ({ name, pattern }) => name === "IN" && pattern.test(text),
  );
  const impliesIndia = city !== null || firstMatch(text, STATE_PATTERNS) !== null;
  const country = indiaNamed
    ? "IN"
    : (firstMatch(text, COUNTRY_PATTERNS) ?? (impliesIndia ? "IN" : null));
  return { city: country === "IN" ? city : null, country, raw: text };
}

const WORK_MODEL_PATTERNS = [
  ["hybrid", /\bhybrid\b/i],
  ["remote", /\bremote\b|\bwork from home\b|\bwfh\b|\btelecommute\b|\bdistributed\b/i],
  ["onsite", /\bon-?site\b|\bin[- ]office\b|\boffice[- ]based\b/i],
];

// Hybrid is checked first: "Hybrid (2 days remote)" is hybrid, not remote.
export function detectWorkModel(text) {
  return WORK_MODEL_PATTERNS.find(([, pattern]) => pattern.test(text ?? ""))?.[0] ?? "unknown";
}

// "Southeast Asia" does not include India.
const OPEN_TO_INDIA = /\b(india|apac|(?<!south[- ]?east )asia|anywhere|worldwide|global)\b/i;

// India / remote filter used by every adapter (TARGET_COUNTRIES = launch market). Keep a job when:
// 1. its location is in a target country, or
// 2. it is remote and its location text says it is open to India (India, APAC, Asia, anywhere,
//    worldwide, global; not "Southeast Asia"), or
// 3. it is remote, names no place at all ("Remote", or empty), and the board belongs to an Indian
//    company (`indian: true` in companies.json). "Remote - San Francisco" is not kept.
const NO_PLACE = /^[^\p{L}]*(remote|work from home|wfh)?[^\p{L}]*$/iu;

export function isOpenToIndia({ location, workModel }, { indianCompany = false } = {}) {
  if (TARGET_COUNTRIES.includes(location.country)) return true;
  if (workModel !== "remote") return false;
  return OPEN_TO_INDIA.test(location.raw) || (indianCompany && NO_PLACE.test(location.raw));
}
