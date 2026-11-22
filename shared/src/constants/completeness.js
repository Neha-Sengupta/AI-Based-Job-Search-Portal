// Profile completeness (F3). Required fields share 70%, recommended share 30%.
export const COMPLETENESS_WEIGHTS = Object.freeze({ required: 70, recommended: 30 });

export const MIN_SKILLS_REQUIRED = 3;

export const REQUIRED_FIELDS = Object.freeze([
  "fullName",
  "contactEmail",
  "country",
  "skills",
  "experienceOrEducation",
  "targetRoles",
]);

export const RECOMMENDED_FIELDS = Object.freeze([
  "headline",
  "summary",
  "phone",
  "links",
  "projects",
]);

export const COMPLETENESS_LABELS = Object.freeze({
  fullName: "Full name",
  contactEmail: "Contact email",
  country: "Country",
  skills: `At least ${MIN_SKILLS_REQUIRED} skills`,
  experienceOrEducation: "Experience or education",
  targetRoles: "Target role",
  headline: "Headline",
  summary: "Summary",
  phone: "Phone",
  links: "LinkedIn, GitHub or portfolio link",
  projects: "A project",
});

// Where each field is edited on /profile (anchor ids).
export const COMPLETENESS_SECTIONS = Object.freeze({
  fullName: "basics",
  contactEmail: "basics",
  country: "basics",
  skills: "skills",
  experienceOrEducation: "experience",
  targetRoles: "preferences",
  headline: "basics",
  summary: "basics",
  phone: "basics",
  links: "basics",
  projects: "projects",
});
