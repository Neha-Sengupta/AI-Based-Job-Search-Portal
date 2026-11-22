// Limits for rule-based CV tailoring.
export const TAILORING_LIMITS = Object.freeze({
  skills: 20,
  bulletsRecentJobs: 6,
  bulletsOlderJobs: 3,
  recentJobs: 2,
  projects: 3,
});

// Words that say little about a role; they count less when matching a target role to a job title.
export const GENERIC_ROLE_WORDS = Object.freeze([
  "developer",
  "engineer",
  "intern",
  "trainee",
  "senior",
  "junior",
  "lead",
  "associate",
  "executive",
  "specialist",
  "and",
  "of",
  "the",
]);
