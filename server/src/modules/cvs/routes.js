import { Router } from "express";
import { cvCreateSchema, cvPreviewSchema, cvTailorSchema, cvUpdateSchema } from "shared/schemas/cv";
import { idParams, objectId, pagination } from "shared/schemas/fields";
import { validate } from "../../middleware/validate.js";
import { contentDisposition } from "../../lib/send-file.js";
import * as service from "./service.js";

export const cvsRouter = Router();

const listQuery = pagination.extend({ jobId: objectId().optional() });

cvsRouter.post("/tailor", validate({ body: cvTailorSchema }), async (req, res) => {
  res.json({ data: await service.tailor(req.user.id, req.valid.body) });
});

cvsRouter.post("/preview", validate({ body: cvPreviewSchema }), async (req, res) => {
  res.json({ data: await service.preview(req.user.id, req.valid.body) });
});

cvsRouter.post("/", validate({ body: cvCreateSchema }), async (req, res) => {
  res.status(201).json({ data: await service.createCv(req.user.id, req.valid.body) });
});

cvsRouter.get("/", validate({ query: listQuery }), async (req, res) => {
  res.json(await service.listCvs(req.user.id, req.valid.query));
});

cvsRouter.get("/:id", validate({ params: idParams }), async (req, res) => {
  res.json({ data: await service.getCv(req.user.id, req.valid.params.id) });
});

cvsRouter.patch("/:id", validate({ params: idParams, body: cvUpdateSchema }), async (req, res) => {
  res.json({ data: await service.updateCv(req.user.id, req.valid.params.id, req.valid.body) });
});

cvsRouter.get("/:id/download", validate({ params: idParams }), async (req, res) => {
  const { pdf, filename } = await service.renderCvPdf(req.user.id, req.valid.params.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", contentDisposition(filename));
  res.send(Buffer.from(pdf));
});

cvsRouter.delete("/:id", validate({ params: idParams }), async (req, res) => {
  await service.deleteCv(req.user.id, req.valid.params.id);
  res.status(204).end();
});
