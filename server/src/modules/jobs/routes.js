import { Router } from "express";
import { jobSearchQuerySchema } from "shared/schemas/job";
import { idParams, pagination } from "shared/schemas/fields";
import { validate } from "../../middleware/validate.js";
import { optionalAuth, requireAuth } from "../../middleware/auth.js";
import * as service from "./service.js";

export const jobsRouter = Router();

// 🔓🔐 public, with fit scores when signed in.
jobsRouter.get("/", optionalAuth, validate({ query: jobSearchQuerySchema }), async (req, res) => {
  res.json(await service.searchJobs(req.valid.query, req.user?.id));
});

jobsRouter.get("/recommended", requireAuth, validate({ query: pagination }), async (req, res) => {
  res.json(await service.recommendedJobs(req.valid.query, req.user.id));
});

jobsRouter.get("/:id", optionalAuth, validate({ params: idParams }), async (req, res) => {
  res.json({ data: await service.getJob(req.valid.params.id, req.user?.id) });
});
