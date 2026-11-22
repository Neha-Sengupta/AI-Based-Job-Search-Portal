// Cue phrases and limits for extractRequirements. Cues match as whole words,
// case-insensitively.
export const NICE_TO_HAVE_CUES = Object.freeze([
  "nice to have",
  "nice-to-have",
  "good to have",
  "good-to-have",
  "bonus",
  "plus",
  "preferred",
  "preferably",
  "desirable",
  "desired",
  "advantage",
  "advantageous",
  "optional",
]);

// A line with one of these ends a nice-to-have section.
export const REQUIRED_CUES = Object.freeze([
  "must have",
  "must-have",
  "must know",
  "required",
  "requirements",
  "mandatory",
  "essential",
  "you have",
  "responsibilities",
  "qualifications",
]);

// "Fresher" in an Indian job ad means 0 years of experience.
export const FRESHER_WORDS = Object.freeze(["fresher", "freshers"]);

// A line this short with no skills is read as a section heading ("Preferred skills", "Benefits").
export const HEADING_MAX_WORDS = 4;

export const MAX_MUST_HAVE = 15;
export const MAX_NICE_TO_HAVE = 15;
export const MAX_REASONABLE_YEARS = 20;

// Sections about the company or its perks: skills named there ("we integrate with Salesforce") aren't requirements.
// A unit starting with one of these opens a skipped section that lasts until the next heading.
export const SKIPPED_SECTION_CUES = Object.freeze([
  "about us",
  "about the company",
  "about the team",
  "who we are",
  "company description",
  "company overview",
  "our company",
  "our story",
  "benefits",
  "perks",
  "what we offer",
  "why join us",
  "why work with us",
  "equal opportunity",
]);
