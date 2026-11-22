import { rateLimit } from "express-rate-limit";
import { RATE_LIMITS } from "shared/constants/limits";
import { AppError } from "../lib/errors.js";

function limiter({ windowMs, limit }, message, perUser = false) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Per-user limiters run after requireAuth, so req.user is always set.
    ...(perUser && { keyGenerator: (req) => req.user.id }),
    handler: (_req, _res, next) => next(new AppError("RATE_LIMITED", message)),
  });
}

export const globalLimiter = limiter(
  RATE_LIMITS.global,
  "Too many requests. Please wait a few minutes and try again.",
);

export const createAiLimiter = () =>
  limiter(RATE_LIMITS.ai, "Too many AI requests. Please wait a minute and try again.", true);

export const createUploadLimiter = () =>
  limiter(RATE_LIMITS.upload, "Too many uploads. Please try again in an hour.", true);
