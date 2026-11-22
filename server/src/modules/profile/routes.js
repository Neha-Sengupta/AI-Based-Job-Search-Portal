import { Router } from "express";
import { profileCreateSchema, profileUpdateSchema } from "shared/schemas/profile";
import { UPLOAD_LIMITS } from "shared/constants/limits";
import { validate } from "../../middleware/validate.js";
import { createUploadLimiter } from "../../middleware/rate-limit.js";
import { detectFileType, uploadSingle } from "../../middleware/upload.js";
import { sendFileStream } from "../../lib/send-file.js";
import * as service from "./service.js";
import { uploadCv } from "./cv-upload.js";

const PHOTO_CACHE = "private, max-age=300";
const CV_EXTENSIONS = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export const profileRouter = Router();
const uploadLimiter = createUploadLimiter();

profileRouter.get("/", async (req, res) => {
  res.json({ data: await service.getProfile(req.user.id) });
});

profileRouter.post("/", validate({ body: profileCreateSchema }), async (req, res) => {
  res.status(201).json({ data: await service.createProfile(req.user.id, req.valid.body) });
});

profileRouter.patch("/", validate({ body: profileUpdateSchema }), async (req, res) => {
  res.json({ data: await service.updateProfile(req.user.id, req.valid.body) });
});

profileRouter.post(
  "/cv-upload",
  uploadLimiter,
  uploadSingle(UPLOAD_LIMITS.cvBytes),
  async (req, res) => {
    const contentType = await detectFileType(req.file, "cv");
    res.json({ data: await uploadCv(req.user.id, { buffer: req.file.buffer, contentType }) });
  },
);

profileRouter.get("/cv-download", async (req, res) => {
  const file = await service.openUploadedCv(req.user.id);
  await sendFileStream(res, file, {
    filename: `cv.${CV_EXTENSIONS[file.contentType] ?? "pdf"}`,
    attachment: true,
  });
});

profileRouter.post(
  "/photo",
  uploadLimiter,
  uploadSingle(UPLOAD_LIMITS.photoBytes),
  async (req, res) => {
    const contentType = await detectFileType(req.file, "photo");
    res.json({
      data: await service.setPhoto(req.user.id, { buffer: req.file.buffer, contentType }),
    });
  },
);

profileRouter.get("/photo", async (req, res) => {
  await sendFileStream(res, await service.openPhoto(req.user.id), { cache: PHOTO_CACHE });
});

profileRouter.delete("/photo", async (req, res) => {
  await service.deletePhoto(req.user.id);
  res.status(204).end();
});
