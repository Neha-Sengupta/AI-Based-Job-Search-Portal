import { Router } from "express";
import {
  answersRequestSchema,
  applicationCreateSchema,
  applicationListQuerySchema,
  applicationUpdateSchema,
} from "shared/schemas/application";
import { idParams } from "shared/schemas/fields";
import { validate } from "../../middleware/validate.js";
import { createAiLimiter } from "../../middleware/rate-limit.js";
import * as service from "./service.js";
import { draftAnswers } from "./answers.js";

export const applicationsRouter = Router();
const aiLimiter = createAiLimiter();

applicationsRouter.get("/", validate({ query: applicationListQuerySchema }), async (req, res) => {
  res.json(await service.listApplications(req.user.id, req.valid.query));
});

applicationsRouter.post("/", validate({ body: applicationCreateSchema }), async (req, res) => {
  res.status(201).json({ data: await service.createApplication(req.user.id, req.valid.body) });
});

applicationsRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  res.json({ data: await service.getApplication(req.user.id, req.valid.params.id) });
});

applicationsRouter.patch(
  "/:id",
  validate({ params: idParams, body: applicationUpdateSchema }),
  async (req, res) => {
    res.json({
      data: await service.updateApplication(req.user.id, req.valid.params.id, req.valid.body),
    });
  },
);

applicationsRouter.delete("/:id", validate({ params: idParams }), async (req, res) => {
  await service.deleteApplication(req.user.id, req.valid.params.id);
  res.status(204).end();
});

applicationsRouter.post(
  "/:id/answers",
  aiLimiter,
  validate({ params: idParams, body: answersRequestSchema }),
  async (req, res) => {
    res.json({ data: await draftAnswers(req.user.id, req.valid.params.id, req.valid.body) });
  },
);
