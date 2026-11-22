import { z } from "zod";
import {
  EXPERIENCE_LEVELS,
  JOB_JOB_TYPES,
  JOB_LIMITS as L,
  JOB_SORTS,
  JOB_WORK_MODELS,
  POSTED_WITHIN_DAYS,
  SALARY_PERIODS,
} from "../constants/jobs.js";
import { JOB_TYPES, WORK_MODELS } from "../constants/profile.js";
import { countryCode, httpUrl, pagination, requiredString } from "./fields.js";

// A job as every source adapter must return it. Unknown values → "unknown".
export const normalizedJobSchema = z.object({
  source: requiredString(50),
  sourceId: requiredString(300),
  title: requiredString(L.title),
  company: requiredString(L.company),
  location: z.object({
    city: z.string().trim().max(L.city).nullable().default(null),
    country: countryCode().nullable().default(null),
    raw: z.string().trim().max(L.rawLocation).default(""),
  }),
  workModel: z.enum(JOB_WORK_MODELS).default("unknown"),
  jobType: z.enum(JOB_JOB_TYPES).default("unknown"),
  experienceLevel: z.enum(EXPERIENCE_LEVELS).default("unknown"),
  salary: z
    .object({
      min: z.number().min(0).nullable(),
      max: z.number().min(0).nullable(),
      currency: z.string().trim().toUpperCase().length(3),
      period: z.enum(SALARY_PERIODS),
    })
    .nullable()
    .default(null),
  description: requiredString(L.description),
  applyUrl: httpUrl(),
  postedAt: z.coerce.date(),
});

// Repeatable query params (?workModel=remote&workModel=hybrid) arrive as a string or an array.
const repeatable = (values) =>
  z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : [].concat(value)),
    z.array(z.enum(values)).max(values.length).optional(),
  );

export const jobSearchQuerySchema = pagination.extend({
  q: z.string().trim().max(L.query, `Must be ${L.query} characters or fewer`).optional(),
  country: countryCode().optional(),
  city: z.string().trim().max(L.city).optional(),
  workModel: repeatable(WORK_MODELS),
  jobType: repeatable(JOB_TYPES),
  experienceLevel: repeatable(EXPERIENCE_LEVELS.filter((level) => level !== "unknown")),
  postedWithin: z.enum(POSTED_WITHIN_DAYS).optional(),
  sort: z.enum(JOB_SORTS).optional(),
});
