import { TEMPLATES } from "shared/constants/templates";
import { tailorCv, unknownCvSkills } from "shared/logic/tailor";
import { AppError } from "../../lib/errors.js";
import { readFile } from "../../lib/storage.js";
import { Application } from "../applications/model.js";
import { Job } from "../jobs/model.js";
import { FILE_KIND, findProfile, toProfileDto } from "../profile/service.js";
import { Cv } from "./model.js";
import { renderCvHtml } from "./render.js";
import { htmlToPdf } from "./pdf.js";

const toCvDto = (cv) => ({
  id: String(cv._id),
  title: cv.title,
  templateId: cv.templateId,
  jobId: cv.jobId ? String(cv.jobId) : null,
  job: cv.job ?? null,
  content: cv.content,
  createdAt: cv.createdAt,
  updatedAt: cv.updatedAt,
});

async function requireProfile(userId) {
  const profile = await findProfile(userId);
  if (!profile) throw new AppError("NOT_FOUND", "Create your profile first.");
  return toProfileDto(profile);
}

async function requireJob(jobId) {
  const job = await Job.findById(jobId).select("title company requirements").lean();
  if (!job) throw new AppError("NOT_FOUND", "This job is no longer available.");
  return job;
}

export async function tailor(userId, { templateId, jobId }) {
  const profile = await requireProfile(userId);
  const job = jobId ? await requireJob(jobId) : null;
  const supportsPhoto = TEMPLATES.find((template) => template.id === templateId)?.supportsPhoto;
  return tailorCv(profile, job, { showPhoto: Boolean(supportsPhoto && profile.photoFileId) });
}

async function photoDataUri(userId, profile, content, templateId) {
  const supportsPhoto = TEMPLATES.find((template) => template.id === templateId)?.supportsPhoto;
  if (!supportsPhoto || !content.basics.showPhoto || !profile?.photoFileId) return undefined;
  const file = await readFile(profile.photoFileId, userId, FILE_KIND.photo);
  return file ? `data:${file.contentType};base64,${file.buffer.toString("base64")}` : undefined;
}

export async function preview(userId, { templateId, content }) {
  const profile = await findProfile(userId);
  return {
    html: renderCvHtml({
      templateId,
      content,
      photoDataUri: await photoDataUri(userId, profile, content, templateId),
    }),
  };
}

// F7.6: a CV may only contain skills the profile has (checked again on the server).
async function checkSkills(userId, content) {
  const profile = await findProfile(userId);
  if (!profile) throw new AppError("NOT_FOUND", "Create your profile first.");
  const unknown = unknownCvSkills(content, profile);
  if (unknown.length) {
    throw new AppError(
      "VALIDATION_ERROR",
      `These skills aren't in your profile: ${unknown.join(", ")}. Add them to your profile first.`,
      {
        fields: { "content.skills": "Only skills from your profile can be used" },
      },
    );
  }
}

export async function createCv(userId, { templateId, jobId, title, content }) {
  await checkSkills(userId, content);
  const job = jobId ? await requireJob(jobId) : null;
  const cv = await Cv.create({
    userId,
    jobId: job?._id ?? null,
    job: job ? { title: job.title, company: job.company } : null,
    templateId,
    title,
    content,
  });
  return toCvDto(cv.toObject());
}

export async function listCvs(userId, { jobId, page, limit }) {
  const filter = { userId, ...(jobId && { jobId }) };
  const [cvs, total] = await Promise.all([
    Cv.find(filter)
      .select("title templateId jobId job createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Cv.countDocuments(filter),
  ]);
  return {
    data: cvs.map((cv) => ({
      id: String(cv._id),
      title: cv.title,
      templateId: cv.templateId,
      jobId: cv.jobId ? String(cv.jobId) : null,
      job: cv.job ?? null,
      createdAt: cv.createdAt,
    })),
    meta: { page, limit, total },
  };
}

async function requireCv(userId, id) {
  const cv = await Cv.findOne({ _id: id, userId }).lean();
  if (!cv) throw new AppError("NOT_FOUND", "CV not found.");
  return cv;
}

export async function getCv(userId, id) {
  return toCvDto(await requireCv(userId, id));
}

export async function updateCv(userId, id, input) {
  if (input.content) await checkSkills(userId, input.content);
  const cv = await Cv.findOneAndUpdate(
    { _id: id, userId },
    { $set: input },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!cv) throw new AppError("NOT_FOUND", "CV not found.");
  return toCvDto(cv);
}

export async function renderCvPdf(userId, id) {
  const cv = await requireCv(userId, id);
  const profile = await findProfile(userId);
  const html = renderCvHtml({
    templateId: cv.templateId,
    content: cv.content,
    photoDataUri: await photoDataUri(userId, profile, cv.content, cv.templateId),
  });
  return {
    pdf: await htmlToPdf(html),
    filename: `${cv.content.basics.fullName} - ${cv.title}.pdf`,
  };
}

export async function deleteCv(userId, id) {
  const result = await Cv.deleteOne({ _id: id, userId });
  if (result.deletedCount === 0) throw new AppError("NOT_FOUND", "CV not found.");
  // Applications keep the entry but show "CV deleted" (F8.6).
  await Application.updateMany({ userId, cvId: id }, { $set: { cvId: null, cvDeleted: true } });
}
