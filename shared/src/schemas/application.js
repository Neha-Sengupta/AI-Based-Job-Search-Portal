import { z } from "zod";
import { APPLICATION_LIMITS as L, APPLICATION_STATUSES } from "../constants/applications.js";
import { objectId, pagination, requiredString } from "./fields.js";

export const applicationCreateSchema = z.object({
  jobId: objectId(),
  status: z.enum(APPLICATION_STATUSES).default("saved"),
  cvId: objectId().nullable().optional(),
});

const answerSchema = z.object({
  question: requiredString(L.question),
  answer: requiredString(L.answer),
  generatedAt: z.coerce.date().optional(),
});

export const applicationUpdateSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    cvId: objectId().nullable().optional(),
    notes: z.string().trim().max(L.notes).optional(),
    answers: z.array(answerSchema).max(L.answers, `At most ${L.answers} answers`).optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "Nothing to update");

export const applicationListQuerySchema = pagination.extend({
  status: z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : [].concat(value)),
    z.array(z.enum(APPLICATION_STATUSES)).max(APPLICATION_STATUSES.length).optional(),
  ),
});

export const answersRequestSchema = z.object({
  questions: z
    .array(requiredString(L.question))
    .max(L.customQuestions, `At most ${L.customQuestions} questions at a time`)
    .optional(),
  regenerate: z.boolean().default(false),
});
