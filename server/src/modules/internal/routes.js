// /internal/* is called by our own GitHub Actions schedule, with a shared key.
import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { runImport } from "../jobs/import.js";

export const internalRouter = Router();

function sameKey(given, expected) {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

internalRouter.use((req, _res, next) => {
  if (!sameKey(req.get("X-Internal-Key"), env.INTERNAL_API_KEY)) {
    throw new AppError("FORBIDDEN", "Not allowed.");
  }
  next();
});

internalRouter.post("/jobs/import", async (req, res) => {
  const counts = await runImport({
    sources: env.JOB_SOURCES,
    maxPerSource: env.JOB_IMPORT_MAX_PER_SOURCE,
    companiesFile: env.JOB_COMPANIES_FILE,
    logger: req.log,
  });
  res.json({ data: counts });
});
