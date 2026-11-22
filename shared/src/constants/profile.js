// Ordered lowest → highest; the fit score compares positions.
export const EDUCATION_LEVELS = Object.freeze([
  "high_school",
  "diploma",
  "bachelor",
  "master",
  "doctorate",
]);

export const EDUCATION_LEVEL_LABELS = Object.freeze({
  high_school: "High school (10th / 12th)",
  diploma: "Diploma",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
});

export const PROFILE_SOURCES = Object.freeze(["form", "cv_upload"]);

export const WORK_MODELS = Object.freeze(["remote", "hybrid", "onsite"]);
export const JOB_TYPES = Object.freeze(["full_time", "part_time", "contract", "internship"]);

export const WORK_MODEL_LABELS = Object.freeze({
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: "Not specified",
});

export const JOB_TYPE_LABELS = Object.freeze({
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
  unknown: "Not specified",
});

export const PROFILE_LIMITS = Object.freeze({
  fullName: 100,
  headline: 120,
  phone: 20,
  city: 100,
  summary: 1000,
  skill: 50,
  skills: 100,
  experience: 30,
  education: 10,
  projects: 30,
  certifications: 30,
  bullets: 10,
  bullet: 300,
  title: 100,
  company: 100,
  institution: 150,
  degree: 100,
  field: 100,
  grade: 20,
  projectName: 100,
  projectDescription: 500,
  projectSkills: 20,
  certificationName: 150,
  issuer: 100,
  roles: 10,
  role: 100,
  countries: 20,
});

// Country choices in profile forms (ISO 3166-1 alpha-2). India first: the launch market.
export const COUNTRY_OPTIONS = Object.freeze([
  { code: "IN", name: "India" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "DE", name: "Germany" },
  { code: "GB", name: "United Kingdom" },
  { code: "IE", name: "Ireland" },
  { code: "JP", name: "Japan" },
  { code: "NL", name: "Netherlands" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SG", name: "Singapore" },
  { code: "US", name: "United States" },
]);
