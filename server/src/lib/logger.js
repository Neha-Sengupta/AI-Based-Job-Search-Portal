import pino from "pino";
import { env } from "../config/env.js";

const LEVELS = { production: "info", development: "debug", test: "silent" };

// Never log cookies, tokens, secrets or personal data.
// The CV download file name contains the user's name, so Content-Disposition is redacted too.
export const REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  'req.headers["x-internal-key"]',
  'res.headers["set-cookie"]',
  'res.headers["content-disposition"]',
];

export const logger = pino({
  level: LEVELS[env.NODE_ENV],
  redact: { paths: REDACT_PATHS, censor: "[redacted]" },
});
