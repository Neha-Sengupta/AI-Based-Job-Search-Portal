export const JOB_WORK_MODELS = Object.freeze(["remote", "hybrid", "onsite", "unknown"]);
export const JOB_JOB_TYPES = Object.freeze([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "unknown",
]);
export const EXPERIENCE_LEVELS = Object.freeze(["entry", "mid", "senior", "lead", "unknown"]);
export const SALARY_PERIODS = Object.freeze(["year", "month", "hour"]);

export const EXPERIENCE_LEVEL_LABELS = Object.freeze({
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead",
  unknown: "Not specified",
});

export const POSTED_WITHIN_DAYS = Object.freeze(["1", "3", "7", "30"]);
export const JOB_SORTS = Object.freeze(["relevance", "newest"]);

export const JOB_LIMITS = Object.freeze({
  title: 200,
  company: 200,
  description: 50_000,
  query: 100,
  city: 100,
  rawLocation: 300,
});

// Jobs older than this are deleted by the import.
export const JOB_MAX_AGE_DAYS = 60;

// Bump when extractRequirements or the skills dictionary changes; the import re-extracts older jobs.
export const REQUIREMENTS_VERSION = 3;

// Launch market: adapters keep jobs located here, or remote jobs open to it.
export const TARGET_COUNTRIES = Object.freeze(["IN"]);

// Sources whose terms ask for a credit line on the job page (F5.6).
export const SOURCE_ATTRIBUTION = Object.freeze({
  arbeitnow: { text: "Jobs via Arbeitnow", url: "https://www.arbeitnow.com" },
});
