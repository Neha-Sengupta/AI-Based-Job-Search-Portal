export const JSON_BODY_LIMIT = "100kb";

export const RATE_LIMITS = Object.freeze({
  global: { windowMs: 15 * 60 * 1000, limit: 300 },
  ai: { windowMs: 60 * 1000, limit: 10 },
  upload: { windowMs: 60 * 60 * 1000, limit: 20 },
});

export const UPLOAD_LIMITS = Object.freeze({
  cvBytes: 4 * 1024 * 1024,
  photoBytes: 2 * 1024 * 1024,
});

export const PAGINATION = Object.freeze({
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 50,
});

export const FIELD_LIMITS = Object.freeze({
  email: 254,
  url: 500,
});
