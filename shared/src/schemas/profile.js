// The master profile (F2). Used by the API, the onboarding forms and the CV parser.
import { z } from "zod";
import {
  EDUCATION_LEVELS,
  JOB_TYPES,
  PROFILE_LIMITS as L,
  PROFILE_SOURCES,
  WORK_MODELS,
} from "../constants/profile.js";
import {
  countryCode,
  currencyCode,
  email,
  httpUrl,
  objectId,
  phone,
  requiredString,
} from "./fields.js";
import { clearEndDateWhenCurrent, isoDate, refineDateRange } from "./dates.js";

const tooLong = (max) => `Must be ${max} characters or fewer`;
// Optional text a user can clear: absent, null or "" (an empty input) all mean "no value".
const clearableString = (max) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .transform((value) => value || null)
    .nullable()
    .optional();
const clearable = (schema) =>
  z
    .union([z.literal("").transform(() => null), schema])
    .nullable()
    .optional();

// Case-insensitive, trimmed de-duplication; the first spelling wins (F2.11).
export const skillList = (max) =>
  z
    .array(z.string().trim().min(1, "Required").max(L.skill, tooLong(L.skill)))
    .max(max, `At most ${max} skills`)
    .transform((skills) => {
      const seen = new Set();
      return skills.filter((skill) => {
        const key = skill.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

const bullets = z
  .array(z.string().trim().min(1, "Required").max(L.bullet, tooLong(L.bullet)))
  .max(L.bullets, `At most ${L.bullets} bullet points`)
  .default([]);

export const experienceItemSchema = z
  .object({
    title: requiredString(L.title),
    company: requiredString(L.company),
    location: clearableString(L.city),
    startDate: isoDate(),
    endDate: isoDate().nullable().optional(),
    current: z.boolean().default(false),
    bullets,
  })
  .superRefine(refineDateRange)
  .transform(clearEndDateWhenCurrent);

export const educationItemSchema = z
  .object({
    institution: requiredString(L.institution),
    degree: clearableString(L.degree),
    field: clearableString(L.field),
    level: z.enum(EDUCATION_LEVELS, "Choose a level"),
    startDate: isoDate().nullable().optional(),
    endDate: isoDate().nullable().optional(),
    current: z.boolean().default(false),
    grade: clearableString(L.grade),
  })
  .superRefine(refineDateRange)
  .transform(clearEndDateWhenCurrent);

export const projectItemSchema = z.object({
  name: requiredString(L.projectName),
  description: clearableString(L.projectDescription),
  bullets,
  skills: skillList(L.projectSkills).default([]),
  url: clearable(httpUrl()),
});

export const certificationItemSchema = z.object({
  name: requiredString(L.certificationName),
  issuer: clearableString(L.issuer),
  date: isoDate().nullable().optional(),
  url: clearable(httpUrl()),
});

export const linksSchema = z.object({
  linkedin: clearable(httpUrl()),
  github: clearable(httpUrl()),
  portfolio: clearable(httpUrl()),
});

export const locationSchema = z.object({
  city: clearableString(L.city),
  country: clearable(countryCode()),
});

export const preferencesSchema = z.object({
  roles: z.array(requiredString(L.role)).max(L.roles, `At most ${L.roles} roles`).default([]),
  workModels: z.array(z.enum(WORK_MODELS)).max(WORK_MODELS.length).default([]),
  jobTypes: z.array(z.enum(JOB_TYPES)).max(JOB_TYPES.length).default([]),
  countries: z
    .array(countryCode())
    .max(L.countries, `At most ${L.countries} countries`)
    .default([]),
  minSalary: z
    .object({ amount: z.number().min(0, "Must be 0 or more"), currency: currencyCode() })
    .nullable()
    .optional(),
});

// Every editable field. Server-owned fields (userId, timestamps, file ids) are not here.
const profileFields = {
  fullName: requiredString(L.fullName),
  headline: clearableString(L.headline),
  contactEmail: clearable(email()),
  phone: clearable(phone()),
  location: locationSchema,
  links: linksSchema,
  summary: clearableString(L.summary),
  skills: skillList(L.skills),
  experience: z.array(experienceItemSchema).max(L.experience),
  education: z.array(educationItemSchema).max(L.education),
  projects: z.array(projectItemSchema).max(L.projects),
  certifications: z.array(certificationItemSchema).max(L.certifications),
  preferences: preferencesSchema,
};

const optionalFields = Object.fromEntries(
  Object.entries(profileFields).map(([key, schema]) => [key, schema.optional()]),
);

export const profileCreateSchema = z.object({
  ...optionalFields,
  fullName: profileFields.fullName,
  source: z.enum(PROFILE_SOURCES),
  uploadedCvFileId: objectId().optional(),
});

export const profileUpdateSchema = z
  .object(optionalFields)
  .refine((input) => Object.keys(input).length > 0, "Nothing to update");

// Per-step schemas for the onboarding forms (same rules, smaller objects).
export const basicsStepSchema = z.object({
  fullName: profileFields.fullName,
  headline: profileFields.headline,
  contactEmail: profileFields.contactEmail,
  phone: profileFields.phone,
  location: locationSchema,
  links: linksSchema,
  summary: profileFields.summary,
});

// The CV parser's output: every field optional. Each top-level field is validated separately so one bad
// field is dropped with a warning instead of failing the whole upload (step 5).
export const profileDraftFieldSchemas = {
  fullName: profileFields.fullName,
  headline: profileFields.headline,
  contactEmail: profileFields.contactEmail,
  phone: profileFields.phone,
  location: locationSchema,
  links: linksSchema,
  summary: profileFields.summary,
  skills: profileFields.skills,
  experience: profileFields.experience,
  education: profileFields.education,
  projects: profileFields.projects,
  certifications: profileFields.certifications,
};

export const experienceStepSchema = z.object({ experience: profileFields.experience });
export const educationStepSchema = z.object({ education: profileFields.education });
export const skillsStepSchema = z.object({
  skills: profileFields.skills,
  projects: profileFields.projects,
  certifications: profileFields.certifications,
});
export const preferencesStepSchema = z.object({ preferences: preferencesSchema });
