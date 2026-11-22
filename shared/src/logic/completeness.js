import {
  COMPLETENESS_WEIGHTS,
  MIN_SKILLS_REQUIRED,
  RECOMMENDED_FIELDS,
  REQUIRED_FIELDS,
} from "../constants/completeness.js";

const filled = (value) => typeof value === "string" && value.trim().length > 0;
const count = (list) => (Array.isArray(list) ? list.length : 0);

const CHECKS = {
  fullName: (p) => filled(p.fullName),
  contactEmail: (p) => filled(p.contactEmail),
  country: (p) => filled(p.location?.country),
  skills: (p) => count(p.skills) >= MIN_SKILLS_REQUIRED,
  experienceOrEducation: (p) => count(p.experience) > 0 || count(p.education) > 0,
  targetRoles: (p) => count(p.preferences?.roles) > 0,
  headline: (p) => filled(p.headline),
  summary: (p) => filled(p.summary),
  phone: (p) => filled(p.phone),
  links: (p) => ["linkedin", "github", "portfolio"].some((key) => filled(p.links?.[key])),
  projects: (p) => count(p.projects) > 0,
};

// Rules only, no AI: the same profile always gets the same score (F3.3).
export function calculateCompleteness(profile = {}) {
  const missingRequired = REQUIRED_FIELDS.filter((field) => !CHECKS[field](profile));
  const missingRecommended = RECOMMENDED_FIELDS.filter((field) => !CHECKS[field](profile));
  const requiredScore =
    (COMPLETENESS_WEIGHTS.required * (REQUIRED_FIELDS.length - missingRequired.length)) /
    REQUIRED_FIELDS.length;
  const recommendedScore =
    (COMPLETENESS_WEIGHTS.recommended * (RECOMMENDED_FIELDS.length - missingRecommended.length)) /
    RECOMMENDED_FIELDS.length;
  return {
    percent: Math.round(requiredScore + recommendedScore),
    missingRequired,
    missingRecommended,
  };
}
