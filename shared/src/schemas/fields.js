// Shared building blocks for every Zod schema.
import { z } from "zod";
import { FIELD_LIMITS, PAGINATION } from "../constants/limits.js";

const tooLong = (max) => `Must be ${max} characters or fewer`;

// An empty or whitespace-only string counts as missing.
export const requiredString = (max) => z.string().trim().min(1, "Required").max(max, tooLong(max));

// May be absent.
export const optionalString = (max) => z.string().trim().max(max, tooLong(max)).optional();

// Present but clearable: null removes the value.
export const nullableString = (max) => z.string().trim().max(max, tooLong(max)).nullable();

export const email = () =>
  z
    .string()
    .trim()
    .toLowerCase()
    .max(FIELD_LIMITS.email, tooLong(FIELD_LIMITS.email))
    .pipe(z.email("Invalid email"));

// Only http(s), which blocks javascript: and data: links.
export const httpUrl = () =>
  z
    .string()
    .trim()
    .max(FIELD_LIMITS.url, tooLong(FIELD_LIMITS.url))
    .pipe(
      z.url({ protocol: /^https?$/, error: "Must be a link starting with http:// or https://" }),
    );

export const phone = () =>
  z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Invalid phone number");

// ISO 3166-1 alpha-2, e.g. "IN".
export const countryCode = () =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter country code");

// ISO 4217, e.g. "INR".
export const currencyCode = () =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code");

// MongoDB ObjectId. A bad ID is a 400, never a crash.
export const objectId = () => z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const idParams = z.object({ id: objectId() });

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});
