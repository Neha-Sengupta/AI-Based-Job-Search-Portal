// Used by the Better Auth config (server) and the sign-up form schema (client), so both enforce the same rules.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;

// Better Auth's limiter for sign-in and sign-up.
export const AUTH_RATE_LIMIT = Object.freeze({ windowSeconds: 60, max: 5 });

// Pages that need a session; the Next.js proxy redirects to /signin without one.
export const PROTECTED_PATHS = Object.freeze([
  "/dashboard",
  "/onboarding",
  "/profile",
  "/cvs",
  "/tracker",
  "/settings",
]);
