// A saved CV's content: a snapshot of profile data, selected and ordered by tailorCv.
import { z } from "zod";
import { PROFILE_LIMITS as L } from "../constants/profile.js";
import { TEMPLATE_IDS } from "../constants/templates.js";
import { objectId, requiredString } from "./fields.js";
import {
  certificationItemSchema,
  educationItemSchema,
  experienceItemSchema,
  linksSchema,
  projectItemSchema,
  skillList,
} from "./profile.js";

const text = (max) => z.string().trim().max(max).nullable().optional();

export const cvContentSchema = z.object({
  basics: z.object({
    fullName: requiredString(L.fullName),
    headline: text(L.headline),
    email: text(254),
    phone: text(L.phone),
    location: text(200),
    links: linksSchema.default({}),
    showPhoto: z.boolean().default(false),
  }),
  summary: text(L.summary),
  skills: skillList(L.skills).default([]),
  experience: z.array(experienceItemSchema).max(L.experience).default([]),
  education: z.array(educationItemSchema).max(L.education).default([]),
  projects: z.array(projectItemSchema).max(L.projects).default([]),
  certifications: z.array(certificationItemSchema).max(L.certifications).default([]),
});

const cvTitle = requiredString(100);

export const cvTailorSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  jobId: objectId().optional(),
});

export const cvPreviewSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  content: cvContentSchema,
});

export const cvCreateSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  jobId: objectId().nullable().optional(),
  title: cvTitle,
  content: cvContentSchema,
});

export const cvUpdateSchema = z
  .object({
    templateId: z.enum(TEMPLATE_IDS).optional(),
    title: cvTitle.optional(),
    content: cvContentSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "Nothing to update");
