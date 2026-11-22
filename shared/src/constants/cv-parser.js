// Word lists and numbers for the rule-based CV parser.
// ponytail: plain word lists will miss cases; grow them from real failures rather than adding clever logic.

export const CV_MIME_TYPES = Object.freeze({
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});

// Matched against a whole line, ignoring case, a trailing ":" and extra spaces.
// "contact" lines join the header; "ignored" sections are dropped completely (personal data we never import).
export const CV_SECTION_KEYWORDS = Object.freeze({
  summary: [
    "summary",
    "profile",
    "professional summary",
    "profile summary",
    "career summary",
    "professional profile",
    "objective",
    "career objective",
    "about me",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "internship",
    "internships",
    "internship experience",
  ],
  education: [
    "education",
    "academic details",
    "academics",
    "academic qualification",
    "academic qualifications",
    "educational qualification",
    "educational qualifications",
    "educational details",
    "qualifications",
  ],
  skills: [
    "skills",
    "technical skills",
    "key skills",
    "core competencies",
    "technologies",
    "tech stack",
    "skills and tools",
    "skill set",
  ],
  projects: ["projects", "academic projects", "personal projects", "key projects"],
  certifications: [
    "certifications",
    "certificates",
    "certification",
    "courses",
    "trainings",
    "licenses and certifications",
  ],
  contact: ["contact", "contact details", "contact information", "contact info"],
  ignored: [
    "declaration",
    "personal details",
    "personal information",
    "personal profile",
    "personal data",
    "hobbies",
    "interests",
    "hobbies and interests",
    "languages",
    "languages known",
    "references",
    "extra-curricular",
    "extra-curricular activities",
    "extracurricular activities",
    "co-curricular activities",
    "achievements",
    "awards",
    "strengths",
    "positions of responsibility",
  ],
});

export const SECTION_TITLE_SCORES = Object.freeze({
  keyword: 4,
  bold: 2,
  allCaps: 1,
  short: 1,
  bigger: 1,
  dateOrDigit: -3,
});
export const SECTION_TITLE_THRESHOLD = 4;
export const SECTION_TITLE_MAX_WORDS = 4;

export const NAME_SCORES = Object.freeze({
  lettersOnly: 3,
  biggest: 3,
  firstLine: 2,
  bold: 1,
  wordCount: 1,
  badCharacters: -4,
  keywordOrJobTitle: -4,
});
export const NAME_WORDS = Object.freeze({ min: 2, max: 4 });

export const JOB_TITLE_SCORES = Object.freeze({ jobTitleWord: 3, bold: 1, date: -2 });
export const COMPANY_SCORES = Object.freeze({ bold: 2, plain: 2, suffix: 2 });
export const INSTITUTION_SCORE = 3;
export const PROJECT_NAME_SCORE = 2;

// Whole words, matched ignoring case.
export const JOB_TITLE_WORDS = Object.freeze([
  "engineer",
  "developer",
  "intern",
  "analyst",
  "designer",
  "manager",
  "consultant",
  "trainee",
  "associate",
  "executive",
  "architect",
  "lead",
  "programmer",
  "administrator",
  "scientist",
  "specialist",
  "officer",
  "director",
  "tester",
  "coordinator",
  "head",
  "fresher",
]);

export const INSTITUTION_WORDS = Object.freeze([
  "university",
  "college",
  "institute",
  "institution",
  "iit",
  "nit",
  "iiit",
  "iim",
  "bits",
  "school",
  "vidyalaya",
  "vidyapeeth",
  "academy",
  "polytechnic",
  "board",
]);

// Compared after removing dots, so "Pvt. Ltd." matches "pvt ltd".
export const COMPANY_SUFFIXES = Object.freeze([
  "pvt ltd",
  "private limited",
  "ltd",
  "limited",
  "inc",
  "llp",
  "llc",
  "corp",
  "corporation",
  "technologies",
  "solutions",
  "services",
  "systems",
  "labs",
  "studios",
  "infotech",
  "software",
  "consulting",
]);

export const BULLET_CHARS = Object.freeze([
  "•",
  "●",
  "▪",
  "■",
  "◦",
  "‣",
  "-",
  "*",
  "–",
  "·",
  "➢",
  "✓",
]);

// The second half of a date range meaning "still doing this".
export const CURRENT_DATE_WORDS = Object.freeze([
  "present",
  "current",
  "currently",
  "till date",
  "to date",
  "ongoing",
  "now",
]);

// Full names; the first three letters are enough to match ("Sept" works too).
export const MONTHS = Object.freeze([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

export const CV_LAYOUT = Object.freeze({
  // A new entry starts when the gap above a line is more than this × the typical line gap.
  entryGapFactor: 1.4,
  // A line is "bigger than the body text" above this × the most common line height.
  biggerTextFactor: 1.1,
  // A gap wider than this many average characters splits a line into separate pieces.
  columnGapChars: 3,
  // Two columns: at least this many lines (and this share of all lines) have a piece starting at the same x.
  twoColumnMinLines: 4,
  twoColumnMinShare: 0.1,
  // Pieces starting within this many points count as the same column.
  columnTolerance: 4,
  // A non-bullet line longer than this is prose (a responsibility), not a title or company candidate.
  candidateMaxWords: 8,
  // A skill longer than this is a sentence, not a skill.
  skillMaxWords: 5,
});

// How the draft fields are named in warnings.
export const CV_DRAFT_FIELD_LABELS = Object.freeze({
  fullName: "name",
  headline: "headline",
  contactEmail: "email address",
  phone: "phone number",
  location: "location",
  links: "links",
  summary: "summary",
  skills: "skills",
  experience: "work experience",
  education: "education",
  projects: "projects",
  certifications: "certifications",
});

export const CV_PARSER_MESSAGES = Object.freeze({
  unreadable: "We couldn't read text from this file",
  unsupported: "We couldn't read that file. Please upload a PDF or DOCX.",
  twoColumns: "Your CV seems to have two columns; please check every field carefully.",
  noEmail: "We couldn't find an email address.",
  noDates: (count) =>
    `We couldn't find dates for ${count} ${count === 1 ? "job" : "jobs"}, so we left ${count === 1 ? "it" : "them"} out. Please add ${count === 1 ? "it" : "them"} by hand.`,
  skippedEntries: (count, section) =>
    `We couldn't read ${count} ${section} ${count === 1 ? "entry" : "entries"}. Please add ${count === 1 ? "it" : "them"} by hand.`,
  unknownSection: (title) =>
    `We skipped the "${title}" section. Please add anything important from it by hand.`,
  invalidField: (field) => `We couldn't use the ${field} we found. Please fill it in by hand.`,
});
